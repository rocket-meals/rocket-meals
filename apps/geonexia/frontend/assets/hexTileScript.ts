/**
 * Hex-tile overlay script for Geonexia.
 *
 * This self-contained IIFE is injected into the MapLibre map HTML via the
 * `injectScript` prop on the `MyMap` component. It hooks into the map's
 * `_mapExtensions` API to:
 *   – Render an H3-based hexagonal grid over the map viewport.
 *   – Notify React Native of viewport changes so that it can compute H3 cells
 *     using H3Helper and send back the GeoJSON via a `hexTileGeoJson` message.
 *   – Handle `hexTileLayer` messages to activate/configure/deactivate the grid.
 *   – Fire `{ tag: 'HexTileClicked', h3Index }` to React Native when the user
 *     taps a hex cell.
 *
 * Hex cell computation is intentionally kept on the React Native side so that
 * the existing H3Helper (helpers/H3Helper.ts) can be reused directly.
 */
export const HEX_TILE_SCRIPT = `
(function () {
  // ── Configuration (can be overridden via hexTileLayer message) ─────────────
  // hexTileActive starts as true because injecting this script means the caller
  // wants the hex-tile grid shown immediately. Send { hexTileLayer: null } to
  // hide it or { hexTileLayer: { color, strokeColor } } to reconfigure.
  // H3 resolution and cell computation are controlled on the React Native side
  // via the H3Helper; this script only renders the GeoJSON it receives.
  var hexTileActive = true;
  var hexTileColor = 'rgba(0, 0, 0, 0)';
  // Hex border: subtle gray, low opacity
  var hexTileStrokeColor = '#9ca3af';
  // Level-based fill colours (level 0 = transparent, 1–3 = light→strong green)
  var HEX_COLOR_LEVEL_1 = 'rgba(187, 247, 208, 0.45)';
  var HEX_COLOR_LEVEL_2 = 'rgba(74, 222, 128, 0.55)';
  var HEX_COLOR_LEVEL_3 = 'rgba(21, 128, 61, 0.65)';

  // ── MapLibre source / layer IDs ───────────────────────────────────────────
  var HEX_TILE_SOURCE = 'hex-tile-source';
  var HEX_TILE_FILL_LAYER = 'hex-tile-fill';
  var HEX_TILE_STROKE_LAYER = 'hex-tile-stroke';

  // ── Empty FeatureCollection used as initial / cleared state ───────────────
  var EMPTY_FC = { type: 'FeatureCollection', features: [] };

  // ── Notify React Native about the current viewport ────────────────────────
  function notifyViewport() {
    if (!hexTileActive || !map) return;
    var bounds = map.getBounds();
    sendToRN({
      tag: 'MapViewportChanged',
      bounds: {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      },
      zoom: map.getZoom(),
    });
  }

  // ── Layer management ──────────────────────────────────────────────────────
  function addHexTileLayer() {
    if (!map || map.getSource(HEX_TILE_SOURCE)) return;
    map.addSource(HEX_TILE_SOURCE, { type: 'geojson', data: EMPTY_FC });
    map.addLayer({
      id: HEX_TILE_FILL_LAYER,
      type: 'fill',
      source: HEX_TILE_SOURCE,
      paint: {
        'fill-color': ['case',
          ['>=', ['get', 'level'], 3], HEX_COLOR_LEVEL_3,
          ['>=', ['get', 'level'], 2], HEX_COLOR_LEVEL_2,
          ['>=', ['get', 'level'], 1], HEX_COLOR_LEVEL_1,
          hexTileColor
        ],
        'fill-opacity': 1,
      },
    });
    map.addLayer({
      id: HEX_TILE_STROKE_LAYER,
      type: 'line',
      source: HEX_TILE_SOURCE,
      paint: { 'line-color': hexTileStrokeColor, 'line-width': 0.8, 'line-opacity': 0.35 },
    });
    notifyViewport();
  }

  function removeHexTileLayer() {
    if (!map) return;
    if (map.getLayer(HEX_TILE_STROKE_LAYER)) map.removeLayer(HEX_TILE_STROKE_LAYER);
    if (map.getLayer(HEX_TILE_FILL_LAYER)) map.removeLayer(HEX_TILE_FILL_LAYER);
    if (map.getSource(HEX_TILE_SOURCE)) map.removeSource(HEX_TILE_SOURCE);
  }

  // ── Heading cone marker ───────────────────────────────────────────────────
  var headingConeMarker = null;
  var headingConeActive = false;
  var headingConeDeg = 0;
  var lastUserLngLat = null;

  function updateHeadingConeMarker() {
    if (!map || !lastUserLngLat || !headingConeActive) return;
    if (headingConeMarker) {
      headingConeMarker.setLngLat(lastUserLngLat);
      var svg = headingConeMarker.getElement().querySelector('svg');
      if (svg) svg.style.transform = 'rotate(' + headingConeDeg + 'deg)';
    } else {
      var el = document.createElement('div');
      el.style.cssText = 'width:52px;height:52px;display:flex;align-items:center;justify-content:center;pointer-events:none;';
      el.innerHTML = '<svg width="52" height="52" viewBox="0 0 52 52" style="transform:rotate(' + headingConeDeg + 'deg);transform-origin:50% 50%;" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M26 26 L15 6 L26 13 L37 6 Z" fill="rgba(37,99,235,0.65)" stroke="rgba(255,255,255,0.9)" stroke-width="1.5" stroke-linejoin="round"/>' +
        '</svg>';
      headingConeMarker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat(lastUserLngLat)
        .addTo(map);
    }
  }

  function removeHeadingCone() {
    if (headingConeMarker) {
      headingConeMarker.remove();
      headingConeMarker = null;
    }
    headingConeActive = false;
  }

  // ── Extension hooks ───────────────────────────────────────────────────────
  window._mapExtensions = window._mapExtensions || {};

  window._mapExtensions.onMapReady = function (m) {
    addHexTileLayer();
    m.on('moveend', notifyViewport);
    m.on('zoomend', notifyViewport);
    m.on('styledata', function () {
      if (hexTileActive && !m.getSource(HEX_TILE_SOURCE)) addHexTileLayer();
    });
  };

  window._mapExtensions.onMessage = function (data) {
    // Track user location to keep the cone positioned at the user's position
    if (data.userLocation && data.userLocation.lat != null && data.userLocation.lng != null) {
      lastUserLngLat = [data.userLocation.lng, data.userLocation.lat];
      if (headingConeActive && headingConeMarker) {
        headingConeMarker.setLngLat(lastUserLngLat);
      }
    }

    // Handle heading cone visibility and direction
    if (data.userHeadingCone !== undefined) {
      if (data.userHeadingCone === null) {
        removeHeadingCone();
      } else {
        headingConeActive = true;
        if (data.userHeadingCone.headingDeg != null) {
          headingConeDeg = data.userHeadingCone.headingDeg;
        }
        updateHeadingConeMarker();
      }
    }

    if (data.hexTileLayer !== undefined) {
      if (data.hexTileLayer) {
        if (data.hexTileLayer.color) hexTileColor = data.hexTileLayer.color;
        if (data.hexTileLayer.strokeColor) hexTileStrokeColor = data.hexTileLayer.strokeColor;
        hexTileActive = true;
        removeHexTileLayer();
        addHexTileLayer();
      } else {
        hexTileActive = false;
        removeHexTileLayer();
      }
      return;
    }
    if (data.hexTileGeoJson !== undefined) {
      if (!hexTileActive) return;
      var src = map && map.getSource(HEX_TILE_SOURCE);
      if (src) src.setData(data.hexTileGeoJson || EMPTY_FC);
    }
  };

  window._mapExtensions.onMapClick = function (e, m) {
    if (!hexTileActive || !m.getSource(HEX_TILE_SOURCE)) return false;
    var features = m.queryRenderedFeatures(e.point, { layers: [HEX_TILE_FILL_LAYER] });
    if (features && features.length > 0) {
      var props = features[0].properties || {};
      sendToRN({ tag: 'HexTileClicked', h3Index: props.h3Index });
      return true;
    }
    return false;
  };

  // Fallback for the web iframe case: if the map already loaded before this
  // script was injected, call onMapReady immediately.
  if (typeof mapReady !== 'undefined' && mapReady && map) {
    window._mapExtensions.onMapReady(map);
  }
})();
`;
