/**
 * H3 Core Helper for Geonexia
 *
 * Constants for the H3-based hex tile overlay used in the Geonexia map.
 *
 * The h3-js library (v4.4.0) is bundled directly in h3coreBundle.ts as a
 * TypeScript string constant. It is injected into the MapLibre WebView context
 * (not into the React Native JavaScript thread running on Hermes). This is
 * intentional: the WebView's JS engine supports the typed-array and
 * bit-manipulation operations h3-js relies on, while Hermes does not.
 * Importing h3-js as an npm package would fail at runtime on Hermes.
 *
 * The bundle is synchronous – `window.h3` is available immediately after the
 * script runs, with no network requests or WASM initialization required.
 */

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
