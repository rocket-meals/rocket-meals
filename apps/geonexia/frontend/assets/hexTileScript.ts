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
  // Level-based fill colours: transparent at level 0, interpolated light→dark green for levels 1–10+
  var HEX_FILL_LEVEL_0 = 'rgba(0, 0, 0, 0)';
  var HEX_FILL_LEVEL_1 = 'rgba(187, 247, 208, 0.45)';
  var HEX_FILL_LEVEL_10 = 'rgba(21, 128, 61, 0.70)';
  // Territory border: thick, dark line between level-0 and level>0 tiles
  var HEX_BORDER_COLOR = '#1e3a1e';
  var HEX_BORDER_WIDTH = 2.5;
  var HEX_BORDER_OPACITY = 0.85;
  // Walk path: sandy brown/earth tone for tiles the user has physically walked on
  var WALK_PATH_COLOR = 'rgba(180, 130, 60, 0.85)';
  var WALK_PATH_WIDTH = 2.5;

  // ── MapLibre source / layer IDs ───────────────────────────────────────────
  var HEX_TILE_SOURCE = 'hex-tile-source';
  var HEX_TILE_FILL_LAYER = 'hex-tile-fill';
  var HEX_TILE_STROKE_LAYER = 'hex-tile-stroke';
  var HEX_BORDER_SOURCE = 'hex-border-source';
  var HEX_BORDER_LAYER = 'hex-border-layer';
  var HEX_WALK_PATH_SOURCE = 'hex-walk-path-source';
  var HEX_WALK_PATH_LAYER = 'hex-walk-path-layer';

  // ── Empty FeatureCollection used as initial / cleared state ───────────────
  var EMPTY_FC = { type: 'FeatureCollection', features: [] };

  // ── Compute territory border edges ────────────────────────────────────────
  // Returns a GeoJSON FeatureCollection of LineString features representing
  // the edges that lie between a level-0 tile and a level>0 tile.
  // The GeoJSON received from React Native includes ALL tiles in the viewport
  // (level 0 and above), so shared edges between adjacent tiles appear twice.
  // A border edge is therefore one that appears exactly twice and where one
  // tile is level 0 and the other is level > 0.
  function buildBorderEdges(features) {
    // 6 decimal places ≈ 0.1 m precision at the equator – sufficient to
    // uniquely identify shared hex polygon vertices without floating-point drift.
    var PRECISION = 6;
    function edgeKey(v1, v2) {
      var s1 = v1[0].toFixed(PRECISION) + ',' + v1[1].toFixed(PRECISION);
      var s2 = v2[0].toFixed(PRECISION) + ',' + v2[1].toFixed(PRECISION);
      return s1 < s2 ? s1 + '|' + s2 : s2 + '|' + s1;
    }

    var edgeMap = {};
    for (var i = 0; i < features.length; i++) {
      var feature = features[i];
      var level = (feature.properties && feature.properties.level) || 0;
      var ring = feature.geometry && feature.geometry.coordinates && feature.geometry.coordinates[0];
      if (!ring) continue;
      for (var j = 0; j < ring.length - 1; j++) {
        var key = edgeKey(ring[j], ring[j + 1]);
        if (!edgeMap[key]) {
          edgeMap[key] = { coords: [ring[j], ring[j + 1]], minLevel: level, maxLevel: level, count: 0 };
        }
        if (level < edgeMap[key].minLevel) edgeMap[key].minLevel = level;
        if (level > edgeMap[key].maxLevel) edgeMap[key].maxLevel = level;
        edgeMap[key].count += 1;
      }
    }

    var borderFeatures = [];
    for (var k in edgeMap) {
      var entry = edgeMap[k];
      // Border: shared between a level-0 tile and a level>0 tile
      if (entry.count === 2 && entry.minLevel === 0 && entry.maxLevel > 0) {
        borderFeatures.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: entry.coords },
          properties: {},
        });
      }
    }

    return { type: 'FeatureCollection', features: borderFeatures };
  }

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
          ['<=', ['get', 'level'], 0], HEX_FILL_LEVEL_0,
          ['interpolate', ['linear'], ['get', 'level'],
            1, HEX_FILL_LEVEL_1,
            10, HEX_FILL_LEVEL_10
          ]
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
    // Territory border: separate source/layer for thick dark boundary lines
    map.addSource(HEX_BORDER_SOURCE, { type: 'geojson', data: EMPTY_FC });
    map.addLayer({
      id: HEX_BORDER_LAYER,
      type: 'line',
      source: HEX_BORDER_SOURCE,
      paint: {
        'line-color': HEX_BORDER_COLOR,
        'line-width': HEX_BORDER_WIDTH,
        'line-opacity': HEX_BORDER_OPACITY,
      },
    });
    // Walk path: sandy brown lines connecting centres of adjacent visited tiles
    map.addSource(HEX_WALK_PATH_SOURCE, { type: 'geojson', data: EMPTY_FC });
    map.addLayer({
      id: HEX_WALK_PATH_LAYER,
      type: 'line',
      source: HEX_WALK_PATH_SOURCE,
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': WALK_PATH_COLOR,
        'line-width': WALK_PATH_WIDTH,
        'line-opacity': 1,
      },
    });
    notifyViewport();
  }

  function removeHexTileLayer() {
    if (!map) return;
    if (map.getLayer(HEX_WALK_PATH_LAYER)) map.removeLayer(HEX_WALK_PATH_LAYER);
    if (map.getSource(HEX_WALK_PATH_SOURCE)) map.removeSource(HEX_WALK_PATH_SOURCE);
    if (map.getLayer(HEX_BORDER_LAYER)) map.removeLayer(HEX_BORDER_LAYER);
    if (map.getSource(HEX_BORDER_SOURCE)) map.removeSource(HEX_BORDER_SOURCE);
    if (map.getLayer(HEX_TILE_STROKE_LAYER)) map.removeLayer(HEX_TILE_STROKE_LAYER);
    if (map.getLayer(HEX_TILE_FILL_LAYER)) map.removeLayer(HEX_TILE_FILL_LAYER);
    if (map.getSource(HEX_TILE_SOURCE)) map.removeSource(HEX_TILE_SOURCE);
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
      var fc = data.hexTileGeoJson || EMPTY_FC;
      if (src) src.setData(fc);
      // Recompute territory border edges whenever tile data changes
      var borderSrc = map && map.getSource(HEX_BORDER_SOURCE);
      if (borderSrc) borderSrc.setData(buildBorderEdges(fc.features || []));
    }
    if (data.hexWalkPathGeoJson !== undefined) {
      if (!hexTileActive) return;
      var walkSrc = map && map.getSource(HEX_WALK_PATH_SOURCE);
      if (walkSrc) walkSrc.setData(data.hexWalkPathGeoJson || EMPTY_FC);
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
