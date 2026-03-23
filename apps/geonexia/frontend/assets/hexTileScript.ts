/**
 * Hex-tile overlay script for Geonexia.
 *
 * This self-contained IIFE is injected into the MapLibre map HTML via the
 * `injectScript` prop on the `MyMap` component. It hooks into the map's
 * `_mapExtensions` API to:
 *   – Render H3 hexagonal tile cells (Uber H3 geospatial indexing) over the
 *     map viewport using `h3.polygonToCells` and `h3.cellToBoundary`.
 *   – Handle `hexTileLayer` messages to activate/configure/deactivate the grid.
 *   – Fire `{ tag: 'HexTileClicked', id }` to React Native when the user taps
 *     a hex cell, where `id` is the canonical H3 cell index string.
 *
 * The h3-js library (h3coreBundle.ts) is prepended to the injected script so
 * that `window.h3` is available synchronously – no CDN or network request needed.
 * The algorithm lives only here (Geonexia), not in the shared common-ui HTML.
 * Resolution constants are defined in h3CoreHelper.ts.
 */

import { H3_DEFAULT_RESOLUTION, H3_MIN_ZOOM, H3_MAX_CELLS } from './h3CoreHelper';
import { H3_CORE_BUNDLE } from './h3coreBundle';

export const HEX_TILE_SCRIPT = `
${H3_CORE_BUNDLE}
(function () {
  // ── Configuration (can be overridden via hexTileLayer message) ─────────────
  // hexTileActive starts as true because injecting this script means the caller
  // wants the hex-tile grid shown immediately. Send { hexTileLayer: null } to
  // hide it or { hexTileLayer: { resolution, color, strokeColor } } to reconfigure.
  var hexTileActive = true;
  var hexTileColor = 'rgba(0, 0, 0, 0)';
  var hexTileStrokeColor = '#2563eb';
  var hexTileResolution = ${H3_DEFAULT_RESOLUTION};

  // ── MapLibre source / layer IDs ───────────────────────────────────────────
  var HEX_TILE_SOURCE = 'hex-tile-source';
  var HEX_TILE_FILL_LAYER = 'hex-tile-fill';
  var HEX_TILE_STROKE_LAYER = 'hex-tile-stroke';

  // ── Safety limits ─────────────────────────────────────────────────────────
  var HEX_TILE_MAX_CELLS = ${H3_MAX_CELLS};
  var HEX_TILE_MIN_ZOOM = ${H3_MIN_ZOOM};

  // ── GeoJSON builder using h3-js ───────────────────────────────────────────
  function buildH3GeoJSON() {
    if (!map || map.getZoom() < HEX_TILE_MIN_ZOOM) {
      return { type: 'FeatureCollection', features: [] };
    }

    var bounds = map.getBounds();
    var sw = bounds.getSouthWest();
    var ne = bounds.getNorthEast();

    // Viewport bounding polygon – h3-js expects [lat, lng] pairs in CCW order.
    var outerRing = [
      [sw.lat, sw.lng],
      [sw.lat, ne.lng],
      [ne.lat, ne.lng],
      [ne.lat, sw.lng],
      [sw.lat, sw.lng],
    ];

    var cells;
    try {
      cells = h3.polygonToCells({ outer: outerRing, holes: [] }, hexTileResolution);
    } catch (e) {
      console.error('[HexTile] polygonToCells error:', e);
      return { type: 'FeatureCollection', features: [] };
    }

    if (!cells || cells.length > HEX_TILE_MAX_CELLS) {
      return { type: 'FeatureCollection', features: [] };
    }

    var features = [];
    for (var i = 0; i < cells.length; i++) {
      var cellId = cells[i];
      var boundary;
      try {
        // cellToBoundary returns [[lat, lng], ...] – convert to GeoJSON [lng, lat].
        boundary = h3.cellToBoundary(cellId);
      } catch (e) {
        continue;
      }
      var coords = [];
      for (var j = 0; j < boundary.length; j++) {
        coords.push([boundary[j][1], boundary[j][0]]);
      }
      coords.push(coords[0]); // close the ring
      features.push({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [coords] },
        properties: { id: cellId },
      });
    }

    return { type: 'FeatureCollection', features: features };
  }

  // ── Layer management ──────────────────────────────────────────────────────
  function addHexTileLayer() {
    if (!map || map.getSource(HEX_TILE_SOURCE)) return;
    map.addSource(HEX_TILE_SOURCE, { type: 'geojson', data: buildH3GeoJSON() });
    map.addLayer({
      id: HEX_TILE_FILL_LAYER,
      type: 'fill',
      source: HEX_TILE_SOURCE,
      paint: { 'fill-color': hexTileColor, 'fill-opacity': 1 },
    });
    map.addLayer({
      id: HEX_TILE_STROKE_LAYER,
      type: 'line',
      source: HEX_TILE_SOURCE,
      paint: { 'line-color': hexTileStrokeColor, 'line-width': 1, 'line-opacity': 0.6 },
    });
  }

  function removeHexTileLayer() {
    if (!map) return;
    if (map.getLayer(HEX_TILE_STROKE_LAYER)) map.removeLayer(HEX_TILE_STROKE_LAYER);
    if (map.getLayer(HEX_TILE_FILL_LAYER)) map.removeLayer(HEX_TILE_FILL_LAYER);
    if (map.getSource(HEX_TILE_SOURCE)) map.removeSource(HEX_TILE_SOURCE);
  }

  function updateHexTileGrid() {
    if (!hexTileActive || !map) return;
    var src = map.getSource(HEX_TILE_SOURCE);
    if (src) src.setData(buildH3GeoJSON());
  }

  // ── Extension hooks ───────────────────────────────────────────────────────
  window._mapExtensions = window._mapExtensions || {};

  window._mapExtensions.onMapReady = function (m) {
    addHexTileLayer();
    m.on('moveend', updateHexTileGrid);
    m.on('zoomend', updateHexTileGrid);
    m.on('styledata', function () {
      if (hexTileActive && !m.getSource(HEX_TILE_SOURCE)) addHexTileLayer();
    });
  };

  window._mapExtensions.onMessage = function (data) {
    if (data.hexTileLayer !== undefined) {
      if (data.hexTileLayer) {
        if (data.hexTileLayer.color) hexTileColor = data.hexTileLayer.color;
        if (data.hexTileLayer.strokeColor) hexTileStrokeColor = data.hexTileLayer.strokeColor;
        if (data.hexTileLayer.resolution) hexTileResolution = data.hexTileLayer.resolution;
        hexTileActive = true;
        removeHexTileLayer();
        addHexTileLayer();
      } else {
        hexTileActive = false;
        removeHexTileLayer();
      }
    }
  };

  window._mapExtensions.onMapClick = function (e, m) {
    if (!hexTileActive || !m.getSource(HEX_TILE_SOURCE)) return false;
    var features = m.queryRenderedFeatures(e.point, { layers: [HEX_TILE_FILL_LAYER] });
    if (features && features.length > 0) {
      var props = features[0].properties || {};
      sendToRN({ tag: 'HexTileClicked', id: props.id });
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
