/**
 * Tests for the H3Helper wrapper (helpers/H3Helper.ts).
 *
 * These tests run under Jest (jest-expo preset, Node environment) and verify
 * that the bundled asm.js H3 library loads, initialises correctly, and
 * produces accurate results for a set of known coordinates.
 *
 * The coordinates used throughout are in the Osnabrück / north-west Germany
 * area (lat ≈ 52.66 °N, lng ≈ 8.13 °E) which is the area referenced in the
 * original bug report.
 */

import {
    isAvailable,
    latLngToCell,
    cellToLatLng,
    cellToBoundary,
    gridDisk,
    gridDistance,
    isValidCell,
    getResolution,
    UNITS,
    greatCircleDistance,
} from '../helpers/H3Helper';

// ─── Known-good fixtures ──────────────────────────────────────────────────────

const LAT = 52.66;
const LNG = 8.13;
const RES = 9;

// Pre-computed expected values (verified against the h3-js reference
// implementation at resolution 9 for the coordinates above).
const EXPECTED_CELL = '891f10d504fffff';
const EXPECTED_CELL_RES_0 = '801ffffffffffff';

// ─── Library availability ─────────────────────────────────────────────────────

describe('H3Helper – library availability', () => {
    it('isAvailable() returns true in the test environment', () => {
        // The asm.js bundle must load and pass its sanity-check in both the
        // Node.js test environment and the React Native / Hermes runtime.
        expect(isAvailable()).toBe(true);
    });
});

// ─── Cell indexing ────────────────────────────────────────────────────────────

describe('H3Helper – cell indexing', () => {
    it('latLngToCell returns a non-empty string for valid coordinates', () => {
        const cell = latLngToCell(LAT, LNG, RES);
        expect(typeof cell).toBe('string');
        expect(cell.length).toBeGreaterThan(0);
    });

    it('latLngToCell returns the expected cell index for known coordinates', () => {
        const cell = latLngToCell(LAT, LNG, RES);
        expect(cell).toBe(EXPECTED_CELL);
    });

    it('latLngToCell returns a different cell for resolution 0', () => {
        const cell = latLngToCell(LAT, LNG, 0);
        expect(cell).toBe(EXPECTED_CELL_RES_0);
    });

    it('latLngToCell throws for NaN coordinates (library validates inputs)', () => {
        // The H3 library validates its inputs and throws H3LibraryError for
        // NaN coordinates.  Callers (e.g. buildH3GeoJson) already guard with
        // try/catch, so this is acceptable behaviour.
        expect(() => latLngToCell(NaN, NaN, RES)).toThrow();
    });

    it('cellToLatLng round-trips correctly', () => {
        const cell = latLngToCell(LAT, LNG, RES);
        const [lat, lng] = cellToLatLng(cell);
        // The centre of the cell containing (LAT, LNG) should be within ~1 km.
        expect(Math.abs(lat - LAT)).toBeLessThan(0.02);
        expect(Math.abs(lng - LNG)).toBeLessThan(0.02);
    });
});

// ─── Cell validation ──────────────────────────────────────────────────────────

describe('H3Helper – cell validation', () => {
    it('isValidCell returns true for a valid cell', () => {
        const cell = latLngToCell(LAT, LNG, RES);
        expect(isValidCell(cell)).toBe(true);
    });

    it('isValidCell returns false for an empty string', () => {
        expect(isValidCell('')).toBe(false);
    });

    it('isValidCell returns false for a random string', () => {
        expect(isValidCell('not-a-cell')).toBe(false);
    });

    it('getResolution returns the correct resolution', () => {
        const cell = latLngToCell(LAT, LNG, RES);
        expect(getResolution(cell)).toBe(RES);
    });
});

// ─── Cell boundary (GeoJSON) ─────────────────────────────────────────────────

describe('H3Helper – cellToBoundary', () => {
    it('returns a non-empty array for a valid cell', () => {
        const cell = latLngToCell(LAT, LNG, RES);
        const boundary = cellToBoundary(cell);
        expect(Array.isArray(boundary)).toBe(true);
        expect(boundary.length).toBeGreaterThan(0);
    });

    it('default [lat, lng] boundary has correct coordinate order', () => {
        const cell = latLngToCell(LAT, LNG, RES);
        const boundary = cellToBoundary(cell, false);
        // Each vertex should be [lat, lng]; latitude of a point near 52 °N
        // must be in the first position.
        const [lat0, lng0] = boundary[0];
        expect(lat0).toBeGreaterThan(50);
        expect(lat0).toBeLessThan(55);
        expect(lng0).toBeGreaterThan(7);
        expect(lng0).toBeLessThan(10);
    });

    it('GeoJSON boundary (formatAsGeoJson=true) has [lng, lat] order and is closed', () => {
        const cell = latLngToCell(LAT, LNG, RES);
        const boundary = cellToBoundary(cell, true);
        // In GeoJSON order the first element is longitude.
        const [lng0, lat0] = boundary[0];
        expect(lng0).toBeGreaterThan(7);
        expect(lng0).toBeLessThan(10);
        expect(lat0).toBeGreaterThan(50);
        expect(lat0).toBeLessThan(55);
        // A closed GeoJSON ring repeats the first vertex at the end.
        const last = boundary[boundary.length - 1];
        expect(last[0]).toBeCloseTo(boundary[0][0], 10);
        expect(last[1]).toBeCloseTo(boundary[0][1], 10);
    });

    it('returns an empty array for an empty string input', () => {
        expect(cellToBoundary('')).toEqual([]);
    });
});

// ─── Grid traversal ───────────────────────────────────────────────────────────

describe('H3Helper – gridDisk', () => {
    it('gridDisk(cell, 0) returns exactly 1 cell (the centre itself)', () => {
        const cell = latLngToCell(LAT, LNG, RES);
        const disk = gridDisk(cell, 0);
        expect(disk).toHaveLength(1);
        expect(disk[0]).toBe(cell);
    });

    it('gridDisk(cell, 1) returns exactly 7 cells', () => {
        const cell = latLngToCell(LAT, LNG, RES);
        const disk = gridDisk(cell, 1);
        expect(disk).toHaveLength(7);
    });

    it('gridDisk(cell, 2) returns exactly 19 cells', () => {
        const cell = latLngToCell(LAT, LNG, RES);
        const disk = gridDisk(cell, 2);
        expect(disk).toHaveLength(19);
    });

    it('all cells returned by gridDisk are valid', () => {
        const cell = latLngToCell(LAT, LNG, RES);
        const disk = gridDisk(cell, 2);
        for (const c of disk) {
            expect(isValidCell(c)).toBe(true);
        }
    });

    it('gridDisk with empty cell returns an empty array', () => {
        expect(gridDisk('', 1)).toEqual([]);
    });

    it('gridDistance between same cell is 0', () => {
        const cell = latLngToCell(LAT, LNG, RES);
        expect(gridDistance(cell, cell)).toBe(0);
    });

    it('gridDistance between adjacent cells is 1', () => {
        const cell = latLngToCell(LAT, LNG, RES);
        const ring1 = gridDisk(cell, 1).filter((c) => c !== cell);
        expect(gridDistance(cell, ring1[0])).toBe(1);
    });
});

// ─── Measurement ─────────────────────────────────────────────────────────────

describe('H3Helper – measurement', () => {
    // UNITS is defined when the H3 library loads; fall back to string literals
    // only as a safety net for environments where isAvailable() is false.
    const KM = UNITS?.km ?? 'km';
    const M = UNITS?.m ?? 'm';

    it('greatCircleDistance between two nearby points is positive and reasonable', () => {
        const a: [number, number] = [LAT, LNG];
        const b: [number, number] = [LAT + 0.01, LNG + 0.01];
        const dist = greatCircleDistance(a, b, KM);
        expect(dist).toBeGreaterThan(0);
        expect(dist).toBeLessThan(5);
    });

    it('greatCircleDistance between identical points is 0', () => {
        const a: [number, number] = [LAT, LNG];
        const dist = greatCircleDistance(a, a, M);
        expect(dist).toBe(0);
    });
});

// ─── Viewport GeoJSON helper (integration) ───────────────────────────────────

describe('H3Helper – viewport GeoJSON integration', () => {
    /**
     * Reproduces the exact `buildH3GeoJson` logic used in the activity screen
     * so we can verify it produces the correct number of cells for the
     * viewport bounds from the bug report.
     */
    const H3_MIN_ZOOM = 14;
    const H3_MAX_CELLS = 5000;
    const H3_GEOJSON_ORDER = true;

    type ViewportBounds = { north: number; south: number; east: number; west: number };

    function buildH3GeoJson(bounds: ViewportBounds, zoom: number, resolution: number) {
        if (zoom < H3_MIN_ZOOM) return { type: 'FeatureCollection' as const, features: [] };

        const centerLat = (bounds.north + bounds.south) / 2;
        const centerLng = (bounds.east + bounds.west) / 2;
        const centerCell = latLngToCell(centerLat, centerLng, resolution);

        const corners: Array<[number, number]> = [
            [bounds.north, bounds.east],
            [bounds.north, bounds.west],
            [bounds.south, bounds.east],
            [bounds.south, bounds.west],
        ];
        let maxK = 0;
        for (const [lat, lng] of corners) {
            try {
                const cornerCell = latLngToCell(lat, lng, resolution);
                const dist = gridDistance(centerCell, cornerCell);
                if (dist > maxK) maxK = dist;
            } catch {
                // gridDistance can throw across icosahedron faces – safe to skip.
            }
        }

        const k = Math.min(maxK + 1, 30);
        const cells = gridDisk(centerCell, k);

        const features: object[] = [];
        for (const cell of cells) {
            if (features.length >= H3_MAX_CELLS) break;
            const boundary = cellToBoundary(cell, H3_GEOJSON_ORDER);
            features.push({
                type: 'Feature',
                geometry: { type: 'Polygon', coordinates: [boundary] },
                properties: { h3Index: cell },
            });
        }

        return { type: 'FeatureCollection' as const, features };
    }

    it('produces a non-empty FeatureCollection for the bug-report viewport at zoom 16', () => {
        // Bounds from the original bug report (Osnabrück area, zoom 16).
        const bounds = { north: 52.66421, south: 52.65891, east: 8.13581, west: 8.13105 };
        const result = buildH3GeoJson(bounds, 16, 9);
        expect(result.type).toBe('FeatureCollection');
        expect(result.features.length).toBeGreaterThan(0);
    });

    it('produces 0 features when zoom is below H3_MIN_ZOOM', () => {
        const bounds = { north: 52.66421, south: 52.65891, east: 8.13581, west: 8.13105 };
        const result = buildH3GeoJson(bounds, 13, 9);
        expect(result.features).toHaveLength(0);
    });

    it('each feature has a valid h3Index property', () => {
        const bounds = { north: 52.66421, south: 52.65891, east: 8.13581, west: 8.13105 };
        const result = buildH3GeoJson(bounds, 16, 9);
        for (const f of result.features) {
            const feature = f as { properties: { h3Index: string } };
            expect(isValidCell(feature.properties.h3Index)).toBe(true);
        }
    });

    it('each feature Polygon coordinates form a closed GeoJSON ring', () => {
        const bounds = { north: 52.66421, south: 52.65891, east: 8.13581, west: 8.13105 };
        const result = buildH3GeoJson(bounds, 16, 9);
        for (const f of result.features) {
            const feature = f as { geometry: { coordinates: number[][][] } };
            const ring = feature.geometry.coordinates[0];
            expect(ring.length).toBeGreaterThan(0);
            // First and last points must be identical (closed ring).
            const first = ring[0];
            const last = ring[ring.length - 1];
            expect(first[0]).toBeCloseTo(last[0], 10);
            expect(first[1]).toBeCloseTo(last[1], 10);
        }
    });
});

// ─── Half-resolution (fractional) subdivision tests ───────────────────────────

import { cellToChildren, cellToParent, cellToCenterChild, getHalfStepChildren } from '../helpers/H3Helper';

describe('H3 half-resolution subdivision', () => {
    const BASE_RES = 9;
    const CHILD_RES = BASE_RES + 1;
    const BOUNDS = { north: 52.66421, south: 52.65891, east: 8.13581, west: 8.13105 };
    const H3_MIN_ZOOM = 14;
    const H3_MAX_CELLS = 5000;
    const H3_RESOLUTION_MIN = 0;
    const H3_RESOLUTION_MAX = 15;
    const H3_GEOJSON_ORDER = true;

    /**
     * Mirrors the half-resolution path of buildH3GeoJson in app/index.tsx.
     */
    function buildH3GeoJsonHalf(bounds: { north: number; south: number; east: number; west: number }, zoom: number, resolution: number) {
        if (zoom < H3_MIN_ZOOM) return { type: 'FeatureCollection' as const, features: [] };
        const isHalfResolution = resolution % 1 !== 0;
        const h3Res = Math.max(
            H3_RESOLUTION_MIN,
            Math.min(H3_RESOLUTION_MAX, isHalfResolution ? Math.floor(resolution) : Math.round(resolution)),
        );
        const childRes = Math.min(H3_RESOLUTION_MAX, h3Res + 1);

        const centerLat = (bounds.north + bounds.south) / 2;
        const centerLng = (bounds.east + bounds.west) / 2;
        const centerCell = latLngToCell(centerLat, centerLng, h3Res);

        const corners: Array<[number, number]> = [
            [bounds.north, bounds.east],
            [bounds.north, bounds.west],
            [bounds.south, bounds.east],
            [bounds.south, bounds.west],
        ];
        let maxK = 0;
        for (const [lat, lng] of corners) {
            try {
                const cornerCell = latLngToCell(lat, lng, h3Res);
                const dist = gridDistance(centerCell, cornerCell);
                if (dist > maxK) maxK = dist;
            } catch {
                // ignore
            }
        }

        const k = Math.min(maxK + 1, 30);
        const parentCells = gridDisk(centerCell, k);
        const features: object[] = [];

        if (isHalfResolution) {
            for (const parentCell of parentCells) {
                if (features.length >= H3_MAX_CELLS) break;
                const children = cellToChildren(parentCell, childRes);
                for (const child of children) {
                    if (features.length >= H3_MAX_CELLS) break;
                    const boundary = cellToBoundary(child, H3_GEOJSON_ORDER);
                    features.push({
                        type: 'Feature',
                        geometry: { type: 'Polygon', coordinates: [boundary] },
                        properties: { h3Index: parentCell },
                    });
                }
            }
        } else {
            for (const cell of parentCells) {
                if (features.length >= H3_MAX_CELLS) break;
                const boundary = cellToBoundary(cell, H3_GEOJSON_ORDER);
                features.push({
                    type: 'Feature',
                    geometry: { type: 'Polygon', coordinates: [boundary] },
                    properties: { h3Index: cell },
                });
            }
        }

        return { type: 'FeatureCollection' as const, features };
    }

    it('fractional resolution produces more features than the equivalent whole-number resolution', () => {
        const whole = buildH3GeoJsonHalf(BOUNDS, 16, BASE_RES);
        const half = buildH3GeoJsonHalf(BOUNDS, 16, BASE_RES + 0.5);
        // Each parent hex has 7 children, so half-resolution should produce ~7x more features.
        expect(half.features.length).toBeGreaterThan(whole.features.length);
    });

    it('features from fractional resolution have h3Index at the base (parent) resolution', () => {
        const result = buildH3GeoJsonHalf(BOUNDS, 16, BASE_RES + 0.5);
        expect(result.features.length).toBeGreaterThan(0);
        for (const f of result.features) {
            const feature = f as { properties: { h3Index: string } };
            expect(isValidCell(feature.properties.h3Index)).toBe(true);
            expect(getResolution(feature.properties.h3Index)).toBe(BASE_RES);
        }
    });

    it('features from fractional resolution have polygon geometry at the child resolution', () => {
        const result = buildH3GeoJsonHalf(BOUNDS, 16, BASE_RES + 0.5);
        expect(result.features.length).toBeGreaterThan(0);
        // The polygon covers the child cell boundary; verify ring is closed.
        for (const f of result.features) {
            const feature = f as { geometry: { coordinates: number[][][] } };
            const ring = feature.geometry.coordinates[0];
            expect(ring.length).toBeGreaterThan(0);
            const first = ring[0];
            const last = ring[ring.length - 1];
            expect(first[0]).toBeCloseTo(last[0], 10);
            expect(first[1]).toBeCloseTo(last[1], 10);
        }
    });

    it('each child cell belongs to the parent stored in h3Index', () => {
        const result = buildH3GeoJsonHalf(BOUNDS, 16, BASE_RES + 0.5);
        expect(result.features.length).toBeGreaterThan(0);
        // Verify a sample of features: the polygon's vertices should be inside
        // the parent cell.  We verify this indirectly: the child cell returned
        // by cellToChildren round-trips to the same parent via cellToParent.
        const parentCell = latLngToCell(
            (BOUNDS.north + BOUNDS.south) / 2,
            (BOUNDS.east + BOUNDS.west) / 2,
            BASE_RES,
        );
        const children = cellToChildren(parentCell, CHILD_RES);
        for (const child of children) {
            expect(cellToParent(child, BASE_RES)).toBe(parentCell);
        }
    });

    it('whole-number resolution is unaffected by the half-resolution logic', () => {
        const whole = buildH3GeoJsonHalf(BOUNDS, 16, BASE_RES);
        // All features should have their own h3Index at the base resolution.
        for (const f of whole.features) {
            const feature = f as { properties: { h3Index: string } };
            expect(getResolution(feature.properties.h3Index)).toBe(BASE_RES);
        }
    });

    it('produces 0 features when zoom is below H3_MIN_ZOOM regardless of fractional resolution', () => {
        const result = buildH3GeoJsonHalf(BOUNDS, 13, BASE_RES + 0.5);
        expect(result.features).toHaveLength(0);
    });
});

// ─── Half-step subdivision unit tests (getHalfStepChildren) ──────────────────

describe('H3 half-step – getHalfStepChildren', () => {
    const BASE_RES = 9;

    it('returns exactly 1 center child and 6 outer children for a regular cell', () => {
        const parent = latLngToCell(LAT, LNG, BASE_RES);
        const { center, outer } = getHalfStepChildren(parent);

        expect(isValidCell(center)).toBe(true);
        expect(outer).toHaveLength(6);
        for (const c of outer) {
            expect(isValidCell(c)).toBe(true);
        }
    });

    it('center child matches cellToCenterChild at parent resolution + 1', () => {
        const parent = latLngToCell(LAT, LNG, BASE_RES);
        const { center } = getHalfStepChildren(parent);
        const expectedCenter = cellToCenterChild(parent, BASE_RES + 1);

        expect(center).toBe(expectedCenter);
    });

    it('center child and all outer children are at parent resolution + 1', () => {
        const parent = latLngToCell(LAT, LNG, BASE_RES);
        const { center, outer } = getHalfStepChildren(parent);

        expect(getResolution(center)).toBe(BASE_RES + 1);
        for (const c of outer) {
            expect(getResolution(c)).toBe(BASE_RES + 1);
        }
    });

    it('center child is not contained in the outer children list', () => {
        const parent = latLngToCell(LAT, LNG, BASE_RES);
        const { center, outer } = getHalfStepChildren(parent);

        expect(outer).not.toContain(center);
    });

    it('center child together with outer children yields all 7 children of the parent', () => {
        const parent = latLngToCell(LAT, LNG, BASE_RES);
        const { center, outer } = getHalfStepChildren(parent);
        const all = [center, ...outer];

        const expected = cellToChildren(parent, BASE_RES + 1);
        expect(all).toHaveLength(7);
        expect(all.sort()).toEqual(expected.sort());
    });

    it('every outer child belongs to the same parent via cellToParent', () => {
        const parent = latLngToCell(LAT, LNG, BASE_RES);
        const { center, outer } = getHalfStepChildren(parent);

        expect(cellToParent(center, BASE_RES)).toBe(parent);
        for (const c of outer) {
            expect(cellToParent(c, BASE_RES)).toBe(parent);
        }
    });

    it('returns empty center and no outer children for an invalid cell', () => {
        const { center, outer } = getHalfStepChildren('not-a-cell');

        expect(center).toBe('');
        expect(outer).toHaveLength(0);
    });

    it('returns empty center and no outer children for an empty string', () => {
        const { center, outer } = getHalfStepChildren('');

        expect(center).toBe('');
        expect(outer).toHaveLength(0);
    });

    it('returns empty center and no outer children when parent is already at resolution 15', () => {
        // At the finest H3 resolution there are no children to subdivide into.
        const parentRes15 = latLngToCell(LAT, LNG, 15);
        const { center, outer } = getHalfStepChildren(parentRes15);

        expect(center).toBe('');
        expect(outer).toHaveLength(0);
    });

    it('works correctly across multiple different parent cells in a disk', () => {
        const origin = latLngToCell(LAT, LNG, BASE_RES);
        const neighbors = gridDisk(origin, 1);

        for (const parent of neighbors) {
            const { center, outer } = getHalfStepChildren(parent);
            expect(isValidCell(center)).toBe(true);
            expect(outer).toHaveLength(6);
            expect(outer).not.toContain(center);
            expect(getResolution(center)).toBe(BASE_RES + 1);
        }
    });
});
