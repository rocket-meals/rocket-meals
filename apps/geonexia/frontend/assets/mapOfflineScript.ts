/**
 * Offline-map script for Geonexia.
 *
 * This self-contained IIFE is injected into the MapLibre map HTML via the
 * `injectScript` prop on the `MyMap` component (appended after HEX_TILE_SCRIPT).
 * It routes every http(s) resource the map requests (style JSON, vector tiles,
 * glyphs, sprites) through a custom MapLibre protocol whose handler:
 *
 *   1. Asks React Native for a cached copy (stored in SQLite by the
 *      MapOfflineStorage adapter) and serves it when available.
 *   2. Falls back to a normal network fetch on cache miss and reports the
 *      downloaded bytes back to React Native for storage.
 *
 * Message protocol (WebView → RN via sendToRN):
 *   { tag: 'MapOfflineInit' }                – ask RN for the current enabled flag
 *   { tag: 'MapOfflineLoad', id, url }       – ask RN for a cached resource
 *   { tag: 'MapOfflineStore', url, data }    – ask RN to cache a resource (base64)
 *
 * Message protocol (RN → WebView via sendToMap):
 *   { mapOfflineEnabled: boolean }               – enable/disable the cache
 *   { mapOfflineLoadResult: { id, data|null } }  – answer to MapOfflineLoad
 *
 * The RN → WebView messages are consumed by listeners registered here (in
 * addition to the map's own message pipeline) because the map queues messages
 * until it fires `load` – cached tiles, however, must be served WHILE the map
 * is still loading, otherwise a cold offline start could never finish loading.
 */
export const MAP_OFFLINE_SCRIPT = `
(function () {
  var PROTOCOL = 'geonexia-offline';
  var PREFIX = PROTOCOL + '://';
  var RN_ROUNDTRIP_TIMEOUT_MS = 3000;

  // null = unknown (React Native has not answered MapOfflineInit yet).
  var offlineEnabled = null;
  var enabledWaiters = [];

  function setOfflineEnabled(value) {
    offlineEnabled = !!value;
    var waiters = enabledWaiters;
    enabledWaiters = [];
    for (var i = 0; i < waiters.length; i++) waiters[i](offlineEnabled);
  }

  // Resolve the enabled flag, waiting for the MapOfflineInit answer when it is
  // not known yet (falls back to "disabled" after a timeout so the map never hangs).
  function getOfflineEnabled() {
    if (offlineEnabled !== null) return Promise.resolve(offlineEnabled);
    return new Promise(function (resolve) {
      var done = false;
      function settle(value) {
        if (done) return;
        done = true;
        resolve(value);
      }
      enabledWaiters.push(settle);
      setTimeout(function () { settle(offlineEnabled === true); }, RN_ROUNDTRIP_TIMEOUT_MS);
    });
  }

  // ── RN load-request correlation ───────────────────────────────────────────
  var nextRequestId = 1;
  var pendingLoads = {};

  function requestCachedFromRN(url) {
    return new Promise(function (resolve) {
      var id = nextRequestId++;
      pendingLoads[id] = resolve;
      setTimeout(function () {
        if (pendingLoads[id]) {
          delete pendingLoads[id];
          resolve(null);
        }
      }, RN_ROUNDTRIP_TIMEOUT_MS);
      sendToRN({ tag: 'MapOfflineLoad', id: id, url: url });
    });
  }

  function handleOfflineMessage(raw) {
    var data;
    try {
      data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
      return;
    }
    if (!data || typeof data !== 'object') return;
    if (typeof data.mapOfflineEnabled === 'boolean') {
      setOfflineEnabled(data.mapOfflineEnabled);
    }
    if (data.mapOfflineLoadResult) {
      var res = data.mapOfflineLoadResult;
      var resolve = pendingLoads[res.id];
      if (resolve) {
        delete pendingLoads[res.id];
        resolve(typeof res.data === 'string' ? res.data : null);
      }
    }
  }

  // Own listeners, independent of the map's mapReady-gated message queue.
  window.addEventListener('message', function (e) { handleOfflineMessage(e.data); });
  document.addEventListener('message', function (e) { handleOfflineMessage(e.data); });

  // ── base64 helpers (chunked to stay below call-argument limits) ───────────
  function bufferToBase64(buffer) {
    var bytes = new Uint8Array(buffer);
    var chunks = [];
    var CHUNK = 0x8000;
    for (var i = 0; i < bytes.length; i += CHUNK) {
      chunks.push(String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK)));
    }
    return btoa(chunks.join(''));
  }

  function base64ToBuffer(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }

  // Convert raw bytes into the shape MapLibre expects for the request type
  // (parsed object for 'json', text for 'string', ArrayBuffer otherwise).
  function bufferToResponseData(buffer, type) {
    if (type === 'json') return JSON.parse(new TextDecoder().decode(buffer));
    if (type === 'string') return new TextDecoder().decode(buffer);
    return buffer;
  }

  function fetchFromNetwork(url, abortController) {
    var options = abortController ? { signal: abortController.signal } : undefined;
    return fetch(url, options).then(function (res) {
      if (!res.ok) {
        throw new Error('Map resource fetch failed (' + res.status + '): ' + url);
      }
      return res.arrayBuffer();
    });
  }

  // ── Custom protocol: cache-first with network fallback ────────────────────
  maplibregl.addProtocol(PROTOCOL, function (params, abortController) {
    var url = params.url.slice(PREFIX.length);
    return getOfflineEnabled().then(function (enabled) {
      if (!enabled) {
        return fetchFromNetwork(url, abortController).then(function (buffer) {
          return { data: bufferToResponseData(buffer, params.type) };
        });
      }
      return requestCachedFromRN(url).then(function (cached) {
        if (cached !== null) {
          return { data: bufferToResponseData(base64ToBuffer(cached), params.type) };
        }
        return fetchFromNetwork(url, abortController).then(function (buffer) {
          try {
            sendToRN({ tag: 'MapOfflineStore', url: url, data: bufferToBase64(buffer) });
          } catch (e) { /* storing is best-effort */ }
          return { data: bufferToResponseData(buffer, params.type) };
        });
      });
    });
  });

  // Route http(s) resources through the offline protocol while the feature is
  // enabled or its state is still unknown; once RN reports "disabled" all
  // requests bypass the protocol again (zero overhead).
  window._mapExtensions.transformRequest = function (url) {
    if (offlineEnabled === false) return { url: url };
    if (url.indexOf('http://') === 0 || url.indexOf('https://') === 0) {
      return { url: PREFIX + url };
    }
    return { url: url };
  };

  // Ask RN for the persisted enabled flag right away.
  sendToRN({ tag: 'MapOfflineInit' });
})();
`;
