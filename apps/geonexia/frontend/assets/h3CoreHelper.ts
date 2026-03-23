/**
 * H3 Core Helper for Geonexia
 *
 * Constants for the H3-based hex tile overlay used in the Geonexia map.
 *
 * h3-js is loaded dynamically inside the MapLibre WebView context (not in the
 * React Native JavaScript thread running on Hermes). This is intentional:
 * the WebView's JS engine supports WebAssembly, while Hermes does not.
 * Importing h3-js as an npm package would fail at runtime on Hermes.
 *
 * The script string exported from hexTileScript.ts injects a <script> tag at
 * runtime that fetches this CDN bundle. Once loaded, `window.h3` exposes the
 * full h3-js API including `latLngToCell`, `cellToBoundary`, and
 * `polygonToCells`.
 */

/** CDN URL for the h3-js UMD bundle. The bundle embeds the WASM binary as base64. */
export const H3_JS_CDN_URL =
    'https://cdn.jsdelivr.net/npm/h3-js@4/dist/h3-js.umd.js';

/**
 * Default H3 resolution for hex tile display.
 * Can be overridden via the `hexTileLayer` message (`resolution` field).
 *
 * | Resolution | Avg edge length | Avg cell area |
 * |------------|-----------------|---------------|
 * |          8 |        461 m    |    0.74 km²   |
 * |          9 |        174 m    |    0.10 km²   |
 * |         10 |         66 m    |   0.015 km²   |
 * |         11 |         25 m    |   0.002 km²   |
 */
export const H3_DEFAULT_RESOLUTION = 9;

/** Minimum map zoom level at which hex tiles are drawn. */
export const H3_MIN_ZOOM = 12;

/** Maximum number of H3 cells rendered per frame to keep the map responsive. */
export const H3_MAX_CELLS = 3000;
