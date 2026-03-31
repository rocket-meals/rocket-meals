import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	Animated,
	AppState,
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
import { useNavigation, useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { MapLocationButton, MyMap, MyMapHandle, QrCode, useTheme, useMyScrollViewModal, SettingsListSelectOptionSingle, SettingsListGroupTitle, SettingsList, SettingsListTextInput } from 'repo-depkit-common-ui';

import { HEX_TILE_SCRIPT } from '../assets/hexTileScript';
import { TERRAIN_ASSETS, TERRAIN_CATEGORIES } from '../assets/terrainAssets';
import { isAvailable as isH3Available, latLngToCell, cellToLatLng, gridDisk, gridDistance, cellToBoundary, gridPathCells, cellToChildren, cellToCenterChild, cellToParent, gridRingUnsafe, getResolution, isValidCell, computeRouteLengthKm, formatDistanceKm } from '../helpers/H3Helper';
import { queryTileFeaturesForHexCell } from '../helpers/TileFeatureHelper';
import { RoutePoint, RunStats, SavedActivity, saveActivity, loadActivities, saveOsmConsent, loadOsmConsent } from '../helpers/ActivityStorage';
import { SavedRoute, loadRoutes, saveRoute } from '../helpers/RouteStorage';
import { buildRouteDisplayData, computeEdgesFromHexTiles, computeHexBounds } from '../helpers/RouteDisplayHelper';
import { HexTileRecord, BillboardAnchorColor } from '../helpers/HexTileStorage';
import { startRun, markVisited, markEnclosed, setHexTileCustomization, setBillboardAtAnchor, applyMapCustomizations, addWalkedEdges } from '../store/hexTileSlice';
import { setSportType, SPORT_TYPES, SportType } from '../store/sportTypeSlice';
import { store, RootState } from '../store/store';
import { GPS_INTERVAL_MS } from '../helpers/GpsIntervalStorage';
import * as Speech from 'expo-speech';
import { getLocales } from 'expo-localization';
import { buildKmAnnouncement, speakAnnouncement, buildBackgroundAnnouncement, buildPeriodicAnnouncement, buildPaceHintAnnouncement, speechRateToNumber, enableBackgroundAudio, disableBackgroundAudio } from '../helpers/TTSHelper';
import type { PaceHintState } from '../helpers/TTSHelper';
import { OBJECT_SPRITES } from '../assets/objects/objectSprites';
import SettingsListBillboard from '../components/SettingsListBillboard';
import SettingsListHexTile from '../components/SettingsListHexTile';
import { useDebugMode } from '../hooks/useDebugMode';

/** Parse a billboard key of the form "objects:N" into the corresponding sprite and index. */
function parseBillboardKey(billboard: string): { sprite: (typeof OBJECT_SPRITES)[number]; idx: number } | null {
	const colonIdx = billboard.indexOf(':');
	if (colonIdx < 0 || billboard.slice(0, colonIdx) !== 'objects') return null;
	const idx = parseInt(billboard.slice(colonIdx + 1), 10);
	const sprite = OBJECT_SPRITES[idx];
	if (!sprite) return null;
	return { sprite, idx };
}

/**
 * Return the effective per-anchor billboard map for a hex tile record,
 * merging the new `billboards` field with the legacy `billboard`/`billboardAnchorColor` pair.
 * The new `billboards` field takes precedence when present.
 */
function getEffectiveBillboards(record: { billboard?: string | null; billboardAnchorColor?: string | null; billboards?: Record<string, string | null> }): Record<BillboardAnchorColor, string> {
	const result: Record<string, string> = {};
	if (record.billboards) {
		for (const [ac, bk] of Object.entries(record.billboards)) {
			if (bk) result[ac] = bk;
		}
	} else if (record.billboard) {
		result[record.billboardAnchorColor ?? BillboardAnchorColor.Purple] = record.billboard;
	}
	return result as Record<BillboardAnchorColor, string>;
}

const PRIMARY_COLOR = '#2563eb';

// Debug status indicator colours
const STATUS_SUCCESS_COLOR = '#22c55e';
const STATUS_WARNING_COLOR = '#f59e0b';
const STATUS_ERROR_COLOR = '#ef4444';

// ─── Measure mode constants ───────────────────────────────────────────────────

// Speed range for synthetic activity points generated from a measure route.
// Slightly randomised jogging pace: base ± variation km/h.
const MEASURE_SPEED_BASE_KMH = 10;
const MEASURE_SPEED_VARIATION_KMH = 2;
// Coordinate noise (degrees) applied to each synthetic GPS point to make the
// route look organic.  ~0.00003° ≈ 3 m at the equator.
const MEASURE_COORD_NOISE_DEG = 0.00003;

// ─── H3 hex-grid helpers ──────────────────────────────────────────────────────

const H3_DEFAULT_RESOLUTION = 10;
const H3_MAX_CELLS = 5000;
const H3_MIN_ZOOM_DEFAULT = 12;
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
const BILLBOARD_UNIT_PX = 48 / 7; // townhall ≈ 48 px at res 10
// Reference H3 resolution for billboard sizing. Billboard sizes scale proportionally
// with the H3 edge length so they are larger on bigger hexagons and smaller on
// smaller ones.
const BILLBOARD_REFERENCE_RESOLUTION = 10;
// Default billboard scale multiplier (adjustable in the debug modal).
const BILLBOARD_SCALE_DEFAULT = 0.4;
// Precision factor for rounding billboard scale values (1 decimal place).
const BILLBOARD_SCALE_DECIMAL_PRECISION = 10;
// Minimum rendered pixel size for billboard icons so that sprites at very small
// H3 resolutions or low user-scale settings remain visible and tappable.
const BILLBOARD_MIN_SIZE_PX = 8;
// cellToBoundary flag: true returns vertices in [lng, lat] GeoJSON coordinate order
// AND automatically closes the ring (appends the first vertex at the end).
const H3_GEOJSON_ORDER = true;

// Billboard anchor color options. Each maps to a position within the hex cell.
// Colors match the debug point layer colors in hexTileScript.ts.
const BILLBOARD_ANCHOR_COLORS = [
	{ id: BillboardAnchorColor.Purple, hex: '#a855f7', label: 'Center (Purple)' },
	{ id: BillboardAnchorColor.Green, hex: '#22c55e', label: 'Vertex (Green)' },
	{ id: BillboardAnchorColor.Red, hex: '#ef4444', label: 'Midpoint 1 (Red)' },
	{ id: BillboardAnchorColor.Orange, hex: '#f97316', label: 'Midpoint 2 (Orange)' },
	{ id: BillboardAnchorColor.Yellow, hex: '#eab308', label: 'Midpoint 3 (Yellow)' },
	{ id: BillboardAnchorColor.Blue, hex: '#3b82f6', label: 'Midpoint 4 (Blue)' },
	{ id: BillboardAnchorColor.White, hex: '#ffffff', label: 'Midpoint 5 (White)' },
	{ id: BillboardAnchorColor.Black, hex: '#000000', label: 'Midpoint 6 (Black)' },
] as const;

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
	minZoom: number = H3_MIN_ZOOM_DEFAULT,
): H3FeatureCollection {
	if (!showAlways && zoom < minZoom) {
		// At low zoom: hide the unvisited grid, but still show tiles that have been
		// visited or enclosed (level > 0) so the user can see their overall progress.
		const features: H3GeoJsonFeature[] = [];
		for (const [cell, record] of Object.entries(hexTileRecords)) {
			if (record.level <= 0) continue;
			if (features.length >= H3_MAX_CELLS) break;
			try {
				const boundary = cellToBoundary(cell, H3_GEOJSON_ORDER);
				if (boundary.length > 0) {
					features.push({
						type: 'Feature',
						geometry: { type: 'Polygon', coordinates: [boundary as number[][]] },
						properties: { h3Index: cell, level: record.level },
					});
				}
			} catch {
				// Skip invalid cells
			}
		}
		return { type: 'FeatureCollection', features };
	}

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
 * walk path, using the actual hex-to-hex transitions that were recorded during
 * activities. Only edges that are present in `walkedEdges` (and whose endpoints
 * are both visible in the current viewport) are drawn, preventing spurious
 * connections between adjacent but non-consecutively-traversed hexagons.
 *
 * Each edge in `walkedEdges` is stored as "cellA:cellB" with the
 * lexicographically smaller index first.
 */
function buildWalkPathGeoJson(
	viewportCells: string[],
	walkedEdges: string[],
): WalkPathFeatureCollection {
	const viewportSet = new Set(viewportCells);
	const features: WalkPathFeature[] = [];

	for (const edge of walkedEdges) {
		const colonIdx = edge.indexOf(':');
		if (colonIdx === -1) continue;
		const cellA = edge.slice(0, colonIdx);
		const cellB = edge.slice(colonIdx + 1);
		// Only draw if both endpoints are visible in the current viewport.
		if (!viewportSet.has(cellA) || !viewportSet.has(cellB)) continue;
		try {
			const [aLat, aLng] = cellToLatLng(cellA);
			const [bLat, bLng] = cellToLatLng(cellB);
			features.push({
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
			// cellToLatLng can throw for invalid indices; skip silently
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
const GPS_TIME_INTERVAL_MS = 1000;
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

/**
 * Build an ordered list of H3 cells that the measure route passes through.
 * For each consecutive pair of waypoints, uses gridPathCells to find the
 * direct hex path. Only outer border cells are included (no filled interior).
 */
function computeOrderedMeasureRouteCells(
	waypoints: Array<{ lat: number; lng: number }>,
	resolution: number,
): string[] {
	if (waypoints.length < 2 || !isH3Available()) return [];
	const res = Math.max(H3_RESOLUTION_MIN, Math.min(H3_RESOLUTION_MAX, Math.floor(resolution)));
	const result: string[] = [];
	const seen = new Set<string>();
	for (let i = 1; i < waypoints.length; i++) {
		const cellA = latLngToCell(waypoints[i - 1].lat, waypoints[i - 1].lng, res);
		const cellB = latLngToCell(waypoints[i].lat, waypoints[i].lng, res);
		if (!cellA || !cellB) continue;
		try {
			const path = gridPathCells(cellA, cellB);
			for (const c of path) {
				if (!seen.has(c)) {
					seen.add(c);
					result.push(c);
				}
			}
		} catch {
			// skip segment if gridPathCells throws (e.g. cells on different icosahedron faces)
		}
	}
	return result;
}

function formatEstimatedDuration(totalMinutes: number): string {
	if (totalMinutes <= 0 || !isFinite(totalMinutes)) return '--:--';
	const h = Math.floor(totalMinutes / 60);
	const m = Math.floor(totalMinutes % 60);
	const s = Math.round((totalMinutes % 1) * 60);
	if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} h`;
	return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} min`;
}

function formatActivityLabel(activity: SavedActivity): string {
	const d = new Date(activity.startedAt);
	const date = d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
	const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
	return `${date} ${time}`;
}

/**
 * Generate synthetic RoutePoints along the centers of the given ordered hex cells,
 * using slightly randomised speeds for a realistic-looking activity.
 */
function generateMeasureRoutePoints(
	orderedCells: string[],
	speedBaseKmh: number,
	speedVariationKmh: number,
	startTimestamp: number,
): RoutePoint[] {
	if (orderedCells.length === 0) return [];
	const points: RoutePoint[] = [];
	let currentTime = startTimestamp;
	for (let i = 0; i < orderedCells.length; i++) {
		const [cellLat, cellLng] = cellToLatLng(orderedCells[i]);
		// Add slight coordinate noise to make the synthetic route look organic.
		const noisyLat = cellLat + (Math.random() - 0.5) * MEASURE_COORD_NOISE_DEG;
		const noisyLng = cellLng + (Math.random() - 0.5) * MEASURE_COORD_NOISE_DEG;
		const speedKmh = Math.max(1, speedBaseKmh + (Math.random() - 0.5) * speedVariationKmh);
		points.push({
			lat: noisyLat,
			lng: noisyLng,
			altitude: null,
			speed: speedKmh / 3.6, // m/s
			timestamp: currentTime,
		});
		if (i < orderedCells.length - 1) {
			const [nextLat, nextLng] = cellToLatLng(orderedCells[i + 1]);
			const distKm = haversineKm(cellLat, cellLng, nextLat, nextLng);
			const timeSeconds = (distKm / speedKmh) * 3600;
			currentTime += Math.round(timeSeconds * 1000);
		}
	}
	return points;
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
			medianSpeedKmh: 0,
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
	const medianSpeedKmh = (() => {
		if (speedsKmh.length === 0) return 0;
		const sorted = [...speedsKmh].sort((a, b) => a - b);
		const mid = Math.floor(sorted.length / 2);
		return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
	})();
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
		medianSpeedKmh,
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
	initialBillboardScale: number;
	initialBillboardFaceCamera: boolean;
	initialShowBillboardAnchors: boolean;
	initialShowDebugPoints: boolean;
	onShowGridAlwaysChange: (val: boolean) => void;
	onH3ResolutionChange: (val: number) => void;
	onZoomAdjust: (delta: number) => void;
	onSpeedChange: (speed: number) => void;
	onBillboardScaleChange: (scale: number) => void;
	onBillboardFaceCameraChange: (val: boolean) => void;
	onShowBillboardAnchorsChange: (val: boolean) => void;
	onShowDebugPointsChange: (val: boolean) => void;
	onExportMapSettings: () => void;
	onImportMapSettings: (json: string) => void;
};

// Precision factor for rounding fractional H3 resolution values (1 decimal place).
const H3_RESOLUTION_DECIMAL_PRECISION = 10;

function DebugInfoContent({
	info,
	theme,
	initialShowGridAlways,
	initialH3Resolution,
	initialSpeed,
	initialBillboardScale,
	initialBillboardFaceCamera,
	initialShowBillboardAnchors,
	initialShowDebugPoints,
	onShowGridAlwaysChange,
	onH3ResolutionChange,
	onZoomAdjust,
	onSpeedChange,
	onBillboardScaleChange,
	onBillboardFaceCameraChange,
	onShowBillboardAnchorsChange,
	onShowDebugPointsChange,
	onExportMapSettings,
	onImportMapSettings,
}: DebugInfoContentProps) {
	const h3Available = isH3Available();
	const [showGridAlways, setShowGridAlways] = useState(initialShowGridAlways);
	const [h3Resolution, setH3Resolution] = useState(initialH3Resolution);
	const [speedText, setSpeedText] = useState(String(initialSpeed));
	const [billboardScale, setBillboardScale] = useState(initialBillboardScale);
	const [billboardFaceCamera, setBillboardFaceCamera] = useState(initialBillboardFaceCamera);
	const [showBillboardAnchors, setShowBillboardAnchors] = useState(initialShowBillboardAnchors);
	const [showDebugPoints, setShowDebugPoints] = useState(initialShowDebugPoints);
	const [showImportArea, setShowImportArea] = useState(false);
	const [importJson, setImportJson] = useState('');

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

	const adjustBillboardScale = useCallback((delta: number) => {
		setBillboardScale((prev) => {
			const next = Math.max(0.1, Math.round((prev + delta) * BILLBOARD_SCALE_DECIMAL_PRECISION) / BILLBOARD_SCALE_DECIMAL_PRECISION);
			onBillboardScaleChange(next);
			return next;
		});
	}, [onBillboardScaleChange]);

	const handleBillboardFaceCameraChange = useCallback((val: boolean) => {
		setBillboardFaceCamera(val);
		onBillboardFaceCameraChange(val);
	}, [onBillboardFaceCameraChange]);

	const handleShowBillboardAnchorsChange = useCallback((val: boolean) => {
		setShowBillboardAnchors(val);
		onShowBillboardAnchorsChange(val);
	}, [onShowBillboardAnchorsChange]);

	const handleShowDebugPointsChange = useCallback((val: boolean) => {
		setShowDebugPoints(val);
		onShowDebugPointsChange(val);
	}, [onShowDebugPointsChange]);

	const tilesExpected = info != null && (showGridAlways || info.zoom >= H3_MIN_ZOOM_DEFAULT);

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
		? `⚠️ Zoom in to ≥${H3_MIN_ZOOM_DEFAULT} to see tiles`
		: info.tileCount > 0
		? `✅ ${info.tileCount} H3 tiles computed`
		: '❌ 0 tiles – H3 library may not be working';

	const viewportRows: { label: string; value: string }[] = info
		? [
			{ label: 'Tiles Visible', value: tilesExpected ? `${info.tileCount} cells` : `0 (zoom < ${H3_MIN_ZOOM_DEFAULT})` },
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

			{/* Billboard Scale row */}
			<View style={[styles.debugRow, { borderBottomColor: theme.screen.text + '22' }]}>
				<Text selectable style={[styles.debugRowLabel, { color: theme.screen.text }]}>Billboard Scale</Text>
				<View style={styles.resolutionPickerMultiRow}>
					<View style={styles.resolutionPickerRow}>
						<TouchableOpacity
							style={[styles.resolutionButton, { opacity: billboardScale <= 0.1 ? 0.4 : 1 }]}
							onPress={() => adjustBillboardScale(-0.5)}
							disabled={billboardScale <= 0.1}
						>
							<Text style={styles.resolutionButtonText}>−</Text>
						</TouchableOpacity>
						<Text selectable style={[styles.resolutionValue, { color: theme.screen.text }]}>
							{billboardScale.toFixed(1)}×
						</Text>
						<TouchableOpacity
							style={styles.resolutionButton}
							onPress={() => adjustBillboardScale(0.5)}
						>
							<Text style={styles.resolutionButtonText}>+</Text>
						</TouchableOpacity>
					</View>
					<View style={styles.resolutionPickerRow}>
						<TouchableOpacity
							style={[styles.resolutionFineButton, { opacity: billboardScale <= 0.1 ? 0.4 : 1 }]}
							onPress={() => adjustBillboardScale(-0.1)}
							disabled={billboardScale <= 0.1}
						>
							<Text style={styles.resolutionFineButtonText}>−0.1</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.resolutionFineButton}
							onPress={() => adjustBillboardScale(0.1)}
						>
							<Text style={styles.resolutionFineButtonText}>+0.1</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>

			{/* Billboard Face Camera toggle */}
			<View style={[styles.debugRow, { borderBottomColor: theme.screen.text + '22' }]}>
				<Text selectable style={[styles.debugRowLabel, { color: theme.screen.text }]}>Billboard Face Camera</Text>
				<Switch
					value={billboardFaceCamera}
					onValueChange={handleBillboardFaceCameraChange}
					trackColor={{ true: PRIMARY_COLOR }}
					thumbColor="#ffffff"
				/>
			</View>

			{/* Show Billboard Anchor Points toggle */}
			<View style={[styles.debugRow, { borderBottomColor: theme.screen.text + '22' }]}>
				<Text selectable style={[styles.debugRowLabel, { color: theme.screen.text }]}>Show Anchor Points</Text>
				<Switch
					value={showBillboardAnchors}
					onValueChange={handleShowBillboardAnchorsChange}
					trackColor={{ true: PRIMARY_COLOR }}
					thumbColor="#ffffff"
				/>
			</View>

			{/* Show Debug Points toggle */}
			<View style={[styles.debugRow, { borderBottomColor: theme.screen.text + '22' }]}>
				<Text selectable style={[styles.debugRowLabel, { color: theme.screen.text }]}>Show Debug Points</Text>
				<Switch
					value={showDebugPoints}
					onValueChange={handleShowDebugPointsChange}
					trackColor={{ true: PRIMARY_COLOR }}
					thumbColor="#ffffff"
				/>
			</View>

			{/* Viewport rows */}
			{viewportRows.map((row) => (
				<View key={row.label} style={[styles.debugRow, { borderBottomColor: theme.screen.text + '22' }]}>
					<Text selectable style={[styles.debugRowLabel, { color: theme.screen.text }]}>{row.label}</Text>
					<Text selectable style={[styles.debugRowValue, { color: theme.screen.text }]}>{row.value}</Text>
				</View>
			))}

			{/* Map Settings export / import */}
			<View style={[styles.debugRow, { borderBottomColor: theme.screen.text + '22', flexDirection: 'column', alignItems: 'stretch', gap: 8, paddingVertical: 12 }]}>
				<Text selectable style={[styles.debugRowLabel, { color: theme.screen.text, marginBottom: 2 }]}>Map Settings</Text>
				<View style={{ flexDirection: 'row', gap: 8 }}>
					<TouchableOpacity
						style={[styles.resolutionButton, { flex: 1, backgroundColor: PRIMARY_COLOR + '18', borderRadius: 8, paddingVertical: 8 }]}
						onPress={onExportMapSettings}
						activeOpacity={0.7}
					>
						<MaterialIcons name="file-upload" size={16} color={PRIMARY_COLOR} />
						<Text style={[styles.debugRowLabel, { color: PRIMARY_COLOR, marginLeft: 4 }]}>Export</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.resolutionButton, { flex: 1, backgroundColor: PRIMARY_COLOR + '18', borderRadius: 8, paddingVertical: 8 }]}
						onPress={() => { setShowImportArea((v) => !v); setImportJson(''); }}
						activeOpacity={0.7}
					>
						<MaterialIcons name="file-download" size={16} color={PRIMARY_COLOR} />
						<Text style={[styles.debugRowLabel, { color: PRIMARY_COLOR, marginLeft: 4 }]}>Import</Text>
					</TouchableOpacity>
				</View>
				{showImportArea && (
					<View style={{ gap: 8 }}>
						<TextInput
							style={[styles.debugSpeedInput, { minHeight: 80, textAlignVertical: 'top', borderRadius: 8, padding: 8, fontFamily: 'monospace', fontSize: 11 }]}
							placeholder="Paste map settings JSON here…"
							placeholderTextColor={theme.screen.icon}
							value={importJson}
							onChangeText={setImportJson}
							multiline
							autoCapitalize="none"
							autoCorrect={false}
						/>
						<View style={{ flexDirection: 'row', gap: 8 }}>
							<TouchableOpacity
								style={[styles.resolutionButton, { flex: 1, backgroundColor: PRIMARY_COLOR, borderRadius: 8, paddingVertical: 8, opacity: importJson.trim().length === 0 ? 0.4 : 1 }]}
								onPress={() => {
									onImportMapSettings(importJson.trim());
									setShowImportArea(false);
									setImportJson('');
								}}
								disabled={importJson.trim().length === 0}
								activeOpacity={0.8}
							>
								<Text style={[styles.debugRowLabel, { color: '#ffffff' }]}>Apply</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.resolutionButton, { flex: 1, backgroundColor: theme.screen.text + '18', borderRadius: 8, paddingVertical: 8 }]}
								onPress={() => { setShowImportArea(false); setImportJson(''); }}
								activeOpacity={0.8}
							>
								<Text style={[styles.debugRowLabel, { color: theme.screen.text }]}>Cancel</Text>
							</TouchableOpacity>
						</View>
					</View>
				)}
			</View>
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
		{ iconName: 'speed', label: 'Median Speed', value: `${stats.medianSpeedKmh.toFixed(1)} km/h` },
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

// ─── Measure Result Content ────────────────────────────────────────────────────

type MeasureResultContentProps = {
	routeLengthInTiles: number;
	enclosedTileCount: number;
	routeCells: string[];
	h3Resolution: number;
	theme: ReturnType<typeof useTheme>['theme'];
	savedActivities: SavedActivity[];
	selectedSportType: SportType;
	onSaveAsActivity: (routeCells: string[], enclosedCount: number) => void;
	onSaveAsRoute: (routeCells: string[], name: string) => void;
	onClose: () => void;
};

function MeasureResultContent({
	routeLengthInTiles,
	enclosedTileCount,
	routeCells,
	h3Resolution,
	theme,
	savedActivities,
	selectedSportType,
	onSaveAsActivity,
	onSaveAsRoute,
	onClose,
}: MeasureResultContentProps) {
	const rows: { iconName: React.ComponentProps<typeof MaterialIcons>['name']; label: string; value: string }[] = [
		{ iconName: 'straighten', label: 'Route Length (hex tiles)', value: String(routeLengthInTiles) },
		{ iconName: 'grid-on', label: 'Enclosed Tiles', value: String(enclosedTileCount) },
		{ iconName: 'grain', label: 'H3 Resolution', value: String(Math.floor(h3Resolution)) },
	];
	const [pendingRouteName, setPendingRouteName] = useState<string | null>(null);

	const routeLengthKm = useMemo(() => computeRouteLengthKm(routeCells), [routeCells]);

	const sportDef = useMemo(
		() => SPORT_TYPES.find((s) => s.type === selectedSportType) ?? SPORT_TYPES[0],
		[selectedSportType],
	);

	const activitiesOfType = useMemo(
		() =>
			savedActivities
				.filter((a) => a.sportType === selectedSportType)
				.sort((a, b) => b.startedAt - a.startedAt),
		[savedActivities, selectedSportType],
	);

	const lastActivity = activitiesOfType[0] ?? null;

	const generalAvgSpeedKmh = useMemo(() => {
		const validActivities = activitiesOfType.filter((a) => a.stats.avgSpeedKmh > 0);
		if (validActivities.length === 0) return 0;
		return validActivities.reduce((sum, a) => sum + a.stats.avgSpeedKmh, 0) / validActivities.length;
	}, [activitiesOfType]);

	const sourceActivity =
		lastActivity !== null && lastActivity.stats.avgSpeedKmh > 0 ? lastActivity : null;

	const effectiveSpeedKmh = sourceActivity ? sourceActivity.stats.avgSpeedKmh : generalAvgSpeedKmh;

	const estimatedMinutes = effectiveSpeedKmh > 0 ? (routeLengthKm / effectiveSpeedKmh) * 60 : null;

	const sportIcon =
		sportDef.iconLibrary === 'MaterialCommunityIcons' ? (
			<MaterialCommunityIcons
				name={sportDef.iconName as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
				size={20}
				color="#ffffff"
			/>
		) : (
			<MaterialIcons
				name={sportDef.iconName as React.ComponentProps<typeof MaterialIcons>['name']}
				size={20}
				color="#ffffff"
			/>
		);

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
			{routeLengthKm > 0 && (
				<>
					<SettingsListGroupTitle title="Distanz" />
					<SettingsList
						leftIcon={<MaterialIcons name="social-distance" size={20} color="#ffffff" />}
						iconBackgroundColor={PRIMARY_COLOR}
						title="Streckenlänge"
						value={formatDistanceKm(routeLengthKm)}
						groupPosition="single"
					/>
				</>
			)}
			{estimatedMinutes !== null && (
				<>
					<SettingsListGroupTitle title="Geschätzte Dauer" />
					{sourceActivity !== null && (
						<SettingsList
							leftIcon={sportIcon}
							iconBackgroundColor={sportDef.color}
							title={sportDef.label}
							value={formatActivityLabel(sourceActivity)}
							groupPosition="top"
						/>
					)}
					<SettingsList
						leftIcon={<MaterialIcons name="timer" size={20} color="#ffffff" />}
						iconBackgroundColor={PRIMARY_COLOR}
						title="Geschätzte Dauer"
						value={formatEstimatedDuration(estimatedMinutes)}
						groupPosition={sourceActivity !== null ? 'bottom' : 'single'}
					/>
				</>
			)}
			{routeCells.length >= 2 && (
				<TouchableOpacity
					style={[styles.shareButton, { backgroundColor: '#43a047', marginTop: 12 }]}
					onPress={() => { onSaveAsActivity(routeCells, enclosedTileCount); onClose(); }}
					activeOpacity={0.8}
				>
					<MaterialIcons name="save-alt" size={18} color="#ffffff" />
					<Text style={styles.shareButtonText}>Als Aktivität speichern</Text>
				</TouchableOpacity>
			)}
			{routeCells.length >= 2 && (
				<>
					<SettingsListGroupTitle title="Als Route speichern" />
					<SettingsListTextInput
						title="Route benennen"
						placeholder="Route Name"
						modalTitle="Neue Route"
						groupPosition={pendingRouteName ? 'top' : 'single'}
						value={pendingRouteName ?? undefined}
						initialValue={pendingRouteName ?? ''}
						onSave={(name) => {
							const trimmed = name.trim();
							if (trimmed) setPendingRouteName(trimmed);
						}}
					/>
					{pendingRouteName && (
						<SettingsList
							leftIcon={<MaterialIcons name="save" size={20} color="#ffffff" />}
							iconBackgroundColor="#43a047"
							title="Route speichern"
							groupPosition="bottom"
							onPress={() => { onSaveAsRoute(routeCells, pendingRouteName); onClose(); }}
						/>
					)}
				</>
			)}
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

// ── Hex Anchor Picker ──────────────────────────────────────────────────────────
// Pointy-top hexagon with 9 interactive anchor points:
//   center (purple), vertex[0] (green), and 6 midpoints (red/orange/yellow/blue/white/black)
//   between the center and each of the 6 vertices.

const HEX_PICKER_SIZE = 180;
const HEX_PICKER_R = HEX_PICKER_SIZE * 0.38;
const HEX_PICKER_CX = HEX_PICKER_SIZE / 2;
const HEX_PICKER_CY = HEX_PICKER_SIZE / 2;
const HEX_DOT_SIZE = 20;
const HEX_DOT_SELECTED_SIZE = 26;

// √3/4
const SQRT3_4 = Math.sqrt(3) / 4;
// √3/2
const SQRT3_2 = Math.sqrt(3) / 2;

// Positions for each BILLBOARD_ANCHOR_COLOR entry.
// Midpoints are rotated one step clockwise vs. the original layout so that black
// lands at the top (directly above the center).
// Green vertex has been moved one step clockwise to vertex[1] (upper-right).
const HEX_ANCHOR_POSITIONS: Record<string, { x: number; y: number }> = {
	purple: { x: HEX_PICKER_CX, y: HEX_PICKER_CY }, // center
	green:  { x: HEX_PICKER_CX + HEX_PICKER_R * SQRT3_2, y: HEX_PICKER_CY - HEX_PICKER_R / 2 }, // vertex[1] upper-right
	black:  { x: HEX_PICKER_CX, y: HEX_PICKER_CY - HEX_PICKER_R / 2 }, // midpoint[0] top
	red:    { x: HEX_PICKER_CX + HEX_PICKER_R * SQRT3_4, y: HEX_PICKER_CY - HEX_PICKER_R / 4 }, // midpoint[1] upper-right
	orange: { x: HEX_PICKER_CX + HEX_PICKER_R * SQRT3_4, y: HEX_PICKER_CY + HEX_PICKER_R / 4 }, // midpoint[2] lower-right
	yellow: { x: HEX_PICKER_CX, y: HEX_PICKER_CY + HEX_PICKER_R / 2 }, // midpoint[3] bottom
	blue:   { x: HEX_PICKER_CX - HEX_PICKER_R * SQRT3_4, y: HEX_PICKER_CY + HEX_PICKER_R / 4 }, // midpoint[4] lower-left
	white:  { x: HEX_PICKER_CX - HEX_PICKER_R * SQRT3_4, y: HEX_PICKER_CY - HEX_PICKER_R / 4 }, // midpoint[5] upper-left
};

// Hexagon outline polygon points (pointy-top, 6 vertices).
const HEX_POLYGON_POINTS = [0, 1, 2, 3, 4, 5].map((i) => {
	const angle = (Math.PI / 2) - (i * Math.PI) / 3;
	return {
		x: HEX_PICKER_CX + HEX_PICKER_R * Math.cos(angle),
		y: HEX_PICKER_CY - HEX_PICKER_R * Math.sin(angle),
	};
});

function HexAnchorPicker({ selected, onSelect, occupiedAnchors }: { selected: BillboardAnchorColor; onSelect: (id: BillboardAnchorColor) => void; occupiedAnchors?: Record<string, string | null> }) {
	const { theme } = useTheme();
	const selectedLabel = BILLBOARD_ANCHOR_COLORS.find((c) => c.id === selected)?.label ?? selected;

	return (
		<View style={hexPickerStyles.wrapper}>
			<View style={hexPickerStyles.container}>
				{/* Hexagon outline using thin border lines between vertices */}
				{HEX_POLYGON_POINTS.map((pt, i) => {
					const next = HEX_POLYGON_POINTS[(i + 1) % 6];
					const dx = next.x - pt.x;
					const dy = next.y - pt.y;
					const len = Math.sqrt(dx * dx + dy * dy);
					const angle = Math.atan2(dy, dx) * (180 / Math.PI);
					return (
						<View
							key={i}
							pointerEvents="none"
							style={[
								hexPickerStyles.hexEdge,
								{
									width: len,
									left: pt.x,
									top: pt.y - 0.75,
									transform: [{ rotate: `${angle}deg` }],
									backgroundColor: theme.screen.text + '30',
								},
							]}
						/>
					);
				})}
				{/* Anchor dots */}
				{BILLBOARD_ANCHOR_COLORS.map((ac) => {
					const pos = HEX_ANCHOR_POSITIONS[ac.id];
					if (!pos) return null;
					const isSelected = selected === ac.id;
					const isOccupied = occupiedAnchors ? !!occupiedAnchors[ac.id] : false;
					const dotSize = isSelected ? HEX_DOT_SELECTED_SIZE : HEX_DOT_SIZE;
					return (
						<TouchableOpacity
							key={ac.id}
							onPress={() => onSelect(ac.id)}
							style={[
								hexPickerStyles.dot,
								{
									width: dotSize,
									height: dotSize,
									borderRadius: dotSize / 2,
									left: pos.x - dotSize / 2,
									top: pos.y - dotSize / 2,
									backgroundColor: ac.hex,
									borderColor: isSelected ? PRIMARY_COLOR : (ac.id === 'white' ? '#d1d5db' : 'transparent'),
									borderWidth: isSelected ? 3 : (ac.id === 'white' ? 1 : 0),
									shadowColor: isSelected ? PRIMARY_COLOR : 'transparent',
									shadowOpacity: isSelected ? 0.6 : 0,
									shadowRadius: 4,
									elevation: isSelected ? 4 : 0,
								},
							]}
						>
							{isOccupied && (
								<View style={hexPickerStyles.occupiedBadge} />
							)}
						</TouchableOpacity>
					);
				})}
			</View>
			<Text style={[hexPickerStyles.label, { color: theme.screen.icon }]}>{selectedLabel}</Text>
		</View>
	);
}

const hexPickerStyles = StyleSheet.create({
	wrapper: {
		alignItems: 'center',
		paddingVertical: 8,
	},
	container: {
		width: HEX_PICKER_SIZE,
		height: HEX_PICKER_SIZE,
		position: 'relative',
	},
	hexEdge: {
		position: 'absolute',
		height: 1.5,
		transformOrigin: '0 50%',
	},
	dot: {
		position: 'absolute',
	},
	occupiedBadge: {
		position: 'absolute',
		top: -4,
		right: -4,
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: '#22c55e',
		borderWidth: 1.5,
		borderColor: '#ffffff',
	},
	label: {
		fontSize: 12,
		fontWeight: '500',
		marginTop: 6,
	},
});

// ─────────────────────────────────────────────────────────────────────────────

type MapFeatureInfo = {
	layerId: string | null;
	name: string | null;
	class: string | null;
	subclass: string | null;
	highway: string | null;
	waterway: string | null;
	building: string | null;
	natural: string | null;
	landuse: string | null;
	amenity: string | null;
};

function HexTileInfoContent({ h3Index }: { h3Index: string }) {
	const { theme } = useTheme();
	const dispatch = useDispatch();
	const { show: showModal, close: closeModal } = useMyScrollViewModal();
	const record = useSelector((state: RootState) => state.hexTiles.records[h3Index] ?? null);
	const [selectedAnchorColor, setSelectedAnchorColor] = useState<BillboardAnchorColor>(BillboardAnchorColor.Purple);
	const [mapFeatures, setMapFeatures] = useState<MapFeatureInfo[] | null>(null);
	const [featuresLoading, setFeaturesLoading] = useState(false);
	const runIdRef = useRef(0);

	useEffect(() => {
		const runId = ++runIdRef.current;
		setFeaturesLoading(true);
		queryTileFeaturesForHexCell(h3Index)
			.then((result) => {
				if (runId === runIdRef.current) setMapFeatures(result);
			})
			.catch(() => {
				if (runId === runIdRef.current) setMapFeatures(null);
			})
			.finally(() => {
				if (runId === runIdRef.current) setFeaturesLoading(false);
			});
	}, [h3Index]);

	const currentTileImage = record?.tileImage ?? null;
	// Effective billboards: prefer the new `billboards` map, fall back to legacy fields.
	const effectiveBillboards = record ? getEffectiveBillboards(record) : {} as Record<BillboardAnchorColor, string>;
	const currentAnchorBillboard = effectiveBillboards[selectedAnchorColor] ?? null;
	const parsedCurrentBillboard = currentAnchorBillboard ? parseBillboardKey(currentAnchorBillboard) : null;

	const infoRows: { label: string; value: string }[] = [
		{ label: 'H3 Index', value: h3Index },
		{ label: 'Level', value: record ? String(record.level) : '0' },
		{ label: 'Walked On', value: record ? (record.walkedOn ? '✅ Yes' : '⬜ No (enclosed only)') : '⬜ No' },
		{ label: 'Visit Count', value: record ? String(record.visitCount) : '0' },
		{ label: 'Enclosed Count', value: record ? String(record.enclosedCount) : '0' },
		{ label: 'Last Visited', value: record ? formatTimestamp(record.lastVisitedAt) : '—' },
		{ label: 'Last Enclosed', value: record ? formatTimestamp(record.lastEnclosedAt) : '—' },
	];

	const openTileSelection = useCallback(() => {
		showModal({
			title: '🌿 Select Tile Image',
			onClose: closeModal,
			children: (
				<View style={{ paddingBottom: 20 }}>
					{TERRAIN_CATEGORIES.map((cat) => {
						const entries = TERRAIN_ASSETS[cat];
						return (
							<View key={cat}>
								<SettingsListGroupTitle title={cat} />
								{entries.map((entry, i) => {
									const position = entries.length === 1 ? 'single' : i === 0 ? 'top' : i === entries.length - 1 ? 'bottom' : 'middle';
									return (
										<SettingsListSelectOptionSingle
											key={entry.key}
											label={entry.key.split('/').pop() ?? entry.key}
											isSelected={currentTileImage === entry.key}
											selectionColor={PRIMARY_COLOR}
											onPress={() => {
												dispatch(setHexTileCustomization({
													h3Index,
													tileImage: currentTileImage === entry.key ? null : entry.key,
												}));
												closeModal();
											}}
											groupPosition={position}
										/>
									);
								})}
							</View>
						);
					})}
				</View>
			),
		});
	}, [showModal, closeModal, currentTileImage, h3Index, dispatch]);

	const openBillboardSelection = useCallback(() => {
		const anchorLabel = BILLBOARD_ANCHOR_COLORS.find((c) => c.id === selectedAnchorColor)?.label ?? selectedAnchorColor;
		showModal({
			title: `🏗️ Select Billboard — ${anchorLabel}`,
			onClose: closeModal,
			children: (
				<View style={{ paddingBottom: 20 }}>
					{/* None option at the top */}
					<SettingsListSelectOptionSingle
						key="none"
						label="None (clear)"
						isSelected={!currentAnchorBillboard}
						selectionColor={PRIMARY_COLOR}
						onPress={() => {
							dispatch(setBillboardAtAnchor({ h3Index, anchorColor: selectedAnchorColor, billboard: null }));
							closeModal();
						}}
						groupPosition={OBJECT_SPRITES.length > 0 ? 'top' : 'single'}
					/>
					{OBJECT_SPRITES.map((sprite, idx) => {
						const key = `objects:${idx}`;
						const isSelected = currentAnchorBillboard === key;
						const position = idx === OBJECT_SPRITES.length - 1 ? 'bottom' : 'middle';
						return (
							<SettingsListSelectOptionSingle
								key={key}
								label={sprite.name}
								isSelected={isSelected}
								selectionColor={PRIMARY_COLOR}
								onPress={() => {
									dispatch(setBillboardAtAnchor({ h3Index, anchorColor: selectedAnchorColor, billboard: key }));
									closeModal();
								}}
								groupPosition={position}
							/>
						);
					})}
				</View>
			),
		});
	}, [showModal, closeModal, currentAnchorBillboard, h3Index, dispatch, selectedAnchorColor]);

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
			<SettingsListHexTile
				tileImageKey={currentTileImage}
				title="Tile Image"
				onPress={openTileSelection}
				groupPosition="single"
			/>

			{/* ── Billboard / Object section (per anchor) ── */}
			<SettingsListGroupTitle title="Objects (per Anchor)" />
			<HexAnchorPicker
				selected={selectedAnchorColor}
				onSelect={setSelectedAnchorColor}
				occupiedAnchors={effectiveBillboards}
			/>
			<SettingsListBillboard
				spriteIndex={parsedCurrentBillboard?.idx ?? null}
				title={BILLBOARD_ANCHOR_COLORS.find((c) => c.id === selectedAnchorColor)?.label ?? selectedAnchorColor}
				onPress={openBillboardSelection}
				groupPosition="single"
			/>

			{/* ── Underlying map info ── */}
			<SettingsListGroupTitle title="Karteninformationen" />
			{featuresLoading && (
				<View style={{ alignItems: 'center', paddingVertical: 16 }}>
					<ActivityIndicator size="small" color={PRIMARY_COLOR} />
				</View>
			)}
			{mapFeatures && mapFeatures.length > 0 && (
				<>
					{mapFeatures.map((feature, idx) => (
						<SettingsList
							key={idx}
							leftIcon={<MaterialIcons name="info-outline" size={20} color="#ffffff" />}
							iconBackgroundColor={PRIMARY_COLOR}
							title={feature.name ?? feature.layerId ?? `Feature ${idx + 1}`}
							value={JSON.stringify(feature, null, 2)}
							groupPosition={mapFeatures.length === 1 ? 'single' : idx === 0 ? 'top' : idx === mapFeatures.length - 1 ? 'bottom' : 'middle'}
						/>
					))}
				</>
			)}
			{!featuresLoading && mapFeatures && mapFeatures.length === 0 && (
				<SettingsList
					leftIcon={<MaterialIcons name="info-outline" size={20} color="#ffffff" />}
					iconBackgroundColor="#6b7280"
					title="Keine Karteninformationen"
					value="Keine Features in diesem Bereich gefunden."
					groupPosition="single"
				/>
			)}

		</View>
	);
}

const MAGNIFY_COLOR = '#3b82f6';

function MagnifyModalContent({ h3Index }: { h3Index: string }) {
	const { theme } = useTheme();
	const [features, setFeatures] = useState<MapFeatureInfo[] | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const runIdRef = useRef(0);

	const fetchFeatures = useCallback(async () => {
		const runId = ++runIdRef.current;

		setLoading(true);
		setError(null);
		setFeatures(null);

		try {
			if (!isH3Available()) {
				throw new Error('H3 Bibliothek nicht verfügbar');
			}
			if (!isValidCell(h3Index)) {
				throw new Error(`Ungültige H3 Zelle: ${h3Index}`);
			}

			const result = await queryTileFeaturesForHexCell(h3Index);
			if (runId !== runIdRef.current) return;
			setFeatures(result);
		} catch (err) {
			if (runId !== runIdRef.current) return;
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			if (runId === runIdRef.current) {
				setLoading(false);
			}
		}
	}, [h3Index]);

	useEffect(() => {
		fetchFeatures();
	}, [fetchFeatures]);

	const resolution = isH3Available() && isValidCell(h3Index) ? getResolution(h3Index) : null;
	const center = isH3Available() && isValidCell(h3Index) ? cellToLatLng(h3Index) : null;

	const boundary = isH3Available() && isValidCell(h3Index) ? cellToBoundary(h3Index) : [];
	const lats = boundary.map((v: [number, number]) => v[0]);
	const lngs = boundary.map((v: [number, number]) => v[1]);
	const minLat = lats.length > 0 ? Math.min(...lats) : null;
	const maxLat = lats.length > 0 ? Math.max(...lats) : null;
	const minLng = lngs.length > 0 ? Math.min(...lngs) : null;
	const maxLng = lngs.length > 0 ? Math.max(...lngs) : null;

	const streets = features?.filter((f) =>
		f.highway || (f.layerId && (f.layerId.includes('road') || f.layerId.includes('highway') || f.layerId.includes('transportation')))
	) ?? [];
	const waterways = features?.filter((f) =>
		f.waterway || (f.layerId && f.layerId.includes('water'))
	) ?? [];
	const buildings = features?.filter((f) =>
		f.building || (f.layerId && f.layerId.includes('building'))
	) ?? [];
	const pois = features?.filter((f) =>
		f.amenity || f.natural || f.landuse ||
		(f.layerId && (f.layerId.includes('poi') || f.layerId.includes('park') || f.layerId.includes('landuse') || f.layerId.includes('landcover')))
	) ?? [];

	const handleCopyJson = useCallback(async () => {
		if (!features) return;
		const json = JSON.stringify(features, null, 2);
		await Clipboard.setStringAsync(json);
		Alert.alert('Kopiert', 'JSON in Zwischenablage kopiert.');
	}, [features]);

	return (
		<View>
			<SettingsListGroupTitle title="Hex Tile" />
			<SettingsList
				leftIcon={<MaterialIcons name="tag" size={20} color="#ffffff" />}
				iconBackgroundColor="#6b7280"
				title="H3 Index"
				value={h3Index}
				groupPosition="top"
			/>
			{resolution !== null && (
				<SettingsList
					leftIcon={<Ionicons name="grid-outline" size={20} color="#ffffff" />}
					iconBackgroundColor={MAGNIFY_COLOR}
					title="Resolution"
					value={String(resolution)}
					groupPosition="middle"
				/>
			)}
			{center !== null && (
				<SettingsList
					leftIcon={<Ionicons name="location-outline" size={20} color="#ffffff" />}
					iconBackgroundColor={MAGNIFY_COLOR}
					title="Zentrum"
					value={`${center[0].toFixed(6)}°N, ${center[1].toFixed(6)}°E`}
					groupPosition="middle"
				/>
			)}
			{minLat !== null && maxLat !== null && minLng !== null && maxLng !== null && (
				<SettingsList
					leftIcon={<Ionicons name="resize-outline" size={20} color="#ffffff" />}
					iconBackgroundColor={MAGNIFY_COLOR}
					title="Boundary (min/max)"
					value={`Lat: ${minLat.toFixed(6)} – ${maxLat.toFixed(6)}\nLng: ${minLng.toFixed(6)} – ${maxLng.toFixed(6)}`}
					groupPosition="bottom"
				/>
			)}

			{loading && (
				<View style={magnifyStyles.loadingContainer}>
					<ActivityIndicator size="large" color={MAGNIFY_COLOR} />
					<Text style={[magnifyStyles.loadingText, { color: theme.screen.text }]}>
						Lade Tile-Features…
					</Text>
				</View>
			)}

			{error && (
				<View style={magnifyStyles.errorContainer}>
					<Ionicons name="alert-circle" size={24} color="#ef4444" />
					<Text style={magnifyStyles.errorText}>{error}</Text>
				</View>
			)}

			{features && features.length === 0 && !loading && (
				<SettingsList
					leftIcon={<MaterialIcons name="info-outline" size={20} color="#ffffff" />}
					iconBackgroundColor="#6b7280"
					title="Keine Karteninformationen"
					value="Keine Features in diesem Bereich gefunden."
					groupPosition="single"
				/>
			)}

			{streets.length > 0 && (
				<>
					<SettingsListGroupTitle title="Straßen" />
					{streets.map((f, idx) => (
						<SettingsList
							key={`street-${idx}`}
							leftIcon={<MaterialIcons name="directions" size={20} color="#ffffff" />}
							iconBackgroundColor="#f97316"
							title={f.name ?? f.highway ?? f.class ?? `Straße ${idx + 1}`}
							value={JSON.stringify(f)}
							groupPosition={streets.length === 1 ? 'single' : idx === 0 ? 'top' : idx === streets.length - 1 ? 'bottom' : 'middle'}
						/>
					))}
				</>
			)}
			{waterways.length > 0 && (
				<>
					<SettingsListGroupTitle title="Gewässer" />
					{waterways.map((f, idx) => (
						<SettingsList
							key={`water-${idx}`}
							leftIcon={<MaterialIcons name="water" size={20} color="#ffffff" />}
							iconBackgroundColor="#3b82f6"
							title={f.name ?? f.waterway ?? f.class ?? `Gewässer ${idx + 1}`}
							value={JSON.stringify(f)}
							groupPosition={waterways.length === 1 ? 'single' : idx === 0 ? 'top' : idx === waterways.length - 1 ? 'bottom' : 'middle'}
						/>
					))}
				</>
			)}
			{buildings.length > 0 && (
				<>
					<SettingsListGroupTitle title="Gebäude" />
					{buildings.map((f, idx) => (
						<SettingsList
							key={`building-${idx}`}
							leftIcon={<MaterialIcons name="apartment" size={20} color="#ffffff" />}
							iconBackgroundColor="#8b5cf6"
							title={f.name ?? f.building ?? f.class ?? `Gebäude ${idx + 1}`}
							value={JSON.stringify(f)}
							groupPosition={buildings.length === 1 ? 'single' : idx === 0 ? 'top' : idx === buildings.length - 1 ? 'bottom' : 'middle'}
						/>
					))}
				</>
			)}
			{pois.length > 0 && (
				<>
					<SettingsListGroupTitle title="Points of Interest" />
					{pois.map((f, idx) => (
						<SettingsList
							key={`poi-${idx}`}
							leftIcon={<MaterialIcons name="place" size={20} color="#ffffff" />}
							iconBackgroundColor="#10b981"
							title={f.name ?? f.amenity ?? f.natural ?? f.landuse ?? f.subclass ?? f.class ?? `POI ${idx + 1}`}
							value={JSON.stringify(f)}
							groupPosition={pois.length === 1 ? 'single' : idx === 0 ? 'top' : idx === pois.length - 1 ? 'bottom' : 'middle'}
						/>
					))}
				</>
			)}

			{features && features.length > 0 && (
				<>
					<SettingsListGroupTitle title="Alle Features (JSON)" />
					<TouchableOpacity
						style={[magnifyStyles.copyButton, { backgroundColor: '#374151' }]}
						onPress={handleCopyJson}
						activeOpacity={0.8}
					>
						<MaterialIcons name="content-copy" size={18} color="#ffffff" />
						<Text style={magnifyStyles.copyButtonText}>JSON kopieren</Text>
					</TouchableOpacity>
					<SettingsList
						leftIcon={<MaterialIcons name="code" size={20} color="#ffffff" />}
						iconBackgroundColor="#374151"
						title="mapFeatures"
						value={JSON.stringify(features, null, 2)}
						groupPosition="single"
					/>
				</>
			)}
		</View>
	);
}

const magnifyStyles = StyleSheet.create({
	loadingContainer: {
		alignItems: 'center',
		paddingVertical: 24,
		gap: 10,
	},
	loadingText: {
		fontSize: 14,
	},
	errorContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	errorText: {
		color: '#ef4444',
		fontSize: 14,
		flex: 1,
	},
	copyButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		marginHorizontal: 16,
		marginVertical: 8,
		paddingVertical: 10,
		borderRadius: 10,
	},
	copyButtonText: {
		color: '#ffffff',
		fontSize: 15,
		fontWeight: '600',
	},
});

export default function RecordScreen() {
	const { theme } = useTheme();
	const { show: showModal, close: closeModal } = useMyScrollViewModal();
	const { show: showColoringModal, close: closeColoringModal } = useMyScrollViewModal();
	const { show: showRouteModal, close: closeRouteModal } = useMyScrollViewModal();
	const { show: showMagnifyModal, close: closeMagnifyModal } = useMyScrollViewModal();
	const navigation = useNavigation();
	const router = useRouter();
	const [osmConsent, setOsmConsent] = useState(false);
	const mapRef = useRef<MyMapHandle>(null);

	// Redux selectors
	const resetToken = useSelector((state: RootState) => state.hexTiles.resetToken);
	const selectedSportType = useSelector((state: RootState) => state.sportType.selectedType);
	const hexTileRecords = useSelector((state: RootState) => state.hexTiles.records);
	const isDevMode = useSelector((state: RootState) => state.hexTiles.isDevMode);
	const isDebugMode = useDebugMode();
	const isTTSEnabled = useSelector((state: RootState) => state.tts.ttsEnabled);
	const announceAppInBackground = useSelector((state: RootState) => state.speechSettings.announceAppInBackground);
	const speechSettings = useSelector((state: RootState) => state.speechSettings);
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

	// Measure mode (debug only): collect waypoints by tapping the map
	const [isMeasureMode, setIsMeasureMode] = useState(false);
	const isMeasureModeRef = useRef(false);
	const measureWaypointsRef = useRef<Array<{ lat: number; lng: number }>>([]);

	// Magnify mode (debug only): show detailed map info when tapping a hex tile
	const [isMagnifyMode, setIsMagnifyMode] = useState(false);
	const isMagnifyModeRef = useRef(false);

	// TTS: track the last whole-km milestone announced to avoid repeating.
	// Reset to 0 when recording starts.
	const lastAnnouncedKmRef = useRef(0);
	const isTTSEnabledRef = useRef(isTTSEnabled);
	isTTSEnabledRef.current = isTTSEnabled;
	const announceAppInBackgroundRef = useRef(announceAppInBackground);
	announceAppInBackgroundRef.current = announceAppInBackground;
	const speechSettingsRef = useRef(speechSettings);
	speechSettingsRef.current = speechSettings;
	// Timer for periodic (time-based) speech announcements during recording
	const periodicAnnouncementTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	// Pace hint hysteresis: tracks the last announced pace warning state and
	// a cooldown timestamp to avoid overwhelming the TTS engine with frequent
	// "too fast" / "too slow" announcements.
	const paceHintStateRef = useRef<PaceHintState>('on_target');
	const lastPaceHintTimeRef = useRef(0);
	/** Minimum cooldown between pace hint announcements (ms). */
	const PACE_HINT_COOLDOWN_MS = 15_000;

	// Follow mode: when active the map stays centred on the user's location.
	// Starts as true so the map tracks the user by default.
	const isFollowingRef = useRef(true);
	const [isFollowing, setIsFollowing] = useState(true);

	const [isPaused, setIsPaused] = useState(false);
	const isPausedRef = useRef(false);
	const accumulatedSecondsRef = useRef(0);

	const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

	// Pre-run route selection: selected route to follow during the next recording.
	const [selectedRoute, setSelectedRoute] = useState<SavedRoute | null>(null);
	const selectedRouteRef = useRef<SavedRoute | null>(null);
	selectedRouteRef.current = selectedRoute;

	// Coloring tool state:
	// - coloringTileImage: the currently selected tile key; null means coloring mode is off.
	// - coloringTileImageRef: ref copy for use in map message callbacks (avoids stale closures).
	// - coloringSelectionMadeRef: tracks whether the user made a selection in the modal,
	//   used to distinguish "closed by selection" vs "dismissed without selection".
	const [coloringTileImage, setColoringTileImage] = useState<string | null>(null);
	const coloringTileImageRef = useRef<string | null>(null);
	const coloringSelectionMadeRef = useRef(false);
	coloringTileImageRef.current = coloringTileImage;

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
			.filter(([, r]) => r.tileImage || r.billboard || r.billboards)
			.map(([h3, r]) => `${h3}=${r.tileImage ?? ''}|${r.billboard ?? ''}|${JSON.stringify(r.billboards ?? {})}`)
			.sort()
			.join('\n'),
	);

	// Stable key for billboard anchor config changes so the map is updated when
	// anchor overrides are adjusted in the Billboard Config screen.
	const billboardConfigKey = useSelector((state: RootState) =>
		JSON.stringify(state.billboardConfig.spriteAnchors),
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
		const spriteAnchors = store.getState().billboardConfig.spriteAnchors;

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

		// ── Billboard GeoJSON symbol layer ───────────────────────────────────────────
		// Billboards are rendered as a MapLibre symbol layer whose icon-size is set to
		// a fixed value per feature. The zoom-based exponential expression in the
		// MapLibre HTML ensures the icon scales proportionally with the map so that
		// each billboard occupies a constant geographic area. Billboard size also
		// scales with the H3 edge length: larger on bigger hexagons, smaller on
		// smaller ones.
		//
		// Each unique billboard SVG is rasterized at 4× resolution (512×512 actual pixels
		// for a 128×128 logical icon) via canvas + pixelRatio, keeping SVGs crisp when
		// zoomed in or on high-DPI screens. Features carry an iconSizeAtRefZoom property
		// (= desiredPixelSize / BILLBOARD_STANDARD_ICON_SIZE at zoom 14) so the layer's
		// icon-size zoom expression scales it correctly at all zoom levels.
		// NOTE: Keep this value in sync with BILLBOARD_ICON_SIZE in the MapLibre HTML.
		const BILLBOARD_STANDARD_ICON_SIZE = 128;

		// Billboard pixel size is determined by the sprite's scaleFactor, the
		// user-adjustable billboard scale multiplier, AND the H3 edge length ratio
		// relative to the reference resolution (10). This makes billboards larger on
		// bigger hexagons and smaller on smaller ones.
		// townhall (scaleFactor 7.0) renders at 7 × BILLBOARD_UNIT_PX ≈ 48 px at zoom 14
		// at the reference resolution.

		const billboardImages: Record<string, { url: string }> = {};
		type BillboardFeature = {
			type: 'Feature';
			geometry: { type: 'Point'; coordinates: [number, number] };
			properties: { iconKey: string; iconSizeAtRefZoom: number; anchorX: number; anchorY: number };
		};
		const billboardFeatures: BillboardFeature[] = [];

		// Midpoint anchor colors in the order they map to hex vertices 0–5.
		const MIDPOINT_ANCHOR_COLORS = [BillboardAnchorColor.Red, BillboardAnchorColor.Orange, BillboardAnchorColor.Yellow, BillboardAnchorColor.Blue, BillboardAnchorColor.White, BillboardAnchorColor.Black];

		for (const [h3Index, record] of Object.entries(records)) {
			// Build an effective billboard map using the shared helper.
			const effectiveBillboards = getEffectiveBillboards(record);
			if (Object.keys(effectiveBillboards).length === 0) continue;

			// Compute hex boundary (centroid + vertices) once per tile.
			const boundary = cellToBoundary(h3Index, H3_GEOJSON_ORDER); // [[lng, lat], ...]
			let sumLng = 0, sumLat = 0;
			const n = boundary.length - 1;
			if (n <= 0) continue;
			for (let j = 0; j < n; j++) {
				const [bLng, bLat] = boundary[j] as [number, number];
				sumLng += bLng;
				sumLat += bLat;
			}
			const centerLng = sumLng / n;
			const centerLat = sumLat / n;

			// Size constants for this tile's resolution (shared across all anchors).
			const cellRes = getResolution(h3Index);
			const clampedRes = Math.max(0, Math.min(cellRes, H3_EDGE_LENGTH_KM.length - 1));
			const edgeLengthRatio = H3_EDGE_LENGTH_KM[clampedRes] / H3_EDGE_LENGTH_KM[BILLBOARD_REFERENCE_RESOLUTION];

			// Render one billboard feature per occupied anchor position.
			for (const [anchorColor, billboardKey] of Object.entries(effectiveBillboards)) {
				const parsed = parseBillboardKey(billboardKey);
				if (!parsed) continue;
				const { sprite, idx } = parsed;
				const url = await loadAssetUrl(billboardKey, sprite.source as number, 'image/svg+xml');
				if (!url) continue;

				const iconKey = `billboard-${billboardKey}`;

				// Look up global anchor overrides for this sprite type.
				const anchorOverride = spriteAnchors[idx];
				const anchorX = anchorOverride?.anchorX ?? sprite.anchorX;
				const anchorY = anchorOverride?.anchorY ?? sprite.anchorY;

				// Determine billboard placement position based on anchor color.
				// Matches debug point positions: purple=center, green=vertex[0],
				// red/orange/yellow/blue/white/black = midpoints 0–5.
				let lng = centerLng;
				let lat = centerLat;
				if (anchorColor === BillboardAnchorColor.Green && n > 0) {
					// Use the first vertex (corner) of the hex polygon.
					const [vLng, vLat] = boundary[0] as [number, number];
					lng = vLng;
					lat = vLat;
				} else if (anchorColor !== BillboardAnchorColor.Purple) {
					// Midpoint between center and a corner vertex.
					const midIdx = MIDPOINT_ANCHOR_COLORS.indexOf(anchorColor as BillboardAnchorColor);
					if (midIdx >= 0 && midIdx < n) {
						const [vLng, vLat] = boundary[midIdx] as [number, number];
						lng = (centerLng + vLng) / 2;
						lat = (centerLat + vLat) / 2;
					}
				}

				// Per-sprite scale multiplier from the billboard config screen (default 1.0).
				const perSpriteScale = anchorOverride?.scaleMultiplier ?? 1.0;
				// Minimum BILLBOARD_MIN_SIZE_PX so extremely small sprites remain visible and tappable.
				const billboardSizePx = Math.max(BILLBOARD_MIN_SIZE_PX, Math.round(
					BILLBOARD_UNIT_PX * sprite.scaleFactor * billboardScaleRef.current * perSpriteScale * edgeLengthRatio,
				));
				// iconSizeAtRefZoom is the MapLibre icon-size value at zoom 14:
				// icon renders at BILLBOARD_STANDARD_ICON_SIZE × iconSizeAtRefZoom pixels on screen.
				const iconSizeAtRefZoom = billboardSizePx / BILLBOARD_STANDARD_ICON_SIZE;

				if (!billboardImages[iconKey]) {
					billboardImages[iconKey] = { url };
				}
				billboardFeatures.push({
					type: 'Feature',
					geometry: { type: 'Point', coordinates: [lng, lat] },
					properties: { iconKey, iconSizeAtRefZoom, anchorX, anchorY },
				});
			}
		}

		mapRef.current.sendToMap({
			imageOverlays,
			// Clear any legacy DOM markers from previous versions.
			mapMarkers: [],
			billboards: {
				images: billboardImages,
				features: billboardFeatures,
			},
		});
	}, [loadAssetUrl]);

	// Re-send customizations whenever tile image / model selections or
	// billboard anchor config change.
	// Billboard sizes scale proportionally with the H3 edge length.
	useEffect(() => {
		loadAndSendCustomizations();
	}, [hexTileCustomizationsKey, billboardConfigKey, loadAndSendCustomizations]);


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
	// Ordered sequence of visited H3 hex cells during the active recording.
	// Each cell appears only once, in the order it was first entered.
	const orderedHexTilesRef = useRef<string[]>([]);
	// The last H3 cell visited; used to detect cell transitions in handleLocationUpdate.
	const lastCellRef = useRef<string | null>(null);
	// Current player position (updated from real GPS and from debug gamepad)
	const debugPlayerPositionRef = useRef<{ lat: number; lng: number } | null>(null);
	// Joystick speed, configurable from the debug modal
	const debugMoveSpeedKmhRef = useRef(DEBUG_MOVE_SPEED_KMH);
	// Billboard scale multiplier, configurable from the debug modal
	const billboardScaleRef = useRef(BILLBOARD_SCALE_DEFAULT);
	// Whether billboards face the camera (true) or lie flat on the map (false)
	const billboardFaceCameraRef = useRef(true);
	// Whether to show anchor point indicators at the base of each billboard
	const showBillboardAnchorsRef = useRef(false);
	// Whether debug point layers (vertices, centers, midpoints) are visible
	const showDebugPointsRef = useRef(false);
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

	/**
	 * Rebuild and send the standard hex tile and walk path GeoJSON to the map
	 * based on the current viewport. Used when restoring normal (non-route-preview)
	 * display after a route is deselected and on viewport changes.
	 */
	const refreshNormalTileDisplay = useCallback((vp: { bounds: ViewportBounds; zoom: number }) => {
		if (!mapRef.current) return;
		let geoJson: H3FeatureCollection = { type: 'FeatureCollection', features: [] };
		try {
			geoJson = buildH3GeoJson(vp.bounds, vp.zoom, h3ResolutionRef.current, showGridAlwaysRef.current, store.getState().hexTiles.records);
		} catch {
			// ignore
		}
		if (debugViewportRef.current) {
			debugViewportRef.current.tileCount = geoJson.features.length;
		}
		const viewportCells = [...new Set(geoJson.features.map((f) => f.properties.h3Index))];
		const walkPathGeoJson = buildWalkPathGeoJson(viewportCells, store.getState().hexTiles.walkedEdges);
		mapRef.current.sendToMap({ hexTileGeoJson: geoJson });
		mapRef.current.sendToMap({ hexWalkPathGeoJson: walkPathGeoJson });
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
			if (periodicAnnouncementTimerRef.current) clearInterval(periodicAnnouncementTimerRef.current);
			Location.stopLocationUpdatesAsync(ACTIVITY_LOCATION_TASK).catch(() => {});
		};
	}, []);

	// ── Announce when the app moves to the background during an active recording
	useEffect(() => {
		const subscription = AppState.addEventListener('change', (nextAppState) => {
			if (
				nextAppState === 'background' &&
				isRecordingRef.current &&
				isTTSEnabledRef.current &&
				announceAppInBackgroundRef.current
			) {
				const locale = getLocales()[0]?.languageTag ?? 'en-US';
				const langCode = locale.split('-')[0].toLowerCase();
				const text = buildBackgroundAnnouncement(locale);
				const curSs = speechSettingsRef.current;
				speakAnnouncement(text, langCode, {
					rate: speechRateToNumber(curSs.speechRate),
				});
			}
		});
		return () => subscription.remove();
	}, []);

	// ── Refresh map display when returning from background during a recording ──
	// While the screen is off the WebView may not process messages, so hex tiles,
	// walk paths and the route line can be stale.  Re-send them once the app
	// becomes active again.
	useEffect(() => {
		const subscription = AppState.addEventListener('change', (nextAppState) => {
			if (nextAppState === 'active' && isRecordingRef.current && mapRef.current) {
				// Re-send the GPS track line
				if (routePointsRef.current.length > 0) {
					sendRouteToMap(routePointsRef.current);
				}
				// Re-send hex tile grid and walk path
				const vp = debugViewportRef.current;
				if (vp) {
					refreshNormalTileDisplay(vp);
				}
			}
		});
		return () => subscription.remove();
	}, [sendRouteToMap, refreshNormalTileDisplay]);

	// ── Route preview: when a route is selected before recording, show only the
	// route's hex tiles and walk path on the map (hiding all other visited tiles).
	// This gives the same view as the route detail screen (routes/[id]).
	useEffect(() => {
		if (!mapRef.current) return;
		if (selectedRoute && !isRecordingRef.current) {
			// Show route preview
			try {
				const { hexTileGeoJson, hexWalkPathGeoJson } = buildRouteDisplayData(
					selectedRoute,
					store.getState().hexTiles.records,
				);
				mapRef.current.sendToMap({ hexTileGeoJson });
				mapRef.current.sendToMap({ hexWalkPathGeoJson });

				// Fit the camera to the route extent
				const bounds = computeHexBounds(selectedRoute.hexTiles);
				if (bounds) {
					const { minLat, maxLat, minLng, maxLng } = bounds;
					const latPad = Math.max((maxLat - minLat) * 0.25, 0.001);
					const lngPad = Math.max((maxLng - minLng) * 0.25, 0.001);
					mapRef.current.sendToMap({
						fitBounds: [[minLng - lngPad, minLat - latPad], [maxLng + lngPad, maxLat + latPad]],
						fitBoundsPadding: 20,
						pitch: 45,
						bearing: 0,
					});
				}
			} catch (err) {
				console.warn('[RecordScreen] Route preview failed:', err);
			}
		} else if (!selectedRoute) {
			// Route deselected: refresh normal tile and walk path display
			const vp = debugViewportRef.current;
			if (vp) {
				refreshNormalTileDisplay(vp);
			}
		}
	}, [selectedRoute, refreshNormalTileDisplay]);

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

	const handleBillboardScaleChange = useCallback((scale: number) => {
		billboardScaleRef.current = scale;
		// Resend billboards so the new scale takes effect immediately.
		loadAndSendCustomizations();
	}, [loadAndSendCustomizations]);

	const handleBillboardFaceCameraChange = useCallback((val: boolean) => {
		billboardFaceCameraRef.current = val;
		mapRef.current?.sendToMap({ billboardPitchAlignment: val ? 'viewport' : 'map' });
	}, []);

	const handleShowBillboardAnchorsChange = useCallback((val: boolean) => {
		showBillboardAnchorsRef.current = val;
		mapRef.current?.sendToMap({ billboardShowAnchors: val });
	}, []);

	const handleShowDebugPointsChange = useCallback((val: boolean) => {
		showDebugPointsRef.current = val;
		mapRef.current?.sendToMap({ hexDebugPoints: val });
	}, []);

	const showHexTileModal = useCallback((h3Index: string) => {
		showModal({
			title: '🗺️ Hex Tile Info',
			children: (
				<HexTileInfoContent h3Index={h3Index} />
			),
		});
	}, [showModal]);

	const showMagnifyHexTileModal = useCallback((h3Index: string) => {
		showMagnifyModal({
			title: '🔍 Karte Info',
			onClose: closeMagnifyModal,
			children: (
				<MagnifyModalContent h3Index={h3Index} />
			),
		});
	}, [showMagnifyModal, closeMagnifyModal]);

	// ── Measure mode (debug only) ───────────────────────────────────────────────

	const startMeasureMode = useCallback(() => {
		isMeasureModeRef.current = true;
		setIsMeasureMode(true);
		measureWaypointsRef.current = [];
		mapRef.current?.sendToMap({ measureMode: true });
		mapRef.current?.sendToMap({ measureRouteCoords: [] });
		mapRef.current?.sendToMap({ measurePoints: [] });
	}, []);

	const cancelMeasureMode = useCallback(() => {
		isMeasureModeRef.current = false;
		setIsMeasureMode(false);
		measureWaypointsRef.current = [];
		mapRef.current?.sendToMap({ measureMode: false });
	}, []);

	// ── Magnify mode (debug only) ───────────────────────────────────────────────

	const startMagnifyMode = useCallback(() => {
		isMagnifyModeRef.current = true;
		setIsMagnifyMode(true);
	}, []);

	const cancelMagnifyMode = useCallback(() => {
		isMagnifyModeRef.current = false;
		setIsMagnifyMode(false);
	}, []);

	const undoMeasurePoint = useCallback(() => {
		const prev = measureWaypointsRef.current.slice(0, -1);
		measureWaypointsRef.current = prev;
		const coords = prev.map((w) => [w.lng, w.lat]);
		mapRef.current?.sendToMap({ measureRouteCoords: coords });
		mapRef.current?.sendToMap({ measurePoints: coords });
	}, []);

	const handleSaveMeasureAsActivity = useCallback((routeCells: string[], enclosedCount: number) => {
		if (routeCells.length < 2) return;
		const startTimestamp = Date.now();
		const speedBaseKmh = MEASURE_SPEED_BASE_KMH + (Math.random() - 0.5) * MEASURE_SPEED_VARIATION_KMH;
		const routePoints = generateMeasureRoutePoints(routeCells, speedBaseKmh, MEASURE_SPEED_VARIATION_KMH, startTimestamp);
		if (routePoints.length < 2) return;
		const stats = computeStats(routePoints);
		const endedAt = routePoints[routePoints.length - 1].timestamp;
		const activity: SavedActivity = {
			id: String(startTimestamp),
			startedAt: startTimestamp,
			endedAt,
			routePoints,
			stats,
			sportType: selectedSportTypeRef.current,
			h3Resolution: Math.max(H3_RESOLUTION_MIN, Math.min(H3_RESOLUTION_MAX, Math.floor(h3ResolutionRef.current))),
			visitedTileCount: routeCells.length,
			enclosedTileCount: enclosedCount,
			hexTilesOrdered: routeCells,
		};
		try {
			saveActivity(activity);
			Alert.alert(
				'Activity Saved',
				`Route saved: ${routeCells.length} hex tiles, ${enclosedCount} enclosed.`,
			);
		} catch {
			Alert.alert('Error', 'Failed to save activity.');
		}
	}, []);

	const handleSaveMeasureAsRoute = useCallback((routeCells: string[], name: string) => {
		if (routeCells.length < 2 || !name.trim()) return;
		const now = Date.now();
		const route: SavedRoute = {
			id: String(now),
			name: name.trim(),
			hexTiles: routeCells,
			h3Resolution: Math.max(H3_RESOLUTION_MIN, Math.min(H3_RESOLUTION_MAX, Math.floor(h3ResolutionRef.current))),
			createdAt: now,
			sportType: selectedSportTypeRef.current,
			walkedEdges: computeEdgesFromHexTiles(routeCells),
		};
		try {
			saveRoute(route);
			Alert.alert('Route gespeichert', `"${route.name}" wurde als Route gespeichert.`);
		} catch {
			Alert.alert('Fehler', 'Die Route konnte nicht gespeichert werden.');
		}
	}, []);

	const finishMeasurement = useCallback(async () => {
		const waypoints = measureWaypointsRef.current;
		if (waypoints.length < 2) {
			Alert.alert('Not enough points', 'Tap at least 2 points on the map to measure a route.');
			return;
		}

		const routeCells = computeOrderedMeasureRouteCells(waypoints, h3ResolutionRef.current);
		const routeLengthInTiles = routeCells.length;

		// Compute enclosed tiles: use waypoints as the route polygon
		const routeAsPoints: RoutePoint[] = waypoints.map((w, i) => ({
			lat: w.lat, lng: w.lng, altitude: null, speed: null, timestamp: Date.now() + i * 1000,
		}));
		let enclosedTileCount = 0;
		try {
			const allEnclosed = findEnclosedCells(routeAsPoints, h3ResolutionRef.current);
			// Exclude cells that are part of the route itself
			const routeCellSet = new Set(routeCells);
			enclosedTileCount = allEnclosed.filter((c) => !routeCellSet.has(c)).length;
		} catch {
			// ignore
		}

		// Load saved activities for time estimation
		const savedActivities = await loadActivities().catch(() => [] as SavedActivity[]);

		// Exit measure mode and clear overlay
		cancelMeasureMode();

		showModal({
			title: '📏 Measure Results',
			onClose: closeModal,
			children: (
				<MeasureResultContent
					routeLengthInTiles={routeLengthInTiles}
					enclosedTileCount={enclosedTileCount}
					routeCells={routeCells}
					h3Resolution={h3ResolutionRef.current}
					theme={theme}
					savedActivities={savedActivities}
					selectedSportType={selectedSportTypeRef.current}
					onSaveAsActivity={handleSaveMeasureAsActivity}
					onSaveAsRoute={handleSaveMeasureAsRoute}
					onClose={closeModal}
				/>
			),
		});
	}, [showModal, closeModal, theme, cancelMeasureMode, handleSaveMeasureAsActivity, handleSaveMeasureAsRoute]);

	const openColoringModal = useCallback(() => {
		coloringSelectionMadeRef.current = false;
		showColoringModal({
			title: '🎨 Tile Color',
			onClose: () => {
				if (!coloringSelectionMadeRef.current) {
					setColoringTileImage(null);
				}
				closeColoringModal();
			},
			children: (
				<View style={{ paddingBottom: 20 }}>
					{TERRAIN_CATEGORIES.map((cat) => {
						const entries = TERRAIN_ASSETS[cat];
						return (
							<View key={cat}>
								<SettingsListGroupTitle title={cat} />
								{entries.map((entry, i) => {
									const position = entries.length === 1 ? 'single' : i === 0 ? 'top' : i === entries.length - 1 ? 'bottom' : 'middle';
									return (
										<SettingsListSelectOptionSingle
											key={entry.key}
											label={entry.key.split('/').pop() ?? entry.key}
											isSelected={coloringTileImageRef.current === entry.key}
											selectionColor={PRIMARY_COLOR}
											onPress={() => {
												coloringSelectionMadeRef.current = true;
												setColoringTileImage(entry.key);
												closeColoringModal();
											}}
											groupPosition={position}
										/>
									);
								})}
							</View>
						);
					})}
				</View>
			),
		});
	}, [showColoringModal, closeColoringModal]);

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
			debugViewportRef.current = { bounds: vp.bounds, zoom: vp.zoom, tileCount: 0 };

			// When a route is selected (pre-recording), show only the route's tiles
			// and walk path instead of the full global tile set.
			if (selectedRouteRef.current && !isRecordingRef.current) {
				try {
					const { hexTileGeoJson, hexWalkPathGeoJson } = buildRouteDisplayData(
						selectedRouteRef.current,
						store.getState().hexTiles.records,
					);
					debugViewportRef.current.tileCount = hexTileGeoJson.features.length;
					mapRef.current?.sendToMap({ hexTileGeoJson });
					mapRef.current?.sendToMap({ hexWalkPathGeoJson });
				} catch (err) {
					console.warn('[RecordScreen] Route preview viewport update failed:', err);
				}
			} else {
				refreshNormalTileDisplay(vp);
			}
		} else if (msg.tag === 'HexTileClicked') {
			const clickedMsg = msg as { h3Index?: string; mapFeatures?: MapFeatureInfo[] };
			if (clickedMsg.h3Index) {
				if (coloringTileImageRef.current !== null) {
					// Coloring mode active: directly apply the selected tile image.
					dispatch(setHexTileCustomization({ h3Index: clickedMsg.h3Index, tileImage: coloringTileImageRef.current }));
				} else if (isMagnifyModeRef.current) {
					// Magnify mode active: show detailed map info modal.
					showMagnifyHexTileModal(clickedMsg.h3Index);
				} else {
					showHexTileModal(clickedMsg.h3Index);
				}
			}
		} else if (msg.tag === 'MapMeasurePoint') {
			const ptMsg = msg as { lat: number; lng: number };
			if (isMeasureModeRef.current) {
				const newWaypoints = [...measureWaypointsRef.current, { lat: ptMsg.lat, lng: ptMsg.lng }];
				measureWaypointsRef.current = newWaypoints;
				const coords = newWaypoints.map((w) => [w.lng, w.lat]);
				mapRef.current?.sendToMap({ measureRouteCoords: coords });
				mapRef.current?.sendToMap({ measurePoints: coords });
			}
		}
	}, [centerMapOnPosition, sendRouteToMap, setFollowMode, showHexTileModal, showMagnifyHexTileModal, loadAndSendCustomizations, dispatch]);

	const handleExportMapSettings = useCallback(async () => {
		const exportData: Record<string, { tileImage?: string; billboards?: Record<string, string> }> = {};
		for (const [h3Index, record] of Object.entries(hexTileRecords)) {
			const billboards = getEffectiveBillboards(record);
			const hasBillboards = Object.keys(billboards).length > 0;
			if (record.tileImage || hasBillboards) {
				exportData[h3Index] = {};
				if (record.tileImage) exportData[h3Index].tileImage = record.tileImage;
				if (hasBillboards) exportData[h3Index].billboards = billboards;
			}
		}
		const json = JSON.stringify({ version: 1, hexTiles: exportData }, null, 2);
		await Clipboard.setStringAsync(json);
		Alert.alert('Map Settings Exported', `${Object.keys(exportData).length} tile customization(s) copied to clipboard.`);
	}, [hexTileRecords]);

	const handleImportMapSettings = useCallback((json: string) => {
		let parsed: unknown;
		try {
			parsed = JSON.parse(json);
		} catch {
			Alert.alert('Import Failed', 'The text is not valid JSON.');
			return;
		}
		const data = parsed as { version?: number; hexTiles?: Record<string, { tileImage?: string | null; billboards?: Record<string, string | null> }> };
		if (!data.hexTiles || typeof data.hexTiles !== 'object') {
			Alert.alert('Import Failed', 'No "hexTiles" object found in the data.');
			return;
		}
		dispatch(applyMapCustomizations(data.hexTiles));
		Alert.alert('Map Settings Imported', `Applied customizations for ${Object.keys(data.hexTiles).length} tile(s).`);
	}, [dispatch]);

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
					initialBillboardScale={billboardScaleRef.current}
					initialBillboardFaceCamera={billboardFaceCameraRef.current}
					initialShowBillboardAnchors={showBillboardAnchorsRef.current}
					initialShowDebugPoints={showDebugPointsRef.current}
					onShowGridAlwaysChange={handleShowGridAlwaysChange}
					onH3ResolutionChange={handleH3ResolutionChange}
					onZoomAdjust={handleZoomAdjust}
					onSpeedChange={handleSpeedChange}
					onBillboardScaleChange={handleBillboardScaleChange}
					onBillboardFaceCameraChange={handleBillboardFaceCameraChange}
					onShowBillboardAnchorsChange={handleShowBillboardAnchorsChange}
					onShowDebugPointsChange={handleShowDebugPointsChange}
					onExportMapSettings={handleExportMapSettings}
					onImportMapSettings={handleImportMapSettings}
				/>
			),
		});
	}, [showModal, closeModal, theme, handleShowGridAlwaysChange, handleH3ResolutionChange, handleZoomAdjust, handleSpeedChange, handleBillboardScaleChange, handleBillboardFaceCameraChange, handleShowBillboardAnchorsChange, handleShowDebugPointsChange, handleExportMapSettings, handleImportMapSettings]);

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
								const newEdges: string[] = [];
								for (let i = 0; i < pathCells.length - 1; i++) {
									const a = pathCells[i];
									const b = pathCells[i + 1];
									newEdges.push(a < b ? `${a}:${b}` : `${b}:${a}`);
									if (i > 0) {
										// Intermediate cell (not pathCells[0] which is lastCellRef, already visited)
										if (!visitedHexIdsRef.current.has(pathCells[i])) {
											visitedHexIdsRef.current.add(pathCells[i]);
											orderedHexTilesRef.current.push(pathCells[i]);
											dispatch(markVisited({ h3Indices: [pathCells[i]], timestamp: point.timestamp }));
										}
									}
								}
								if (newEdges.length > 0) {
									dispatch(addWalkedEdges(newEdges));
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
						orderedHexTilesRef.current.push(cell);
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

		// Announce each whole-km milestone via TTS when enabled.
		if (isTTSEnabledRef.current) {
			const crossedKm = Math.floor(d);
			if (crossedKm > 0 && crossedKm > lastAnnouncedKmRef.current) {
				lastAnnouncedKmRef.current = crossedKm;
				const elapsedSec = startTimeRef.current > 0
						? (Date.now() - startTimeRef.current) / 1000 + accumulatedSecondsRef.current
						: accumulatedSecondsRef.current;
				const paceMinPerKm = elapsedSec > 0 && d > 0 ? elapsedSec / 60 / d : null;
				const locale = getLocales()[0]?.languageTag ?? 'en-US';
				const langCode = locale.split('-')[0].toLowerCase();
				const curSs = speechSettingsRef.current;
				const text = buildKmAnnouncement(crossedKm, paceMinPerKm, locale, {
					announcePace: curSs.announcePace,
					announceSpeedKmh: curSs.announceSpeed,
				});
				speakAnnouncement(text, langCode, {
					rate: speechRateToNumber(curSs.speechRate),
				});
			}
		}

		// ── Pace hint announcements with hysteresis threshold ────────────
		if (isTTSEnabledRef.current && d > 0) {
			const curSs = speechSettingsRef.current;
			if (curSs.paceTargetEnabled) {
				const elapsedSec = startTimeRef.current > 0
					? (Date.now() - startTimeRef.current) / 1000 + accumulatedSecondsRef.current
					: accumulatedSecondsRef.current;
				const currentPace = elapsedSec > 0 ? elapsedSec / 60 / d : null;
				if (currentPace != null) {
					const targetPace = curSs.paceTargetMinutes + curSs.paceTargetSeconds / 60;
					const fasterThreshold = curSs.paceHintFasterMinutes + curSs.paceHintFasterSeconds / 60;
					const slowerThreshold = curSs.paceHintSlowerMinutes + curSs.paceHintSlowerSeconds / 60;

					// Lower pace value = faster running.  Thresholds are subtracted/added
					// from the target to define the acceptable range boundaries.
					const fasterBound = targetPace - fasterThreshold;
					const slowerBound = targetPace + slowerThreshold;

					const prev = paceHintStateRef.current;
					let next: PaceHintState = 'on_target';

					if (curSs.paceHintFasterEnabled && currentPace < fasterBound) {
						next = 'too_fast';
					} else if (curSs.paceHintSlowerEnabled && currentPace > slowerBound) {
						next = 'too_slow';
					}

					// Announce only on a *transition* into a warning state from on_target
					// and only if the cooldown has elapsed.
					const now = Date.now();
					if (
						next !== 'on_target' &&
						prev === 'on_target' &&
						now - lastPaceHintTimeRef.current >= PACE_HINT_COOLDOWN_MS
					) {
						const locale = getLocales()[0]?.languageTag ?? 'en-US';
						const langCode = locale.split('-')[0].toLowerCase();
						const text = buildPaceHintAnnouncement(next, currentPace, targetPace, locale);
						speakAnnouncement(text, langCode, {
							volume: curSs.volume,
							rate: speechRateToNumber(curSs.speechRate),
							useApplicationAudioSession: curSs.duckMusicDuringTTS,
						});
						lastPaceHintTimeRef.current = now;
					}

					paceHintStateRef.current = next;
				}
			}
		}

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
			const walkPathGeoJson = buildWalkPathGeoJson(viewportCells, store.getState().hexTiles.walkedEdges);
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

	// ── Periodic speech announcement helpers ──────────────────────────────────
	const stopPeriodicAnnouncementTimer = useCallback(() => {
		if (periodicAnnouncementTimerRef.current) {
			clearInterval(periodicAnnouncementTimerRef.current);
			periodicAnnouncementTimerRef.current = null;
		}
	}, []);

	const startPeriodicAnnouncementTimer = useCallback(() => {
		stopPeriodicAnnouncementTimer();
		const ss = speechSettingsRef.current;
		if (!ss.enabled) return;
		const intervalSec = ss.intervalTimeMinutes * 60 + ss.intervalTimeSeconds;
		if (intervalSec <= 0) return;

		periodicAnnouncementTimerRef.current = setInterval(() => {
			if (!isRecordingRef.current || isPausedRef.current || !isTTSEnabledRef.current) return;
			const curSs = speechSettingsRef.current;
			if (!curSs.enabled) return;

			const elapsedSec = startTimeRef.current > 0
				? (Date.now() - startTimeRef.current) / 1000 + accumulatedSecondsRef.current
				: accumulatedSecondsRef.current;
			const points = routePointsRef.current;
			let totalDistanceKm = 0;
			for (let i = 1; i < points.length; i++) {
				totalDistanceKm += haversineKm(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng);
			}
			const paceMinPerKm = totalDistanceKm > 0 && elapsedSec > 0 ? elapsedSec / 60 / totalDistanceKm : null;
			const lastPt = points.length > 0 ? points[points.length - 1] : null;
			const speedKmh = lastPt?.speed != null && lastPt.speed >= 0 ? lastPt.speed * 3.6 : null;

			const locale = getLocales()[0]?.languageTag ?? 'en-US';
			const langCode = locale.split('-')[0].toLowerCase();
			const text = buildPeriodicAnnouncement(locale, {
				distanceKm: totalDistanceKm,
				elapsedSeconds: elapsedSec,
				paceMinPerKm,
				speedKmh,
			}, {
				announceDistance: curSs.announceDistance,
				announcePace: curSs.announcePace,
				announceDuration: curSs.announceDuration,
				announceSpeed: curSs.announceSpeed,
				announceCalories: curSs.announceCalories,
				announceHeartRate: curSs.announceHeartRate,
			});
			if (text.length > 0) {
				speakAnnouncement(text, langCode, {
					volume: curSs.volume,
					rate: speechRateToNumber(curSs.speechRate),
					useApplicationAudioSession: curSs.duckMusicDuringTTS,
				});
			}
		}, intervalSec * 1000);
	}, [stopPeriodicAnnouncementTimer]);

	const startRecording = useCallback(async () => {
		const expoGo = isRunningInExpoGo();
		const gpsTimeIntervalMs = GPS_INTERVAL_MS[store.getState().gpsInterval.selectedMode];
		console.log('[RecordScreen] startRecording called. isRunningInExpoGo:', expoGo);

		// Cancel measure mode before starting a recording
		if (isMeasureModeRef.current) {
			isMeasureModeRef.current = false;
			setIsMeasureMode(false);
			measureWaypointsRef.current = [];
			mapRef.current?.sendToMap({ measureMode: false });
		}

		try {
			console.log('[RecordScreen] Requesting foreground location permission...');
			const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
			console.log('[RecordScreen] Foreground permission status:', fgStatus);
			if (fgStatus !== 'granted') {
				Alert.alert('GPS', 'Location permission is required for run recording.');
				return;
			}

			// Enable background audio so TTS announcements work when the app is backgrounded
			await enableBackgroundAudio();

			routePointsRef.current = [];
			visitedHexIdsRef.current = new Set();
			orderedHexTilesRef.current = [];
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
			lastAnnouncedKmRef.current = 0;
			paceHintStateRef.current = 'on_target';
			lastPaceHintTimeRef.current = 0;
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

			// Start periodic (time-based) speech announcements if enabled
			startPeriodicAnnouncementTimer();

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
						timeInterval: gpsTimeIntervalMs,
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
					timeInterval: gpsTimeIntervalMs,
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
						timeInterval: gpsTimeIntervalMs,
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
			stopPeriodicAnnouncementTimer();
		}
	}, [handleLocationUpdate, setFollowMode, showModal, theme, startPeriodicAnnouncementTimer, stopPeriodicAnnouncementTimer]);

	// Show a modal to select a saved route before starting a recording.
	const showRouteSelectionModal = useCallback(async () => {
		let routes: SavedRoute[] = [];
		try {
			routes = await loadRoutes();
		} catch {
			// ignore
		}
		if (routes.length === 0) {
			Alert.alert('🗺️ No Routes', 'You don\'t have any saved routes yet. Complete a run to save one.');
			return;
		}
		showRouteModal({
			title: '🗺️ Select Route',
			onClose: closeRouteModal,
			children: (
				<View>
					<SettingsListGroupTitle title="Run this route today" />
					<SettingsListSelectOptionSingle
						key="__none__"
						label="Automatisch"
						isSelected={selectedRoute === null}
						selectionColor={PRIMARY_COLOR}
						onPress={() => {
							setSelectedRoute(null);
							closeRouteModal();
						}}
						groupPosition={routes.length === 0 ? 'single' : 'top'}
					/>
					{routes.map((route, i) => {
						const position = i === routes.length - 1 ? 'bottom' : 'middle';
						return (
							<SettingsListSelectOptionSingle
								key={route.id}
								label={route.name}
								isSelected={selectedRoute?.id === route.id}
								selectionColor={PRIMARY_COLOR}
								onPress={() => {
									setSelectedRoute(route);
									closeRouteModal();
								}}
								groupPosition={position}
							/>
						);
					})}
				</View>
			),
		});
	}, [showRouteModal, closeRouteModal, selectedRoute]);


	const stopRecording = useCallback(async () => {
		console.log('[RecordScreen] stopRecording called.');
		_onLocationUpdate = null;
		fgSubRef.current?.remove();
		fgSubRef.current = null;

		if (timerRef.current) {
			clearInterval(timerRef.current);
			timerRef.current = null;
		}
		stopPeriodicAnnouncementTimer();

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
		Speech.stop();
		await disableBackgroundAudio();

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
			const walkPathGeoJson = buildWalkPathGeoJson(viewportCells, store.getState().hexTiles.walkedEdges);
			mapRef.current.sendToMap({ hexTileGeoJson: geoJson });
			mapRef.current.sendToMap({ hexWalkPathGeoJson: walkPathGeoJson });
		}

		// Save activity to persistent storage (including ordered hex tiles for route matching)
		const activityH3Res = Math.max(H3_RESOLUTION_MIN, Math.min(H3_RESOLUTION_MAX, Math.floor(h3ResolutionRef.current)));
		const hexTilesOrdered = orderedHexTilesRef.current.slice();
		const activity: SavedActivity = {
			id: String(startTimeRef.current),
			startedAt: startTimeRef.current,
			endedAt,
			routePoints: points,
			stats,
			sportType: selectedSportType,
			h3Resolution: activityH3Res,
			visitedTileCount: visitedHexIdsRef.current.size,
			enclosedTileCount: enclosedCells.length,
			hexTilesOrdered,
			routeId: selectedRouteRef.current?.id ?? undefined,
		};
		try {
			saveActivity(activity);
		} catch (err) {
			console.warn('[RecordScreen] Failed to save activity:', err);
		}

		// Clear the pre-run selected route after the run ends
		setSelectedRoute(null);

		// Navigate directly to the activity detail screen.
		// Route assignment (if needed) is handled there via the scroll-view modal.
		router.push(`/activities/${activity.id}`);
	}, [theme, dispatch, selectedSportType, router, stopPeriodicAnnouncementTimer]);

	const pauseRecording = useCallback(() => {
		accumulatedSecondsRef.current += Math.floor((Date.now() - startTimeRef.current) / 1000);
		if (timerRef.current) {
			clearInterval(timerRef.current);
			timerRef.current = null;
		}
		stopPeriodicAnnouncementTimer();
		isPausedRef.current = true;
		setIsPaused(true);
	}, [stopPeriodicAnnouncementTimer]);

	const resumeRecording = useCallback(() => {
		startTimeRef.current = Date.now();
		timerRef.current = setInterval(() => {
			setElapsedSeconds(accumulatedSecondsRef.current + Math.floor((Date.now() - startTimeRef.current) / 1000));
		}, 1000);
		startPeriodicAnnouncementTimer();
		// Allow GPS to resume as the authoritative position source. If the user
		// navigated via joystick during the pause, GPS will smoothly re-anchor
		// to the physical device location from the current player position.
		movedPlayerManuallyRef.current = false;
		isPausedRef.current = false;
		setIsPaused(false);
	}, [startPeriodicAnnouncementTimer]);

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
			<SafeAreaView style={[styles.container, { backgroundColor: theme.screen.background }]}>
				<OsmConsentScreen onConsent={handleConsent} />
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: theme.screen.background }]}>
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
					{isDebugMode && !isRecording && (
						<>
							<TouchableOpacity
								style={[
									styles.debugButton,
									coloringTileImage !== null && { backgroundColor: PRIMARY_COLOR },
								]}
								onPress={openColoringModal}
								activeOpacity={0.8}
							>
								<MaterialIcons name="format-paint" size={20} color={coloringTileImage !== null ? '#ffffff' : '#555555'} />
							</TouchableOpacity>
							<View style={styles.buttonSpacer} />
							<TouchableOpacity
								style={[
									styles.debugButton,
									isMeasureMode && { backgroundColor: '#f97316' },
								]}
								onPress={isMeasureMode ? cancelMeasureMode : startMeasureMode}
								activeOpacity={0.8}
							>
								<MaterialIcons name="straighten" size={20} color={isMeasureMode ? '#ffffff' : '#555555'} />
							</TouchableOpacity>
							<View style={styles.buttonSpacer} />
						</>
					)}
					{isDebugMode && !isRecording && !isMeasureMode && (
						<>
							<TouchableOpacity
								style={styles.debugButton}
								onPress={showDebugModal}
								activeOpacity={0.8}
							>
								<MaterialIcons name="bug-report" size={20} color="#555555" />
							</TouchableOpacity>
							<View style={styles.buttonSpacer} />
							<TouchableOpacity
								style={[
									styles.debugButton,
									isMagnifyMode && { backgroundColor: '#3b82f6' },
								]}
								onPress={isMagnifyMode ? cancelMagnifyMode : startMagnifyMode}
								activeOpacity={0.8}
							>
								<MaterialIcons name="search" size={20} color={isMagnifyMode ? '#ffffff' : '#555555'} />
							</TouchableOpacity>
						</>
					)}
					{isDebugMode && isMeasureMode && (
						<>
							<TouchableOpacity
								style={[styles.debugButton, { backgroundColor: '#43a047' }]}
								onPress={finishMeasurement}
								activeOpacity={0.8}
							>
								<MaterialIcons name="check" size={20} color="#ffffff" />
							</TouchableOpacity>
							<View style={styles.buttonSpacer} />
							<TouchableOpacity
								style={styles.debugButton}
								onPress={undoMeasurePoint}
								activeOpacity={0.8}
							>
								<MaterialIcons name="undo" size={20} color="#555555" />
							</TouchableOpacity>
						</>
					)}
				</View>

				{/* Joystick controller – bottom-left overlay */}
				{isDebugMode && (
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
				)}

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

						{/* Selected route indicator (shown only before recording starts) */}
						{!isRecording && selectedRoute && (
							<View style={styles.selectedRouteRow}>
								<MaterialIcons name="route" size={14} color={PRIMARY_COLOR} />
								<Text style={[styles.selectedRouteText, { color: theme.screen.text }]} numberOfLines={1}>
									{selectedRoute.name}
								</Text>
								<TouchableOpacity onPress={() => setSelectedRoute(null)} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
									<MaterialIcons name="close" size={16} color={theme.screen.icon} />
								</TouchableOpacity>
							</View>
						)}

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
								{!isRecording ? (
									<TouchableOpacity
										style={[styles.routeButton, selectedRoute ? { backgroundColor: PRIMARY_COLOR + '22' } : {}]}
										onPress={showRouteSelectionModal}
										activeOpacity={0.8}
									>
										<MaterialIcons name="route" size={24} color={selectedRoute ? PRIMARY_COLOR : theme.screen.icon} />
									</TouchableOpacity>
								) : (
									<TouchableOpacity
										style={styles.chevronButton}
										onPress={() => setIsPanelCollapsed(true)}
										activeOpacity={0.7}
									>
										<MaterialIcons name="expand-more" size={24} color={theme.screen.icon} />
									</TouchableOpacity>
								)}
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
	routeButton: {
		width: 52,
		height: 52,
		borderRadius: 26,
		alignItems: 'center',
		justifyContent: 'center',
	},
	selectedRouteRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		paddingHorizontal: 16,
		paddingVertical: 4,
	},
	selectedRouteText: {
		fontSize: 13,
		fontWeight: '600',
		maxWidth: 200,
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
});
