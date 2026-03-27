import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
	Alert,
	Animated,
	PanResponder,
	Platform,
	SafeAreaView,
	ScrollView,
	StyleSheet,
	Switch,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { isRunningInExpoGo } from 'expo';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { WebView } from 'react-native-webview';
import { MapLocationButton, MyMap, MyMapHandle, QrCode, useTheme, useMyScrollViewModal, SettingsListSelectOptionSingle, SettingsListGroupTitle } from 'repo-depkit-common-ui';

import { HEX_TILE_SCRIPT } from '../assets/hexTileScript';
import { TERRAIN_ASSETS, TERRAIN_CATEGORIES, TerrainCategory } from '../assets/terrainAssets';
import { isAvailable as isH3Available, latLngToCell, cellToLatLng, gridDisk, gridDistance, cellToBoundary, gridPathCells, cellToChildren, cellToCenterChild, cellToParent, gridRingUnsafe } from '../helpers/H3Helper';
import { RoutePoint, RunStats, saveActivity, saveOsmConsent, loadOsmConsent } from '../helpers/ActivityStorage';
import { HexTileRecord } from '../helpers/HexTileStorage';
import { startRun, markVisited, markEnclosed, setHexTileCustomization } from '../store/hexTileSlice';
import { setSportType, SPORT_TYPES, SportType } from '../store/sportTypeSlice';
import { store, RootState } from '../store/store';
import { OBJECT_SPRITES } from '../assets/objects/objectSprites';

/** Module-level cache mapping terrain asset key → base64 data URI. */
const cachedTerrainSvgDataUrls = new Map<string, string>();
let cachedTerrainSvgDataUrlsLoaded = false;

async function loadAllTerrainSvgDataUrls(): Promise<Map<string, string>> {
	if (cachedTerrainSvgDataUrlsLoaded) return cachedTerrainSvgDataUrls;
	for (const entries of Object.values(TERRAIN_ASSETS)) {
		for (const entry of entries) {
			try {
				const asset = Asset.fromModule(entry.source as number);
				await asset.downloadAsync();
				let url: string;
				if (Platform.OS === 'web') {
					url = asset.uri ?? '';
				} else {
					if (!asset.localUri) continue;
					const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
						encoding: FileSystem.EncodingType.Base64,
					});
					url = `data:image/svg+xml;base64,${base64}`;
				}
				cachedTerrainSvgDataUrls.set(entry.key, url);
			} catch (e) {
				console.warn(`[loadAllTerrainSvgDataUrls] Failed for ${entry.key}:`, e);
			}
		}
	}
	cachedTerrainSvgDataUrlsLoaded = true;
	return cachedTerrainSvgDataUrls;
}

/** Module-level cache mapping object sprite key ("objects:N") → base64 data URI. */
const cachedObjectSvgDataUrls = new Map<string, string>();
let cachedObjectSvgDataUrlsLoaded = false;

async function loadAllObjectSvgDataUrls(): Promise<Map<string, string>> {
	if (cachedObjectSvgDataUrlsLoaded) return cachedObjectSvgDataUrls;
	for (let i = 0; i < OBJECT_SPRITES.length; i++) {
		const sprite = OBJECT_SPRITES[i];
		const key = `objects:${i}`;
		try {
			const asset = Asset.fromModule(sprite.source as number);
			await asset.downloadAsync();
			let url: string;
			if (Platform.OS === 'web') {
				url = asset.uri ?? '';
			} else {
				if (!asset.localUri) continue;
				const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
					encoding: FileSystem.EncodingType.Base64,
				});
				url = `data:image/svg+xml;base64,${base64}`;
			}
			cachedObjectSvgDataUrls.set(key, url);
		} catch (e) {
			console.warn(`[loadAllObjectSvgDataUrls] Failed for ${key}:`, e);
		}
	}
	cachedObjectSvgDataUrlsLoaded = true;
	return cachedObjectSvgDataUrls;
}

/** Parse a billboard key of the form "objects:N" into the corresponding sprite and index. */
function parseBillboardKey(billboard: string): { sprite: (typeof OBJECT_SPRITES)[number]; idx: number } | null {
	const colonIdx = billboard.indexOf(':');
	if (colonIdx < 0 || billboard.slice(0, colonIdx) !== 'objects') return null;
	const idx = parseInt(billboard.slice(colonIdx + 1), 10);
	const sprite = OBJECT_SPRITES[idx];
	if (!sprite) return null;
	return { sprite, idx };
}

const PRIMARY_COLOR = '#2563eb';

// Debug status indicator colours
const STATUS_SUCCESS_COLOR = '#22c55e';
const STATUS_WARNING_COLOR = '#f59e0b';
const STATUS_ERROR_COLOR = '#ef4444';

// ─── H3 hex-grid helpers ──────────────────────────────────────────────────────

const H3_DEFAULT_RESOLUTION = 10;
const H3_MAX_CELLS = 5000;
const H3_MIN_ZOOM = 14;
const H3_RESOLUTION_MIN = 0;
const H3_RESOLUTION_MAX = 15;

// Average H3 hexagon edge lengths in km for each integer resolution 0–15.
// Source: https://h3geo.org/docs/core-library/restable
const H3_EDGE_LENGTH_KM: readonly number[] = [
	1107.712591, // 0
	418.676005,  // 1
	158.244655,  // 2
	59.810857,   // 3
	22.606379,   // 4
	8.544408,    // 5
	3.229482,    // 6
	1.220629,    // 7
	0.461354,    // 8
	0.174375,    // 9
	0.065907,    // 10  ← default resolution
	0.024910,    // 11
	0.009415,    // 12
	0.003559,    // 13
	0.001348,    // 14
	0.000509,    // 15
];

// Base billboard size unit in pixels at H3 resolution 10.
// townhall (scaleFactor 7.0) renders at exactly 7 × BILLBOARD_UNIT_PX pixels wide.
// All other sprites are scaled by their own scaleFactor relative to this unit.
// Multiplied by 6 so all billboards appear 6× larger in the viewport.
const BILLBOARD_UNIT_PX = 48 * 6 / 7; // townhall ≈ 288 px at res 10
// Default MapLibre zoom assumed when no viewport data is available yet.
const DEFAULT_REFERENCE_ZOOM = 14;
// cellToBoundary flag: true returns vertices in [lng, lat] GeoJSON coordinate order
// AND automatically closes the ring (appends the first vertex at the end).
const H3_GEOJSON_ORDER = true;

type ViewportBounds = { north: number; south: number; east: number; west: number };

type H3GeoJsonFeature = {
	type: 'Feature';
	geometry:
		| { type: 'Polygon'; coordinates: number[][][] }
		| { type: 'Point'; coordinates: number[] };
	properties: { h3Index: string; level: number; colorIndex?: number };
};

type H3FeatureCollection = {
	type: 'FeatureCollection';
	features: H3GeoJsonFeature[];
};

function buildH3GeoJson(
	bounds: ViewportBounds,
	zoom: number,
	resolution: number,
	showAlways: boolean,
	hexTileRecords: Record<string, HexTileRecord>,
): H3FeatureCollection {
	if (!showAlways && zoom < H3_MIN_ZOOM) return { type: 'FeatureCollection', features: [] };

	// Fractional resolutions (e.g. 10.5) use the floor as the base integer
	// resolution and visually subdivide each parent cell into its children at
	// the next resolution level.  Whole-number resolutions use the existing
	// behaviour (round to nearest integer so e.g. 10.9 still maps to res 11).
	const isHalfResolution = resolution % 1 !== 0;
	const h3Res = Math.max(
		H3_RESOLUTION_MIN,
		Math.min(H3_RESOLUTION_MAX, isHalfResolution ? Math.floor(resolution) : Math.round(resolution)),
	);

	const centerLat = (bounds.north + bounds.south) / 2;
	const centerLng = (bounds.east + bounds.west) / 2;
	const centerCell = latLngToCell(centerLat, centerLng, h3Res);

	// Determine how many grid rings are needed to cover all four viewport corners.
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
		} catch (err) {
			// gridDistance can throw when cells span different icosahedron faces.
			console.warn('[H3] gridDistance failed for corner cell:', err);
		}
	}

	const k = Math.min(maxK + 1, 30);
	const parentCells = gridDisk(centerCell, k);

	const features: H3GeoJsonFeature[] = [];
	if (isHalfResolution) {
		// For fractional resolutions (e.g. 10.5) we compute child hexes at the
		// next integer resolution and color them in 7 colors: the center child
		// gets white (colorIndex 0) and the 6 ring children get red, yellow,
		// green, blue, purple, orange (colorIndex 1–6) in ring order.
		const childRes = Math.min(H3_RESOLUTION_MAX, h3Res + 1);
		for (const parentCell of parentCells) {
			if (features.length >= H3_MAX_CELLS) break;
			const parentLevel = hexTileRecords[parentCell]?.level ?? 0;
			const centerChild = cellToCenterChild(parentCell, childRes);
			if (!centerChild) continue;

			// Center child → colorIndex 0 (white)
			const centerBoundary = cellToBoundary(centerChild, H3_GEOJSON_ORDER);
			if (centerBoundary.length > 0) {
				features.push({
					type: 'Feature',
					geometry: { type: 'Polygon', coordinates: [centerBoundary as number[][]] },
					properties: { h3Index: parentCell, level: parentLevel, colorIndex: 0 },
				});
			}

			// Ring children → colorIndex 1–6
			let ringChildren: string[] = [];
			try {
				ringChildren = gridRingUnsafe(centerChild, 1).filter(
					(c) => cellToParent(c, h3Res) === parentCell,
				);
			} catch (err) {
				// gridRingUnsafe can throw for pentagon cells; skip ring for those
				console.warn('[H3] gridRingUnsafe failed for centerChild', centerChild, err);
			}
			for (let i = 0; i < ringChildren.length; i++) {
				if (features.length >= H3_MAX_CELLS) break;
				const child = ringChildren[i];
				const boundary = cellToBoundary(child, H3_GEOJSON_ORDER);
				if (boundary.length > 0) {
					features.push({
						type: 'Feature',
						geometry: { type: 'Polygon', coordinates: [boundary as number[][]] },
						properties: { h3Index: parentCell, level: parentLevel, colorIndex: i + 1 },
					});
				}
			}
		}
	} else {
		for (const cell of parentCells) {
			if (features.length >= H3_MAX_CELLS) break;
			const boundary = cellToBoundary(cell, H3_GEOJSON_ORDER);
			// H3_GEOJSON_ORDER=true already closes the ring; no need to append boundary[0] again.
			features.push({
				type: 'Feature',
				geometry: { type: 'Polygon', coordinates: [boundary as number[][]] },
				properties: { h3Index: cell, level: hexTileRecords[cell]?.level ?? 0 },
			});
		}
	}

	return { type: 'FeatureCollection', features };
}

// ─── Walk path GeoJSON builder ────────────────────────────────────────────────

type WalkPathFeature = {
	type: 'Feature';
	geometry: { type: 'LineString'; coordinates: number[][] };
	properties: Record<string, never>;
};

type WalkPathFeatureCollection = {
	type: 'FeatureCollection';
	features: WalkPathFeature[];
};

/**
 * Build a GeoJSON FeatureCollection of LineString features representing the
 * walk paths across all visited tiles. For each pair of adjacent cells that
 * are both walked-on, a line is drawn from one cell's centre to the other.
 * Lines are deduplicated (each pair drawn once) by comparing H3 indices.
 *
 * Only considers cells that appear in `viewportCells` so that the output stays
 * bounded to the visible map area.
 */
function buildWalkPathGeoJson(
	viewportCells: string[],
	hexTileRecords: Record<string, HexTileRecord>,
): WalkPathFeatureCollection {
	const viewportSet = new Set(viewportCells);
	const features: WalkPathFeature[] = [];

	for (const cell of viewportCells) {
		const record = hexTileRecords[cell];
		if (!record?.walkedOn) continue;

		const [centerLat, centerLng] = cellToLatLng(cell);

		// Find all immediate H3 neighbours (ring 1, excluding the cell itself)
		const neighbours = gridDisk(cell, 1).filter((neighbor) => neighbor !== cell);

		for (const neighborH3 of neighbours) {
			// Deduplicate edges: each pair (cell, neighbor) is drawn exactly once by
			// the tile whose H3 index is lexicographically smaller.
			if (cell >= neighborH3) continue;
			// Only draw if the neighbour is also in the viewport and was walked on.
			if (!viewportSet.has(neighborH3)) continue;
			if (!hexTileRecords[neighborH3]?.walkedOn) continue;

			const [nLat, nLng] = cellToLatLng(neighborH3);
			features.push({
				type: 'Feature',
				geometry: {
					type: 'LineString',
					coordinates: [
						[centerLng, centerLat],
						[nLng, nLat],
					],
				},
				properties: {},
			});
		}
	}

	return { type: 'FeatureCollection', features };
}

// ─── Debug position controller ───────────────────────────────────────────────

const DEBUG_MOVE_SPEED_KMH = 500;
const DEBUG_MOVE_SPEED_MAX_KMH = 9999;
const DEBUG_MOVE_INTERVAL_MS = 100;

const JOYSTICK_OUTER_RADIUS = 60;
const JOYSTICK_KNOB_RADIUS = 22;
const JOYSTICK_MAX_DISPLACEMENT = JOYSTICK_OUTER_RADIUS - JOYSTICK_KNOB_RADIUS;

/**
 * Compute lat/lng delta from joystick displacement.
 * When `heading` is provided (heading mode active), the movement vector is
 * rotated so that joystick-up maps to the heading direction rather than north.
 */
function getJoystickDelta(
	dx: number,
	dy: number,
	lat: number,
	maxDisplacement: number,
	speedKmh: number,
	heading?: number,
): { dLat: number; dLng: number } {
	const dist = Math.sqrt(dx * dx + dy * dy);
	if (dist < 2) return { dLat: 0, dLng: 0 };
	const ratio = Math.min(dist / maxDisplacement, 1.0);
	const speedMs = (speedKmh / 3.6) * ratio;
	const metersPerTick = speedMs * (DEBUG_MOVE_INTERVAL_MS / 1000);
	const LAT_DEG_PER_METER = 1 / 111320;
	const cosLat = Math.cos((lat * Math.PI) / 180);
	const LNG_DEG_PER_METER = cosLat > 0.001 ? 1 / (111320 * cosLat) : 1 / 111320;
	const nx = dx / dist;
	const ny = dy / dist;
	// e = East component, n = North component (screen-up = north when heading = 0)
	let e = nx;
	let n = -ny;
	if (heading != null) {
		// Rotate movement clockwise by heading so that joystick-up = forward in heading direction
		const H_rad = (heading * Math.PI) / 180;
		const rotE = e * Math.cos(H_rad) + n * Math.sin(H_rad);
		const rotN = -e * Math.sin(H_rad) + n * Math.cos(H_rad);
		e = rotE;
		n = rotN;
	}
	return {
		dLat: n * metersPerTick * LAT_DEG_PER_METER,
		dLng: e * metersPerTick * LNG_DEG_PER_METER,
	};
}

type JoystickControllerProps = {
	positionRef: React.MutableRefObject<{ lat: number; lng: number } | null>;
	speedKmhRef: React.MutableRefObject<number>;
	onMove: (lat: number, lng: number) => void;
	isHeadingModeRef: React.MutableRefObject<boolean>;
	currentHeadingRef: React.MutableRefObject<number>;
	joystickActiveRef: React.MutableRefObject<boolean>;
	isRecordingRef: React.MutableRefObject<boolean>;
	onHeadingChange: (bearing: number) => void;
};

function JoystickController({ positionRef, speedKmhRef, onMove, isHeadingModeRef, currentHeadingRef, joystickActiveRef, isRecordingRef, onHeadingChange }: JoystickControllerProps) {
	const knobX = useRef(new Animated.Value(0)).current;
	const knobY = useRef(new Animated.Value(0)).current;
	const knobOffsetRef = useRef({ x: 0, y: 0 });
	// Tracks the joystick's own position during a gesture so it accumulates
	// movement independently of positionRef (which GPS may update concurrently).
	const internalPosRef = useRef<{ lat: number; lng: number } | null>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// Keep callback ref up-to-date without recreating PanResponder
	const onHeadingChangeRef = useRef(onHeadingChange);
	onHeadingChangeRef.current = onHeadingChange;

	const stopMoving = useCallback(() => {
		joystickActiveRef.current = false;
		internalPosRef.current = null;
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
		knobOffsetRef.current = { x: 0, y: 0 };
		Animated.spring(knobX, { toValue: 0, useNativeDriver: true }).start();
		Animated.spring(knobY, { toValue: 0, useNativeDriver: true }).start();
	}, [knobX, knobY, joystickActiveRef]);

	const panResponder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: () => true,
			onMoveShouldSetPanResponder: () => true,
			onPanResponderGrant: () => {
				joystickActiveRef.current = true;
				// Snapshot the current GPS/player position so the joystick accumulates
				// its own movement from here without touching positionRef.
				internalPosRef.current = positionRef.current ? { ...positionRef.current } : null;
				if (intervalRef.current) clearInterval(intervalRef.current);
				intervalRef.current = setInterval(() => {
					// Use internal position for delta accumulation; fall back to positionRef
					// only if internal position was never initialised.
					const pos = internalPosRef.current ?? positionRef.current;
					if (!pos) return;
					const { x, y } = knobOffsetRef.current;
					const heading = isHeadingModeRef.current ? currentHeadingRef.current : undefined;
					const { dLat, dLng } = getJoystickDelta(x, y, pos.lat, JOYSTICK_MAX_DISPLACEMENT, speedKmhRef.current, heading);
					// Derive the actual movement bearing and use it as the view heading
					if (Math.abs(dLat) + Math.abs(dLng) > 1e-9) {
						const moveBearing = ((Math.atan2(dLng, dLat) * 180) / Math.PI + 360) % 360;
						currentHeadingRef.current = moveBearing;
						onHeadingChangeRef.current(moveBearing);
					}
					const newLat = pos.lat + dLat;
					const newLng = pos.lng + dLng;
					// Always advance the joystick's own internal position so movement
					// accumulates smoothly even while GPS is updating positionRef.
					internalPosRef.current = { lat: newLat, lng: newLng };
					// During recording, GPS is the authoritative position source, so we
					// must NOT overwrite positionRef (= debugPlayerPositionRef) from the
					// joystick. Only when idle may we update the shared position ref.
					if (!isRecordingRef.current) {
						positionRef.current = { lat: newLat, lng: newLng };
					}
					onMove(newLat, newLng);
				}, DEBUG_MOVE_INTERVAL_MS);
			},
			onPanResponderMove: (_, gestureState) => {
				const dist = Math.sqrt(gestureState.dx ** 2 + gestureState.dy ** 2);
				let cx = gestureState.dx;
				let cy = gestureState.dy;
				if (dist > JOYSTICK_MAX_DISPLACEMENT) {
					cx = (cx / dist) * JOYSTICK_MAX_DISPLACEMENT;
					cy = (cy / dist) * JOYSTICK_MAX_DISPLACEMENT;
				}
				knobX.setValue(cx);
				knobY.setValue(cy);
				knobOffsetRef.current = { x: cx, y: cy };
			},
			onPanResponderRelease: () => stopMoving(),
			onPanResponderTerminate: () => stopMoving(),
		}),
	).current;

	useEffect(() => {
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, []);

	return (
		<View style={styles.joystickOuter} {...panResponder.panHandlers}>
			<Animated.View
				style={[
					styles.joystickKnob,
					{ transform: [{ translateX: knobX }, { translateY: knobY }] },
				]}
			/>
		</View>
	);
}

// ─── Computation constants ────────────────────────────────────────────────────

const DEFAULT_RUNNER_WEIGHT_KG = 75;
const KCAL_PER_KG_PER_KM = 0.9;
const AVERAGE_STRIDE_LENGTH_METERS = 0.77;
const FLUID_BASELINE_DURATION_SECONDS = 3600;
const FLUID_BASELINE_ML = 600;
const GPS_TIME_INTERVAL_MS = 5000;
const GPS_DISTANCE_INTERVAL_METERS = 5;
/**
 * Maximum number of intermediate H3 cells to fill in when a GPS gap is detected
 * (i.e. the straight-line H3 path between two accepted GPS fixes is longer than 1
 * cell). Prevents marking enormous numbers of tiles when the gap is very large.
 */
const GPS_PATH_INTERPOLATION_MAX_CELLS = 200;

// ─── Background task ──────────────────────────────────────────────────────────

const ACTIVITY_LOCATION_TASK = 'geonexia-activity-location';

// Module-level callback invoked from the background task to notify the active component.
// This reference is set when recording starts and cleared when recording stops.
let _onLocationUpdate: ((point: RoutePoint) => void) | null = null;

TaskManager.defineTask(ACTIVITY_LOCATION_TASK, async ({ data, error }: TaskManager.TaskManagerTaskBody) => {
	if (error || !data) return;
	const locations = (data as { locations: Location.LocationObject[] }).locations;
	if (!Array.isArray(locations)) return;
	for (const loc of locations) {
		const point: RoutePoint = {
			lat: loc.coords.latitude,
			lng: loc.coords.longitude,
			altitude: loc.coords.altitude,
			speed: loc.coords.speed,
			timestamp: loc.timestamp,
		};
		if (_onLocationUpdate) {
			_onLocationUpdate(point);
		}
	}
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
	const R = 6371;
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLng = ((lng2 - lng1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Compute the forward bearing (0–360°, clockwise from North) from point 1 to point 2.
 */
function computeBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
	const φ1 = (lat1 * Math.PI) / 180;
	const φ2 = (lat2 * Math.PI) / 180;
	const Δλ = ((lng2 - lng1) * Math.PI) / 180;
	const y = Math.sin(Δλ) * Math.cos(φ2);
	const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
	return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * Ray-casting point-in-polygon test.
 * Polygon is an array of [lng, lat] pairs.
 */
function pointInPolygon(lng: number, lat: number, polygon: Array<[number, number]>): boolean {
	let inside = false;
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const [xi, yi] = polygon[i];
		const [xj, yj] = polygon[j];
		const intersect =
			yi > lat !== yj > lat &&
			lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
		if (intersect) inside = !inside;
	}
	return inside;
}

/**
 * Given a completed run route, find all H3 cells that are enclosed by the
 * route polygon (i.e. inside the loop). Returns an empty array when:
 *   – the route has fewer than 3 points,
 *   – the start and end are more than 300 m apart (not a loop), or
 *   – the H3 library is unavailable.
 */
function findEnclosedCells(routePoints: RoutePoint[], resolution: number): string[] {
	if (!isH3Available() || routePoints.length < 3) return [];

	const first = routePoints[0];
	const last = routePoints[routePoints.length - 1];
	if (haversineKm(first.lat, first.lng, last.lat, last.lng) > 0.3) return [];

	// Route polygon in [lng, lat] order (same as GeoJSON).
	const polygon: Array<[number, number]> = routePoints.map((p) => [p.lng, p.lat]);

	// Bounding box of the route with a small padding.
	const lats = routePoints.map((p) => p.lat);
	const lngs = routePoints.map((p) => p.lng);
	const bounds: ViewportBounds = {
		north: Math.max(...lats) + 0.001,
		south: Math.min(...lats) - 0.001,
		east: Math.max(...lngs) + 0.001,
		west: Math.min(...lngs) - 0.001,
	};

	// Enumerate all H3 cells in the bounding box using the same gridDisk logic
	// as buildH3GeoJson, but with showAlways=true and a high zoom.
	// Use Math.floor to match buildH3GeoJson's base-resolution logic for
	// fractional resolutions (e.g. 10.5 → base res 10).
	const h3Res = Math.max(H3_RESOLUTION_MIN, Math.min(H3_RESOLUTION_MAX, Math.floor(resolution)));
	const centerLat = (bounds.north + bounds.south) / 2;
	const centerLng = (bounds.east + bounds.west) / 2;
	const centerCell = latLngToCell(centerLat, centerLng, h3Res);

	let maxK = 0;
	const corners: Array<[number, number]> = [
		[bounds.north, bounds.east],
		[bounds.north, bounds.west],
		[bounds.south, bounds.east],
		[bounds.south, bounds.west],
	];
	for (const [lat, lng] of corners) {
		try {
			const cornerCell = latLngToCell(lat, lng, h3Res);
			const dist = gridDistance(centerCell, cornerCell);
			if (dist > maxK) maxK = dist;
		} catch {
			// ignore
		}
	}

	const cells = gridDisk(centerCell, Math.min(maxK + 1, 30));
	const enclosed: string[] = [];
	for (const cell of cells) {
		try {
			// cellToLatLng returns [lat, lng]; reorder to [lng, lat] for the test.
			const [cellLat, cellLng] = cellToLatLng(cell);
			if (pointInPolygon(cellLng, cellLat, polygon)) {
				enclosed.push(cell);
			}
		} catch {
			// ignore invalid cells
		}
	}

	return enclosed;
}

function computeStats(points: RoutePoint[]): RunStats {
	if (points.length < 2) {
		const durationSeconds = points.length === 1 ? (Date.now() - points[0].timestamp) / 1000 : 0;
		return {
			distanceKm: 0,
			durationSeconds,
			paceMinPerKm: 0,
			maxSpeedKmh: 0,
			minSpeedKmh: 0,
			avgSpeedKmh: 0,
			kcal: 0,
			steps: 0,
			elevationGainM: 0,
			elevationLossM: 0,
			fluidNeedsMl: 0,
		};
	}

	let distanceKm = 0;
	let elevationGainM = 0;
	let elevationLossM = 0;
	const speedsKmh: number[] = [];

	for (let i = 1; i < points.length; i++) {
		const segKm = haversineKm(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng);
		distanceKm += segKm;

		if (points[i].altitude != null && points[i - 1].altitude != null) {
			const diff = (points[i].altitude as number) - (points[i - 1].altitude as number);
			if (diff > 0) elevationGainM += diff;
			else elevationLossM += Math.abs(diff);
		}

		const dtSec = (points[i].timestamp - points[i - 1].timestamp) / 1000;
		const gpsSpeed = points[i].speed;
		const segSpeedKmh =
			gpsSpeed != null && gpsSpeed >= 0
				? gpsSpeed * 3.6
				: dtSec > 0
				? (segKm / dtSec) * 3600
				: 0;
		if (segSpeedKmh > 0) speedsKmh.push(segSpeedKmh);
	}

	const durationSeconds = (points[points.length - 1].timestamp - points[0].timestamp) / 1000;
	const paceMinPerKm = distanceKm > 0 ? durationSeconds / 60 / distanceKm : 0;
	const maxSpeedKmh = speedsKmh.length > 0 ? Math.max(...speedsKmh) : 0;
	const minSpeedKmh = speedsKmh.length > 0 ? Math.min(...speedsKmh) : 0;
	const avgSpeedKmh = durationSeconds > 0 ? (distanceKm / durationSeconds) * 3600 : 0;
	const kcal = Math.round(distanceKm * DEFAULT_RUNNER_WEIGHT_KG * KCAL_PER_KG_PER_KM);
	const steps = Math.round((distanceKm * 1000) / AVERAGE_STRIDE_LENGTH_METERS);
	const fluidNeedsMl = Math.round((durationSeconds / FLUID_BASELINE_DURATION_SECONDS) * FLUID_BASELINE_ML);

	return {
		distanceKm,
		durationSeconds,
		paceMinPerKm,
		maxSpeedKmh,
		minSpeedKmh,
		avgSpeedKmh,
		kcal,
		steps,
		elevationGainM,
		elevationLossM,
		fluidNeedsMl,
	};
}

function formatDuration(totalSeconds: number): string {
	const h = Math.floor(totalSeconds / 3600);
	const m = Math.floor((totalSeconds % 3600) / 60);
	const s = Math.floor(totalSeconds % 60);
	if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatPace(minPerKm: number): string {
	if (minPerKm <= 0 || !isFinite(minPerKm)) return '--:--';
	const m = Math.floor(minPerKm);
	const s = Math.round((minPerKm - m) * 60);
	return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDistance(km: number): string {
	if (km < 1) return `${Math.round(km * 1000)} m`;
	return `${km.toFixed(2)} km`;
}

// ─── Debug viewport info ─────────────────────────────────────────────────────

type DebugViewportInfo = {
	bounds: ViewportBounds;
	zoom: number;
	tileCount: number;
};

// ─── Run Share Data ───────────────────────────────────────────────────────────

/** Data exported at the end of a run for sharing as JSON / QR code. */
type RunShareData = {
	startedAt: number;
	endedAt: number;
	durationSeconds: number;
	distanceKm: number;
	tiles: {
		/** H3 resolution used during the run */
		h3Resolution: number;
		/** Tiles visited by the user: [h3Index, level] pairs */
		visited: Array<[string, number]>;
		/** Tiles enclosed by the run loop (not walked on): [h3Index, level] pairs */
		enclosed: Array<[string, number]>;
	};
};

// ─── Debug Info Content (shown inside the debug modal) ───────────────────────

type DebugInfoContentProps = {
	info: DebugViewportInfo | null;
	theme: ReturnType<typeof useTheme>['theme'];
	initialShowGridAlways: boolean;
	initialH3Resolution: number;
	initialSpeed: number;
	onShowGridAlwaysChange: (val: boolean) => void;
	onH3ResolutionChange: (val: number) => void;
	onZoomAdjust: (delta: number) => void;
	onSpeedChange: (speed: number) => void;
};

// Precision factor for rounding fractional H3 resolution values (1 decimal place).
const H3_RESOLUTION_DECIMAL_PRECISION = 10;

function DebugInfoContent({
	info,
	theme,
	initialShowGridAlways,
	initialH3Resolution,
	initialSpeed,
	onShowGridAlwaysChange,
	onH3ResolutionChange,
	onZoomAdjust,
	onSpeedChange,
}: DebugInfoContentProps) {
	const h3Available = isH3Available();
	const [showGridAlways, setShowGridAlways] = useState(initialShowGridAlways);
	const [h3Resolution, setH3Resolution] = useState(initialH3Resolution);
	const [speedText, setSpeedText] = useState(String(initialSpeed));

	const handleShowGridAlwaysChange = useCallback((val: boolean) => {
		setShowGridAlways(val);
		onShowGridAlwaysChange(val);
	}, [onShowGridAlwaysChange]);

	const adjustResolution = useCallback((delta: number) => {
		setH3Resolution((prev) => {
			const next = Math.round((prev + delta) * H3_RESOLUTION_DECIMAL_PRECISION) / H3_RESOLUTION_DECIMAL_PRECISION;
			const clamped = Math.max(H3_RESOLUTION_MIN, Math.min(H3_RESOLUTION_MAX, next));
			onH3ResolutionChange(clamped);
			return clamped;
		});
	}, [onH3ResolutionChange]);

	const handleSpeedTextChange = useCallback((text: string) => {
		setSpeedText(text);
		const parsed = parseFloat(text);
		if (!isNaN(parsed) && parsed > 0) {
			onSpeedChange(Math.min(parsed, DEBUG_MOVE_SPEED_MAX_KMH));
		}
	}, [onSpeedChange]);

	const tilesExpected = info != null && (showGridAlways || info.zoom >= H3_MIN_ZOOM);

	const statusColor = !h3Available
		? STATUS_ERROR_COLOR
		: info == null
		? STATUS_WARNING_COLOR
		: !tilesExpected
		? STATUS_WARNING_COLOR
		: info.tileCount > 0
		? STATUS_SUCCESS_COLOR
		: STATUS_ERROR_COLOR;

	const statusText = !h3Available
		? '❌ H3 library failed to initialise'
		: info == null
		? '⚠️ No viewport data yet. Move or zoom the map.'
		: !tilesExpected
		? `⚠️ Zoom in to ≥${H3_MIN_ZOOM} to see tiles`
		: info.tileCount > 0
		? `✅ ${info.tileCount} H3 tiles computed`
		: '❌ 0 tiles – H3 library may not be working';

	const viewportRows: { label: string; value: string }[] = info
		? [
			{ label: 'Tiles Visible', value: tilesExpected ? `${info.tileCount} cells` : `0 (zoom < ${H3_MIN_ZOOM})` },
			{ label: 'North', value: info.bounds.north.toFixed(5) },
			{ label: 'South', value: info.bounds.south.toFixed(5) },
			{ label: 'East', value: info.bounds.east.toFixed(5) },
			{ label: 'West', value: info.bounds.west.toFixed(5) },
		]
		: [];

	return (
		<View style={styles.debugContainer}>
			<View style={[styles.debugStatusBanner, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
				<Text selectable style={[styles.debugStatusText, { color: statusColor }]}>{statusText}</Text>
			</View>

			{/* H3 Library row */}
			<View style={[styles.debugRow, { borderBottomColor: theme.screen.text + '22' }]}>
				<Text selectable style={[styles.debugRowLabel, { color: theme.screen.text }]}>H3 Library</Text>
				<Text selectable style={[styles.debugRowValue, { color: theme.screen.text }]}>
					{h3Available ? '✅ Available' : '❌ Not available'}
				</Text>
			</View>

			{/* Show Grid Always toggle */}
			<View style={[styles.debugRow, { borderBottomColor: theme.screen.text + '22' }]}>
				<Text selectable style={[styles.debugRowLabel, { color: theme.screen.text }]}>Show Grid Always</Text>
				<Switch
					value={showGridAlways}
					onValueChange={handleShowGridAlwaysChange}
					trackColor={{ true: PRIMARY_COLOR }}
					thumbColor="#ffffff"
				/>
			</View>

			{/* H3 Grid Resolution picker */}
			<View style={[styles.debugRow, { borderBottomColor: theme.screen.text + '22' }]}>
				<Text selectable style={[styles.debugRowLabel, { color: theme.screen.text }]}>H3 Grid Resolution</Text>
				<View style={styles.resolutionPickerMultiRow}>
					<View style={styles.resolutionPickerRow}>
						<TouchableOpacity
							style={[styles.resolutionButton, { opacity: h3Resolution <= H3_RESOLUTION_MIN ? 0.4 : 1 }]}
							onPress={() => adjustResolution(-1)}
							disabled={h3Resolution <= H3_RESOLUTION_MIN}
						>
							<Text style={styles.resolutionButtonText}>−</Text>
						</TouchableOpacity>
						<Text style={[styles.resolutionValue, { color: theme.screen.text }]}>
							{Number.isInteger(h3Resolution) ? h3Resolution : h3Resolution.toFixed(1)}
						</Text>
						<TouchableOpacity
							style={[styles.resolutionButton, { opacity: h3Resolution >= H3_RESOLUTION_MAX ? 0.4 : 1 }]}
							onPress={() => adjustResolution(1)}
							disabled={h3Resolution >= H3_RESOLUTION_MAX}
						>
							<Text style={styles.resolutionButtonText}>+</Text>
						</TouchableOpacity>
					</View>
					<View style={styles.resolutionPickerRow}>
						<TouchableOpacity
							style={[styles.resolutionFineButton, { opacity: h3Resolution <= H3_RESOLUTION_MIN ? 0.4 : 1 }]}
							onPress={() => adjustResolution(-0.5)}
							disabled={h3Resolution <= H3_RESOLUTION_MIN}
						>
							<Text style={styles.resolutionFineButtonText}>−0.5</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.resolutionFineButton, { opacity: h3Resolution <= H3_RESOLUTION_MIN ? 0.4 : 1 }]}
							onPress={() => adjustResolution(-0.1)}
							disabled={h3Resolution <= H3_RESOLUTION_MIN}
						>
							<Text style={styles.resolutionFineButtonText}>−0.1</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.resolutionFineButton, { opacity: h3Resolution >= H3_RESOLUTION_MAX ? 0.4 : 1 }]}
							onPress={() => adjustResolution(0.1)}
							disabled={h3Resolution >= H3_RESOLUTION_MAX}
						>
							<Text style={styles.resolutionFineButtonText}>+0.1</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.resolutionFineButton, { opacity: h3Resolution >= H3_RESOLUTION_MAX ? 0.4 : 1 }]}
							onPress={() => adjustResolution(0.5)}
							disabled={h3Resolution >= H3_RESOLUTION_MAX}
						>
							<Text style={styles.resolutionFineButtonText}>+0.5</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>

			{/* Zoom Level row with ±0.1 buttons */}
			<View style={[styles.debugRow, { borderBottomColor: theme.screen.text + '22' }]}>
				<Text selectable style={[styles.debugRowLabel, { color: theme.screen.text }]}>Zoom Level</Text>
				<View style={styles.resolutionPicker}>
					<TouchableOpacity
						style={styles.resolutionButton}
						onPress={() => onZoomAdjust(-0.1)}
					>
						<Text style={styles.resolutionButtonText}>−</Text>
					</TouchableOpacity>
					<Text selectable style={[styles.resolutionValue, { color: theme.screen.text }]}>
						{info != null ? info.zoom.toFixed(2) : '—'}
					</Text>
					<TouchableOpacity
						style={styles.resolutionButton}
						onPress={() => onZoomAdjust(0.1)}
					>
						<Text style={styles.resolutionButtonText}>+</Text>
					</TouchableOpacity>
				</View>
			</View>

			{/* Joystick Speed row */}
			<View style={[styles.debugRow, { borderBottomColor: theme.screen.text + '22' }]}>
				<Text selectable style={[styles.debugRowLabel, { color: theme.screen.text }]}>Joystick Speed (km/h)</Text>
				<TextInput
					style={[styles.debugSpeedInput, { color: theme.screen.text, borderColor: theme.screen.text + '44' }]}
					value={speedText}
					onChangeText={handleSpeedTextChange}
					keyboardType="decimal-pad"
					returnKeyType="done"
					selectTextOnFocus
				/>
			</View>

			{/* Min zoom info row */}
			<View style={[styles.debugRow, { borderBottomColor: theme.screen.text + '22' }]}>
				<Text selectable style={[styles.debugRowLabel, { color: theme.screen.text }]}>Min Zoom for Tiles</Text>
				<Text selectable style={[styles.debugRowValue, { color: theme.screen.text }]}>
					{showGridAlways ? 'disabled (always on)' : String(H3_MIN_ZOOM)}
				</Text>
			</View>

			{/* Viewport rows */}
			{viewportRows.map((row) => (
				<View key={row.label} style={[styles.debugRow, { borderBottomColor: theme.screen.text + '22' }]}>
					<Text selectable style={[styles.debugRowLabel, { color: theme.screen.text }]}>{row.label}</Text>
					<Text selectable style={[styles.debugRowValue, { color: theme.screen.text }]}>{row.value}</Text>
				</View>
			))}
		</View>
	);
}

// ─── OSM Consent Screen ───────────────────────────────────────────────────────

function OsmConsentScreen({ onConsent }: { onConsent: () => void }) {
	return (
		<ScrollView contentContainerStyle={styles.consentContainer}>
			<Ionicons name="map-outline" size={56} color={PRIMARY_COLOR} style={styles.consentIcon} />
			<Text style={styles.consentTitle}>Map display with OpenStreetMap</Text>
			<Text style={styles.consentBody}>
				This map loads map data from{' '}
				<Text style={styles.consentBold}>OpenStreetMap</Text>{' '}
				(openstreetmap.org) and{' '}
				<Text style={styles.consentBold}>OpenFreeMap</Text>{' '}
				(openfreemap.org). Data such as your IP address will be transmitted to
				servers of the OpenStreetMap Foundation and Protomaps LLC.
			</Text>
			<Text style={styles.consentNote}>
				Your consent is saved and will persist across app restarts. You can reset it by clearing the app's data.
			</Text>
			<TouchableOpacity style={styles.consentButton} onPress={onConsent} activeOpacity={0.8}>
				<Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
				<Text style={styles.consentButtonText}>Load map data (Accept)</Text>
			</TouchableOpacity>
		</ScrollView>
	);
}

// ─── Run Share Content (shown inside bottom sheet modal) ──────────────────────

const QR_MAX_BYTES = 2953;

function RunShareContent({ shareData, theme }: { shareData: RunShareData; theme: ReturnType<typeof useTheme>['theme'] }) {
	const compact = JSON.stringify(shareData);
	const pretty = JSON.stringify(shareData, null, 2);
	const showQr = compact.length <= QR_MAX_BYTES;

	const handleCopy = useCallback(async () => {
		await Clipboard.setStringAsync(compact);
		Alert.alert('Copied', 'Run data copied to clipboard.');
	}, [compact]);

	return (
		<View>
			<ScrollView
				horizontal
				style={styles.shareCodeScroll}
				contentContainerStyle={styles.shareCodeContent}
				showsHorizontalScrollIndicator={false}
			>
				<Text style={[styles.shareCodeText, { color: theme.screen.text }]} selectable>
					{pretty}
				</Text>
			</ScrollView>
			<TouchableOpacity style={[styles.shareButton, { backgroundColor: PRIMARY_COLOR }]} onPress={handleCopy} activeOpacity={0.8}>
				<MaterialIcons name="content-copy" size={18} color="#ffffff" />
				<Text style={styles.shareButtonText}>Copy JSON</Text>
			</TouchableOpacity>
			{showQr && (
				<View style={styles.shareQrContainer}>
					<QrCode value={compact} size={220} />
				</View>
			)}
			{!showQr && (
				<Text style={[styles.shareQrHint, { color: theme.screen.text + '88' }]}>
					QR code not available – run data exceeds size limit. Use "Copy JSON" instead.
				</Text>
			)}
		</View>
	);
}

// ─── Run Stats Content (used inside bottom sheet modal) ───────────────────────

function RunStatsContent({ stats, theme, shareData }: { stats: RunStats; theme: ReturnType<typeof useTheme>['theme']; shareData: RunShareData }) {
	const { show: showShareModal } = useMyScrollViewModal();

	const handleShare = useCallback(() => {
		showShareModal({
			title: '📤 Share Run',
			children: <RunShareContent shareData={shareData} theme={theme} />,
		});
	}, [showShareModal, shareData, theme]);

	const rows: { iconName: React.ComponentProps<typeof MaterialIcons>['name']; label: string; value: string }[] = [
		{ iconName: 'straighten', label: 'Distance', value: formatDistance(stats.distanceKm) },
		{ iconName: 'timer', label: 'Duration', value: formatDuration(stats.durationSeconds) },
		{ iconName: 'speed', label: 'Pace', value: formatPace(stats.paceMinPerKm) + ' min/km' },
		{ iconName: 'speed', label: 'Avg. Speed', value: `${stats.avgSpeedKmh.toFixed(1)} km/h` },
		{ iconName: 'arrow-upward', label: 'Max. Speed', value: `${stats.maxSpeedKmh.toFixed(1)} km/h` },
		{ iconName: 'arrow-downward', label: 'Min. Speed', value: `${stats.minSpeedKmh.toFixed(1)} km/h` },
		{ iconName: 'local-fire-department', label: 'Calories', value: `${stats.kcal} kcal` },
		{ iconName: 'directions-walk', label: 'Steps (est.)', value: stats.steps.toLocaleString() },
		{ iconName: 'trending-up', label: 'Elevation Gain', value: `${Math.round(stats.elevationGainM)} m` },
		{ iconName: 'trending-down', label: 'Elevation Loss', value: `${Math.round(stats.elevationLossM)} m` },
		{ iconName: 'water-drop', label: 'Fluid Needs', value: `${stats.fluidNeedsMl} ml` },
	];

	return (
		<>
			{rows.map((row, index) => (
				<View
					key={row.label}
					style={[
						styles.statsRow,
						{ borderBottomColor: theme.screen.text + '22' },
						index === rows.length - 1 && styles.statsRowLast,
					]}
				>
					<MaterialIcons name={row.iconName} size={20} color={theme.screen.icon} style={styles.statsRowIcon} />
					<Text style={[styles.statsRowLabel, { color: theme.screen.text }]}>{row.label}</Text>
					<Text style={[styles.statsRowValue, { color: theme.screen.text }]}>{row.value}</Text>
				</View>
			))}
			<TouchableOpacity style={[styles.shareButton, { backgroundColor: PRIMARY_COLOR }]} onPress={handleShare} activeOpacity={0.8}>
				<MaterialIcons name="share" size={18} color="#ffffff" />
				<Text style={styles.shareButtonText}>Share Run</Text>
			</TouchableOpacity>
		</>
	);
}

// ─── Hex Tile Info Content ─────────────────────────────────────────────────────

function formatTimestamp(ts: number | null): string {
	if (ts === null) return '—';
	return new Date(ts).toLocaleString(undefined, {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

const TILE_THUMB_SIZE = 64;
const TILE_THUMB_GAP = 6;

function HexTileInfoContent({ h3Index }: { h3Index: string }) {
	const { theme } = useTheme();
	const dispatch = useDispatch();
	const record = useSelector((state: RootState) => state.hexTiles.records[h3Index] ?? null);

	const [selectedCategory, setSelectedCategory] = useState<TerrainCategory>('Grass');
	const [terrainSvgUrls, setTerrainSvgUrls] = useState<Map<string, string>>(new Map());
	const [objectSvgUrls, setObjectSvgUrls] = useState<Map<string, string>>(new Map());

	const currentTileImage = record?.tileImage ?? null;
	const currentBillboard = record?.billboard ?? null;

	// Load all terrain SVGs as base64 data URIs for use in the tile picker WebView.
	useEffect(() => {
		loadAllTerrainSvgDataUrls().then(urls => {
			setTerrainSvgUrls(new Map(urls));
		});
	}, []);

	// Load all object sprite SVGs as base64 data URIs for use in the billboard picker WebView.
	useEffect(() => {
		loadAllObjectSvgDataUrls().then(urls => {
			setObjectSvgUrls(new Map(urls));
		});
	}, []);

	const infoRows: { label: string; value: string }[] = [
		{ label: 'H3 Index', value: h3Index },
		{ label: 'Level', value: record ? String(record.level) : '0' },
		{ label: 'Walked On', value: record ? (record.walkedOn ? '✅ Yes' : '⬜ No (enclosed only)') : '⬜ No' },
		{ label: 'Visit Count', value: record ? String(record.visitCount) : '0' },
		{ label: 'Enclosed Count', value: record ? String(record.enclosedCount) : '0' },
		{ label: 'Last Visited', value: record ? formatTimestamp(record.lastVisitedAt) : '—' },
		{ label: 'Last Enclosed', value: record ? formatTimestamp(record.lastEnclosedAt) : '—' },
	];

	// Build the HTML for the WebView-based tile picker using individual terrain SVG data URIs.
	const tilePickerHtml = useMemo(() => {
		if (terrainSvgUrls.size === 0) return null;
		const thumbSize = TILE_THUMB_SIZE;
		const gap = TILE_THUMB_GAP;

		const tileItems = TERRAIN_ASSETS[selectedCategory].map((asset) => {
			const url = terrainSvgUrls.get(asset.key) ?? '';
			const isSelected = currentTileImage === asset.key;
			const border = isSelected ? `2px solid ${PRIMARY_COLOR}` : '2px solid transparent';
			return `<div class="tile" data-key="${asset.key}" style="border:${border};"><img src="${url}" /></div>`;
		}).join('');

		return [
			'<!DOCTYPE html><html>',
			'<head>',
			'<meta name="viewport" content="width=device-width,initial-scale=1">',
			'<style>',
			`*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;}`,
			`html,body{background:transparent;overflow:hidden;}`,
			`.row{display:flex;flex-direction:row;gap:${gap}px;padding:4px 12px 10px;overflow-x:scroll;-webkit-overflow-scrolling:touch;width:100%;}`,
			`.tile{flex-shrink:0;width:${thumbSize}px;height:${thumbSize}px;border-radius:6px;overflow:hidden;cursor:pointer;display:flex;align-items:center;justify-content:center;}`,
			`.tile img{width:100%;height:100%;object-fit:cover;}`,
			'</style>',
			'</head>',
			'<body>',
			`<div class="row">${tileItems}</div>`,
			'<script>',
			`document.querySelectorAll('.tile').forEach(function(el){`,
			`  el.addEventListener('click',function(){window.ReactNativeWebView.postMessage(this.dataset.key);});`,
			`});`,
			'<\/script>',
			'</body></html>',
		].join('');
	}, [terrainSvgUrls, selectedCategory, currentTileImage]);

	// Build the HTML for the WebView-based billboard (object sprite) picker.
	const billboardPickerHtml = useMemo(() => {
		if (objectSvgUrls.size === 0) return null;
		const thumbSize = TILE_THUMB_SIZE;
		const gap = TILE_THUMB_GAP;

		const objectItems = OBJECT_SPRITES.map((sprite, idx) => {
			const key = `objects:${idx}`;
			const url = objectSvgUrls.get(key) ?? '';
			const isSelected = currentBillboard === key;
			const border = isSelected ? `2px solid ${PRIMARY_COLOR}` : '2px solid transparent';
			return `<div class="tile" data-key="${key}" style="border:${border};" title="${sprite.name}"><img src="${url}" /></div>`;
		}).join('');

		return [
			'<!DOCTYPE html><html>',
			'<head>',
			'<meta name="viewport" content="width=device-width,initial-scale=1">',
			'<style>',
			`*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;}`,
			`html,body{background:transparent;overflow:hidden;}`,
			`.row{display:flex;flex-direction:row;gap:${gap}px;padding:4px 12px 10px;overflow-x:scroll;-webkit-overflow-scrolling:touch;width:100%;}`,
			`.tile{flex-shrink:0;width:${thumbSize}px;height:${thumbSize}px;border-radius:6px;overflow:hidden;cursor:pointer;display:flex;align-items:center;justify-content:center;}`,
			`.tile img{width:100%;height:100%;object-fit:contain;}`,
			'</style>',
			'</head>',
			'<body>',
			`<div class="row">${objectItems}</div>`,
			'<script>',
			`document.querySelectorAll('.tile').forEach(function(el){`,
			`  el.addEventListener('click',function(){window.ReactNativeWebView.postMessage(this.dataset.key);});`,
			`});`,
			'<\/script>',
			'</body></html>',
		].join('');
	}, [objectSvgUrls, currentBillboard]);

	return (
		<View style={styles.hexInfoContainer}>
			{/* ── Stats rows ── */}
			{infoRows.map((row, i) => (
				<View
					key={row.label}
					style={[
						styles.hexInfoRow,
						{ borderBottomColor: theme.screen.text + '18' },
						i === infoRows.length - 1 && { borderBottomWidth: 0 },
					]}
				>
					<Text style={[styles.hexInfoLabel, { color: theme.screen.icon }]}>{row.label}</Text>
					<Text style={[styles.hexInfoValue, { color: theme.screen.text }]}>{row.value}</Text>
				</View>
			))}

			{/* ── Tile Image section ── */}
			<SettingsListGroupTitle title="Tile Image" />

			{/* Category tabs */}
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.tilePickerCategoryRow}
			>
				{TERRAIN_CATEGORIES.map((cat) => {
					const isActive = selectedCategory === cat;
					return (
						<TouchableOpacity
							key={cat}
							onPress={() => setSelectedCategory(cat)}
							style={[
								styles.tilePickerCategoryTab,
								{
									backgroundColor: isActive ? PRIMARY_COLOR : theme.screen.text + '18',
								},
							]}
						>
							<Text
								style={[
									styles.tilePickerCategoryLabel,
									{ color: isActive ? '#ffffff' : theme.screen.text },
								]}
							>
								{cat}
							</Text>
						</TouchableOpacity>
					);
				})}
			</ScrollView>

			{/* Thumbnail row */}
			{tilePickerHtml != null ? (
				<WebView
					source={{ html: tilePickerHtml }}
					style={{ height: TILE_THUMB_SIZE + 20, backgroundColor: 'transparent' }}
					originWhitelist={['*']}
					scrollEnabled={true}
					onMessage={event => {
						const key = event.nativeEvent.data;
						if (!key) return;
						dispatch(
							setHexTileCustomization({
								h3Index,
								tileImage: currentTileImage === key ? null : key,
							}),
						);
					}}
				/>
			) : (
				<Text style={[styles.tilePickerCategoryLabel, { color: theme.screen.text + '80', paddingHorizontal: 16, paddingBottom: 10 }]}>
					Loading…
				</Text>
			)}

			{currentTileImage && (
				<View style={styles.tilePickerCurrentRow}>
					<Text style={[styles.tilePickerCurrentLabel, { color: theme.screen.icon }]}>
						Selected: {currentTileImage}
					</Text>
					<TouchableOpacity
						onPress={() => dispatch(setHexTileCustomization({ h3Index, tileImage: null }))}
					>
						<Text style={[styles.tilePickerClearBtn, { color: '#ef4444' }]}>Remove</Text>
					</TouchableOpacity>
				</View>
			)}

			{/* ── Billboard / Object section ── */}
			<SettingsListGroupTitle title="Object" />

			{billboardPickerHtml != null ? (
				<WebView
					source={{ html: billboardPickerHtml }}
					style={{ height: TILE_THUMB_SIZE + 20, backgroundColor: 'transparent' }}
					originWhitelist={['*']}
					scrollEnabled={true}
					onMessage={event => {
						const key = event.nativeEvent.data;
						if (!key) return;
						dispatch(
							setHexTileCustomization({
								h3Index,
								billboard: currentBillboard === key ? null : key,
							}),
						);
					}}
				/>
			) : (
				<Text style={[styles.tilePickerCategoryLabel, { color: theme.screen.text + '80', paddingHorizontal: 16, paddingBottom: 10 }]}>
					Loading…
				</Text>
			)}

			{currentBillboard && (
				<View style={styles.tilePickerCurrentRow}>
					<Text style={[styles.tilePickerCurrentLabel, { color: theme.screen.icon }]}>
						{parseBillboardKey(currentBillboard)?.sprite.name ?? currentBillboard}
					</Text>
					<TouchableOpacity
						onPress={() => dispatch(setHexTileCustomization({ h3Index, billboard: null }))}
					>
						<Text style={[styles.tilePickerClearBtn, { color: '#ef4444' }]}>Remove</Text>
					</TouchableOpacity>
				</View>
			)}

		</View>
	);
}

// ─── Record Screen ─────────────────────────────────────────────────────────────

export default function RecordScreen() {
	const { theme } = useTheme();
	const { show: showModal, close: closeModal } = useMyScrollViewModal();
	const navigation = useNavigation();
	const [osmConsent, setOsmConsent] = useState(false);
	const mapRef = useRef<MyMapHandle>(null);

	// Redux selectors
	const resetToken = useSelector((state: RootState) => state.hexTiles.resetToken);
	const selectedSportType = useSelector((state: RootState) => state.sportType.selectedType);
	const activeTileCount = useSelector((state: RootState) =>
		Object.values(state.hexTiles.records).filter((r) => r.level > 0).length,
	);
	const prevResetTokenRef = useRef<number | null>(null);

	const activeSport = useMemo(
		() => SPORT_TYPES.find((s) => s.type === selectedSportType) ?? SPORT_TYPES[0],
		[selectedSportType],
	);

	const [isRecording, setIsRecording] = useState(false);
	const [elapsedSeconds, setElapsedSeconds] = useState(0);
	const [liveDistanceKm, setLiveDistanceKm] = useState(0);
	const [liveSpeedKmh, setLiveSpeedKmh] = useState<number | null>(null);

	// Follow mode: when active the map stays centred on the user's location.
	// Starts as true so the map tracks the user by default.
	const isFollowingRef = useRef(true);
	const [isFollowing, setIsFollowing] = useState(true);

	const [isPaused, setIsPaused] = useState(false);
	const isPausedRef = useRef(false);
	const accumulatedSecondsRef = useRef(0);

	const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

	// Debug: last viewport info for the debug modal (ref avoids stale closure issues).
	const debugViewportRef = useRef<DebugViewportInfo | null>(null);

	// H3 grid settings (refs for synchronous access in callbacks)
	const showGridAlwaysRef = useRef(false);
	const [showGridAlways, setShowGridAlways] = useState(false);
	const h3ResolutionRef = useRef(H3_DEFAULT_RESOLUTION);
	const [h3Resolution, setH3Resolution] = useState(H3_DEFAULT_RESOLUTION);

	// Heading mode: when active during recording, the map rotates to face the
	// direction of travel. Toggled by the compass button.
	const isHeadingModeRef = useRef(false);
	const [isHeadingMode, setIsHeadingMode] = useState(false);

	// Initial center for MyMap, populated from the last known GPS position before
	// the WebView mounts so that the map never starts at the Germany default.
	const [mapInitialCenter, setMapInitialCenter] = useState<{ lat: number; lng: number } | undefined>(undefined);
	// Becomes true once the last-known-position fetch has completed (or failed),
	// preventing MyMap from mounting before we have an initial center to offer.
	const [mapCanRender, setMapCanRender] = useState(false);

	// Current view heading (degrees clockwise from north). Updated by device
	// compass or joystick movement direction when heading mode is active.
	const currentHeadingRef = useRef(0);
	// True while the joystick is being actively used; suppresses compass updates.
	const joystickActiveRef = useRef(false);

	const dispatch = useDispatch();

	// ── Tile image / model overlay sync ────────────────────────────────────────

	// True once the MapLibre WebView has fired MapComponentMounted and is ready
	// to receive overlay messages.
	const mapWebViewReadyRef = useRef(false);

	// Cache: asset key → base64 data URL, so assets are only read from disk once.
	const assetUrlCacheRef = useRef<Map<string, string>>(new Map());

	// Stable string that represents the current tile customizations.
	// Primitive return value means useSelector will only trigger a re-render when
	// the actual customization values change (not on every GPS update).
	const hexTileCustomizationsKey = useSelector((state: RootState) =>
		Object.entries(state.hexTiles.records)
			.filter(([, r]) => r.tileImage || r.billboard)
			.map(([h3, r]) => `${h3}=${r.tileImage ?? ''}|${r.billboard ?? ''}`)
			.sort()
			.join('\n'),
	);

	// Load a bundled asset (PNG) and return a base64 data URI (native) or the bundled
	// asset URL (web).  Using data URIs avoids canvas-taint security errors when drawing PNG files
	// onto an HTML Canvas.
	// Results are cached in assetUrlCacheRef so each file is read only once per session.
	const loadAssetUrl = useCallback(async (cacheKey: string, moduleId: number, mimeType: string): Promise<string | null> => {
		const cached = assetUrlCacheRef.current.get(cacheKey);
		if (cached) return cached;
		try {
			const asset = Asset.fromModule(moduleId);
			await asset.downloadAsync();
			let url: string;
			if (Platform.OS === 'web') {
				url = asset.uri;
			} else {
				if (!asset.localUri) return null;
				// Read the asset as a base64-encoded data URI so the WebView can use it
				// directly without any file:// cross-origin or canvas-taint restrictions.
				const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
					encoding: FileSystem.EncodingType.Base64,
				});
				url = `data:${mimeType};base64,${base64}`;
			}
			assetUrlCacheRef.current.set(cacheKey, url);
			return url;
		} catch (e) {
			console.warn(`[RecordScreen] Failed to load asset ${cacheKey}:`, e);
			return null;
		}
	}, []);

	// Build and send imageOverlays to the map based on current Redux state.
	const loadAndSendCustomizations = useCallback(async () => {
		if (!mapWebViewReadyRef.current || !mapRef.current) return;

		const records = store.getState().hexTiles.records;

		// Flat lookup: terrain asset key → module ID
		const terrainLookup = new Map<string, number>();
		for (const assets of Object.values(TERRAIN_ASSETS)) {
			for (const entry of assets) {
				terrainLookup.set(entry.key, entry.source as number);
			}
		}

		type ImageOverlay = {
			id: string;
			url: string;
			coordinates: [[number, number], [number, number], [number, number], [number, number]];
			opacity: number;
			// Actual H3 hex vertices in [lng, lat] order for precise canvas clipping.
			polygonCoords: [number, number][];
			// Bearing from hex center to its first vertex (radians, 0 = North, CW positive).
			// Used to rotate the texture so it aligns with the H3 hex orientation.
			rotation: number;
		};

		const imageOverlays: ImageOverlay[] = [];

		for (const [h3Index, record] of Object.entries(records)) {
			// ── Tile image overlay ──────────────────────────────────────────────
			if (record.tileImage) {
				const moduleId = terrainLookup.get(record.tileImage);
				if (moduleId !== undefined) {
					const url = await loadAssetUrl(`terrain:${record.tileImage}`, moduleId, 'image/svg+xml');
					if (url) {
						// Compute the bounding box of the hexagon in [lng, lat] GeoJSON order.
						const boundary = cellToBoundary(h3Index); // [[lat, lng], ...]
						if (boundary.length >= 3) {
							let minLat = Infinity, maxLat = -Infinity;
							let minLng = Infinity, maxLng = -Infinity;
							for (const [lat, lng] of boundary) {
								if (lat < minLat) minLat = lat;
								if (lat > maxLat) maxLat = lat;
								if (lng < minLng) minLng = lng;
								if (lng > maxLng) maxLng = lng;
							}
							// Compute the geographic bearing (azimuth) from the hex center to its first
							// vertex. Math.cos(centerLat) corrects the longitude delta for the fact that
							// 1° of longitude covers less ground at higher latitudes. atan2(x, y) with
							// (dlng, dlat) gives the angle measured clockwise from North, which is the
							// standard geographic convention (0 = North, π/2 = East).
							const centerLat = (minLat + maxLat) / 2;
							const centerLng = (minLng + maxLng) / 2;
							const v0 = boundary[0];
							const dlat = v0[0] - centerLat;
							const dlng = (v0[1] - centerLng) * Math.cos(centerLat * Math.PI / 180);
							const rotation = Math.atan2(dlng, dlat); // radians CW from North
							imageOverlays.push({
								id: `tile-img-${h3Index}`,
								url,
								// MapLibre image source format: top-left, top-right, bottom-right, bottom-left
								coordinates: [
									[minLng, maxLat],
									[maxLng, maxLat],
									[maxLng, minLat],
									[minLng, minLat],
								],
								opacity: 0.9,
								// Actual hex vertices in [lng, lat] for canvas polygon clipping.
								polygonCoords: boundary.map(([lat, lng]) => [lng, lat] as [number, number]),
								rotation,
							});
						}
					}
				}
			}
		}

		// ── Billboard markers ────────────────────────────────────────────────────
		type BillboardMarker = {
			id: string;
			position: { lat: number; lng: number };
			icon: string;
			size: [number, number];
			iconAnchor: [number, number];
		};
		const billboardMarkers: BillboardMarker[] = [];

		// Scale billboard pixel size by the current H3 resolution so that billboards
		// stay proportional to the hexagon visual size at resolution 10 (default).
		// townhall (scaleFactor 7.0) renders at 7 × BILLBOARD_UNIT_PX ≈ 288 px.
		// Higher resolutions (smaller hexagons) shrink billboards proportionally.
		const h3Res = Math.max(H3_RESOLUTION_MIN, Math.min(H3_RESOLUTION_MAX, Math.floor(h3ResolutionRef.current)));
		const hexEdgeRef = H3_EDGE_LENGTH_KM[10]!;
		const hexEdgeCur = H3_EDGE_LENGTH_KM[h3Res]!;
		const hexScaleRatio = hexEdgeCur / hexEdgeRef;

		for (const [h3Index, record] of Object.entries(records)) {
			if (!record.billboard) continue;
			const parsed = parseBillboardKey(record.billboard);
			if (!parsed) continue;
			const { sprite } = parsed;
			const url = await loadAssetUrl(record.billboard, sprite.source as number, 'image/svg+xml');
			if (!url) continue;
			// Compute the centroid of the hexagon polygon by averaging its boundary
			// vertices, matching how buildCentersGeoJson computes purple dot positions
			// in hexTileScript. The ring is closed (last vertex = first), so exclude
			// the last vertex when averaging.
			const boundary = cellToBoundary(h3Index, H3_GEOJSON_ORDER); // [[lng, lat], ...]
			let sumLng = 0, sumLat = 0;
			const n = boundary.length - 1;
			if (n <= 0) continue; // skip if boundary is empty or degenerate
			for (let j = 0; j < n; j++) {
				const [bLng, bLat] = boundary[j] as [number, number];
				sumLng += bLng;
				sumLat += bLat;
			}
			const lng = sumLng / n;
			const lat = sumLat / n;
			// Compute the pixel size for this sprite, applying its scaleFactor and the
			// current H3 resolution scale.  Minimum 8 px to keep tiny sprites visible.
			const billboardSizePx = Math.max(8, Math.round(BILLBOARD_UNIT_PX * sprite.scaleFactor * hexScaleRatio));
			// anchorY is a fraction of height (0=top, 1=bottom, 0.5=center).
			// The X anchor is always the horizontal center of the square icon.
			const anchorYPx = Math.round(sprite.anchorY * billboardSizePx);
			billboardMarkers.push({
				id: `billboard-${h3Index}`,
				position: { lat, lng },
				icon: `<img src="${url}" style="width:100%;height:100%;object-fit:contain;pointer-events:none;">`,
				size: [billboardSizePx, billboardSizePx],
				iconAnchor: [billboardSizePx / 2, anchorYPx],
			});
		}

		mapRef.current.sendToMap({
			imageOverlays,
			mapMarkers: billboardMarkers,
			// Always use the fixed DEFAULT_REFERENCE_ZOOM so that billboard pixel
			// sizes stay consistent relative to the current zoom level regardless
			// of when loadAndSendCustomizations was last called.  Using the live
			// map zoom here would shift the reference anchor on every h3-level
			// change, causing billboards to appear at the wrong scale after
			// toggling the level back to its original value.
			mapMarkersReferenceZoom: DEFAULT_REFERENCE_ZOOM,
		});
	}, [loadAssetUrl]);

	// Re-send customizations whenever tile image / model selections change, or when the
	// H3 resolution changes (billboard pixel sizes depend on the current resolution).
	useEffect(() => {
		loadAndSendCustomizations();
	}, [hexTileCustomizationsKey, loadAndSendCustomizations, h3Resolution]);


	useLayoutEffect(() => {
		navigation.setOptions({
			title: `${activeTileCount} Felder`,
		});
	}, [navigation, activeTileCount]);

	// When the hex tile data is reset, reload the map with an empty GeoJSON so
	// the old (now deleted) tiles are cleared immediately without an app restart.
	useEffect(() => {
		if (prevResetTokenRef.current === null) {
			// First render: record the initial token, don't treat it as a reset.
			prevResetTokenRef.current = resetToken;
			return;
		}
		if (resetToken === prevResetTokenRef.current) return;
		prevResetTokenRef.current = resetToken;
		mapRef.current?.sendToMap({
			hexTileGeoJson: { type: 'FeatureCollection', features: [] },
		});
	}, [resetToken]);

	const setFollowMode = useCallback((val: boolean) => {
		isFollowingRef.current = val;
		setIsFollowing(val);
	}, []);

	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const startTimeRef = useRef<number>(0);
	const routePointsRef = useRef<RoutePoint[]>([]);
	// Foreground-only fallback subscription (used when background permission is denied)
	const fgSubRef = useRef<Location.LocationSubscription | null>(null);

	// Visited H3 hex cells during the active recording (used for immediate GeoJSON updates;
	// persistent data lives in the Redux store)
	const visitedHexIdsRef = useRef<Set<string>>(new Set());
	// The last H3 cell visited; used to detect cell transitions in handleLocationUpdate.
	const lastCellRef = useRef<string | null>(null);
	// Current player position (updated from real GPS and from debug gamepad)
	const debugPlayerPositionRef = useRef<{ lat: number; lng: number } | null>(null);
	// Joystick speed, configurable from the debug modal
	const debugMoveSpeedKmhRef = useRef(DEBUG_MOVE_SPEED_KMH);
	// Mirrors isRecording state for use inside callbacks without stale closures
	const isRecordingRef = useRef(false);
	// Last GPS point that passed the speed filter; used to detect unrealistic jumps.
	// Reset to null at the start of each recording.
	const lastAcceptedGpsPointRef = useRef<RoutePoint | null>(null);
	// Set to true once the user moves the player via the joystick during a recording.
	// While true, incoming GPS updates no longer override the visual player position.
	// Reset to false when a new recording starts or ends.
	const movedPlayerManuallyRef = useRef(false);
	// Ref mirror of selectedSportType so callbacks can read it without stale closures.
	const selectedSportTypeRef = useRef<SportType>(selectedSportType);
	selectedSportTypeRef.current = selectedSportType;

	const centerMapOnPosition = useCallback((pos: { lat: number; lng: number }) => {
		if (!mapRef.current) return;
		mapRef.current.sendToMap({ userLocation: { lat: pos.lat, lng: pos.lng } });
		mapRef.current.sendToMap({
			mapCenterPosition: { lat: pos.lat, lng: pos.lng },
			easeAnimation: true,
			easeDuration: 800,
		});
	}, []);

	// Load persisted OSM consent on mount
	useEffect(() => {
		loadOsmConsent().then((consented) => {
			if (consented) setOsmConsent(true);
		});
	}, []);

	useEffect(() => {
		return () => {
			// Cleanup on unmount: stop any active tracking
			_onLocationUpdate = null;
			fgSubRef.current?.remove();
			if (timerRef.current) clearInterval(timerRef.current);
			Location.stopLocationUpdatesAsync(ACTIVITY_LOCATION_TASK).catch(() => {});
		};
	}, []);

	// Pre-populate debug player position from last known location once consent is given
	useEffect(() => {
		if (!osmConsent) return;

		// Start compass heading subscription once the user has consented to location usage
		let headingSub: Location.LocationSubscription | null = null;
		let active = true;
		Location.watchHeadingAsync((headingData) => {
			// Prefer true heading; fall back to magnetic heading
			const deg = headingData.trueHeading >= 0 ? headingData.trueHeading : headingData.magHeading;
			// Always update the cone on the map
			mapRef.current?.sendToMap({ userHeading: deg });
			// Joystick overrides heading while active; only update from compass when idle
			if (joystickActiveRef.current) return;
			currentHeadingRef.current = deg;
			// Rotate map bearing in heading mode
			if (isHeadingModeRef.current) {
				mapRef.current?.sendToMap({ bearing: deg, easeAnimation: true, easeDuration: 200 });
			}
		}).then((sub) => {
			if (active) {
				headingSub = sub;
			} else {
				sub.remove();
			}
		}).catch((err) => {
			console.warn('[RecordScreen] watchHeadingAsync failed:', err);
		});


		Location.getLastKnownPositionAsync()
			.then((loc) => {
				if (loc && !debugPlayerPositionRef.current) {
					const pos = { lat: loc.coords.latitude, lng: loc.coords.longitude };
					debugPlayerPositionRef.current = pos;
					setMapInitialCenter(pos);
					centerMapOnPosition(pos);
				}
				setMapCanRender(true);
			})
			.catch((err) => {
				console.warn('[RecordScreen] getLastKnownPositionAsync failed:', err);
				setMapCanRender(true);
			});

		return () => {
			active = false;
			headingSub?.remove();
		};
	}, [osmConsent, centerMapOnPosition]);

	const handleConsent = useCallback(() => {
		setOsmConsent(true);
		saveOsmConsent(true);
	}, []);

	const sendRouteToMap = useCallback((points: RoutePoint[]) => {
		if (!mapRef.current) return;
		const coords = points.map((p) => [p.lng, p.lat]);
		mapRef.current.sendToMap({ routeCoordinates: coords });
	}, []);

	const recomputeH3 = useCallback(() => {
		const vp = debugViewportRef.current;
		if (!vp || !mapRef.current) return;
		let geoJson: H3FeatureCollection = { type: 'FeatureCollection', features: [] };
		try {
			geoJson = buildH3GeoJson(vp.bounds, vp.zoom, h3ResolutionRef.current, showGridAlwaysRef.current, store.getState().hexTiles.records);
		} catch (err) {
			console.warn('[RecordScreen] buildH3GeoJson failed:', err);
		}
		debugViewportRef.current = { ...vp, tileCount: geoJson.features.length };
		mapRef.current.sendToMap({ hexTileGeoJson: geoJson });
	}, []);

	const handleShowGridAlwaysChange = useCallback((val: boolean) => {
		showGridAlwaysRef.current = val;
		setShowGridAlways(val);
		recomputeH3();
	}, [recomputeH3]);

	const handleH3ResolutionChange = useCallback((val: number) => {
		h3ResolutionRef.current = val;
		setH3Resolution(val);
		recomputeH3();
	}, [recomputeH3]);

	const handleZoomAdjust = useCallback((delta: number) => {
		const currentZoom = debugViewportRef.current?.zoom ?? 14;
		mapRef.current?.sendToMap({ zoomTo: currentZoom + delta, easeDuration: 200 });
	}, []);

	const handleSpeedChange = useCallback((speed: number) => {
		debugMoveSpeedKmhRef.current = speed;
	}, []);

	const showHexTileModal = useCallback((h3Index: string) => {
		showModal({
			title: '🗺️ Hex Tile Info',
			onClose: closeModal,
			children: (
				<HexTileInfoContent h3Index={h3Index} />
			),
		});
	}, [showModal, closeModal]);

	const handleMapMessage = useCallback((data: object) => {
		const msg = data as { tag?: string };
		if (msg.tag === 'MapComponentMounted') {
			mapWebViewReadyRef.current = true;
			// Activate hex tile layer. strokeColor is intentionally omitted so that
			// the default gray value defined in hexTileScript.ts is preserved.
			mapRef.current?.sendToMap({
				hexTileLayer: { color: 'rgba(0, 0, 0, 0)' },
			});
			if (routePointsRef.current.length > 0) {
				sendRouteToMap(routePointsRef.current);
			}
			const pos = debugPlayerPositionRef.current;
			if (pos) {
				centerMapOnPosition(pos);
			}
			// Send any already-selected tile images to the map.
			loadAndSendCustomizations();
		} else if (msg.tag === 'MapInteracted') {
			setFollowMode(false);
		} else if (msg.tag === 'MapViewportChanged') {
			const vp = msg as { bounds: ViewportBounds; zoom: number };
			let geoJson: H3FeatureCollection = { type: 'FeatureCollection', features: [] };
			try {
				geoJson = buildH3GeoJson(vp.bounds, vp.zoom, h3ResolutionRef.current, showGridAlwaysRef.current, store.getState().hexTiles.records);
			} catch (err) {
				console.warn('[RecordScreen] buildH3GeoJson failed:', err);
			}
			debugViewportRef.current = { bounds: vp.bounds, zoom: vp.zoom, tileCount: geoJson.features.length };
			const viewportCells = [...new Set(geoJson.features.map((f) => f.properties.h3Index))];
			const walkPathGeoJson = buildWalkPathGeoJson(viewportCells, store.getState().hexTiles.records);
			mapRef.current?.sendToMap({ hexTileGeoJson: geoJson });
			mapRef.current?.sendToMap({ hexWalkPathGeoJson: walkPathGeoJson });
		} else if (msg.tag === 'HexTileClicked') {
			const clickedMsg = msg as { h3Index?: string };
			if (clickedMsg.h3Index) {
				showHexTileModal(clickedMsg.h3Index);
			}
		}
	}, [centerMapOnPosition, sendRouteToMap, setFollowMode, showHexTileModal, loadAndSendCustomizations]);

	const showDebugModal = useCallback(() => {
		const info = debugViewportRef.current;
		showModal({
			title: '🔍 Hex Tile Debug',
			onClose: closeModal,
			children: (
				<DebugInfoContent
					info={info}
					theme={theme}
					initialShowGridAlways={showGridAlwaysRef.current}
					initialH3Resolution={h3ResolutionRef.current}
					initialSpeed={debugMoveSpeedKmhRef.current}
					onShowGridAlwaysChange={handleShowGridAlwaysChange}
					onH3ResolutionChange={handleH3ResolutionChange}
					onZoomAdjust={handleZoomAdjust}
					onSpeedChange={handleSpeedChange}
				/>
			),
		});
	}, [showModal, closeModal, theme, handleShowGridAlwaysChange, handleH3ResolutionChange, handleZoomAdjust, handleSpeedChange]);

	const showActivityTypeModal = useCallback(() => {
		showModal({
			title: '🏃 Select Activity Type',
			onClose: closeModal,
			children: (
				<View>
					<SettingsListGroupTitle title="Sport" />
					{SPORT_TYPES.map((sportDef, i) => {
						const position =
							i === 0 ? 'top' : i === SPORT_TYPES.length - 1 ? 'bottom' : 'middle';
						const icon =
							sportDef.iconLibrary === 'MaterialCommunityIcons' ? (
								<MaterialCommunityIcons
									name={sportDef.iconName as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
									size={22}
									color="#ffffff"
								/>
							) : (
								<MaterialIcons
									name={sportDef.iconName as React.ComponentProps<typeof MaterialIcons>['name']}
									size={22}
									color="#ffffff"
								/>
							);
						return (
							<SettingsListSelectOptionSingle
								key={sportDef.type}
								label={sportDef.label}
								leftIcon={icon}
								iconBgColor={sportDef.color}
								selectionColor={sportDef.color}
								isSelected={selectedSportType === sportDef.type}
								onPress={() => {
									dispatch(setSportType(sportDef.type));
									closeModal();
								}}
								groupPosition={position}
							/>
						);
					})}
				</View>
			),
		});
	}, [showModal, closeModal, dispatch, selectedSportType]);

	const handleLocationUpdate = useCallback((point: RoutePoint, fromJoystick = false) => {
		if (isPausedRef.current) {
			// During pause: update the visual player position but do NOT record GPS points
			// or mark hex tiles. Both real GPS and joystick movement are allowed so the
			// player marker stays live while the run is paused.
			//
			// For real GPS: skip if the user already overrode the position with the
			// joystick before pausing – this mirrors the active-recording behaviour and
			// prevents GPS from snapping the marker back while the user navigates
			// virtually during the pause.
			const shouldUpdate = fromJoystick || !movedPlayerManuallyRef.current;
			if (shouldUpdate) {
				debugPlayerPositionRef.current = { lat: point.lat, lng: point.lng };
				mapRef.current?.sendToMap({ userLocation: { lat: point.lat, lng: point.lng } });
				centerMapOnPosition({ lat: point.lat, lng: point.lng });
				// Advance the accepted-point ref for real GPS so the speed filter works
				// correctly on the first GPS point recorded after resume.
				if (!fromJoystick) {
					lastAcceptedGpsPointRef.current = point;
				}
			}
			return;
		}

		// ── GPS speed filter (real GPS only) ─────────────────────────────────────
		// If the implied speed between the last accepted GPS fix and this one is
		// unrealistically high for the selected sport, discard the point as a GPS
		// glitch / noise spike.
		if (!fromJoystick) {
			// While the joystick is actively held during a recording, skip GPS
			// route points entirely. The joystick is providing the authoritative
			// position; adding a real GPS fix would create a visible jump in the
			// recorded route from the virtual joystick position back to the
			// physical GPS location.
			if (isRecordingRef.current && (joystickActiveRef.current || movedPlayerManuallyRef.current)) {
				return;
			}

			const lastAccepted = lastAcceptedGpsPointRef.current;
			if (lastAccepted) {
				const distKm = haversineKm(lastAccepted.lat, lastAccepted.lng, point.lat, point.lng);
				const dtSec = (point.timestamp - lastAccepted.timestamp) / 1000;
				if (dtSec > 0) {
					const impliedSpeedKmh = (distKm / dtSec) * 3600;
					const activeSportDef = SPORT_TYPES.find((s) => s.type === selectedSportTypeRef.current);
					const maxSpeedKmh = activeSportDef?.maxSpeedKmh ?? 250;
					if (impliedSpeedKmh > maxSpeedKmh) {
						console.warn(
							`[RecordScreen] GPS point filtered: implied speed ${impliedSpeedKmh.toFixed(1)} km/h` +
							` exceeds max ${maxSpeedKmh} km/h for sport "${selectedSportTypeRef.current}".`,
						);
						return;
					}
				}
			}
			lastAcceptedGpsPointRef.current = point;
		}

		const next = [...routePointsRef.current, point];
		routePointsRef.current = next;

		// Update the visual player position only from GPS and only when the user
		// has not already overridden it via the joystick during this recording.
		if (!fromJoystick && !movedPlayerManuallyRef.current) {
			debugPlayerPositionRef.current = { lat: point.lat, lng: point.lng };
		}

		// Track the visited H3 cell and dispatch to Redux for persistent storage
		if (isH3Available()) {
			try {
				// Use the same base integer resolution as buildH3GeoJson so that the
				// visited cell ID matches the keys in the GeoJSON and the Redux records.
				// For fractional resolutions (e.g. 10.5) buildH3GeoJson uses Math.floor
				// as the base and subdivides into children; visits are tracked at the base
				// (parent) resolution so the colour update propagates to all sub-tiles.
				const h3Res = Math.max(H3_RESOLUTION_MIN, Math.min(H3_RESOLUTION_MAX, Math.floor(h3ResolutionRef.current)));
				const cell = latLngToCell(point.lat, point.lng, h3Res);
				if (cell) {
					// ── GPS gap interpolation ─────────────────────────────────────────
					// When moving from lastCellRef to the new cell, fill in all H3 cells
					// on the straight-line path between them. This handles GPS dropouts
					// where the device had no signal for several updates: tiles the user
					// actually passed through are still counted as visited.
					if (lastCellRef.current && cell !== lastCellRef.current) {
						try {
							const pathCells = gridPathCells(lastCellRef.current, cell);
							// pathCells[0] is lastCellRef (already visited), pathCells[last] is
							// `cell` which will be processed below. Only fill when the gap is
							// within a reasonable bound to avoid marking thousands of tiles on a
							// very long GPS outage.
							// pathCells.length - 2 is the number of intermediate cells (excludes
							// first and last), so `<= GPS_PATH_INTERPOLATION_MAX_CELLS` allows
							// exactly that many intermediate cells at most.
							if (pathCells.length - 2 <= GPS_PATH_INTERPOLATION_MAX_CELLS) {
								for (let i = 1; i < pathCells.length - 1; i++) {
									const intermediate = pathCells[i];
									if (!visitedHexIdsRef.current.has(intermediate)) {
										visitedHexIdsRef.current.add(intermediate);
										dispatch(markVisited({ h3Indices: [intermediate], timestamp: point.timestamp }));
									}
								}
							}
						} catch (pathErr) {
							// gridPathCells can throw when the two cells are on different
							// icosahedron faces – log at warn level for diagnosability and continue.
							console.warn('[RecordScreen] gridPathCells failed during gap interpolation:', pathErr);
						}
					}

					// Only count each tile once per run so the level can rise by at most
					// one step during a single activity.
					if (!visitedHexIdsRef.current.has(cell)) {
						visitedHexIdsRef.current.add(cell);
						dispatch(markVisited({ h3Indices: [cell], timestamp: point.timestamp }));
					}
					if (cell !== lastCellRef.current) {
						lastCellRef.current = cell;
					}
				}
			} catch (err) {
				console.warn('[RecordScreen] latLngToCell failed for visited hex tracking:', err);
			}
		}

		// If heading mode is active, rotate the map smoothly to face movement direction.
		if (isHeadingModeRef.current && next.length >= 2) {
			const prev = next[next.length - 2];
			const bearing = computeBearing(prev.lat, prev.lng, point.lat, point.lng);
			mapRef.current?.sendToMap({ bearing, easeAnimation: true, easeDuration: 500 });
		}

		let d = 0;
		for (let i = 1; i < next.length; i++) {
			d += haversineKm(next[i - 1].lat, next[i - 1].lng, next[i].lat, next[i].lng);
		}
		setLiveDistanceKm(d);

		if (point.speed != null && point.speed >= 0) {
			setLiveSpeedKmh(point.speed * 3.6);
		}

		sendRouteToMap(next);

		// Centre the map on the new position:
		//  – Joystick updates always re-centre (the user is actively navigating).
		//  – GPS updates only re-centre when the user has not overridden with the joystick.
		if (fromJoystick || !movedPlayerManuallyRef.current) {
			centerMapOnPosition({ lat: point.lat, lng: point.lng });
		}

		// Refresh hex GeoJSON to show updated tile levels (includes the just-dispatched visit)
		const vp = debugViewportRef.current;
		if (vp && mapRef.current) {
			let geoJson: H3FeatureCollection = { type: 'FeatureCollection', features: [] };
			try {
				geoJson = buildH3GeoJson(vp.bounds, vp.zoom, h3ResolutionRef.current, showGridAlwaysRef.current, store.getState().hexTiles.records);
			} catch (err) {
				console.warn('[RecordScreen] buildH3GeoJson failed during location update:', err);
			}
			debugViewportRef.current = { ...vp, tileCount: geoJson.features.length };
			const viewportCells = [...new Set(geoJson.features.map((f) => f.properties.h3Index))];
			const walkPathGeoJson = buildWalkPathGeoJson(viewportCells, store.getState().hexTiles.records);
			mapRef.current.sendToMap({ hexTileGeoJson: geoJson });
			mapRef.current.sendToMap({ hexWalkPathGeoJson: walkPathGeoJson });
		}
	}, [centerMapOnPosition, sendRouteToMap, dispatch]);

	// Moves the player to a new position (used by the debug gamepad).
	// During recording the joystick acts as a GPS substitute: every movement is
	// forwarded to handleLocationUpdate so route points are recorded just like
	// real GPS fixes.  When not recording the joystick has full control of the
	// player position without recording anything.
	const handleDebugMove = useCallback((lat: number, lng: number) => {
		if (isRecordingRef.current) {
			// Only mark as manually moved when actively recording (not paused) so that
			// GPS can take back control of the player position after a pause/resume.
			if (!isPausedRef.current) {
				movedPlayerManuallyRef.current = true;
			}
			// During recording, forward to handleLocationUpdate as a synthetic route
			// point. During pause, handleLocationUpdate will perform a visual-only
			// update (no recording).
			handleLocationUpdate({
				lat,
				lng,
				altitude: null,
				speed: debugMoveSpeedKmhRef.current / 3.6,
				timestamp: Date.now(),
			}, true);
		} else {
			debugPlayerPositionRef.current = { lat, lng };
			mapRef.current?.sendToMap({ userLocation: { lat, lng } });
			if (isFollowingRef.current) {
				mapRef.current?.sendToMap({
					mapCenterPosition: { lat, lng },
					easeAnimation: true,
					easeDuration: DEBUG_MOVE_INTERVAL_MS,
				});
			}
		}
	}, [handleLocationUpdate]);

	// Called by the joystick when the movement direction changes.
	// Updates the view cone and, in heading mode, the map bearing.
	const handleHeadingChange = useCallback((bearing: number) => {
		mapRef.current?.sendToMap({ userHeading: bearing });
		if (isHeadingModeRef.current) {
			mapRef.current?.sendToMap({ bearing, easeAnimation: true, easeDuration: 100 });
		}
	}, []);

	const startRecording = useCallback(async () => {
		const expoGo = isRunningInExpoGo();
		console.log('[RecordScreen] startRecording called. isRunningInExpoGo:', expoGo);
		try {
			console.log('[RecordScreen] Requesting foreground location permission...');
			const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
			console.log('[RecordScreen] Foreground permission status:', fgStatus);
			if (fgStatus !== 'granted') {
				Alert.alert('GPS', 'Location permission is required for run recording.');
				return;
			}

			routePointsRef.current = [];
			visitedHexIdsRef.current = new Set();
			lastCellRef.current = null;
			lastAcceptedGpsPointRef.current = null;
			movedPlayerManuallyRef.current = false;
			dispatch(startRun());
			startTimeRef.current = Date.now();
			accumulatedSecondsRef.current = 0;
			isPausedRef.current = false;
			setIsPaused(false);
			setElapsedSeconds(0);
			setLiveDistanceKm(0);
			setLiveSpeedKmh(null);
			isRecordingRef.current = true;
			setIsRecording(true);
			setFollowMode(true);
			mapRef.current?.sendToMap({ routeCoordinates: [] });

			// Switch to heading mode and increase pitch for an immersive running view
			isHeadingModeRef.current = true;
			setIsHeadingMode(true);
			mapRef.current?.sendToMap({ pitch: 60, easeAnimation: true });
			// Apply the current compass heading immediately as initial map bearing
			mapRef.current?.sendToMap({ bearing: currentHeadingRef.current, easeAnimation: true, easeDuration: 500 });

			timerRef.current = setInterval(() => {
				setElapsedSeconds(accumulatedSecondsRef.current + Math.floor((Date.now() - startTimeRef.current) / 1000));
			}, 1000);

			if (expoGo) {
				console.log('[RecordScreen] Running in Expo Go – skipping background permission, using foreground-only tracking.');
				showModal({
					title: 'Expo Go: Foreground Tracking Only',
					children: (
						<View style={styles.expoGoNoticeContainer}>
							<Text style={[styles.expoGoNoticeText, { color: theme.screen.text }]}>
								Background location is not supported in Expo Go.{'\n\n'}
								Location will only be tracked while this screen is open and the app is in the foreground.
								For full background tracking, run the app as a standalone build.
							</Text>
						</View>
					),
				});
				const sub = await Location.watchPositionAsync(
					{
						accuracy: Location.Accuracy.BestForNavigation,
						timeInterval: GPS_TIME_INTERVAL_MS,
						distanceInterval: GPS_DISTANCE_INTERVAL_METERS,
					},
					(loc) => {
						console.log('[RecordScreen] Foreground location update:', loc.coords.latitude, loc.coords.longitude);
						handleLocationUpdate({
							lat: loc.coords.latitude,
							lng: loc.coords.longitude,
							altitude: loc.coords.altitude,
							speed: loc.coords.speed,
							timestamp: loc.timestamp,
						});
					},
				);
				fgSubRef.current = sub;
				console.log('[RecordScreen] Foreground-only watch started (Expo Go).');
				return;
			}

			console.log('[RecordScreen] Requesting background location permission...');
			let bgStatus: Location.PermissionStatus | null = null;
			try {
				const bgResult = await Location.requestBackgroundPermissionsAsync();
				bgStatus = bgResult.status;
				console.log('[RecordScreen] Background permission status:', bgStatus);
			} catch (bgErr) {
				console.warn('[RecordScreen] Background permission request failed (may not be supported):', bgErr);
			}
			const useBackground = bgStatus === 'granted';

			if (useBackground) {
				console.log('[RecordScreen] Starting background location updates via TaskManager...');
				_onLocationUpdate = handleLocationUpdate;
				await Location.startLocationUpdatesAsync(ACTIVITY_LOCATION_TASK, {
					accuracy: Location.Accuracy.BestForNavigation,
					timeInterval: GPS_TIME_INTERVAL_MS,
					distanceInterval: GPS_DISTANCE_INTERVAL_METERS,
					showsBackgroundLocationIndicator: true,
					foregroundService: {
						notificationTitle: 'Activity Recording',
						notificationBody: 'Geonexia is recording your activity in the background.',
						notificationColor: PRIMARY_COLOR,
					},
				});
				console.log('[RecordScreen] Background location updates started.');
			} else {
				console.log('[RecordScreen] Background permission denied – falling back to foreground-only tracking.');
				const sub = await Location.watchPositionAsync(
					{
						accuracy: Location.Accuracy.BestForNavigation,
						timeInterval: GPS_TIME_INTERVAL_MS,
						distanceInterval: GPS_DISTANCE_INTERVAL_METERS,
					},
					(loc) => {
						console.log('[RecordScreen] Foreground location update:', loc.coords.latitude, loc.coords.longitude);
						handleLocationUpdate({
							lat: loc.coords.latitude,
							lng: loc.coords.longitude,
							altitude: loc.coords.altitude,
							speed: loc.coords.speed,
							timestamp: loc.timestamp,
						});
					},
				);
				fgSubRef.current = sub;
				console.log('[RecordScreen] Foreground-only watch started.');
			}
		} catch (err) {
			console.error('[RecordScreen] startRecording error:', err);
			if (err instanceof Error) {
				console.error('[RecordScreen] Error name:', err.name, '| message:', err.message);
			}
			Alert.alert('Error', 'Run recording could not be started.');
			isRecordingRef.current = false;
			setIsRecording(false);
			if (timerRef.current) {
				clearInterval(timerRef.current);
				timerRef.current = null;
			}
		}
	}, [handleLocationUpdate, setFollowMode, showModal, theme]);

	const stopRecording = useCallback(async () => {
		console.log('[RecordScreen] stopRecording called.');
		_onLocationUpdate = null;
		fgSubRef.current?.remove();
		fgSubRef.current = null;

		if (timerRef.current) {
			clearInterval(timerRef.current);
			timerRef.current = null;
		}

		try {
			const isTaskRunning = await TaskManager.isTaskRegisteredAsync(ACTIVITY_LOCATION_TASK);
			console.log('[RecordScreen] Background task running:', isTaskRunning);
			if (isTaskRunning) {
				await Location.stopLocationUpdatesAsync(ACTIVITY_LOCATION_TASK);
				console.log('[RecordScreen] Background location updates stopped.');
			}
		} catch (err) {
			console.warn('[RecordScreen] Error stopping background task:', err);
		}

		isRecordingRef.current = false;
		setIsRecording(false);
		setIsPaused(false);
		isPausedRef.current = false;
		accumulatedSecondsRef.current = 0;
		movedPlayerManuallyRef.current = false;

		// Exit heading mode and restore default pitch/bearing
		isHeadingModeRef.current = false;
		setIsHeadingMode(false);
		mapRef.current?.sendToMap({ pitch: 20, easeAnimation: true });
		mapRef.current?.sendToMap({ resetBearing: true });

		const points = routePointsRef.current;
		console.log('[RecordScreen] Recorded points count:', points.length);
		if (points.length < 2) {
			Alert.alert('Run finished', 'Too few GPS points were recorded.');
			return;
		}

		const stats = computeStats(points);
		const endedAt = Date.now();

		// Detect enclosed tiles when the route forms a closed loop and persist them.
		// Tiles already visited during the run are excluded from the enclosed set.
		let enclosedCells: string[] = [];
		try {
			const allEnclosed = findEnclosedCells(points, h3ResolutionRef.current);
			enclosedCells = allEnclosed.filter((cell) => !visitedHexIdsRef.current.has(cell));
			if (enclosedCells.length > 0) {
				dispatch(markEnclosed({ h3Indices: enclosedCells, timestamp: endedAt }));
			}
		} catch (err) {
			console.warn('[RecordScreen] Enclosed tile detection failed:', err);
		}

		// Refresh the map to show newly enclosed tiles and updated walk path.
		const vp = debugViewportRef.current;
		if (vp && mapRef.current) {
			let geoJson: H3FeatureCollection = { type: 'FeatureCollection', features: [] };
			try {
				geoJson = buildH3GeoJson(vp.bounds, vp.zoom, h3ResolutionRef.current, showGridAlwaysRef.current, store.getState().hexTiles.records);
			} catch {
				// ignore
			}
			const viewportCells = [...new Set(geoJson.features.map((f) => f.properties.h3Index))];
			const walkPathGeoJson = buildWalkPathGeoJson(viewportCells, store.getState().hexTiles.records);
			mapRef.current.sendToMap({ hexTileGeoJson: geoJson });
			mapRef.current.sendToMap({ hexWalkPathGeoJson: walkPathGeoJson });
		}

		// Save activity to persistent storage
		const activity = {
			id: String(startTimeRef.current),
			startedAt: startTimeRef.current,
			endedAt,
			routePoints: points,
			stats,
			sportType: selectedSportType,
		};
		try {
			saveActivity(activity);
		} catch (err) {
			console.warn('[RecordScreen] Failed to save activity:', err);
		}

		// Build share data from the final Redux state (after all dispatches above).
		const finalRecords = store.getState().hexTiles.records;
		const shareData: RunShareData = {
			startedAt: startTimeRef.current,
			endedAt,
			durationSeconds: stats.durationSeconds,
			distanceKm: stats.distanceKm,
			tiles: {
				h3Resolution: Math.round(h3ResolutionRef.current),
				visited: Array.from(visitedHexIdsRef.current).map((id) => [id, finalRecords[id]?.level ?? 0]),
				enclosed: enclosedCells.map((id) => [id, finalRecords[id]?.level ?? 0]),
			},
		};

		showModal({
			title: '🏃 Run Statistics',
			onClose: closeModal,
			children: <RunStatsContent stats={stats} theme={theme} shareData={shareData} />,
		});
	}, [showModal, closeModal, theme, dispatch]);

	const pauseRecording = useCallback(() => {
		accumulatedSecondsRef.current += Math.floor((Date.now() - startTimeRef.current) / 1000);
		if (timerRef.current) {
			clearInterval(timerRef.current);
			timerRef.current = null;
		}
		isPausedRef.current = true;
		setIsPaused(true);
	}, []);

	const resumeRecording = useCallback(() => {
		startTimeRef.current = Date.now();
		timerRef.current = setInterval(() => {
			setElapsedSeconds(accumulatedSecondsRef.current + Math.floor((Date.now() - startTimeRef.current) / 1000));
		}, 1000);
		// Allow GPS to resume as the authoritative position source. If the user
		// navigated via joystick during the pause, GPS will smoothly re-anchor
		// to the physical device location from the current player position.
		movedPlayerManuallyRef.current = false;
		isPausedRef.current = false;
		setIsPaused(false);
	}, []);

	/**
	 * Compass / North button handler:
	 *   – During a run: toggles between heading mode (map follows movement direction)
	 *     and north mode (bearing reset to 0°).
	 *   – Outside a run: always resets bearing to north.
	 */
	const handleCompassPress = useCallback(() => {
		if (isRecordingRef.current) {
			const nextHeadingMode = !isHeadingModeRef.current;
			isHeadingModeRef.current = nextHeadingMode;
			setIsHeadingMode(nextHeadingMode);
			if (!nextHeadingMode) {
				// Switched back to north mode – reset bearing
				mapRef.current?.sendToMap({ resetBearing: true });
			}
		} else {
			mapRef.current?.sendToMap({ resetBearing: true });
		}
	}, []);

	// Compute live pace and avg speed from elapsed time and distance
	const livePaceMinPerKm = liveDistanceKm > 0 ? elapsedSeconds / 60 / liveDistanceKm : null;
	const liveAvgSpeedKmh = elapsedSeconds > 0 ? (liveDistanceKm / elapsedSeconds) * 3600 : 0;

	if (!osmConsent) {
		return (
			<SafeAreaView style={styles.container}>
				<OsmConsentScreen onConsent={handleConsent} />
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			{/* Map fills remaining space above the panel */}
			<View style={styles.mapWrapper}>
				{mapCanRender && (
					<MyMap ref={mapRef} initialZoom={17} initialCenter={mapInitialCenter} onMessage={handleMapMessage} injectScript={HEX_TILE_SCRIPT} />
				)}

				{/* Map overlay buttons – top-right */}
				<View style={styles.mapOverlayButtons} pointerEvents="box-none">
					{/* Compass / heading-mode toggle button */}
					<TouchableOpacity
						style={[
							styles.compassButton,
							isHeadingMode && { backgroundColor: PRIMARY_COLOR },
						]}
						onPress={handleCompassPress}
						activeOpacity={0.8}
					>
						<MaterialIcons
							name={isHeadingMode ? 'navigation' : 'explore'}
							size={26}
							color={isHeadingMode ? '#ffffff' : '#555555'}
						/>
					</TouchableOpacity>
					<View style={styles.buttonSpacer} />
					<MapLocationButton
						mapRef={mapRef}
						backgroundColor="#ffffff"
						iconColor="#555555"
						activeColor={PRIMARY_COLOR}
						isFollowing={isFollowing}
						zoom={17}
						onLocationFound={() => {
							movedPlayerManuallyRef.current = false;
							setFollowMode(true);
						}}
					/>
					<View style={styles.buttonSpacer} />
					<TouchableOpacity
						style={styles.debugButton}
						onPress={showDebugModal}
						activeOpacity={0.8}
					>
						<MaterialIcons name="bug-report" size={20} color="#555555" />
					</TouchableOpacity>
				</View>

				{/* Joystick controller – bottom-left overlay */}
			<View style={styles.gamepadOverlay} pointerEvents="box-none">
					<JoystickController
						positionRef={debugPlayerPositionRef}
						speedKmhRef={debugMoveSpeedKmhRef}
						onMove={handleDebugMove}
						isHeadingModeRef={isHeadingModeRef}
						currentHeadingRef={currentHeadingRef}
						joystickActiveRef={joystickActiveRef}
						isRecordingRef={isRecordingRef}
						onHeadingChange={handleHeadingChange}
					/>
				</View>

				</View>

			{/* Bottom control panel */}
			<View style={[styles.liveBar, { backgroundColor: theme.screen.background }]}>
				{isPanelCollapsed ? (
					/* Collapsed: only show expand chevron – aligned right to match expanded position */
					<View style={styles.liveBarCollapsedRow}>
						<View style={styles.liveBarSideSlot}>
							<TouchableOpacity
								style={styles.chevronButton}
								onPress={() => setIsPanelCollapsed(false)}
								activeOpacity={0.7}
							>
								<MaterialIcons name="expand-less" size={24} color={theme.screen.icon} />
							</TouchableOpacity>
						</View>
					</View>
				) : (
					<>
						{/* Stats row */}
						<View style={styles.liveBarStatsRow}>
							<View style={styles.liveStatCard}>
								<MaterialIcons name="straighten" size={20} color={PRIMARY_COLOR} />
								<Text style={[styles.liveStatBigValue, { color: theme.screen.text }]}>
									{isRecording
										? (liveDistanceKm < 1 ? (liveDistanceKm * 1000).toFixed(0) : liveDistanceKm.toFixed(2))
										: '--'}
								</Text>
								<Text style={[styles.liveStatUnit, { color: theme.screen.icon }]}>
									{isRecording && liveDistanceKm < 1 ? 'm' : 'km'}
								</Text>
							</View>
							<View style={[styles.liveVerticalDivider, { backgroundColor: theme.screen.text + '33' }]} />
							<View style={styles.liveStatCard}>
								<MaterialIcons name="speed" size={20} color={PRIMARY_COLOR} />
								<Text style={[styles.liveStatBigValue, { color: theme.screen.text }]}>
									{isRecording && livePaceMinPerKm != null ? formatPace(livePaceMinPerKm) : '--:--'}
								</Text>
								<Text style={[styles.liveStatUnit, { color: theme.screen.icon }]}>min/km</Text>
							</View>
							<View style={[styles.liveVerticalDivider, { backgroundColor: theme.screen.text + '33' }]} />
							<View style={styles.liveStatCard}>
								<MaterialIcons name="directions-run" size={20} color={theme.screen.icon} />
								<Text style={[styles.liveStatBigValue, { color: theme.screen.text }]}>
									{isRecording ? liveAvgSpeedKmh.toFixed(1) : '--'}
								</Text>
								<Text style={[styles.liveStatUnit, { color: theme.screen.icon }]}>km/h</Text>
							</View>
						</View>

						{/* Controls row: [stop?] [record/pause – centred] [chevron-down] */}
						<View style={styles.liveBarControlsRow}>
							{/* Left side: stop button when recording, activity type picker otherwise */}
							<View style={styles.liveBarSideSlot}>
								{isRecording ? (
									<TouchableOpacity
										style={[styles.stopButton, { backgroundColor: '#e53935' }]}
										onPress={stopRecording}
										activeOpacity={0.8}
									>
										<MaterialIcons name="stop" size={32} color="white" />
									</TouchableOpacity>
								) : (
									<TouchableOpacity
										style={[styles.activityTypeButton, { backgroundColor: activeSport.color + '22' }]}
										onPress={showActivityTypeModal}
										activeOpacity={0.8}
									>
										{activeSport.iconLibrary === 'MaterialCommunityIcons' ? (
											<MaterialCommunityIcons
												name={activeSport.iconName as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
												size={28}
												color={activeSport.color}
											/>
										) : (
											<MaterialIcons
												name={activeSport.iconName as React.ComponentProps<typeof MaterialIcons>['name']}
												size={28}
												color={activeSport.color}
											/>
										)}
									</TouchableOpacity>
								)}
							</View>

							{/* Central record / pause button */}
							<TouchableOpacity
								style={[
									styles.mainRecordButton,
									{
										backgroundColor: !isRecording
											? '#43a047'
											: isPaused
											? '#43a047'
											: '#f59e0b',
									},
								]}
								onPress={
									!isRecording
										? startRecording
										: isPaused
										? resumeRecording
										: pauseRecording
								}
								activeOpacity={0.8}
							>
								<MaterialIcons
									name={!isRecording ? 'play-arrow' : isPaused ? 'play-arrow' : 'pause'}
									size={32}
									color="white"
								/>
							</TouchableOpacity>

							{/* Chevron-down collapse button – right side */}
							<View style={styles.liveBarSideSlot}>
								<TouchableOpacity
									style={styles.chevronButton}
									onPress={() => setIsPanelCollapsed(true)}
									activeOpacity={0.7}
								>
									<MaterialIcons name="expand-more" size={24} color={theme.screen.icon} />
								</TouchableOpacity>
							</View>
						</View>
					</>
				)}
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#ffffff',
	},
	mapWrapper: {
		flex: 1,
	},
	expoGoNoticeContainer: {
		paddingHorizontal: 20,
		paddingBottom: 12,
	},
	expoGoNoticeText: {
		fontSize: 14,
		lineHeight: 22,
	},
	mapOverlayButtons: {
		position: 'absolute',
		top: 16,
		right: 12,
		zIndex: 20,
		elevation: 20,
		alignItems: 'center',
	},
	buttonSpacer: {
		height: 8,
	},
	compassButton: {
		width: 44,
		height: 44,
		borderRadius: 8,
		backgroundColor: '#ffffff',
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.2,
		shadowRadius: 3,
		elevation: 3,
	},
	debugButton: {
		width: 36,
		height: 36,
		borderRadius: 8,
		backgroundColor: '#ffffff',
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.2,
		shadowRadius: 2,
		elevation: 4,
	},
	// Stats + recording controls bar
	liveBar: {
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: '#00000022',
		paddingBottom: 8,
	},
	liveBarCollapsedRow: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		paddingHorizontal: 24,
		paddingVertical: 6,
	},
	liveBarStatsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-evenly',
		paddingTop: 12,
		paddingHorizontal: 8,
	},
	liveBarControlsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 24,
		paddingTop: 12,
	},
	liveBarSideSlot: {
		width: 60,
		alignItems: 'center',
		justifyContent: 'center',
	},
	liveStatCard: {
		flex: 1,
		alignItems: 'center',
		gap: 2,
	},
	liveVerticalDivider: {
		width: 1,
		height: 44,
		marginHorizontal: 4,
	},
	liveStatBigValue: {
		fontSize: 22,
		fontWeight: '700',
		letterSpacing: -0.5,
	},
	liveStatSmallValue: {
		fontSize: 18,
		fontWeight: '600',
	},
	liveStatUnit: {
		fontSize: 10,
		fontWeight: '500',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	recordButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 3,
		elevation: 4,
	},
	recordButtonGroup: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	mainRecordButton: {
		width: 60,
		height: 60,
		borderRadius: 30,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.35,
		shadowRadius: 5,
		elevation: 6,
	},
	stopButton: {
		width: 60,
		height: 60,
		borderRadius: 30,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.35,
		shadowRadius: 5,
		elevation: 6,
	},
	chevronButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: 'center',
		justifyContent: 'center',
	},
	// Consent styles
	consentContainer: {
		flexGrow: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 24,
		paddingVertical: 32,
	},
	consentIcon: {
		marginBottom: 20,
	},
	consentTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#111111',
		textAlign: 'center',
		marginBottom: 14,
	},
	consentBody: {
		fontSize: 14,
		color: '#444444',
		textAlign: 'center',
		lineHeight: 22,
		marginBottom: 10,
	},
	consentBold: {
		fontWeight: '700',
	},
	consentNote: {
		fontSize: 13,
		color: '#888888',
		textAlign: 'center',
		lineHeight: 18,
		marginBottom: 28,
	},
	consentButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		backgroundColor: PRIMARY_COLOR,
		paddingVertical: 14,
		paddingHorizontal: 24,
		borderRadius: 10,
	},
	consentButtonText: {
		color: '#ffffff',
		fontSize: 15,
		fontWeight: '600',
	},
	// Stats modal styles
	statsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	statsRowLast: {
		borderBottomWidth: 0,
	},
	statsRowIcon: {
		marginRight: 12,
	},
	statsRowLabel: {
		flex: 1,
		fontSize: 15,
	},
	statsRowValue: {
		fontSize: 15,
		fontWeight: '600',
	},
	// Share styles
	shareButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginHorizontal: 16,
		marginTop: 16,
		marginBottom: 8,
		paddingVertical: 12,
		borderRadius: 10,
		gap: 8,
	},
	shareButtonText: {
		color: '#ffffff',
		fontSize: 15,
		fontWeight: '600',
	},
	shareCodeScroll: {
		marginHorizontal: 16,
		marginTop: 8,
		borderRadius: 8,
		backgroundColor: '#1e1e1e',
		maxHeight: 220,
	},
	shareCodeContent: {
		padding: 12,
	},
	shareCodeText: {
		fontFamily: 'monospace',
		fontSize: 12,
	},
	shareQrContainer: {
		alignItems: 'center',
		marginTop: 16,
		marginBottom: 8,
	},
	shareQrHint: {
		textAlign: 'center',
		fontSize: 13,
		marginHorizontal: 16,
		marginTop: 12,
		marginBottom: 8,
	},
	// Debug modal styles
	debugContainer: {
		paddingBottom: 12,
	},
	debugStatusBanner: {
		marginHorizontal: 16,
		marginBottom: 12,
		paddingVertical: 10,
		paddingHorizontal: 14,
		borderRadius: 8,
		borderWidth: 1,
	},
	debugStatusText: {
		fontSize: 14,
		fontWeight: '600',
	},
	debugRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	debugRowLabel: {
		flex: 1,
		fontSize: 14,
	},
	debugRowValue: {
		fontSize: 14,
		fontWeight: '600',
	},
	resolutionPicker: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	resolutionPickerMultiRow: {
		flexDirection: 'column',
		alignItems: 'flex-end',
		gap: 4,
	},
	resolutionPickerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	resolutionButton: {
		width: 30,
		height: 30,
		borderRadius: 6,
		backgroundColor: PRIMARY_COLOR,
		alignItems: 'center',
		justifyContent: 'center',
	},
	resolutionButtonText: {
		color: '#ffffff',
		fontSize: 18,
		fontWeight: '700',
		lineHeight: 22,
	},
	resolutionValue: {
		fontSize: 16,
		fontWeight: '700',
		minWidth: 36,
		textAlign: 'center',
	},
	resolutionFineButton: {
		height: 26,
		borderRadius: 6,
		backgroundColor: PRIMARY_COLOR,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 6,
	},
	resolutionFineButtonText: {
		color: '#ffffff',
		fontSize: 11,
		fontWeight: '700',
	},
	debugSpeedInput: {
		fontSize: 15,
		fontWeight: '600',
		borderWidth: 1,
		borderRadius: 6,
		paddingVertical: 4,
		paddingHorizontal: 10,
		minWidth: 72,
		textAlign: 'center',
	},
	// Joystick controller overlay
	gamepadOverlay: {
		position: 'absolute',
		bottom: 16,
		left: 12,
		zIndex: 20,
		elevation: 20,
	},
	joystickOuter: {
		width: JOYSTICK_OUTER_RADIUS * 2,
		height: JOYSTICK_OUTER_RADIUS * 2,
		borderRadius: JOYSTICK_OUTER_RADIUS,
		backgroundColor: 'rgba(0, 0, 0, 0.30)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	joystickKnob: {
		width: JOYSTICK_KNOB_RADIUS * 2,
		height: JOYSTICK_KNOB_RADIUS * 2,
		borderRadius: JOYSTICK_KNOB_RADIUS,
		backgroundColor: 'rgba(255, 255, 255, 0.85)',
	},
	// Activity type picker button
	activityTypeButton: {
		width: 52,
		height: 52,
		borderRadius: 26,
		alignItems: 'center',
		justifyContent: 'center',
	},
	// Hex tile info modal
	hexInfoContainer: {
		paddingBottom: 8,
	},
	hexInfoRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderBottomWidth: StyleSheet.hairlineWidth,
		gap: 8,
	},
	hexInfoLabel: {
		flex: 1,
		fontSize: 14,
	},
	hexInfoValue: {
		fontSize: 14,
		fontWeight: '600',
		flexShrink: 1,
		textAlign: 'right',
	},
	// Tile image picker
	tilePickerCategoryRow: {
		flexDirection: 'row',
		gap: TILE_THUMB_GAP,
		paddingHorizontal: 16,
		paddingBottom: 10,
	},
	tilePickerCategoryTab: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
	},
	tilePickerCategoryLabel: {
		fontSize: 13,
		fontWeight: '600',
	},
	tilePickerCurrentRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingBottom: 8,
	},
	tilePickerCurrentLabel: {
		fontSize: 12,
		flex: 1,
	},
	tilePickerClearBtn: {
		fontSize: 13,
		fontWeight: '600',
		paddingLeft: 8,
	},
});
