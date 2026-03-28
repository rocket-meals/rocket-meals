/**
 * 3-D billboard overlay script for Geonexia.
 *
 * This self-contained IIFE is injected into the MapLibre map HTML **after** the
 * hex-tile script via the `injectScript` prop on the `MyMap` component.
 * It chains the existing `_mapExtensions` hooks so that both scripts cooperate.
 *
 * Instead of rendering billboards as MapLibre HTML Markers (DOM overlay), this
 * script creates a single THREE.js custom layer with `renderingMode: '3d'`.
 * Each billboard becomes a vertical plane mesh textured with the SVG sprite,
 * placed in Mercator coordinate space.  Benefits:
 *
 *   – Proper depth-testing: billboards occlude each other based on distance.
 *   – World-space sizing: billboard width equals the H3 hex width, so they
 *     shrink on zoom-out and grow on zoom-in (perspective projection).
 *   – Camera-facing: every render frame the planes rotate around the vertical
 *     axis so the texture always faces the viewer.
 *   – High quality: SVGs are rasterized to a 512×512 canvas texture, keeping
 *     crisp detail at typical zoom levels.
 *
 * React Native sends a `billboardData` message:
 *
 *   {
 *     billboardData: {
 *       hexEdgeMeters: number,         // H3 hex edge length in metres
 *       billboards: Array<{
 *         id: string,
 *         position: { lng: number, lat: number },
 *         svgDataUri: string,          // data:image/svg+xml;base64,…
 *         scaleFactor: number,         // relative to MAX_SCALE_FACTOR
 *         anchorY: number,             // 0 = top, 0.5 = center, 1 = bottom
 *         billboardScale: number,      // debug multiplier (default 1)
 *       }>
 *     }
 *   }
 */
export const BILLBOARD_SCRIPT = `
(function () {
  // ── Chain with existing _mapExtensions hooks ────────────────────────────
  var _prevOnMapReady = window._mapExtensions && window._mapExtensions.onMapReady;
  var _prevOnMessage  = window._mapExtensions && window._mapExtensions.onMessage;

  // ── Constants ───────────────────────────────────────────────────────────
  var BILLBOARD_LAYER_ID = 'billboard-3d-layer';
  var TEXTURE_SIZE       = 512;
  // Townhall scaleFactor is the reference maximum.
  var MAX_SCALE_FACTOR   = 7.0;

  // ── State ───────────────────────────────────────────────────────────────
  var bbScene     = null;
  var bbCamera    = null;
  var bbRenderer  = null;
  var bbMapInst   = null;
  var bbMeshes    = {};   // id → { mesh, texture, material, geometry, svgKey }
  var bbLayerAdded = false;
  // Generation counter – incremented on every updateBillboards call so that
  // stale async texture loads are discarded.
  var bbGeneration = 0;

  // ── SVG data-URI → THREE.CanvasTexture ──────────────────────────────────
  function loadSvgTexture(svgDataUri, callback) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      var c   = document.createElement('canvas');
      c.width  = TEXTURE_SIZE;
      c.height = TEXTURE_SIZE;
      var ctx = c.getContext('2d');
      ctx.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
      ctx.drawImage(img, 0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
      var tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;
      callback(tex);
    };
    img.onerror = function () {
      console.warn('[Billboard3D] Failed to load SVG texture');
      callback(null);
    };
    img.src = svgDataUri;
  }

  // ── Create a vertical billboard quad (BufferGeometry) ───────────────────
  // The quad is in the XZ plane (Y = 0), with:
  //   – width along X   (east/west in Mercator)
  //   – height along Z  (altitude / up in Mercator)
  //   – front face normal pointing +Y (south in Mercator → towards camera
  //     at bearing 0 where the camera is south of the map centre).
  function createBillboardGeometry(wUnits, hUnits) {
    var geo = new THREE.BufferGeometry();
    var w2 = wUnits / 2;
    // Vertices: bottom-left, bottom-right, top-left, top-right
    var positions = new Float32Array([
      -w2, 0, 0,       // 0  bottom-left
       w2, 0, 0,       // 1  bottom-right
      -w2, 0, hUnits,  // 2  top-left
       w2, 0, hUnits,  // 3  top-right
    ]);
    // UVs map canvas → geometry (flipY handled by THREE default).
    var uvs = new Float32Array([
      0, 0,   // 0
      1, 0,   // 1
      0, 1,   // 2
      1, 1,   // 3
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv',       new THREE.BufferAttribute(uvs,       2));
    // CCW winding when viewed from +Y (front face towards camera at bearing 0).
    geo.setIndex([0, 2, 1, 1, 2, 3]);
    return geo;
  }

  // ── Create the custom 3-D layer ─────────────────────────────────────────
  function addBillboardLayer(mapInst) {
    if (typeof THREE === 'undefined') return;
    if (bbLayerAdded) return;
    if (mapInst.getLayer && mapInst.getLayer(BILLBOARD_LAYER_ID)) return;

    var customLayer = {
      id: BILLBOARD_LAYER_ID,
      type: 'custom',
      renderingMode: '3d',

      onAdd: function (m, gl) {
        bbCamera  = new THREE.Camera();
        bbScene   = new THREE.Scene();
        // Bright ambient: sprites should look flat & vibrant.
        bbScene.add(new THREE.AmbientLight(0xffffff, 1.0));
        bbMapInst  = m;
        bbRenderer = new THREE.WebGLRenderer({
          canvas: m.getCanvas(),
          context: gl,
          antialias: true,
        });
        bbRenderer.autoClear = false;
      },

      render: function (gl, args) {
        if (!bbScene || !bbCamera || !bbRenderer || !bbMapInst) return;
        var ids = Object.keys(bbMeshes);
        if (ids.length === 0) return; // nothing to draw

        var rawMatrix = (args && args.projectionMatrix)
          ? args.projectionMatrix
          : args;
        bbCamera.projectionMatrix.fromArray(rawMatrix);

        // Rotate every billboard around the vertical axis (Z in Mercator)
        // so it always faces the camera.
        var bearingRad = bbMapInst.getBearing() * Math.PI / 180;
        for (var i = 0; i < ids.length; i++) {
          var entry = bbMeshes[ids[i]];
          if (entry && entry.mesh) {
            entry.mesh.rotation.z = bearingRad;
          }
        }

        bbRenderer.resetState();
        bbRenderer.render(bbScene, bbCamera);
        bbMapInst.triggerRepaint();
      },
    };

    mapInst.addLayer(customLayer);
    bbLayerAdded = true;
  }

  // ── Dispose a single billboard entry ────────────────────────────────────
  function disposeBillboard(entry) {
    if (!entry) return;
    if (entry.mesh && bbScene) bbScene.remove(entry.mesh);
    if (entry.texture)  entry.texture.dispose();
    if (entry.material) entry.material.dispose();
    if (entry.geometry) entry.geometry.dispose();
  }

  // ── Update billboard meshes ─────────────────────────────────────────────
  function updateBillboards(data) {
    if (typeof THREE === 'undefined' || !bbScene) return;

    bbGeneration++;
    var currentGen = bbGeneration;

    var hexEdge = data.hexEdgeMeters || 65;
    // Pointy-top H3 hex width (flat-side to flat-side) = edge × sqrt(3).
    var hexWidth = hexEdge * Math.sqrt(3);

    var billboards = data.billboards || [];

    // Build a look-up of incoming IDs.
    var incoming = {};
    for (var i = 0; i < billboards.length; i++) {
      incoming[billboards[i].id] = true;
    }

    // Remove meshes that are no longer present.
    var oldIds = Object.keys(bbMeshes);
    for (var j = 0; j < oldIds.length; j++) {
      if (!incoming[oldIds[j]]) {
        disposeBillboard(bbMeshes[oldIds[j]]);
        delete bbMeshes[oldIds[j]];
      }
    }

    // Create / update each billboard.
    for (var k = 0; k < billboards.length; k++) {
      var bb = billboards[k];
      var existing = bbMeshes[bb.id];

      // If the SVG has not changed we can skip – position is baked in at
      // creation time since MercatorCoordinate depends on the lat/lng.
      if (existing && existing.svgKey === bb.svgDataUri) continue;

      // Remove stale entry.
      if (existing) {
        disposeBillboard(existing);
        delete bbMeshes[bb.id];
      }

      // Closure to capture billboard data and generation.
      (function (bbData, gen) {
        loadSvgTexture(bbData.svgDataUri, function (texture) {
          // Discard if a newer updateBillboards call has been made.
          if (gen !== bbGeneration) {
            if (texture) texture.dispose();
            return;
          }
          if (!texture || !bbScene) return;

          var merc = maplibregl.MercatorCoordinate.fromLngLat(
            [bbData.position.lng, bbData.position.lat], 0,
          );
          var mpu = merc.meterInMercatorCoordinateUnits();

          var spriteW = hexWidth
            * (bbData.scaleFactor / MAX_SCALE_FACTOR)
            * (bbData.billboardScale || 1);
          var spriteH = spriteW; // square aspect ratio
          var wUnits  = spriteW * mpu;
          var hUnits  = spriteH * mpu;

          var geometry = createBillboardGeometry(wUnits, hUnits);
          var material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.05,
            side: THREE.DoubleSide,
            depthTest: true,
            depthWrite: true,
          });
          var mesh = new THREE.Mesh(geometry, material);

          // Position in Mercator space.
          // Bottom of the billboard sits at ground level (z ≈ 0).
          mesh.position.set(merc.x, merc.y, 0);

          bbScene.add(mesh);
          bbMeshes[bbData.id] = {
            mesh: mesh,
            texture: texture,
            material: material,
            geometry: geometry,
            svgKey: bbData.svgDataUri,
          };
          if (bbMapInst) bbMapInst.triggerRepaint();
        });
      })(bb, currentGen);
    }

    if (bbMapInst) bbMapInst.triggerRepaint();
  }

  // ── Extension hooks ─────────────────────────────────────────────────────
  window._mapExtensions.onMapReady = function (m) {
    if (_prevOnMapReady) _prevOnMapReady(m);
    addBillboardLayer(m);
  };

  window._mapExtensions.onMessage = function (data) {
    if (_prevOnMessage) _prevOnMessage(data);
    if (data.billboardData !== undefined) {
      if (!data.billboardData) {
        updateBillboards({ hexEdgeMeters: 0, billboards: [] });
      } else {
        updateBillboards(data.billboardData);
      }
    }
  };

  // Fallback for the web iframe case: if the map already loaded before this
  // script was injected, initialise the billboard layer immediately.
  if (typeof mapReady !== 'undefined' && mapReady && map) {
    addBillboardLayer(map);
  }
})();
`;
