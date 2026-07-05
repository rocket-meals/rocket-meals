import { cellToBoundary, cellToLatLng, gridPathCells, latLngToCell } from './H3Helper';
import { HexTileRecord } from './HexTileStorage';
import type { SavedRoute } from './RouteStorage';

// ─── Types ──────────────────────────────────────────────────────────────────

type GeoJsonFeature = {
	type: 'Feature';
	geometry: { type: string; coordinates: unknown };
	properties: Record<string, unknown>;
};

type GeoJsonFeatureCollection = {
	type: 'FeatureCollection';
	features: GeoJsonFeature[];
};

export type RouteDisplayData = {
	hexTileGeoJson: GeoJsonFeatureCollection;
	hexWalkPathGeoJson: GeoJsonFeatureCollection;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const H3_GEOJSON_ORDER = true;

/** Maximum number of intermediate cells allowed when interpolating GPS gaps. */
const GPS_PATH_INTERPOLATION_MAX_CELLS = 10;

/**
 * Compute walked edges from an ordered list of hex tiles by creating an edge
 * between each consecutive pair. This is used as a fallback for routes that
 * were saved without explicit walked edges.
 */
export function computeEdgesFromHexTiles(hexTiles: string[]): string[] {
	const edgeSet = new Set<string>();
	for (let i = 0; i < hexTiles.length - 1; i++) {
		const a = hexTiles[i];
		const b = hexTiles[i + 1];
		edgeSet.add(a < b ? `${a}:${b}` : `${b}:${a}`);
	}
	return Array.from(edgeSet);
}

/**
 * Compute walked edges from raw GPS route points by converting each point to
 * its H3 cell and tracking hex-to-hex transitions (including gap
 * interpolation). This produces accurate edges based on the actual path taken.
 */
export function computeEdgesFromRoutePoints(
	routePoints: { lat: number; lng: number }[],
	h3Resolution: number,
): string[] {
	const edges = new Set<string>();
	let lastCell: string | null = null;

	for (const point of routePoints) {
		try {
			const cell = latLngToCell(point.lat, point.lng, h3Resolution);
			if (!cell) continue;
			if (lastCell && cell !== lastCell) {
				try {
					const pathCells = gridPathCells(lastCell, cell);
					if (pathCells.length - 2 <= GPS_PATH_INTERPOLATION_MAX_CELLS) {
						for (let i = 0; i < pathCells.length - 1; i++) {
							const a = pathCells[i];
							const b = pathCells[i + 1];
							edges.add(a < b ? `${a}:${b}` : `${b}:${a}`);
						}
					}
				} catch {
					// Different icosahedron faces – just add direct edge
					edges.add(lastCell < cell ? `${lastCell}:${cell}` : `${cell}:${lastCell}`);
				}
			}
			lastCell = cell;
		} catch {
			// Skip invalid GPS points
		}
	}

	return Array.from(edges);
}

// ─── Main builder ───────────────────────────────────────────────────────────

/**
 * Compute the geographic bounding box of a list of H3 cells using their center
 * points. Returns `null` when the list is empty or contains only invalid cells.
 */
export function computeHexBounds(
	hexTiles: string[],
): { minLat: number; maxLat: number; minLng: number; maxLng: number } | null {
	if (hexTiles.length === 0) return null;
	let minLat = Infinity;
	let maxLat = -Infinity;
	let minLng = Infinity;
	let maxLng = -Infinity;
	for (const cell of hexTiles) {
		try {
			const [lat, lng] = cellToLatLng(cell);
			if (lat < minLat) minLat = lat;
			if (lat > maxLat) maxLat = lat;
			if (lng < minLng) minLng = lng;
			if (lng > maxLng) maxLng = lng;
		} catch {
			// Skip invalid cells
		}
	}
	if (!isFinite(minLat)) return null;
	return { minLat, maxLat, minLng, maxLng };
}

/**
 * Build the GeoJSON data needed to display a route on the map.
 * Returns both the hex tile polygons and the walk path lines.
 *
 * This function is shared between the route detail screen (`routes/[id]`) and
 * the route preview in the recording screen so that the visual appearance is
 * always consistent.
 */
export function buildRouteDisplayData(
	route: SavedRoute,
	hexTileRecords: Record<string, HexTileRecord>,
): RouteDisplayData {
	// ── Hex tile polygons ─────────────────────────────────────────────────
	const tileFeatures: GeoJsonFeature[] = [];
	for (const cell of route.hexTiles) {
		try {
			const boundary = cellToBoundary(cell, H3_GEOJSON_ORDER);
			if (boundary.length === 0) continue;
			const level = hexTileRecords[cell]?.level ?? 0;
			tileFeatures.push({
				type: 'Feature',
				geometry: { type: 'Polygon', coordinates: [boundary] },
				properties: { h3Index: cell, level },
			});
		} catch {
			// Skip invalid cells
		}
	}

	// ── Walk path lines ───────────────────────────────────────────────────
	// Prefer the finer red-line edges (walkedEdgesRedLine) when available so that
	// the red walk path is drawn at the red-line resolution for higher accuracy.
	// Fall back to h10 walkedEdges, and finally compute from hex tile order.
	const edges = route.walkedEdgesRedLine ?? route.walkedEdges ?? computeEdgesFromHexTiles(route.hexTiles);

	const pathFeatures: GeoJsonFeature[] = [];
	for (const edge of edges) {
		const colonIdx = edge.indexOf(':');
		if (colonIdx === -1) continue;
		const cellA = edge.slice(0, colonIdx);
		const cellB = edge.slice(colonIdx + 1);
		try {
			const [aLat, aLng] = cellToLatLng(cellA);
			const [bLat, bLng] = cellToLatLng(cellB);
			pathFeatures.push({
				type: 'Feature',
				geometry: {
					type: 'LineString',
					coordinates: [
						[aLng, aLat],
						[bLng, bLat],
					],
				},
				properties: {},
			});
		} catch {
			// Skip invalid cells
		}
	}

	return {
		hexTileGeoJson: { type: 'FeatureCollection', features: tileFeatures },
		hexWalkPathGeoJson: { type: 'FeatureCollection', features: pathFeatures },
	};
}
