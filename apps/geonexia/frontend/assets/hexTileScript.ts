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
  var hexDebugPointsVisible = false;
  var hexTileColor = 'rgba(0, 0, 0, 0)';
  // Hex border: light gray, low opacity
  var hexTileStrokeColor = '#d1d5db';
  // Level-based fill colours: level 1 = lightest green, level 10 = darkest green.
  // Levels 1–10 are interpolated linearly between these two endpoints.
  var HEX_COLOR_LEVEL_MIN = '#bbf7d0'; // level  1 – light mint green
  var HEX_COLOR_LEVEL_MAX = '#15803d'; // level 10 – dark forest green
  var HEX_OPACITY_LEVEL_MIN = 0.21;   // level  1  (default: 70 % of HEX_OPACITY_LEVEL_MAX)
  var HEX_OPACITY_LEVEL_MAX = 0.30;   // level 10  (default: 0.30, user-adjustable)
  // Hex grid line appearance (user-adjustable via hexLineOpacity / hexLineWidth messages)
  var HEX_LINE_OPACITY_SCALE = 1.0;  // multiplier applied to the zoom-dependent base opacity
  var HEX_LINE_WIDTH_SCALE = 1.0;    // multiplier applied to the zoom-dependent base width
  // Territory border: thick, dark line between level-0 and level>0 tiles
  var HEX_BORDER_COLOR = '#1e3a1e';
  var HEX_BORDER_WIDTH = 2.5;
  var HEX_BORDER_OPACITY = 0.85;
  // Walk path: red for tiles the user has physically walked on
  var WALK_PATH_COLOR = 'rgba(220, 38, 38, 0.85)';
  var WALK_PATH_WIDTH = 2.5;

  // ── MapLibre source / layer IDs ───────────────────────────────────────────
  var HEX_TILE_SOURCE = 'hex-tile-source';
  var HEX_TILE_FILL_LAYER = 'hex-tile-fill';
  var HEX_TILE_STROKE_LAYER = 'hex-tile-stroke';
  var HEX_BORDER_SOURCE = 'hex-border-source';
  var HEX_BORDER_LAYER = 'hex-border-layer';
  var HEX_WALK_PATH_SOURCE = 'hex-walk-path-source';
  var HEX_WALK_PATH_LAYER = 'hex-walk-path-layer';
  var HEX_VERTICES_SOURCE = 'hex-vertices-source';
  var HEX_VERTICES_LAYER = 'hex-vertices-layer';
  var HEX_CENTERS_SOURCE = 'hex-centers-source';
  var HEX_CENTERS_LAYER = 'hex-centers-layer';
  var HEX_MIDPOINTS_SOURCE = 'hex-midpoints-source';
  var HEX_MIDPOINTS_LAYER = 'hex-midpoints-layer';
  // Enclosed area: semi-transparent blue fill for tiles enclosed by a route loop
  var HEX_ENCLOSED_SOURCE = 'hex-enclosed-source';
  var HEX_ENCLOSED_FILL_LAYER = 'hex-enclosed-fill';
  var HEX_ENCLOSED_STROKE_LAYER = 'hex-enclosed-stroke';
  var HEX_ENCLOSED_FILL_COLOR = 'rgba(59, 130, 246, 0.18)'; // semi-transparent blue
  var HEX_ENCLOSED_STROKE_COLOR = '#3b82f6'; // blue
  // Measure mode: draw tapped waypoints and the connecting polyline
  var MEASURE_ROUTE_SOURCE = 'measure-route-source';
  var MEASURE_ROUTE_LAYER = 'measure-route-layer';
  var MEASURE_POINTS_SOURCE = 'measure-points-source';
  var MEASURE_POINTS_LAYER = 'measure-points-layer';
  var MEASURE_ROUTE_COLOR = '#f97316'; // orange
  var measureModeActive = false;
  // Colours assigned to midpoints between the hex centre and each corner vertex,
  // cycling through: red, orange, yellow, blue, white, black.
  var MIDPOINT_COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#ffffff', '#000000'];
  // Route outline mode: when enabled (routes/[id] screen), border edges are
  // computed from tile count alone (outer-boundary only, ignoring level), and
  // the enclosed-area stroke is hidden.
  var routeOutlineMode = false;
  // ── Search highlight: red border for tiles matching the active search ─────
  var HEX_SEARCH_HIGHLIGHT_SOURCE = 'hex-search-highlight-source';
  var HEX_SEARCH_HIGHLIGHT_LAYER = 'hex-search-highlight-layer';
  var HEX_SEARCH_HIGHLIGHT_COLOR = '#ef4444'; // red
  // ── Route edit overlay: neighbor highlight + action labels ───────────────
  var ROUTE_EDIT_NEIGHBOR_SOURCE = 'route-edit-neighbor-source';
  var ROUTE_EDIT_NEIGHBOR_FILL_LAYER = 'route-edit-neighbor-fill';
  var ROUTE_EDIT_NEIGHBOR_STROKE_LAYER = 'route-edit-neighbor-stroke';
  var ROUTE_EDIT_LABELS_SOURCE = 'route-edit-labels-source';
  var ROUTE_EDIT_LABELS_LAYER = 'route-edit-labels';

  // ── Empty FeatureCollection used as initial / cleared state ───────────────
  var EMPTY_FC = { type: 'FeatureCollection', features: [] };

  // ── Build GeoJSON FeatureCollection of unique hex polygon vertices ───────
  // Extracts every corner point from the polygon rings and deduplicates them.
  // Used to render green dots at all hex tile corner positions.
  function buildVerticesGeoJson(features) {
    var PRECISION = 6;
    var seen = {};
    var points = [];
    for (var i = 0; i < features.length; i++) {
      var ring = features[i].geometry && features[i].geometry.coordinates && features[i].geometry.coordinates[0];
      if (!ring) continue;
      // Polygon rings are closed (last vertex === first); skip the last to avoid duplicates.
      for (var j = 0; j < ring.length - 1; j++) {
        var key = ring[j][0].toFixed(PRECISION) + ',' + ring[j][1].toFixed(PRECISION);
        if (!seen[key]) {
          seen[key] = true;
          points.push({ type: 'Feature', geometry: { type: 'Point', coordinates: ring[j] }, properties: {} });
        }
      }
    }
    return { type: 'FeatureCollection', features: points };
  }

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
      // Interior border: shared by exactly two tiles, one level-0 and one level>0.
      // Outer boundary: the edge belongs to only one tile in the viewport (count===1)
      // because the neighbouring tile lies outside the rendered disk – that
      // neighbour is implicitly unvisited (level 0), so the edge is still a border.
      var isInteriorBorder = entry.count === 2 && entry.minLevel === 0 && entry.maxLevel > 0;
      var isOuterBorder = entry.count === 1 && entry.maxLevel > 0;
      if (isInteriorBorder || isOuterBorder) {
        borderFeatures.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: entry.coords },
          properties: {},
        });
      }
    }

    return { type: 'FeatureCollection', features: borderFeatures };
  }

  // ── Compute route-tile outer-boundary edges ───────────────────────────────
  // Returns a GeoJSON FeatureCollection of LineString features for every edge
  // that belongs to exactly ONE tile in the provided feature set (i.e. the
  // outer perimeter of the tile group). Level is ignored so this works even
  // when all tiles share the same level value.
  function buildRouteBorderEdges(features) {
    var PRECISION = 6;
    function edgeKey(v1, v2) {
      var s1 = v1[0].toFixed(PRECISION) + ',' + v1[1].toFixed(PRECISION);
      var s2 = v2[0].toFixed(PRECISION) + ',' + v2[1].toFixed(PRECISION);
      return s1 < s2 ? s1 + '|' + s2 : s2 + '|' + s1;
    }
    var edgeCount = {};
    var edgeCoords = {};
    for (var i = 0; i < features.length; i++) {
      var ring = features[i].geometry && features[i].geometry.coordinates && features[i].geometry.coordinates[0];
      if (!ring) continue;
      for (var j = 0; j < ring.length - 1; j++) {
        var key = edgeKey(ring[j], ring[j + 1]);
        edgeCoords[key] = [ring[j], ring[j + 1]];
        edgeCount[key] = (edgeCount[key] || 0) + 1;
      }
    }
    var borderFeatures = [];
    for (var k in edgeCount) {
      if (edgeCount[k] === 1) {
        borderFeatures.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: edgeCoords[k] },
          properties: {},
        });
      }
    }
    return { type: 'FeatureCollection', features: borderFeatures };
  }

  // ── Build GeoJSON FeatureCollection of hex polygon centroids ─────────────
  // Computes the centroid of each polygon by averaging its vertices (excluding
  // the closing duplicate). The result is a Point feature at the exact centre
  // of each hex tile, used to render a small purple dot per hexagon.
  function buildCentersGeoJson(features) {
    var points = [];
    for (var i = 0; i < features.length; i++) {
      var feature = features[i];
      var ring = feature.geometry && feature.geometry.coordinates && feature.geometry.coordinates[0];
      if (!ring || ring.length < 2) continue;
      // Polygon rings are closed (last === first); exclude the last vertex.
      var n = ring.length - 1;
      var sumLng = 0, sumLat = 0;
      for (var j = 0; j < n; j++) {
        sumLng += ring[j][0];
        sumLat += ring[j][1];
      }
      points.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [sumLng / n, sumLat / n] },
        properties: {},
      });
    }
    return { type: 'FeatureCollection', features: points };
  }

  // ── Build GeoJSON FeatureCollection of midpoints between centre and corners ─
  // For each hex polygon, computes the centroid and then the midpoint between
  // the centroid and each of the 6 corner vertices. Each midpoint is assigned
  // one of six colours in order: red, orange, yellow, blue, white, black.
  function buildMidpointsGeoJson(features) {
    var points = [];
    for (var i = 0; i < features.length; i++) {
      var feature = features[i];
      var ring = feature.geometry && feature.geometry.coordinates && feature.geometry.coordinates[0];
      if (!ring || ring.length < 2) continue;
      // Polygon rings are closed (last === first); exclude the last vertex.
      var n = ring.length - 1;
      var sumLng = 0, sumLat = 0;
      for (var j = 0; j < n; j++) {
        sumLng += ring[j][0];
        sumLat += ring[j][1];
      }
      var centerLng = sumLng / n;
      var centerLat = sumLat / n;
      for (var j = 0; j < n; j++) {
        var color = MIDPOINT_COLORS[j % MIDPOINT_COLORS.length];
        points.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [(centerLng + ring[j][0]) / 2, (centerLat + ring[j][1]) / 2],
          },
          properties: { midpointColor: color },
        });
      }
    }
    return { type: 'FeatureCollection', features: points };
  }

  // ── Measure route layer ───────────────────────────────────────────────────
  // Draws the tapped waypoints (circles) and connecting polyline for measure mode.
  function updateMeasureRouteLayer(coords) {
    if (!map) return;
    var fc = {
      type: 'FeatureCollection',
      features: coords && coords.length >= 2 ? [{
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coords },
        properties: {}
      }] : []
    };
    if (map.getSource(MEASURE_ROUTE_SOURCE)) {
      map.getSource(MEASURE_ROUTE_SOURCE).setData(fc);
    } else {
      map.addSource(MEASURE_ROUTE_SOURCE, { type: 'geojson', data: fc });
      map.addLayer({
        id: MEASURE_ROUTE_LAYER,
        type: 'line',
        source: MEASURE_ROUTE_SOURCE,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': MEASURE_ROUTE_COLOR,
          'line-width': 3,
          'line-dasharray': [2, 1],
          'line-opacity': 0.9,
        }
      });
    }
  }

  function updateMeasurePointsLayer(points) {
    if (!map) return;
    var features = (points || []).map(function(p) {
      return { type: 'Feature', geometry: { type: 'Point', coordinates: p }, properties: {} };
    });
    var fc = { type: 'FeatureCollection', features: features };
    if (map.getSource(MEASURE_POINTS_SOURCE)) {
      map.getSource(MEASURE_POINTS_SOURCE).setData(fc);
    } else {
      map.addSource(MEASURE_POINTS_SOURCE, { type: 'geojson', data: fc });
      map.addLayer({
        id: MEASURE_POINTS_LAYER,
        type: 'circle',
        source: MEASURE_POINTS_SOURCE,
        paint: {
          'circle-radius': 6,
          'circle-color': MEASURE_ROUTE_COLOR,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 1,
        }
      });
    }
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
  // ── Route edit overlay layers ─────────────────────────────────────────────
  // Added lazily when the first routeEditLabels/routeEditNeighbors message
  // arrives so they are always rendered on top of the base hex tile layers.
  function addRouteEditLayers() {
    if (!map || map.getSource(ROUTE_EDIT_NEIGHBOR_SOURCE)) return;
    map.addSource(ROUTE_EDIT_NEIGHBOR_SOURCE, { type: 'geojson', data: EMPTY_FC });
    map.addLayer({
      id: ROUTE_EDIT_NEIGHBOR_FILL_LAYER,
      type: 'fill',
      source: ROUTE_EDIT_NEIGHBOR_SOURCE,
      paint: {
        'fill-color': '#3b82f6',
        'fill-opacity': 0.45,
      },
    });
    map.addLayer({
      id: ROUTE_EDIT_NEIGHBOR_STROKE_LAYER,
      type: 'line',
      source: ROUTE_EDIT_NEIGHBOR_SOURCE,
      paint: {
        'line-color': '#1d4ed8',
        'line-width': 2,
        'line-opacity': 0.9,
      },
    });
    map.addSource(ROUTE_EDIT_LABELS_SOURCE, { type: 'geojson', data: EMPTY_FC });
    map.addLayer({
      id: ROUTE_EDIT_LABELS_LAYER,
      type: 'symbol',
      source: ROUTE_EDIT_LABELS_SOURCE,
      layout: {
        'text-field': ['get', 'label'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 9, 12, 13, 18, 16, 24],
        'text-anchor': 'center',
        'text-allow-overlap': true,
        'text-ignore-placement': true,
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#000000',
        'text-halo-width': 2,
      },
    });
  }

  function removeRouteEditLayers() {
    if (!map) return;
    if (map.getLayer(ROUTE_EDIT_LABELS_LAYER)) map.removeLayer(ROUTE_EDIT_LABELS_LAYER);
    if (map.getSource(ROUTE_EDIT_LABELS_SOURCE)) map.removeSource(ROUTE_EDIT_LABELS_SOURCE);
    if (map.getLayer(ROUTE_EDIT_NEIGHBOR_STROKE_LAYER)) map.removeLayer(ROUTE_EDIT_NEIGHBOR_STROKE_LAYER);
    if (map.getLayer(ROUTE_EDIT_NEIGHBOR_FILL_LAYER)) map.removeLayer(ROUTE_EDIT_NEIGHBOR_FILL_LAYER);
    if (map.getSource(ROUTE_EDIT_NEIGHBOR_SOURCE)) map.removeSource(ROUTE_EDIT_NEIGHBOR_SOURCE);
  }

  function addHexTileLayer() {
    if (!map || map.getSource(HEX_TILE_SOURCE)) return;
    // Enclosed area layer rendered first (below the main hex tile fill)
    map.addSource(HEX_ENCLOSED_SOURCE, { type: 'geojson', data: EMPTY_FC });
    map.addLayer({
      id: HEX_ENCLOSED_FILL_LAYER,
      type: 'fill',
      source: HEX_ENCLOSED_SOURCE,
      paint: { 'fill-color': HEX_ENCLOSED_FILL_COLOR, 'fill-opacity': 1 },
    });
    map.addLayer({
      id: HEX_ENCLOSED_STROKE_LAYER,
      type: 'line',
      source: HEX_ENCLOSED_SOURCE,
      paint: {
        'line-color': HEX_ENCLOSED_STROKE_COLOR,
        'line-width': 0.5,
        'line-opacity': routeOutlineMode ? 0 : 0.4,
      },
    });
    map.addSource(HEX_TILE_SOURCE, { type: 'geojson', data: EMPTY_FC });
    map.addLayer({
      id: HEX_TILE_FILL_LAYER,
      type: 'fill',
      source: HEX_TILE_SOURCE,
      paint: {
        'fill-color': ['case',
          ['has', 'colorIndex'],
          ['match', ['get', 'colorIndex'],
            0, '#ffffff',
            1, '#ef4444',
            2, '#eab308',
            3, '#22c55e',
            4, '#3b82f6',
            5, '#a855f7',
            6, '#f97316',
            '#ffffff'
          ],
          ['case',
            ['==', ['get', 'level'], 0], hexTileColor,
            ['interpolate', ['linear'], ['get', 'level'],
              1, HEX_COLOR_LEVEL_MIN,
              10, HEX_COLOR_LEVEL_MAX
            ]
          ]
        ],
        'fill-opacity': ['case',
          ['has', 'colorIndex'],
          0.75,
          ['case',
            ['==', ['get', 'level'], 0], 0,
            ['interpolate', ['linear'], ['get', 'level'],
              1, HEX_OPACITY_LEVEL_MIN,
              10, HEX_OPACITY_LEVEL_MAX
            ]
          ]
        ],
      },
    });
    map.addLayer({
      id: HEX_TILE_STROKE_LAYER,
      type: 'line',
      source: HEX_TILE_SOURCE,
      paint: {
        'line-color': hexTileStrokeColor,
        'line-width': ['interpolate', ['linear'], ['zoom'], 9, 2.8 * HEX_LINE_WIDTH_SCALE, 12, 2.0 * HEX_LINE_WIDTH_SCALE, 15, 1.4 * HEX_LINE_WIDTH_SCALE],
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0.5 * HEX_LINE_OPACITY_SCALE, 12, 0.4 * HEX_LINE_OPACITY_SCALE, 15, 0.3 * HEX_LINE_OPACITY_SCALE],
      },
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
    // Hex tile corner vertices: green dots at every polygon vertex
    map.addSource(HEX_VERTICES_SOURCE, { type: 'geojson', data: EMPTY_FC });
    map.addLayer({
      id: HEX_VERTICES_LAYER,
      type: 'circle',
      source: HEX_VERTICES_SOURCE,
      layout: { visibility: hexDebugPointsVisible ? 'visible' : 'none' },
      paint: {
        'circle-radius': 4,
        'circle-color': '#22c55e',
        'circle-stroke-width': 1,
        'circle-stroke-color': '#166534',
        'circle-opacity': 0.9,
      },
    });
    // Hex tile centres: small purple dot at the exact centre of each hexagon
    map.addSource(HEX_CENTERS_SOURCE, { type: 'geojson', data: EMPTY_FC });
    map.addLayer({
      id: HEX_CENTERS_LAYER,
      type: 'circle',
      source: HEX_CENTERS_SOURCE,
      layout: { visibility: hexDebugPointsVisible ? 'visible' : 'none' },
      paint: {
        'circle-radius': 5,
        'circle-color': '#a855f7',
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#6b21a8',
        'circle-opacity': 0.9,
      },
    });
    // Hex tile midpoints: coloured dots halfway between centre and each corner
    // Colours cycle through red, orange, yellow, blue, white, black per vertex.
    map.addSource(HEX_MIDPOINTS_SOURCE, { type: 'geojson', data: EMPTY_FC });
    map.addLayer({
      id: HEX_MIDPOINTS_LAYER,
      type: 'circle',
      source: HEX_MIDPOINTS_SOURCE,
      layout: { visibility: hexDebugPointsVisible ? 'visible' : 'none' },
      paint: {
        'circle-radius': 4,
        'circle-color': ['get', 'midpointColor'],
        'circle-stroke-width': 1,
        'circle-stroke-color': 'rgba(0, 0, 0, 0.5)',
        'circle-opacity': 0.9,
      },
    });
    // Search highlight: red border drawn on top of hex tiles for tiles matching
    // the active debug search filter. Raised above hex layers but below routes.
    map.addSource(HEX_SEARCH_HIGHLIGHT_SOURCE, { type: 'geojson', data: EMPTY_FC });
    map.addLayer({
      id: HEX_SEARCH_HIGHLIGHT_LAYER,
      type: 'line',
      source: HEX_SEARCH_HIGHLIGHT_SOURCE,
      paint: {
        'line-color': HEX_SEARCH_HIGHLIGHT_COLOR,
        'line-width': 3,
        'line-opacity': 0.9,
      },
    });
    // Raise any route track / segment layers above the hex tile layers so the
    // GPS route is always rendered on top of the hex grid.  These layers are
    // created lazily (only once the first routeCoordinates message arrives), so
    // they may not exist yet – the guard keeps this a no-op in that case.
    var ROUTE_LAYER_IDS = [
      'route-track-layer-border',
      'route-track-layer',
      'route-seg-border-layer',
      'route-seg-color-layer',
    ];
    for (var ri = 0; ri < ROUTE_LAYER_IDS.length; ri++) {
      if (map.getLayer(ROUTE_LAYER_IDS[ri])) map.moveLayer(ROUTE_LAYER_IDS[ri]);
    }
    // Raise the billboard 3D layer above hex tile layers so billboards are
    // always rendered on top of the grid, even after hex tile layer recreation.
    // NOTE: Must match BILLBOARD_LAYER_ID in the MapLibre HTML (index.html).
    var BILLBOARD_LAYER_REF = 'billboard-3d-layer';
    if (map.getLayer(BILLBOARD_LAYER_REF)) {
      map.moveLayer(BILLBOARD_LAYER_REF);
    }
    notifyViewport();
  }

  function removeHexTileLayer() {
    if (!map) return;
    if (map.getLayer(HEX_CENTERS_LAYER)) map.removeLayer(HEX_CENTERS_LAYER);
    if (map.getSource(HEX_CENTERS_SOURCE)) map.removeSource(HEX_CENTERS_SOURCE);
    if (map.getLayer(HEX_MIDPOINTS_LAYER)) map.removeLayer(HEX_MIDPOINTS_LAYER);
    if (map.getSource(HEX_MIDPOINTS_SOURCE)) map.removeSource(HEX_MIDPOINTS_SOURCE);
    if (map.getLayer(HEX_VERTICES_LAYER)) map.removeLayer(HEX_VERTICES_LAYER);
    if (map.getSource(HEX_VERTICES_SOURCE)) map.removeSource(HEX_VERTICES_SOURCE);
    if (map.getLayer(HEX_WALK_PATH_LAYER)) map.removeLayer(HEX_WALK_PATH_LAYER);
    if (map.getSource(HEX_WALK_PATH_SOURCE)) map.removeSource(HEX_WALK_PATH_SOURCE);
    if (map.getLayer(HEX_BORDER_LAYER)) map.removeLayer(HEX_BORDER_LAYER);
    if (map.getSource(HEX_BORDER_SOURCE)) map.removeSource(HEX_BORDER_SOURCE);
    if (map.getLayer(HEX_TILE_STROKE_LAYER)) map.removeLayer(HEX_TILE_STROKE_LAYER);
    if (map.getLayer(HEX_TILE_FILL_LAYER)) map.removeLayer(HEX_TILE_FILL_LAYER);
    if (map.getSource(HEX_TILE_SOURCE)) map.removeSource(HEX_TILE_SOURCE);
    if (map.getLayer(HEX_ENCLOSED_STROKE_LAYER)) map.removeLayer(HEX_ENCLOSED_STROKE_LAYER);
    if (map.getLayer(HEX_ENCLOSED_FILL_LAYER)) map.removeLayer(HEX_ENCLOSED_FILL_LAYER);
    if (map.getSource(HEX_ENCLOSED_SOURCE)) map.removeSource(HEX_ENCLOSED_SOURCE);
    if (map.getLayer(HEX_SEARCH_HIGHLIGHT_LAYER)) map.removeLayer(HEX_SEARCH_HIGHLIGHT_LAYER);
    if (map.getSource(HEX_SEARCH_HIGHLIGHT_SOURCE)) map.removeSource(HEX_SEARCH_HIGHLIGHT_SOURCE);
  }

  // ── Replay Animation (Rückblenden-Modus) ─────────────────────────────────
  //
  // ZUSAMMENFASSUNG DER BISHERIGEN VERSUCHE (warum der Marker sich nicht bewegt hat):
  //
  // Versuch 1 (PR #2457, #2460): Die Animation lief auf der React-Native-Seite
  //   per setTimeout-Kette. Jedes Frame sendete einzeln userLocation + userHeading
  //   über die React-Native ↔ WebView-Bridge. Die Kamera folgte per easeTo.
  //   Problem: Die auto-rotate Funktion (setBearing in einer Schleife) hat die
  //   camera-follow easeTo-Animationen kontinuierlich abgebrochen, sodass der
  //   Marker optisch stehen blieb.
  //
  // Versuch 2 (PR #2463): Die Kamera wurde auf fitBounds (Übersicht der ganzen
  //   Route) umgestellt, statt der Kamera dem Marker zu folgen. Die Animation
  //   lief weiterhin per React-Native setTimeout + userLocation-Messages.
  //   Problem: Bei Overview-Zoom (fitBounds) ist die Positionsänderung pro Frame
  //   sub-pixel (<0.03 px/Frame), sodass der Marker visuell stehen bleibt.
  //
  // Versuch 3 (PR #2466): Die Animation wurde in die WebView verschoben
  //   (hexTileScript, setInterval + source.setData, Timestamp-basiert). Dazu
  //   wurde auch in index.html eine zweite Replay-Animation mit
  //   CAR_SPEED_DEG_PER_FRAME (räumliche Geschwindigkeit) eingebaut.
  //   Problem: Die index.html-Version hatte einen Bug (replayParticle wurde durch
  //   removeReplayLayer() auf null gesetzt bevor addReplayLayer() aufgerufen
  //   wurde), sodass sie nie gerendert wurde. Die hexTileScript-Version war
  //   korrekt, aber die [id].tsx-Seite sendete fitBounds (Overview-Zoom) → wieder
  //   sub-pixel Bewegung, visuell unsichtbar.
  //
  // Versuch 4 (PR #2469): Weitere Duplicate-Replay-Code in index.html mit
  //   falschem Algorithmus (CAR_SPEED_DEG_PER_FRAME statt Zeitstempel).
  //   Gleicher Bug: replayParticle = null vor addReplayLayer. Gleiche Konsequenz.
  //
  // AKTUELLE LÖSUNG:
  //   - Der doppelte Replay-Code in index.html wurde entfernt (war toter Code).
  //   - Die Animation läuft nur hier in hexTileScript mit Timestamp-Interpolation.
  //   - Die Kamera bleibt beim Replay-Start unverändert (kein flyTo/easeTo).
  //     Der Marker bewegt sich auf der Karte, aber die Kamera dreht sich wie im
  //     Übersichtsmodus weiterhin automatisch um die Route-Mitte (auto-rotate).
  //   - [id].tsx sendet weiterhin fitBounds für die Übersicht; die Kamera
  //     wird nach dem Replay-Start nicht vom WebView verändert.
  //
  var REPLAY_PLAYER_SOURCE = 'replay-player-source';
  var REPLAY_PLAYER_LAYER = 'replay-player-layer';
  var REPLAY_PLAYER_COLOR = '#7c3aed';
  var REPLAY_PLAYER_RADIUS = 8;
  var REPLAY_PLAYER_STROKE_COLOR = '#ffffff';
  var REPLAY_PLAYER_STROKE_WIDTH = 2;
  var REPLAY_ANIM_MS = 50; // ~20 fps

  var replayAnimInterval = null;
  var replayAnimState = null;

  function replayPointToGeoJSON(lng, lat) {
    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: {}
      }]
    };
  }

  /** Returns compass bearing in degrees (0-360) from point A to point B. */
  function replayBearingTo(lat1, lng1, lat2, lng2) {
    var toRad = Math.PI / 180;
    var phi1 = lat1 * toRad;
    var phi2 = lat2 * toRad;
    var dLambda = (lng2 - lng1) * toRad;
    var y = Math.sin(dLambda) * Math.cos(phi2);
    var x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
    return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
  }

  function stopReplayAnimation() {
    if (replayAnimInterval) { clearInterval(replayAnimInterval); replayAnimInterval = null; }
    replayAnimState = null;
    if (map) {
      if (map.getLayer(REPLAY_PLAYER_LAYER)) map.removeLayer(REPLAY_PLAYER_LAYER);
      if (map.getSource(REPLAY_PLAYER_SOURCE)) map.removeSource(REPLAY_PLAYER_SOURCE);
    }
  }

  function startReplayAnimation(points, speed) {
    stopReplayAnimation();
    if (!points || points.length < 2 || !map) return;
    var duration = points[points.length - 1].timestamp - points[0].timestamp;
    if (duration <= 0) return;
    replayAnimState = {
      points: points,
      speed: speed,
      startWallTime: Date.now(),
      startReplayTime: points[0].timestamp,
      duration: duration,
    };
    var geojson = replayPointToGeoJSON(points[0].lng, points[0].lat);
    if (map.getSource(REPLAY_PLAYER_SOURCE)) {
      map.getSource(REPLAY_PLAYER_SOURCE).setData(geojson);
    } else {
      map.addSource(REPLAY_PLAYER_SOURCE, { type: 'geojson', data: geojson });
      map.addLayer({
        id: REPLAY_PLAYER_LAYER,
        type: 'circle',
        source: REPLAY_PLAYER_SOURCE,
        paint: {
          'circle-radius': REPLAY_PLAYER_RADIUS,
          'circle-color': REPLAY_PLAYER_COLOR,
          'circle-opacity': 0.9,
          'circle-stroke-width': REPLAY_PLAYER_STROKE_WIDTH,
          'circle-stroke-color': REPLAY_PLAYER_STROKE_COLOR,
        },
      });
    }
    // Do not move the camera when replay starts. The map stays at the overview
    // fitBounds position so the auto-rotate continues to spin around the route
    // center, exactly as in the non-replay overview mode.
    replayAnimInterval = setInterval(function () {
      if (!replayAnimState || !map || !map.getSource(REPLAY_PLAYER_SOURCE)) return;
      var pts = replayAnimState.points;
      var dur = replayAnimState.duration;
      var elapsed = Date.now() - replayAnimState.startWallTime;
      var replayOffset = (elapsed * replayAnimState.speed) % dur;
      var replayTime = replayAnimState.startReplayTime + replayOffset;
      // Binary search for the segment containing replayTime
      var lo = 0, hi = pts.length - 2;
      while (lo < hi) {
        var mid = Math.floor((lo + hi + 1) / 2);
        if (pts[mid].timestamp <= replayTime) { lo = mid; } else { hi = mid - 1; }
      }
      var p1 = pts[lo];
      var p2 = pts[lo + 1] || p1;
      var segDur = p2.timestamp - p1.timestamp;
      var t = segDur > 0 ? (replayTime - p1.timestamp) / segDur : 0;
      t = Math.max(0, Math.min(1, t));
      var lng = p1.lng + (p2.lng - p1.lng) * t;
      var lat = p1.lat + (p2.lat - p1.lat) * t;
      // Only update the marker position. The camera is not moved so the
      // auto-rotate keeps spinning around the map center (overview behaviour).
      map.getSource(REPLAY_PLAYER_SOURCE).setData(replayPointToGeoJSON(lng, lat));
    }, REPLAY_ANIM_MS);
  }
  // ─────────────────────────────────────────────────────────────────────────

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
        if (typeof data.hexTileLayer.opacityMax === 'number') {
          HEX_OPACITY_LEVEL_MAX = data.hexTileLayer.opacityMax;
          HEX_OPACITY_LEVEL_MIN = data.hexTileLayer.opacityMax * 0.7;
        }
        if (typeof data.hexTileLayer.lineOpacity === 'number') {
          HEX_LINE_OPACITY_SCALE = Math.min(1, Math.max(0, data.hexTileLayer.lineOpacity));
        }
        if (typeof data.hexTileLayer.lineWidth === 'number') {
          HEX_LINE_WIDTH_SCALE = Math.min(3, Math.max(0, data.hexTileLayer.lineWidth));
        }
        hexTileActive = true;
        removeHexTileLayer();
        addHexTileLayer();
      } else {
        hexTileActive = false;
        removeHexTileLayer();
      }
      return;
    }
    if (data.hexTileOpacity !== undefined) {
      var newMax = Math.min(1, Math.max(0, data.hexTileOpacity));
      HEX_OPACITY_LEVEL_MAX = newMax;
      HEX_OPACITY_LEVEL_MIN = newMax * 0.7;
      if (map && map.getLayer(HEX_TILE_FILL_LAYER)) {
        map.setPaintProperty(HEX_TILE_FILL_LAYER, 'fill-opacity', ['case',
          ['has', 'colorIndex'],
          0.75,
          ['case',
            ['==', ['get', 'level'], 0], 0,
            ['interpolate', ['linear'], ['get', 'level'],
              1, HEX_OPACITY_LEVEL_MIN,
              10, HEX_OPACITY_LEVEL_MAX
            ]
          ]
        ]);
      }
      return;
    }
    if (data.hexLineOpacity !== undefined) {
      HEX_LINE_OPACITY_SCALE = Math.min(1, Math.max(0, data.hexLineOpacity));
      if (map && map.getLayer(HEX_TILE_STROKE_LAYER)) {
        map.setPaintProperty(HEX_TILE_STROKE_LAYER, 'line-opacity', ['interpolate', ['linear'], ['zoom'],
          9, 0.5 * HEX_LINE_OPACITY_SCALE,
          12, 0.4 * HEX_LINE_OPACITY_SCALE,
          15, 0.3 * HEX_LINE_OPACITY_SCALE
        ]);
      }
      return;
    }
    if (data.hexLineWidth !== undefined) {
      HEX_LINE_WIDTH_SCALE = Math.min(3, Math.max(0, data.hexLineWidth));
      if (map && map.getLayer(HEX_TILE_STROKE_LAYER)) {
        map.setPaintProperty(HEX_TILE_STROKE_LAYER, 'line-width', ['interpolate', ['linear'], ['zoom'],
          9, 2.8 * HEX_LINE_WIDTH_SCALE,
          12, 2.0 * HEX_LINE_WIDTH_SCALE,
          15, 1.4 * HEX_LINE_WIDTH_SCALE
        ]);
      }
      return;
    }
    if (data.hexRouteOutlineMode !== undefined) {
      routeOutlineMode = !!data.hexRouteOutlineMode;
      if (map && map.getLayer(HEX_ENCLOSED_STROKE_LAYER)) {
        map.setPaintProperty(HEX_ENCLOSED_STROKE_LAYER, 'line-opacity', routeOutlineMode ? 0 : 0.4);
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
      if (borderSrc) borderSrc.setData(routeOutlineMode ? buildRouteBorderEdges(fc.features || []) : buildBorderEdges(fc.features || []));
      // Update green corner-vertex dots
      var verticesSrc = map && map.getSource(HEX_VERTICES_SOURCE);
      if (verticesSrc) verticesSrc.setData(buildVerticesGeoJson(fc.features || []));
      // Update purple centre dots
      var centersSrc = map && map.getSource(HEX_CENTERS_SOURCE);
      if (centersSrc) centersSrc.setData(buildCentersGeoJson(fc.features || []));
      // Update midpoint dots between centre and each corner
      var midpointsSrc = map && map.getSource(HEX_MIDPOINTS_SOURCE);
      if (midpointsSrc) midpointsSrc.setData(buildMidpointsGeoJson(fc.features || []));
    }
    if (data.hexWalkPathGeoJson !== undefined) {
      if (!hexTileActive) return;
      var walkSrc = map && map.getSource(HEX_WALK_PATH_SOURCE);
      if (walkSrc) walkSrc.setData(data.hexWalkPathGeoJson || EMPTY_FC);
    }
    if (data.hexEnclosedGeoJson !== undefined) {
      if (!hexTileActive) return;
      var enclosedSrc = map && map.getSource(HEX_ENCLOSED_SOURCE);
      if (enclosedSrc) enclosedSrc.setData(data.hexEnclosedGeoJson || EMPTY_FC);
    }
    if (data.hexSearchHighlightGeoJson !== undefined) {
      var searchSrc = map && map.getSource(HEX_SEARCH_HIGHLIGHT_SOURCE);
      if (searchSrc) searchSrc.setData(data.hexSearchHighlightGeoJson || EMPTY_FC);
    }
    if (data.hexDebugPoints !== undefined) {
      hexDebugPointsVisible = data.hexDebugPoints;
      var visibility = hexDebugPointsVisible ? 'visible' : 'none';
      var debugLayers = [HEX_VERTICES_LAYER, HEX_CENTERS_LAYER, HEX_MIDPOINTS_LAYER];
      for (var di = 0; di < debugLayers.length; di++) {
        if (map && map.getLayer(debugLayers[di])) {
          map.setLayoutProperty(debugLayers[di], 'visibility', visibility);
        }
      }
    }
    if (data.routeEditLabels !== undefined) {
      if (!map) return;
      if (!map.getSource(ROUTE_EDIT_LABELS_SOURCE)) addRouteEditLayers();
      var editLabelsSrc = map.getSource(ROUTE_EDIT_LABELS_SOURCE);
      if (editLabelsSrc) editLabelsSrc.setData(data.routeEditLabels || EMPTY_FC);
      // Clearing labels also clears neighbors (edit mode exited)
      if (!data.routeEditLabels) {
        var clearNeighborSrc = map.getSource(ROUTE_EDIT_NEIGHBOR_SOURCE);
        if (clearNeighborSrc) clearNeighborSrc.setData(EMPTY_FC);
      }
      return;
    }
    if (data.routeEditNeighbors !== undefined) {
      if (!map) return;
      if (!map.getSource(ROUTE_EDIT_NEIGHBOR_SOURCE)) addRouteEditLayers();
      var editNeighborSrc = map.getSource(ROUTE_EDIT_NEIGHBOR_SOURCE);
      if (editNeighborSrc) editNeighborSrc.setData(data.routeEditNeighbors || EMPTY_FC);
      return;
    }
    if (data.measureMode !== undefined) {
      measureModeActive = data.measureMode;
      if (!measureModeActive) {
        updateMeasureRouteLayer([]);
        updateMeasurePointsLayer([]);
      }
    }
    if (data.measureRouteCoords !== undefined) {
      updateMeasureRouteLayer(data.measureRouteCoords);
    }
    if (data.measurePoints !== undefined) {
      updateMeasurePointsLayer(data.measurePoints);
    }
    // ── Batch tile-feature query ─────────────────────────────────────────
    // Receives an array of { id, polygon: [[lng,lat], ...] } objects,
    // projects each polygon to screen space, queries all rendered map
    // features within the bounding box and returns the results grouped by id.
    if (data.queryTileFeatures) {
      var req = data.queryTileFeatures;
      var requestId = req.requestId || '';
      var tiles = req.tiles || [];
      if (!map) { sendToRN({ tag: 'TileFeaturesResult', requestId: requestId, features: {} }); return; }
      var hexOverlayLayersQuery = {};
      hexOverlayLayersQuery[HEX_TILE_FILL_LAYER] = true;
      hexOverlayLayersQuery[HEX_TILE_STROKE_LAYER] = true;
      hexOverlayLayersQuery[HEX_BORDER_LAYER] = true;
      hexOverlayLayersQuery[HEX_WALK_PATH_LAYER] = true;
      hexOverlayLayersQuery[HEX_VERTICES_LAYER] = true;
      hexOverlayLayersQuery[HEX_CENTERS_LAYER] = true;
      hexOverlayLayersQuery[HEX_MIDPOINTS_LAYER] = true;
      hexOverlayLayersQuery[MEASURE_ROUTE_LAYER] = true;
      hexOverlayLayersQuery[MEASURE_POINTS_LAYER] = true;
      hexOverlayLayersQuery[ROUTE_EDIT_NEIGHBOR_FILL_LAYER] = true;
      hexOverlayLayersQuery[ROUTE_EDIT_NEIGHBOR_STROKE_LAYER] = true;
      hexOverlayLayersQuery[ROUTE_EDIT_LABELS_LAYER] = true;

      var result = {};
      for (var ti = 0; ti < tiles.length; ti++) {
        var tile = tiles[ti];
        var tileId = tile.id;
        var poly = tile.polygon;
        if (!poly || poly.length === 0) { result[tileId] = []; continue; }

        var qMinX = Infinity, qMinY = Infinity, qMaxX = -Infinity, qMaxY = -Infinity;
        for (var pi = 0; pi < poly.length; pi++) {
          var qPt = map.project([poly[pi][0], poly[pi][1]]);
          if (qPt.x < qMinX) qMinX = qPt.x;
          if (qPt.y < qMinY) qMinY = qPt.y;
          if (qPt.x > qMaxX) qMaxX = qPt.x;
          if (qPt.y > qMaxY) qMaxY = qPt.y;
        }

        var qRendered = map.queryRenderedFeatures([[qMinX, qMinY], [qMaxX, qMaxY]]);
        var qFeatures = [];
        var qSeen = {};
        for (var qi = 0; qi < qRendered.length; qi++) {
          var qf = qRendered[qi];
          if (qf.layer && hexOverlayLayersQuery[qf.layer.id]) continue;
          var qfp = qf.properties || {};
          var qKey = (qfp.name || '') + '|' + (qfp['class'] || '') + '|' + (qfp.subclass || '') + '|'
            + (qfp.highway || '') + '|' + (qfp.waterway || '') + '|'
            + (qfp.building || '') + '|' + (qfp.natural || '') + '|' + (qfp.landuse || '') + '|'
            + (qfp.amenity || '') + '|' + ((qf.layer && qf.layer.id) || '');
          if (qSeen[qKey]) continue;
          qSeen[qKey] = true;
          qFeatures.push({
            layerId: (qf.layer && qf.layer.id) || null,
            name: qfp.name || qfp['name:de'] || null,
            'class': qfp['class'] || null,
            subclass: qfp.subclass || null,
            highway: qfp.highway || null,
            waterway: qfp.waterway || null,
            building: qfp.building || null,
            natural: qfp.natural || null,
            landuse: qfp.landuse || null,
            amenity: qfp.amenity || null,
          });
        }
        result[tileId] = qFeatures;
      }
      sendToRN({ tag: 'TileFeaturesResult', requestId: requestId, features: result });
    }
    if (data.replayAnimation !== undefined) {
      if (data.replayAnimation) {
        startReplayAnimation(data.replayAnimation.points, data.replayAnimation.speed);
      } else {
        stopReplayAnimation();
      }
    }
  };

  window._mapExtensions.onMapClick = function (e, m) {
    // Measure mode: capture tap coordinates and send back to React Native
    if (measureModeActive) {
      sendToRN({ tag: 'MapMeasurePoint', lat: e.lngLat.lat, lng: e.lngLat.lng });
      return true;
    }
    // Route edit neighbor layer takes priority: tapping a highlighted candidate
    // tile fires HexNeighborClicked so the React Native side can insert it.
    if (m.getSource(ROUTE_EDIT_NEIGHBOR_SOURCE) && m.getLayer(ROUTE_EDIT_NEIGHBOR_FILL_LAYER)) {
      var neighborFeatures = m.queryRenderedFeatures(e.point, { layers: [ROUTE_EDIT_NEIGHBOR_FILL_LAYER] });
      if (neighborFeatures && neighborFeatures.length > 0) {
        var nProps = neighborFeatures[0].properties || {};
        sendToRN({ tag: 'HexNeighborClicked', h3Index: nProps.h3Index });
        return true;
      }
    }
    if (!hexTileActive || !m.getSource(HEX_TILE_SOURCE)) return false;
    var features = m.queryRenderedFeatures(e.point, { layers: [HEX_TILE_FILL_LAYER] });
    if (features && features.length > 0) {
      var props = features[0].properties || {};

      // Compute screen-space bounding box from the hex polygon geometry so we
      // query ALL map features that fall within the hexagon, not just at the
      // single click point.
      var hexOverlayLayers = {};
      hexOverlayLayers[HEX_TILE_FILL_LAYER] = true;
      hexOverlayLayers[HEX_TILE_STROKE_LAYER] = true;
      hexOverlayLayers[HEX_BORDER_LAYER] = true;
      hexOverlayLayers[HEX_WALK_PATH_LAYER] = true;
      hexOverlayLayers[HEX_VERTICES_LAYER] = true;
      hexOverlayLayers[HEX_CENTERS_LAYER] = true;
      hexOverlayLayers[HEX_MIDPOINTS_LAYER] = true;
      hexOverlayLayers[MEASURE_ROUTE_LAYER] = true;
      hexOverlayLayers[MEASURE_POINTS_LAYER] = true;
      hexOverlayLayers[ROUTE_EDIT_NEIGHBOR_FILL_LAYER] = true;
      hexOverlayLayers[ROUTE_EDIT_NEIGHBOR_STROKE_LAYER] = true;
      hexOverlayLayers[ROUTE_EDIT_LABELS_LAYER] = true;

      var allRendered;
      var geometry = features[0].geometry;
      var coords = geometry && geometry.coordinates && geometry.coordinates[0];
      if (coords && coords.length > 0) {
        var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (var ci = 0; ci < coords.length; ci++) {
          var pt = m.project([coords[ci][0], coords[ci][1]]);
          if (pt.x < minX) minX = pt.x;
          if (pt.y < minY) minY = pt.y;
          if (pt.x > maxX) maxX = pt.x;
          if (pt.y > maxY) maxY = pt.y;
        }
        allRendered = m.queryRenderedFeatures([[minX, minY], [maxX, maxY]]);
      } else {
        allRendered = m.queryRenderedFeatures(e.point);
      }

      var mapFeatures = [];
      var seen = {};
      for (var fi = 0; fi < allRendered.length; fi++) {
        var f = allRendered[fi];
        // Skip our own hex overlay layers
        if (f.layer && hexOverlayLayers[f.layer.id]) continue;
        var fp = f.properties || {};
        // Deduplicate by building a simple key from the interesting properties
        var dedupeKey = (fp.name || '') + '|' + (fp['class'] || '') + '|' + (fp.subclass || '') + '|'
          + (fp.highway || '') + '|' + (fp.waterway || '') + '|'
          + (fp.building || '') + '|' + (fp.natural || '') + '|' + (fp.landuse || '') + '|'
          + (fp.amenity || '') + '|' + ((f.layer && f.layer.id) || '');
        if (seen[dedupeKey]) continue;
        seen[dedupeKey] = true;
        mapFeatures.push({
          layerId: (f.layer && f.layer.id) || null,
          name: fp.name || fp['name:de'] || null,
          'class': fp['class'] || null,
          subclass: fp.subclass || null,
          highway: fp.highway || null,
          waterway: fp.waterway || null,
          building: fp.building || null,
          natural: fp.natural || null,
          landuse: fp.landuse || null,
          amenity: fp.amenity || null,
        });
      }
      sendToRN({ tag: 'HexTileClicked', h3Index: props.h3Index, mapFeatures: mapFeatures });
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
