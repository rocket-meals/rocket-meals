import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Animated,
	AppState,
	PanResponder,
	Platform,
	SafeAreaView,
	ScrollView,
	StyleSheet,
	Text,
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
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { MapLocationButton, MyMap, MyMapHandle, QrCode, useTheme, useMyScrollViewModal, SettingsListSelectOptionSingle, SettingsListGroupTitle, SettingsList, SettingsListTextInput, SettingsListBoolean, SettingsListNumberInput, MapStyleKey } from 'repo-depkit-common-ui';
import { MathHelper, fetchWeatherAtCoordinates } from 'repo-depkit-common';
import type { MapOverlayIdentity } from 'repo-depkit-common';

import { HEX_TILE_SCRIPT } from '../assets/hexTileScript';
import { TERRAIN_ASSETS, TERRAIN_CATEGORIES, TerrainAssetEntry } from '../assets/terrainAssets';
import { MapLoadingOverlay } from '../components/MapLoadingOverlay';
import { isAvailable as isH3Available, latLngToCell, cellToLatLng, gridDisk, gridDistance, areNeighborCells, cellToBoundary, gridPathCells, cellToChildren, cellToCenterChild, cellToParent, gridRingUnsafe, getResolution, isValidCell, computeRouteLengthKm, formatDistanceKm, getPentagons, type CoordPair } from '../helpers/H3Helper';
import { queryTileFeaturesForHexCell } from '../helpers/TileFeatureHelper';
import type { MapFeatureInfo } from '../helpers/RouteNameSuggestionHelper';
import type { ViewportBounds } from '../helpers/ViewportBounds';
import { ROUTE_NAME_LANDMARK_NAME_NULL_ALLOW } from '../helpers/OpenMapTilesSchema';
import { RoutePoint, RunStats, SavedActivity, saveActivity, loadActivities, saveOsmConsent, loadOsmConsent } from '../helpers/ActivityStorage';
import { computeActivityData, hasForestFeature, BILLBOARD_PINE_TREE_LARGE, BILLBOARD_PINE_TREE_SMALL, getSmallTreeAnchorForHexId, RED_LINE_GRID_RESOLUTION } from '../helpers/ActivityMapRebuildHelper';
import { mergeHexTileFeatureCache, loadHexTileFeatureCache, type HexTileFeatureCache } from '../helpers/HexTileFeatureStorage';
import { SavedRoute, loadRoutes, saveRoute } from '../helpers/RouteStorage';
import { buildRouteDisplayData, computeEdgesFromHexTiles, computeEdgesFromRoutePoints, computeHexBounds } from '../helpers/RouteDisplayHelper';
import { HexTileRecord, BillboardAnchorPosition } from '../helpers/HexTileStorage';
import { startRun, markVisited, markEnclosed, setHexTileCustomization, setBillboardAtAnchor, setTextureAdaptionAtAnchor, applyMapCustomizations, addWalkedEdges, addWalkedEdgesRedLine, HexTileCustomizationPayload } from '../store/hexTileSlice';
import { setSportType, SPORT_TYPES, SportType, SportTypeDefinition } from '../store/sportTypeSlice';
import { store, RootState, AppDispatch } from '../store/store';
import { setHomeHexTile } from '../store/playerInformationSlice';
import type { SpeechSettingsState } from '../store/speechSettingsSlice';
import { resetMapSearchState, setMapSearchName, toggleMapSearchKey } from '../store/mapSearchSlice';
import { buildJsonExportFilename, pickJsonFromFile, saveJsonToFile } from '../helpers/JsonFileTransferHelper';
import { getLocales } from 'expo-localization';
import { buildKmAnnouncement, speakAnnouncement, buildBackgroundAnnouncement, buildPeriodicAnnouncement, buildPaceHintAnnouncement, buildOnTargetAnnouncement, speechRateToNumber, enableBackgroundAudio, disableBackgroundAudio } from '../helpers/TTSHelper';
import { clearAudioQueue } from '../helpers/AudioQueueHelper';
import { setRecordingActive } from '../helpers/RecordingActivityTracker';
import { findMatchingRoutes } from '../helpers/RouteMatchingHelper';
import { saveRecordingSnapshot, loadRecordingSnapshot, clearRecordingSnapshot, appendPointsToRecordingSnapshot, type InterruptedRecordingSnapshot } from '../helpers/InterruptedRecordingStorage';
import type { PaceHintState } from '../helpers/TTSHelper';
import { OBJECT_SPRITES } from '../assets/objects/objectSprites';
import SettingsListBillboard from '../components/SettingsListBillboard';
import SettingsListHexTile from '../components/SettingsListHexTile';
import { useDebugMode } from '../hooks/useDebugMode';
import useGeonexiaAlert from '../hooks/useGeonexiaAlert';

/** Parse a billboard key of the form "objects:N" into the corresponding sprite and index. */
function parseBillboardKey(billboard: string): { sprite: (typeof OBJECT_SPRITES)[number]; idx: number } | null {
	const colonIdx = billboard.indexOf(':');
	if (colonIdx < 0 || billboard.slice(0, colonIdx) !== 'objects') return null;
	const idx = Number.parseInt(billboard.slice(colonIdx + 1), 10);
	const sprite = OBJECT_SPRITES[idx];
	if (!sprite) return null;
	return { sprite, idx };
}

/**
 * Return the effective per-anchor billboard map for a hex tile record,
 * merging the new `billboards` field with the legacy `billboard`/`billboardAnchorColor` pair.
 * The new `billboards` field takes precedence when present.
 */
function getEffectiveBillboards(record: { billboard?: string | null; billboardAnchorColor?: string | null; billboards?: Record<string, string | null> }): Record<BillboardAnchorPosition, string> {
	const result: Record<string, string> = {};
	if (record.billboards) {
		for (const [ac, bk] of Object.entries(record.billboards)) {
			if (bk) result[ac] = bk;
		}
	} else if (record.billboard) {
		result[record.billboardAnchorColor ?? BillboardAnchorPosition.CENTER] = record.billboard;
	}
	return result as Record<BillboardAnchorPosition, string>;
}

/**
 * Return the effective per-anchor flat-rendering flag map for a hex tile record.
 */
function getEffectiveBillboardsFlat(record: { billboardsFlat?: Record<string, boolean> }): Record<string, boolean> {
	return record.billboardsFlat ?? {};
}

/**
 * Return the effective per-anchor Hex Texture Adaption map for a hex tile record.
 * These are always rendered flat on the map surface (pitch-alignment = 'map').
 */
function getEffectiveBillboardsTexture(record: { billboardsTexture?: Record<string, string | null> }): Record<BillboardAnchorPosition, string> {
	const result: Record<string, string> = {};
	if (record.billboardsTexture) {
		for (const [ac, bk] of Object.entries(record.billboardsTexture)) {
			if (bk) result[ac] = bk;
		}
	}
	return result as Record<BillboardAnchorPosition, string>;
}

/**
 * Parse the rotation angle (in degrees) from a BillboardAnchorPosition value,
 * after reflecting across the 300°–120° axis (new = (240 - original + 360) % 360).
 * Values like 'outer_30', 'middle_120' yield their reflected angle; 'center' yields 0.
 */
function getAnchorAngleDeg(anchorPosition: string): number {
	const match = /_(\d+)$/.exec(anchorPosition);
	return match ? (240 - Number.parseInt(match[1], 10) + 360) % 360 : 0;
}

// Geometric lookup for all 12 degree positions (index = degree / 30).
// type 'vertex': use boundary[idx] directly.
// type 'edge':   midpoint of boundary[idx] and boundary[(idx+1)%n].
const DEGREE_POSITION_GEO: Array<{ type: 'vertex' | 'edge'; idx: number }> = [
	{ type: 'vertex', idx: 0 },  // 0°   vertex[0] top
	{ type: 'edge',   idx: 0 },  // 30°  edge[0] (vertex[0]→vertex[1])
	{ type: 'vertex', idx: 1 },  // 60°  vertex[1]
	{ type: 'edge',   idx: 1 },  // 90°  edge[1]
	{ type: 'vertex', idx: 2 },  // 120° vertex[2]
	{ type: 'edge',   idx: 2 },  // 150° edge[2]
	{ type: 'vertex', idx: 3 },  // 180° vertex[3]
	{ type: 'edge',   idx: 3 },  // 210° edge[3]
	{ type: 'vertex', idx: 4 },  // 240° vertex[4]
	{ type: 'edge',   idx: 4 },  // 270° edge[4]
	{ type: 'vertex', idx: 5 },  // 300° vertex[5]
	{ type: 'edge',   idx: 5 },  // 330° edge[5] (vertex[5]→vertex[0])
];

// OUTER ring: 12 positions at 0°, 30°, …, 330°
const OUTER_ANCHOR_BY_DEGREE: BillboardAnchorPosition[] = [
	BillboardAnchorPosition.OUTER_0_DEGREE,
	BillboardAnchorPosition.OUTER_30_DEGREE,
	BillboardAnchorPosition.OUTER_60_DEGREE,
	BillboardAnchorPosition.OUTER_90_DEGREE,
	BillboardAnchorPosition.OUTER_120_DEGREE,
	BillboardAnchorPosition.OUTER_150_DEGREE,
	BillboardAnchorPosition.OUTER_180_DEGREE,
	BillboardAnchorPosition.OUTER_210_DEGREE,
	BillboardAnchorPosition.OUTER_240_DEGREE,
	BillboardAnchorPosition.OUTER_270_DEGREE,
	BillboardAnchorPosition.OUTER_300_DEGREE,
	BillboardAnchorPosition.OUTER_330_DEGREE,
];

// MIDDLE ring: 12 positions at 0°, 30°, …, 330°
const MIDDLE_ANCHOR_BY_DEGREE: BillboardAnchorPosition[] = [
	BillboardAnchorPosition.MIDDLE_0_DEGREE,
	BillboardAnchorPosition.MIDDLE_30_DEGREE,
	BillboardAnchorPosition.MIDDLE_60_DEGREE,
	BillboardAnchorPosition.MIDDLE_90_DEGREE,
	BillboardAnchorPosition.MIDDLE_120_DEGREE,
	BillboardAnchorPosition.MIDDLE_150_DEGREE,
	BillboardAnchorPosition.MIDDLE_180_DEGREE,
	BillboardAnchorPosition.MIDDLE_210_DEGREE,
	BillboardAnchorPosition.MIDDLE_240_DEGREE,
	BillboardAnchorPosition.MIDDLE_270_DEGREE,
	BillboardAnchorPosition.MIDDLE_300_DEGREE,
	BillboardAnchorPosition.MIDDLE_330_DEGREE,
];

/**
 * Resolve the geographic [lng, lat] for a given anchor position string.
 */
function resolveAnchorPosition(
	anchorColor: string,
	boundary: CoordPair[],
	n: number,
	centerLng: number,
	centerLat: number,
): [number, number] {
	let lng = centerLng;
	let lat = centerLat;
	const outerIdx = OUTER_ANCHOR_BY_DEGREE.indexOf(anchorColor as BillboardAnchorPosition);
	const middleIdx = MIDDLE_ANCHOR_BY_DEGREE.indexOf(anchorColor as BillboardAnchorPosition);
	if (outerIdx >= 0) {
		// H3's cellToBoundary places boundary[0] at the visual 300° position.
		// Positions are reflected across the 300°–120° axis: the formula
		// (10 - idx + 12) % 12 applies both the boundary[0] offset and the
		// axis reflection in one step.
		const geo = DEGREE_POSITION_GEO[(10 - outerIdx + 12) % 12];
		if (geo.type === 'vertex' && geo.idx < n) {
			[lng, lat] = boundary[geo.idx] as [number, number];
		} else if (geo.type === 'edge' && geo.idx < n) {
			const [lng1, lat1] = boundary[geo.idx] as [number, number];
			const [lng2, lat2] = boundary[(geo.idx + 1) % n] as [number, number];
			lng = (lng1 + lng2) / 2;
			lat = (lat1 + lat2) / 2;
		}
	} else if (middleIdx >= 0) {
		// Same reflection formula as for the outer ring.
		const geo = DEGREE_POSITION_GEO[(10 - middleIdx + 12) % 12];
		let outerLng = centerLng;
		let outerLat = centerLat;
		if (geo.type === 'vertex' && geo.idx < n) {
			[outerLng, outerLat] = boundary[geo.idx] as [number, number];
		} else if (geo.type === 'edge' && geo.idx < n) {
			const [lng1, lat1] = boundary[geo.idx] as [number, number];
			const [lng2, lat2] = boundary[(geo.idx + 1) % n] as [number, number];
			outerLng = (lng1 + lng2) / 2;
			outerLat = (lat1 + lat2) / 2;
		}
		lng = (centerLng + outerLng) / 2;
		lat = (centerLat + outerLat) / 2;
	}
	// else: CENTER → use centerLng/centerLat (already set above)
	return [lng, lat];
}

/**
 * Group position of a list entry for settings list styling:
 * 'single' for one-item lists, otherwise 'top' / 'middle' / 'bottom'.
 */
type ListGroupPosition = 'top' | 'middle' | 'bottom' | 'single';

function getListGroupPosition(index: number, length: number): ListGroupPosition {
	if (length === 1) return 'single';
	if (index === 0) return 'top';
	if (index === length - 1) return 'bottom';
	return 'middle';
}

/**
 * Renders the shared "terrain category -> entries" grid used by both the tile-image
 * and tile-color pickers; each caller supplies its own per-entry row (selection state
 * and onPress differ between the two pickers).
 */
function renderTerrainCategoryList(renderEntry: (entry: TerrainAssetEntry, position: ListGroupPosition) => React.ReactNode) {
	return (
		<View style={{ paddingBottom: 20 }}>
			{TERRAIN_CATEGORIES.map((cat) => {
				const entries = TERRAIN_ASSETS[cat];
				return (
					<View key={cat}>
						<SettingsListGroupTitle title={cat} />
						{entries.map((entry, i) => renderEntry(entry, getListGroupPosition(i, entries.length)))}
					</View>
				);
			})}
		</View>
	);
}

/** Locale-independent code unit comparison for deterministic string sorting. */
function compareByCodeUnit(a: string, b: string): number {
	if (a < b) return -1;
	if (a > b) return 1;
	return 0;
}

const PRIMARY_COLOR = '#2563eb';

/** Billboard key for the castle2 sprite. Used to mark the player's home tile. */
const BILLBOARD_CASTLE2_KEY = 'objects:12';

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
// Logical icon size (px) a billboard sprite is rasterized at; iconSizeAtRefZoom is
// desiredPixelSize / BILLBOARD_STANDARD_ICON_SIZE. Keep in sync with BILLBOARD_ICON_SIZE
// in the MapLibre HTML.
const BILLBOARD_STANDARD_ICON_SIZE = 128;
// cellToBoundary flag: true returns vertices in [lng, lat] GeoJSON coordinate order
// AND automatically closes the ring (appends the first vertex at the end).
const H3_GEOJSON_ORDER = true;

// Billboard anchor position options. Each maps to a position within the hex cell.
const BILLBOARD_ANCHOR_COLORS = [
	{ id: BillboardAnchorPosition.CENTER,        hex: '#a855f7', label: 'Center' },
	{ id: BillboardAnchorPosition.OUTER_0_DEGREE,   hex: '#ffffff', label: 'Outer 0°' },
	{ id: BillboardAnchorPosition.OUTER_30_DEGREE,  hex: '#f43f5e', label: 'Outer 30°' },
	{ id: BillboardAnchorPosition.OUTER_60_DEGREE,  hex: '#22c55e', label: 'Outer 60°' },
	{ id: BillboardAnchorPosition.OUTER_90_DEGREE,  hex: '#f59e0b', label: 'Outer 90°' },
	{ id: BillboardAnchorPosition.OUTER_120_DEGREE, hex: '#10b981', label: 'Outer 120°' },
	{ id: BillboardAnchorPosition.OUTER_150_DEGREE, hex: '#06b6d4', label: 'Outer 150°' },
	{ id: BillboardAnchorPosition.OUTER_180_DEGREE, hex: '#ffffff', label: 'Outer 180°' },
	{ id: BillboardAnchorPosition.OUTER_210_DEGREE, hex: '#8b5cf6', label: 'Outer 210°' },
	{ id: BillboardAnchorPosition.OUTER_240_DEGREE, hex: '#ffffff', label: 'Outer 240°' },
	{ id: BillboardAnchorPosition.OUTER_270_DEGREE, hex: '#ec4899', label: 'Outer 270°' },
	{ id: BillboardAnchorPosition.OUTER_300_DEGREE, hex: '#ffffff', label: 'Outer 300°' },
	{ id: BillboardAnchorPosition.OUTER_330_DEGREE, hex: '#f43f5e', label: 'Outer 330°' },
	{ id: BillboardAnchorPosition.MIDDLE_0_DEGREE,   hex: '#ffffff', label: 'Middle 0°' },
	{ id: BillboardAnchorPosition.MIDDLE_30_DEGREE,  hex: '#f43f5e', label: 'Middle 30°' },
	{ id: BillboardAnchorPosition.MIDDLE_60_DEGREE,  hex: '#ef4444', label: 'Middle 60°' },
	{ id: BillboardAnchorPosition.MIDDLE_90_DEGREE,  hex: '#f97316', label: 'Middle 90°' },
	{ id: BillboardAnchorPosition.MIDDLE_120_DEGREE, hex: '#eab308', label: 'Middle 120°' },
	{ id: BillboardAnchorPosition.MIDDLE_150_DEGREE, hex: '#10b981', label: 'Middle 150°' },
	{ id: BillboardAnchorPosition.MIDDLE_180_DEGREE, hex: '#3b82f6', label: 'Middle 180°' },
	{ id: BillboardAnchorPosition.MIDDLE_210_DEGREE, hex: '#8b5cf6', label: 'Middle 210°' },
	{ id: BillboardAnchorPosition.MIDDLE_240_DEGREE, hex: '#6366f1', label: 'Middle 240°' },
	{ id: BillboardAnchorPosition.MIDDLE_270_DEGREE, hex: '#ec4899', label: 'Middle 270°' },
	{ id: BillboardAnchorPosition.MIDDLE_300_DEGREE, hex: '#000000', label: 'Middle 300°' },
	{ id: BillboardAnchorPosition.MIDDLE_330_DEGREE, hex: '#64748b', label: 'Middle 330°' },
] as const;

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

/**
 * Build the low-zoom H3 feature set: hides the unvisited grid, but still shows
 * tiles that have been visited or enclosed (level > 0) so the user can see
 * their overall progress.
 */
function buildLowZoomH3Features(hexTileRecords: Record<string, HexTileRecord>): H3GeoJsonFeature[] {
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
	return features;
}

/** Determine how many grid rings are needed to cover all four viewport corners. */
function computeMaxGridDistanceToCorners(bounds: ViewportBounds, h3Res: number, centerCell: string): number {
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
	return maxK;
}

/**
 * For fractional resolutions (e.g. 10.5) compute child hexes at the next
 * integer resolution and color them in 7 colors: the center child gets white
 * (colorIndex 0) and the 6 ring children get red, yellow, green, blue,
 * purple, orange (colorIndex 1–6) in ring order.
 */
/** Build the white center-child feature (colorIndex 0) for one parent cell, or null if it has no boundary. */
function buildCenterChildFeature(
	parentCell: string,
	centerChild: string,
	parentLevel: number,
): H3GeoJsonFeature | null {
	const centerBoundary = cellToBoundary(centerChild, H3_GEOJSON_ORDER);
	if (centerBoundary.length === 0) return null;
	return {
		type: 'Feature',
		geometry: { type: 'Polygon', coordinates: [centerBoundary as number[][]] },
		properties: { h3Index: parentCell, level: parentLevel, colorIndex: 0 },
	};
}

/** Build the colored ring-child features (colorIndex 1–6) around one parent cell's center child. */
function buildRingChildFeatures(
	parentCell: string,
	centerChild: string,
	h3Res: number,
	parentLevel: number,
	maxFeatures: number,
): H3GeoJsonFeature[] {
	let ringChildren: string[] = [];
	try {
		ringChildren = gridRingUnsafe(centerChild, 1).filter(
			(c) => cellToParent(c, h3Res) === parentCell,
		);
	} catch (err) {
		// gridRingUnsafe can throw for pentagon cells; skip ring for those
		console.warn('[H3] gridRingUnsafe failed for centerChild', centerChild, err);
	}

	const features: H3GeoJsonFeature[] = [];
	for (let i = 0; i < ringChildren.length && features.length < maxFeatures; i++) {
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
	return features;
}

function buildHalfResolutionH3Features(
	parentCells: string[],
	h3Res: number,
	hexTileRecords: Record<string, HexTileRecord>,
): H3GeoJsonFeature[] {
	const features: H3GeoJsonFeature[] = [];
	const childRes = Math.min(H3_RESOLUTION_MAX, h3Res + 1);
	for (const parentCell of parentCells) {
		if (features.length >= H3_MAX_CELLS) break;
		const parentLevel = hexTileRecords[parentCell]?.level ?? 0;
		const centerChild = cellToCenterChild(parentCell, childRes);
		if (!centerChild) continue;

		const centerFeature = buildCenterChildFeature(parentCell, centerChild, parentLevel);
		if (centerFeature) features.push(centerFeature);

		features.push(...buildRingChildFeatures(parentCell, centerChild, h3Res, parentLevel, H3_MAX_CELLS - features.length));
	}
	return features;
}

/** Whole-number resolutions: one feature per parent cell at the base resolution. */
function buildWholeResolutionH3Features(
	parentCells: string[],
	hexTileRecords: Record<string, HexTileRecord>,
): H3GeoJsonFeature[] {
	const features: H3GeoJsonFeature[] = [];
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
	return features;
}

function buildH3GeoJson(
	bounds: ViewportBounds,
	zoom: number,
	resolution: number,
	showAlways: boolean,
	hexTileRecords: Record<string, HexTileRecord>,
	minZoom: number = H3_MIN_ZOOM_DEFAULT,
): H3FeatureCollection {
	if (!showAlways && zoom < minZoom) {
		return { type: 'FeatureCollection', features: buildLowZoomH3Features(hexTileRecords) };
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

	const maxK = computeMaxGridDistanceToCorners(bounds, h3Res, centerCell);
	const k = Math.min(maxK + 1, 30);
	const parentCells = gridDisk(centerCell, k);

	const features: H3GeoJsonFeature[] = isHalfResolution
		? buildHalfResolutionH3Features(parentCells, h3Res, hexTileRecords)
		: buildWholeResolutionH3Features(parentCells, hexTileRecords);

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
 * activities. Prefers the finer red-line edges (`walkedEdgesRedLine`) when provided
 * and non-empty so that the red walk path line is drawn through red-line cell centres.
 * Falls back to h10 `walkedEdges`.
 *
 * For red-line edges the viewport filter checks whether the h10 parent of each cell
 * is visible in the current viewport (since the viewport is rendered at h10).
 * For h10 edges the cells are checked directly.
 *
 * Each edge in `walkedEdges`/`walkedEdgesRedLine` is stored as "cellA:cellB" with
 * the lexicographically smaller index first.
 */
/**
 * Whether both endpoints of an edge (or their h10 parents, for red-line edges)
 * are visible in the given viewport cell set.
 */
function isEdgeVisibleInViewport(
	cellA: string,
	cellB: string,
	useRedLine: boolean | undefined,
	viewportSet: Set<string>,
	parentRes: number,
): boolean {
	if (useRedLine) {
		try {
			const parentA = cellToParent(cellA, parentRes);
			const parentB = cellToParent(cellB, parentRes);
			return viewportSet.has(parentA) && viewportSet.has(parentB);
		} catch {
			return false;
		}
	}
	return viewportSet.has(cellA) && viewportSet.has(cellB);
}

function buildWalkPathGeoJson(
	viewportCells: string[],
	walkedEdges: string[],
	walkedEdgesRedLine?: string[],
): WalkPathFeatureCollection {
	const viewportSet = new Set(viewportCells);
	const features: WalkPathFeature[] = [];
	const useRedLine = (walkedEdgesRedLine && walkedEdgesRedLine.length > 0);
	const edgesToDraw = useRedLine ? walkedEdgesRedLine : walkedEdges;
	// Parent resolution for the viewport check of red-line edges: the viewport
	// tiles are rendered at h10, so red-line cells (h12, legacy h11) are mapped
	// to their h10 parent regardless of the red-line resolution.
	const parentRes = H3_DEFAULT_RESOLUTION;

	for (const edge of edgesToDraw) {
		const colonIdx = edge.indexOf(':');
		if (colonIdx === -1) continue;
		const cellA = edge.slice(0, colonIdx);
		const cellB = edge.slice(colonIdx + 1);
		// Only draw if both endpoints (or their h10 parents for red-line edges) are
		// visible in the current viewport.
		if (!isEdgeVisibleInViewport(cellA, cellB, useRedLine, viewportSet, parentRes)) continue;
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
	const dist = Math.hypot(dx, dy);
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

function JoystickController({ positionRef, speedKmhRef, onMove, isHeadingModeRef, currentHeadingRef, joystickActiveRef, isRecordingRef, onHeadingChange }: Readonly<JoystickControllerProps>) {
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
				const dist = Math.hypot(gestureState.dx, gestureState.dy);
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
const SPEED_WARMUP_MS = 10_000;
const SPEED_WINDOW_SIZE = 5;
const GPS_TIME_INTERVAL_MS = 1000;
const GPS_DISTANCE_INTERVAL_METERS = 0;
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
	const points: RoutePoint[] = locations.map((loc) => ({
		lat: loc.coords.latitude,
		lng: loc.coords.longitude,
		altitude: loc.coords.altitude,
		speed: loc.coords.speed,
		timestamp: loc.timestamp,
	}));
	// No active recording in this JS runtime. Two possible reasons:
	// 1. The OS killed the app process mid-recording and relaunched the runtime
	//    headlessly for this update. The run is still ongoing – keep capturing
	//    it by appending the points to the crash-recovery snapshot so the
	//    recovery on the next app start has the complete track. Stopping the
	//    task here (as an earlier version did) killed legitimate background
	//    recordings and made GPS capture unreliable.
	// 2. The task is a stale leftover with no fresh snapshot – then GPS must
	//    not stay active without a recording, so stop the task. Fully closing
	//    the app (swipe away) is additionally handled natively on Android via
	//    the foreground service's killServiceOnDestroy.
	if (!_onLocationUpdate) {
		const appended = await appendPointsToRecordingSnapshot(points);
		if (!appended) {
			await Location.stopLocationUpdatesAsync(ACTIVITY_LOCATION_TASK).catch(() => {});
		}
		return;
	}
	for (const point of points) {
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
 *   – the first and last GPS points do not map to adjacent hex tiles (not a loop), or
 *   – the H3 library is unavailable.
 */
function findEnclosedCells(routePoints: RoutePoint[], resolution: number): string[] {
	if (!isH3Available() || routePoints.length < 3) return [];

	const h3Res = Math.max(H3_RESOLUTION_MIN, Math.min(H3_RESOLUTION_MAX, Math.floor(resolution)));

	// Check loop closure: first and last GPS points must map to the same hex tile
	// or to adjacent hex tiles.
	const first = routePoints[0];
	const last = routePoints.at(-1)!;
	const firstCell = latLngToCell(first.lat, first.lng, h3Res);
	const lastCell = latLngToCell(last.lat, last.lng, h3Res);
	if (firstCell !== lastCell && !areNeighborCells(firstCell, lastCell)) return [];

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
	if (totalMinutes <= 0 || !Number.isFinite(totalMinutes)) return '--:--';
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
		const noisyLat = cellLat + (MathHelper.random() - 0.5) * MEASURE_COORD_NOISE_DEG;
		const noisyLng = cellLng + (MathHelper.random() - 0.5) * MEASURE_COORD_NOISE_DEG;
		const speedKmh = Math.max(1, speedBaseKmh + (MathHelper.random() - 0.5) * speedVariationKmh);
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

type RouteSegmentAccumulation = {
	distanceKm: number;
	elevationGainM: number;
	elevationLossM: number;
	speedsKmh: number[];
	speedDistanceKm: number;
	speedDurationSeconds: number;
};

/** Elevation change between two consecutive points; zero on either side when altitude is missing. */
function computeElevationDelta(
	prevAltitude: number | null | undefined,
	currAltitude: number | null | undefined,
): { gainM: number; lossM: number } {
	if (prevAltitude == null || currAltitude == null) {
		return { gainM: 0, lossM: 0 };
	}
	const diff = currAltitude - prevAltitude;
	return diff > 0 ? { gainM: diff, lossM: 0 } : { gainM: 0, lossM: Math.abs(diff) };
}

/** Speed for a segment, preferring the GPS-reported speed over the distance/time-derived one. */
function computeSegmentSpeedKmh(dtSec: number, gpsSpeed: number | null | undefined, segKm: number): number {
	if (gpsSpeed != null && gpsSpeed >= 0) {
		return gpsSpeed * 3.6;
	}
	return dtSec > 0 ? (segKm / dtSec) * 3600 : 0;
}

/**
 * Walk consecutive route points accumulating total distance, elevation
 * gain/loss, and the per-segment speed samples (once the GPS warm-up period
 * has elapsed) used for the max/min/avg/median speed stats.
 */
function accumulateRouteSegments(points: RoutePoint[], startTimestamp: number): RouteSegmentAccumulation {
	let distanceKm = 0;
	let elevationGainM = 0;
	let elevationLossM = 0;
	const speedsKmh: number[] = [];
	let speedDistanceKm = 0;
	let speedDurationSeconds = 0;

	for (let i = 1; i < points.length; i++) {
		const prev = points[i - 1];
		const curr = points[i];
		const segKm = haversineKm(prev.lat, prev.lng, curr.lat, curr.lng);
		distanceKm += segKm;

		const { gainM, lossM } = computeElevationDelta(prev.altitude, curr.altitude);
		elevationGainM += gainM;
		elevationLossM += lossM;

		const dtSec = (curr.timestamp - prev.timestamp) / 1000;
		const segSpeedKmh = computeSegmentSpeedKmh(dtSec, curr.speed, segKm);

		if (curr.timestamp - startTimestamp >= SPEED_WARMUP_MS) {
			if (segSpeedKmh > 0) speedsKmh.push(segSpeedKmh);
			speedDistanceKm += segKm;
			speedDurationSeconds += dtSec;
		}
	}

	return { distanceKm, elevationGainM, elevationLossM, speedsKmh, speedDistanceKm, speedDurationSeconds };
}

/** Smooths raw per-segment speeds with a trailing moving-average window. */
function computeWindowedSpeeds(speedsKmh: number[]): number[] {
	const windowedSpeeds: number[] = [];
	let windowSum = 0;
	for (let i = 0; i < speedsKmh.length; i++) {
		windowSum += speedsKmh[i];
		if (i >= SPEED_WINDOW_SIZE) windowSum -= speedsKmh[i - SPEED_WINDOW_SIZE];
		windowedSpeeds.push(windowSum / Math.min(i + 1, SPEED_WINDOW_SIZE));
	}
	return windowedSpeeds;
}

/** Median of the raw (non-windowed) per-segment speeds. */
function computeMedianSpeed(speedsKmh: number[]): number {
	if (speedsKmh.length === 0) return 0;
	const sorted = [...speedsKmh].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
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

	const startTimestamp = points[0].timestamp;
	const { distanceKm, elevationGainM, elevationLossM, speedsKmh, speedDistanceKm, speedDurationSeconds } =
		accumulateRouteSegments(points, startTimestamp);

	const durationSeconds = (points.at(-1)!.timestamp - points[0].timestamp) / 1000;
	const paceMinPerKm = distanceKm > 0 ? durationSeconds / 60 / distanceKm : 0;
	const windowedSpeeds = computeWindowedSpeeds(speedsKmh);
	const maxSpeedKmh = windowedSpeeds.length > 0 ? Math.max(...windowedSpeeds) : 0;
	const minSpeedKmh = windowedSpeeds.length > 0 ? Math.min(...windowedSpeeds) : 0;
	const avgSpeedKmh = speedDurationSeconds > 0 ? (speedDistanceKm / speedDurationSeconds) * 3600 : 0;
	const medianSpeedKmh = computeMedianSpeed(speedsKmh);
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
	if (minPerKm <= 0 || !Number.isFinite(minPerKm)) return '--:--';
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
	initialMinZoom: number;
	initialSpeed: number;
	initialBillboardScale: number;
	initialBillboardFaceCamera: boolean;
	initialShowBillboardAnchors: boolean;
	initialShowDebugPoints: boolean;
	onShowGridAlwaysChange: (val: boolean) => void;
	onH3ResolutionChange: (val: number) => void;
	onMinZoomChange: (val: number) => void;
	onZoomAdjust: (delta: number) => void;
	onSpeedChange: (speed: number) => void;
	onBillboardScaleChange: (scale: number) => void;
	onBillboardFaceCameraChange: (val: boolean) => void;
	onShowBillboardAnchorsChange: (val: boolean) => void;
	onShowDebugPointsChange: (val: boolean) => void;
	onExportMapSettings: () => void;
	onImportMapSettings: () => void;
	onFlyToCell: (lat: number, lng: number) => void;
};

function DebugInfoContent({
	info,
	theme,
	initialShowGridAlways,
	initialH3Resolution,
	initialMinZoom,
	initialSpeed,
	initialBillboardScale,
	initialBillboardFaceCamera,
	initialShowBillboardAnchors,
	initialShowDebugPoints,
	onShowGridAlwaysChange,
	onH3ResolutionChange,
	onMinZoomChange,
	onZoomAdjust,
	onSpeedChange,
	onBillboardScaleChange,
	onBillboardFaceCameraChange,
	onShowBillboardAnchorsChange,
	onShowDebugPointsChange,
	onExportMapSettings,
	onImportMapSettings,
	onFlyToCell,
}: Readonly<DebugInfoContentProps>) {
	const h3Available = isH3Available();
	const [showGridAlways, setShowGridAlways] = useState(initialShowGridAlways);
	const [h3Resolution, setH3Resolution] = useState(initialH3Resolution);
	const [minZoom, setMinZoom] = useState(initialMinZoom);
	const [speedText, setSpeedText] = useState(String(initialSpeed));
	const [billboardScale, setBillboardScale] = useState(initialBillboardScale);
	const [billboardFaceCamera, setBillboardFaceCamera] = useState(initialBillboardFaceCamera);
	const [showBillboardAnchors, setShowBillboardAnchors] = useState(initialShowBillboardAnchors);
	const [showDebugPoints, setShowDebugPoints] = useState(initialShowDebugPoints);

	const handleShowGridAlwaysChange = useCallback((val: boolean) => {
		setShowGridAlways(val);
		onShowGridAlwaysChange(val);
	}, [onShowGridAlwaysChange]);

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

	const pentagons = useMemo(() => {
		const res = Math.round(h3Resolution);
		if (!isH3Available() || res < H3_RESOLUTION_MIN || res > H3_RESOLUTION_MAX) return [];
		return getPentagons(res);
	}, [h3Resolution]);

	const tilesExpected = info != null && (showGridAlways || info.zoom >= minZoom);

	let statusColor: string;
	let statusText: string;
	if (!h3Available) {
		statusColor = STATUS_ERROR_COLOR;
		statusText = '❌ H3 library failed to initialise';
	} else if (info == null) {
		statusColor = STATUS_WARNING_COLOR;
		statusText = '⚠️ No viewport data yet. Move or zoom the map.';
	} else if (!tilesExpected) {
		statusColor = STATUS_WARNING_COLOR;
		statusText = `⚠️ Zoom in to ≥${minZoom} to see tiles`;
	} else if (info.tileCount > 0) {
		statusColor = STATUS_SUCCESS_COLOR;
		statusText = `✅ ${info.tileCount} H3 tiles computed`;
	} else {
		statusColor = STATUS_ERROR_COLOR;
		statusText = '❌ 0 tiles – H3 library may not be working';
	}

	let viewportRows: { label: string; value: string }[] = [];
	if (info) {
		viewportRows = [
			{ label: 'Tiles Visible', value: tilesExpected ? `${info.tileCount} cells` : `0 (zoom < ${minZoom})` },
			{ label: 'North', value: info.bounds.north.toFixed(5) },
			{ label: 'South', value: info.bounds.south.toFixed(5) },
			{ label: 'East', value: info.bounds.east.toFixed(5) },
			{ label: 'West', value: info.bounds.west.toFixed(5) },
		];
	}

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

			{/* Show Grid Always */}
			<SettingsListBoolean
				label="Show Grid Always"
				isEnabled={showGridAlways}
				onToggle={() => handleShowGridAlwaysChange(!showGridAlways)}
				groupPosition="single"
				primaryColor={PRIMARY_COLOR}
			/>

			{/* H3 Grid Resolution */}
			<SettingsListNumberInput
				label="H3 Grid Resolution"
				value={Number.isInteger(h3Resolution) ? String(h3Resolution) : h3Resolution.toFixed(1)}
				initialValue={h3Resolution}
				min={H3_RESOLUTION_MIN}
				max={H3_RESOLUTION_MAX}
				step={1}
				allowDecimal
				groupPosition="single"
				modalTitle="H3 Grid Resolution"
				saveLabel="Apply"
				primaryColor={PRIMARY_COLOR}
				onSave={(val) => {
					const clamped = Math.max(H3_RESOLUTION_MIN, Math.min(H3_RESOLUTION_MAX, val));
					setH3Resolution(clamped);
					onH3ResolutionChange(clamped);
				}}
			/>

			{/* Min Zoom for Tiles */}
			{!showGridAlways && (
				<SettingsListNumberInput
					label="Min Zoom for Tiles"
					value={String(minZoom)}
					initialValue={minZoom}
					min={0}
					max={22}
					step={1}
					groupPosition="single"
					modalTitle="Min Zoom for Tiles"
					saveLabel="Apply"
					primaryColor={PRIMARY_COLOR}
					onSave={(val) => {
						const clamped = Math.max(0, Math.min(22, val));
						setMinZoom(clamped);
						onMinZoomChange(clamped);
					}}
				/>
			)}
			{showGridAlways && (
				<View style={[styles.debugRow, { borderBottomColor: theme.screen.text + '22' }]}>
					<Text selectable style={[styles.debugRowLabel, { color: theme.screen.text }]}>Min Zoom for Tiles</Text>
					<Text selectable style={[styles.debugRowValue, { color: theme.screen.text }]}>disabled (always on)</Text>
				</View>
			)}

			{/* Zoom Level */}
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

			{/* Joystick Speed */}
			<SettingsListNumberInput
				label="Joystick Speed (km/h)"
				value={speedText}
				initialValue={Number.parseFloat(speedText) || initialSpeed}
				min={0.1}
				max={DEBUG_MOVE_SPEED_MAX_KMH}
				allowDecimal
				groupPosition="single"
				modalTitle="Joystick Speed (km/h)"
				saveLabel="Apply"
				primaryColor={PRIMARY_COLOR}
				onSave={(val) => {
					const clamped = Math.min(val, DEBUG_MOVE_SPEED_MAX_KMH);
					setSpeedText(String(clamped));
					onSpeedChange(clamped);
				}}
			/>

			{/* Billboard Scale */}
			<SettingsListNumberInput
				label="Billboard Scale"
				value={`${billboardScale.toFixed(1)}×`}
				initialValue={billboardScale}
				min={0.1}
				step={0.1}
				allowDecimal
				groupPosition="single"
				modalTitle="Billboard Scale"
				saveLabel="Apply"
				suffix="×"
				primaryColor={PRIMARY_COLOR}
				onSave={(val) => {
					const next = Math.max(0.1, Math.round(val * BILLBOARD_SCALE_DECIMAL_PRECISION) / BILLBOARD_SCALE_DECIMAL_PRECISION);
					setBillboardScale(next);
					onBillboardScaleChange(next);
				}}
			/>

			{/* Billboard Face Camera */}
			<SettingsListBoolean
				label="Billboard Face Camera"
				isEnabled={billboardFaceCamera}
				onToggle={() => handleBillboardFaceCameraChange(!billboardFaceCamera)}
				groupPosition="single"
				primaryColor={PRIMARY_COLOR}
			/>

			{/* Show Billboard Anchor Points */}
			<SettingsListBoolean
				label="Show Anchor Points"
				isEnabled={showBillboardAnchors}
				onToggle={() => handleShowBillboardAnchorsChange(!showBillboardAnchors)}
				groupPosition="single"
				primaryColor={PRIMARY_COLOR}
			/>

			{/* Show Debug Points */}
			<SettingsListBoolean
				label="Show Debug Points"
				isEnabled={showDebugPoints}
				onToggle={() => handleShowDebugPointsChange(!showDebugPoints)}
				groupPosition="single"
				primaryColor={PRIMARY_COLOR}
			/>

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
						<Text style={[styles.debugRowLabel, { color: PRIMARY_COLOR, marginLeft: 4 }]}>Export File</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.resolutionButton, { flex: 1, backgroundColor: PRIMARY_COLOR + '18', borderRadius: 8, paddingVertical: 8 }]}
						onPress={onImportMapSettings}
						activeOpacity={0.7}
					>
						<MaterialIcons name="file-download" size={16} color={PRIMARY_COLOR} />
						<Text style={[styles.debugRowLabel, { color: PRIMARY_COLOR, marginLeft: 4 }]}>Import File</Text>
					</TouchableOpacity>
				</View>
			</View>

			{/* Pentagon tiles fly-to */}
			{pentagons.length > 0 && (
				<>
					<SettingsListGroupTitle title={`⬠ Pentagon Tiles (Res ${Math.round(h3Resolution)})`} />
					{pentagons.map((cell, i) => {
						const [lat, lng] = cellToLatLng(cell);
						const position: ListGroupPosition = getListGroupPosition(i, pentagons.length);
						return (
							<SettingsListSelectOptionSingle
								key={cell}
								label={`Pentagon #${i + 1} (${lat.toFixed(2)}, ${lng.toFixed(2)})`}
								leftIcon={<MaterialIcons name="navigation" size={20} color="#ffffff" />}
								iconBgColor={PRIMARY_COLOR}
								isSelected={false}
								selectionColor={PRIMARY_COLOR}
								groupPosition={position}
								onPress={() => onFlyToCell(lat, lng)}
							/>
						);
					})}
				</>
			)}
		</View>
	);
}

// ─── OSM Consent Screen ───────────────────────────────────────────────────────

function OsmConsentScreen({ onConsent }: Readonly<{ onConsent: () => void }>) {
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

function RunShareContent({ shareData, theme }: Readonly<{ shareData: RunShareData; theme: ReturnType<typeof useTheme>['theme'] }>) {
	const compact = JSON.stringify(shareData);
	const pretty = JSON.stringify(shareData, null, 2);
	const showQr = compact.length <= QR_MAX_BYTES;
	const { showAlert } = useGeonexiaAlert();

	const handleSaveFile = useCallback(async () => {
		try {
			const result = await saveJsonToFile(pretty, buildJsonExportFilename('geonexia-run'));
			if (result === 'saved') showAlert('Exported', 'Run data saved as JSON file.');
		} catch {
			showAlert('Export Failed', 'The export file could not be saved.');
		}
	}, [pretty]);

	const handleCopy = useCallback(async () => {
		await Clipboard.setStringAsync(compact);
		showAlert('Copied', 'Run data copied to clipboard.');
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
			<TouchableOpacity style={[styles.shareButton, { backgroundColor: PRIMARY_COLOR }]} onPress={handleSaveFile} activeOpacity={0.8}>
				<MaterialIcons name="save-alt" size={18} color="#ffffff" />
				<Text style={styles.shareButtonText}>Save as File</Text>
			</TouchableOpacity>
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

function RunStatsContent({ stats, theme, shareData }: Readonly<{ stats: RunStats; theme: ReturnType<typeof useTheme>['theme']; shareData: RunShareData }>) {
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
	enclosedCells: string[];
	routeCells: string[];
	h3Resolution: number;
	theme: ReturnType<typeof useTheme>['theme'];
	savedActivities: SavedActivity[];
	selectedSportType: SportType;
	onSaveAsActivity: (routeCells: string[], enclosedCells: string[]) => void;
	onSaveAsRoute: (routeCells: string[], name: string) => void;
	onClose: () => void;
};

function MeasureResultContent({
	routeLengthInTiles,
	enclosedTileCount,
	enclosedCells,
	routeCells,
	h3Resolution,
	theme,
	savedActivities,
	selectedSportType,
	onSaveAsActivity,
	onSaveAsRoute,
	onClose,
}: Readonly<MeasureResultContentProps>) {
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
					onPress={() => { onSaveAsActivity(routeCells, enclosedCells); onClose(); }}
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
// Pointy-top hexagon showing all 25 anchor positions:
//   CENTER (hex centroid), 12 OUTER positions (6 vertices + 6 edge midpoints),
//   and 12 MIDDLE positions (midpoints between CENTER and each OUTER point).
//
// Degree convention: 0° = vertex[0] (top), clockwise.
//   Vertices at 0°, 60°, 120°, 180°, 240°, 300°.
//   Edge midpoints at 30°, 90°, 150°, 210°, 270°, 330°.

const HEX_PICKER_SIZE = 260;
const HEX_PICKER_R = HEX_PICKER_SIZE * 0.38;
const HEX_PICKER_CX = HEX_PICKER_SIZE / 2;
const HEX_PICKER_CY = HEX_PICKER_SIZE / 2;
const HEX_DOT_SIZE = 20;
const HEX_DOT_SELECTED_SIZE = 26;

// √3/4
const SQRT3_4 = Math.sqrt(3) / 4;
// √3/8
const SQRT3_8 = Math.sqrt(3) / 8;
// √3/2
const SQRT3_2 = Math.sqrt(3) / 2;

// Positions for each BillboardAnchorPosition entry keyed by the enum string value.
// All coordinates are in the local HEX_PICKER coordinate system (pointy-top hex, 0° at top, clockwise).
// For angle θ clockwise from top: x = CX + d*sin(θ),  y = CY − d*cos(θ)
// Outer vertices: d = R,  outer edge midpoints: d = R*√3/2,  middle vertices: d = R/2,  middle edge midpoints: d = R*√3/4
// √3/2 ≈ 0.866,  √3/4 ≈ 0.433,  √3/8 ≈ 0.217
const HEX_ANCHOR_POSITIONS: Record<string, { x: number; y: number }> = {
	// ── Center ──────────────────────────────────────────────────────────────────
	[BillboardAnchorPosition.CENTER]: { x: HEX_PICKER_CX, y: HEX_PICKER_CY },

	// ── Outer ring: vertices (0° = top, clockwise) ──────────────────────────────
	[BillboardAnchorPosition.OUTER_0_DEGREE]:   { x: HEX_PICKER_CX,                               y: HEX_PICKER_CY - HEX_PICKER_R },                // 0°: vertex top
	[BillboardAnchorPosition.OUTER_60_DEGREE]:  { x: HEX_PICKER_CX + HEX_PICKER_R * SQRT3_2,      y: HEX_PICKER_CY - HEX_PICKER_R / 2 },            // 60°: vertex upper-right
	[BillboardAnchorPosition.OUTER_120_DEGREE]: { x: HEX_PICKER_CX + HEX_PICKER_R * SQRT3_2,      y: HEX_PICKER_CY + HEX_PICKER_R / 2 },            // 120°: vertex lower-right
	[BillboardAnchorPosition.OUTER_180_DEGREE]: { x: HEX_PICKER_CX,                               y: HEX_PICKER_CY + HEX_PICKER_R },                // 180°: vertex bottom
	[BillboardAnchorPosition.OUTER_240_DEGREE]: { x: HEX_PICKER_CX - HEX_PICKER_R * SQRT3_2,      y: HEX_PICKER_CY + HEX_PICKER_R / 2 },            // 240°: vertex lower-left
	[BillboardAnchorPosition.OUTER_300_DEGREE]: { x: HEX_PICKER_CX - HEX_PICKER_R * SQRT3_2,      y: HEX_PICKER_CY - HEX_PICKER_R / 2 },            // 300°: vertex upper-left

	// ── Outer ring: edge midpoints ───────────────────────────────────────────────
	[BillboardAnchorPosition.OUTER_30_DEGREE]:  { x: HEX_PICKER_CX + HEX_PICKER_R * SQRT3_4,      y: HEX_PICKER_CY - HEX_PICKER_R * 3 / 4 },       // 30°: edge top-right
	[BillboardAnchorPosition.OUTER_90_DEGREE]:  { x: HEX_PICKER_CX + HEX_PICKER_R * SQRT3_2,      y: HEX_PICKER_CY },                               // 90°: edge right
	[BillboardAnchorPosition.OUTER_150_DEGREE]: { x: HEX_PICKER_CX + HEX_PICKER_R * SQRT3_4,      y: HEX_PICKER_CY + HEX_PICKER_R * 3 / 4 },       // 150°: edge lower-right
	[BillboardAnchorPosition.OUTER_210_DEGREE]: { x: HEX_PICKER_CX - HEX_PICKER_R * SQRT3_4,      y: HEX_PICKER_CY + HEX_PICKER_R * 3 / 4 },       // 210°: edge lower-left
	[BillboardAnchorPosition.OUTER_270_DEGREE]: { x: HEX_PICKER_CX - HEX_PICKER_R * SQRT3_2,      y: HEX_PICKER_CY },                               // 270°: edge left
	[BillboardAnchorPosition.OUTER_330_DEGREE]: { x: HEX_PICKER_CX - HEX_PICKER_R * SQRT3_4,      y: HEX_PICKER_CY - HEX_PICKER_R * 3 / 4 },       // 330°: edge top-left

	// ── Middle ring: toward vertices ─────────────────────────────────────────────
	[BillboardAnchorPosition.MIDDLE_0_DEGREE]:   { x: HEX_PICKER_CX,                               y: HEX_PICKER_CY - HEX_PICKER_R / 2 },            // 0°: toward top
	[BillboardAnchorPosition.MIDDLE_60_DEGREE]:  { x: HEX_PICKER_CX + HEX_PICKER_R * SQRT3_4,      y: HEX_PICKER_CY - HEX_PICKER_R / 4 },            // 60°: toward upper-right
	[BillboardAnchorPosition.MIDDLE_120_DEGREE]: { x: HEX_PICKER_CX + HEX_PICKER_R * SQRT3_4,      y: HEX_PICKER_CY + HEX_PICKER_R / 4 },            // 120°: toward lower-right
	[BillboardAnchorPosition.MIDDLE_180_DEGREE]: { x: HEX_PICKER_CX,                               y: HEX_PICKER_CY + HEX_PICKER_R / 2 },            // 180°: toward bottom
	[BillboardAnchorPosition.MIDDLE_240_DEGREE]: { x: HEX_PICKER_CX - HEX_PICKER_R * SQRT3_4,      y: HEX_PICKER_CY + HEX_PICKER_R / 4 },            // 240°: toward lower-left
	[BillboardAnchorPosition.MIDDLE_300_DEGREE]: { x: HEX_PICKER_CX - HEX_PICKER_R * SQRT3_4,      y: HEX_PICKER_CY - HEX_PICKER_R / 4 },            // 300°: toward upper-left

	// ── Middle ring: toward edge midpoints ───────────────────────────────────────
	[BillboardAnchorPosition.MIDDLE_30_DEGREE]:  { x: HEX_PICKER_CX + HEX_PICKER_R * SQRT3_8,      y: HEX_PICKER_CY - HEX_PICKER_R * 3 / 8 },       // 30°: toward top-right edge
	[BillboardAnchorPosition.MIDDLE_90_DEGREE]:  { x: HEX_PICKER_CX + HEX_PICKER_R * SQRT3_4,      y: HEX_PICKER_CY },                               // 90°: toward right edge
	[BillboardAnchorPosition.MIDDLE_150_DEGREE]: { x: HEX_PICKER_CX + HEX_PICKER_R * SQRT3_8,      y: HEX_PICKER_CY + HEX_PICKER_R * 3 / 8 },       // 150°: toward lower-right edge
	[BillboardAnchorPosition.MIDDLE_210_DEGREE]: { x: HEX_PICKER_CX - HEX_PICKER_R * SQRT3_8,      y: HEX_PICKER_CY + HEX_PICKER_R * 3 / 8 },       // 210°: toward lower-left edge
	[BillboardAnchorPosition.MIDDLE_270_DEGREE]: { x: HEX_PICKER_CX - HEX_PICKER_R * SQRT3_4,      y: HEX_PICKER_CY },                               // 270°: toward left edge
	[BillboardAnchorPosition.MIDDLE_330_DEGREE]: { x: HEX_PICKER_CX - HEX_PICKER_R * SQRT3_8,      y: HEX_PICKER_CY - HEX_PICKER_R * 3 / 8 },       // 330°: toward top-left edge
};

// Hexagon outline polygon points (pointy-top, 6 vertices).
const HEX_POLYGON_POINTS = [0, 1, 2, 3, 4, 5].map((i) => {
	const angle = (Math.PI / 2) - (i * Math.PI) / 3;
	return {
		id: i,
		x: HEX_PICKER_CX + HEX_PICKER_R * Math.cos(angle),
		y: HEX_PICKER_CY - HEX_PICKER_R * Math.sin(angle),
	};
});

function HexAnchorPicker({ selected, onSelect, occupiedAnchors }: Readonly<{ selected: BillboardAnchorPosition; onSelect: (id: BillboardAnchorPosition) => void; occupiedAnchors?: Record<string, string | null> }>) {
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
					const len = Math.hypot(dx, dy);
					const angle = Math.atan2(dy, dx) * (180 / Math.PI);
					return (
						<View
							key={pt.id}
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
					const isWhiteSwatch = ac.hex === '#ffffff';
					const unselectedBorderColor = isWhiteSwatch ? '#d1d5db' : 'transparent';
					const unselectedBorderWidth = isWhiteSwatch ? 1 : 0;
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
									borderColor: isSelected ? PRIMARY_COLOR : unselectedBorderColor,
									borderWidth: isSelected ? 3 : unselectedBorderWidth,
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

/**
 * Build the stat rows shown for a hex tile in `HexTileInfoContent`: base H3/record
 * stats plus, if the cell has a resolvable parent, its parent-cell rows appended.
 */
function buildHexTileInfoRows(
	h3Index: string,
	record: HexTileRecord | null,
	parentInfo: { parentIndex: string; childNumber: number | null; totalChildren: number } | null,
): { label: string; value: string }[] {
	let walkedOnValue = '⬜ No';
	if (record) {
		walkedOnValue = record.walkedOn ? '✅ Yes' : '⬜ No (enclosed only)';
	}

	const parentRows: { label: string; value: string }[] = [];
	if (parentInfo) {
		const childNumberValue = parentInfo.childNumber !== null ? `${parentInfo.childNumber} / ${parentInfo.totalChildren}` : '—';
		parentRows.push(
			{ label: 'Parent H3', value: parentInfo.parentIndex },
			{ label: 'Nr. im Parent', value: childNumberValue },
		);
	}

	return [
		{ label: 'H3 Index', value: h3Index },
		{ label: 'Level', value: record ? String(record.level) : '0' },
		{ label: 'Walked On', value: walkedOnValue },
		{ label: 'Visit Count', value: record ? String(record.visitCount) : '0' },
		{ label: 'Enclosed Count', value: record ? String(record.enclosedCount) : '0' },
		{ label: 'Avenue Count', value: record ? String(record.avenueCount) : '0' },
		{ label: 'Last Visited', value: record ? formatTimestamp(record.lastVisitedAt) : '—' },
		{ label: 'Last Enclosed', value: record ? formatTimestamp(record.lastEnclosedAt) : '—' },
		...parentRows,
	];
}

function HexTileInfoContent({ h3Index }: Readonly<{ h3Index: string }>) {
	const { theme } = useTheme();
	const dispatch = useDispatch();
	const { show: showModal, close: closeModal } = useMyScrollViewModal();
	const record = useSelector((state: RootState) => state.hexTiles.records[h3Index] ?? null);
	const [selectedObjectAnchor, setSelectedObjectAnchor] = useState<BillboardAnchorPosition>(BillboardAnchorPosition.CENTER);
	const [selectedTextureAdaptionAnchor, setSelectedTextureAdaptionAnchor] = useState<BillboardAnchorPosition>(BillboardAnchorPosition.CENTER);
	const [mapFeatures, setMapFeatures] = useState<MapFeatureInfo[] | null>(null);
	const [featuresLoading, setFeaturesLoading] = useState(false);
	const runIdRef = useRef(0);

	useEffect(() => {
		const runId = ++runIdRef.current;
		setFeaturesLoading(true);
		queryTileFeaturesForHexCell(h3Index, undefined, { nameNullAllowList: ROUTE_NAME_LANDMARK_NAME_NULL_ALLOW })
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
	const effectiveBillboardsObjects = record ? getEffectiveBillboards(record) : {} as Record<BillboardAnchorPosition, string>;
	const currentObjectAnchorBillboard = effectiveBillboardsObjects[selectedObjectAnchor] ?? null;
	const parsedCurrentObjectBillboard = currentObjectAnchorBillboard ? parseBillboardKey(currentObjectAnchorBillboard) : null;
	const effectiveBillboardsTexture = record ? getEffectiveBillboardsTexture(record) : {} as Record<BillboardAnchorPosition, string>;
	const currentTextureAnchorBillboard = effectiveBillboardsTexture[selectedTextureAdaptionAnchor] ?? null;
	const parsedCurrentTextureBillboard = currentTextureAnchorBillboard ? parseBillboardKey(currentTextureAnchorBillboard) : null;

	const parentInfo = useMemo(() => {
		if (!isH3Available() || !isValidCell(h3Index)) return null;
		const res = getResolution(h3Index);
		if (res <= 0) return null;
		const parentIndex = cellToParent(h3Index, res - 1);
		if (!parentIndex) return null;
		// H3 index strings - deterministic code unit comparison keeps child numbering
		// identical across devices regardless of locale.
		const siblings = cellToChildren(parentIndex, res).sort(compareByCodeUnit);
		const childNumber = siblings.indexOf(h3Index);
		return {
			parentIndex,
			childNumber: childNumber >= 0 ? childNumber + 1 : null,
			totalChildren: siblings.length,
		};
	}, [h3Index]);

	const infoRows = buildHexTileInfoRows(h3Index, record, parentInfo);

	const openTileSelection = useCallback(() => {
		showModal({
			title: '🌿 Select Tile Image',
			onClose: closeModal,
			children: renderTerrainCategoryList((entry, position) => (
				<SettingsListHexTile
					key={entry.key}
					tileImageKey={entry.key}
					title={entry.key.split('/').pop() ?? entry.key}
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
			)),
		});
	}, [showModal, closeModal, currentTileImage, h3Index, dispatch]);

	const openObjectSelection = useCallback(() => {
		const anchorLabel = BILLBOARD_ANCHOR_COLORS.find((c) => c.id === selectedObjectAnchor)?.label ?? selectedObjectAnchor;
		showModal({
			title: `🏠 Select Hex Object — ${anchorLabel}`,
			onClose: closeModal,
			children: (
				<View style={{ paddingBottom: 20 }}>
					<SettingsListSelectOptionSingle
						key="none"
						label="None (clear)"
						isSelected={!currentObjectAnchorBillboard}
						selectionColor={PRIMARY_COLOR}
						onPress={() => {
							dispatch(setBillboardAtAnchor({ h3Index, anchorColor: selectedObjectAnchor, billboard: null }));
							closeModal();
						}}
						groupPosition={OBJECT_SPRITES.length > 0 ? 'top' : 'single'}
					/>
					{OBJECT_SPRITES.map((sprite, idx) => {
						const key = `objects:${idx}`;
						const isSelected = currentObjectAnchorBillboard === key;
						const position = idx === OBJECT_SPRITES.length - 1 ? 'bottom' : 'middle';
						return (
							<SettingsListBillboard
								key={key}
								spriteIndex={idx}
								title={sprite.name}
								isSelected={isSelected}
								selectionColor={PRIMARY_COLOR}
								onPress={() => {
									dispatch(setBillboardAtAnchor({ h3Index, anchorColor: selectedObjectAnchor, billboard: key }));
									closeModal();
								}}
								groupPosition={position}
							/>
						);
					})}
				</View>
			),
		});
	}, [showModal, closeModal, currentObjectAnchorBillboard, h3Index, dispatch, selectedObjectAnchor]);

	const openTextureAdaptionSelection = useCallback(() => {
		const anchorLabel = BILLBOARD_ANCHOR_COLORS.find((c) => c.id === selectedTextureAdaptionAnchor)?.label ?? selectedTextureAdaptionAnchor;
		showModal({
			title: `🖼️ Select Texture Adaption — ${anchorLabel}`,
			onClose: closeModal,
			children: (
				<View style={{ paddingBottom: 20 }}>
					<SettingsListSelectOptionSingle
						key="none"
						label="None (clear)"
						isSelected={!currentTextureAnchorBillboard}
						selectionColor={PRIMARY_COLOR}
						onPress={() => {
							dispatch(setTextureAdaptionAtAnchor({ h3Index, anchorColor: selectedTextureAdaptionAnchor, billboard: null }));
							closeModal();
						}}
						groupPosition={OBJECT_SPRITES.length > 0 ? 'top' : 'single'}
					/>
					{OBJECT_SPRITES.map((sprite, idx) => {
						const key = `objects:${idx}`;
						const isSelected = currentTextureAnchorBillboard === key;
						const position = idx === OBJECT_SPRITES.length - 1 ? 'bottom' : 'middle';
						return (
							<SettingsListBillboard
								key={key}
								spriteIndex={idx}
								title={sprite.name}
								isSelected={isSelected}
								selectionColor={PRIMARY_COLOR}
								onPress={() => {
									dispatch(setTextureAdaptionAtAnchor({ h3Index, anchorColor: selectedTextureAdaptionAnchor, billboard: key }));
									closeModal();
								}}
								groupPosition={position}
							/>
						);
					})}
				</View>
			),
		});
	}, [showModal, closeModal, currentTextureAnchorBillboard, h3Index, dispatch, selectedTextureAdaptionAnchor]);

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

			{/* ── Hex Textur section (terrain fill image) ── */}
			<SettingsListGroupTitle title="Hex Textur" />
			<SettingsListHexTile
				tileImageKey={currentTileImage}
				title="Hex Textur"
				onPress={openTileSelection}
				groupPosition="single"
			/>

			{/* ── Hex Texture Adaption section (flat sprites at anchor positions) ── */}
			<SettingsListGroupTitle title="Hex Texture Adaption" />
			<HexAnchorPicker
				selected={selectedTextureAdaptionAnchor}
				onSelect={setSelectedTextureAdaptionAnchor}
				occupiedAnchors={effectiveBillboardsTexture}
			/>
			<SettingsListBillboard
				spriteIndex={parsedCurrentTextureBillboard?.idx ?? null}
				title={BILLBOARD_ANCHOR_COLORS.find((c) => c.id === selectedTextureAdaptionAnchor)?.label ?? selectedTextureAdaptionAnchor}
				onPress={openTextureAdaptionSelection}
				groupPosition="single"
			/>

			{/* ── Hex Feld Object Set section (face-camera objects at anchor positions) ── */}
			<SettingsListGroupTitle title="Hex Feld Object Set" />
			<HexAnchorPicker
				selected={selectedObjectAnchor}
				onSelect={setSelectedObjectAnchor}
				occupiedAnchors={effectiveBillboardsObjects}
			/>
			<SettingsListBillboard
				spriteIndex={parsedCurrentObjectBillboard?.idx ?? null}
				title={BILLBOARD_ANCHOR_COLORS.find((c) => c.id === selectedObjectAnchor)?.label ?? selectedObjectAnchor}
				onPress={openObjectSelection}
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
							key={`${feature.layerId ?? ''}-${feature.class ?? ''}-${feature.subclass ?? ''}-${feature.name ?? ''}-${idx}`}
							leftIcon={<MaterialIcons name="info-outline" size={20} color="#ffffff" />}
							iconBackgroundColor={PRIMARY_COLOR}
							title={feature.name ?? feature.layerId ?? `Feature ${idx + 1}`}
							value={JSON.stringify(feature, null, 2)}
							groupPosition={getListGroupPosition(idx, mapFeatures.length)}
						/>
					))}
				</>
			)}
			{!featuresLoading && mapFeatures?.length === 0 && (
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

function MagnifyModalContent({ h3Index }: Readonly<{ h3Index: string }>) {
	const { theme } = useTheme();
	const { showAlert } = useGeonexiaAlert();
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

			const result = await queryTileFeaturesForHexCell(h3Index, undefined, { nameNullAllowList: ROUTE_NAME_LANDMARK_NAME_NULL_ALLOW });
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
		f.waterway || (f.layerId?.includes('water'))
	) ?? [];
	const buildings = features?.filter((f) =>
		f.building || (f.layerId?.includes('building'))
	) ?? [];
	const pois = features?.filter((f) =>
		f.amenity || f.natural || f.landuse ||
		(f.layerId && (f.layerId.includes('poi') || f.layerId.includes('park') || f.layerId.includes('landuse') || f.layerId.includes('landcover')))
	) ?? [];

	const handleCopyJson = useCallback(async () => {
		if (!features) return;
		const json = JSON.stringify(features, null, 2);
		await Clipboard.setStringAsync(json);
		showAlert('Kopiert', 'JSON in Zwischenablage kopiert.');
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

			{features?.length === 0 && !loading && (
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
							key={`street-${f.class ?? ''}-${f.subclass ?? ''}-${f.name ?? ''}-${idx}`}
							leftIcon={<MaterialIcons name="directions" size={20} color="#ffffff" />}
							iconBackgroundColor="#f97316"
							title={f.name ?? f.highway ?? f.class ?? `Straße ${idx + 1}`}
							value={JSON.stringify(f)}
							groupPosition={getListGroupPosition(idx, streets.length)}
						/>
					))}
				</>
			)}
			{waterways.length > 0 && (
				<>
					<SettingsListGroupTitle title="Gewässer" />
					{waterways.map((f, idx) => (
						<SettingsList
							key={`water-${f.class ?? ''}-${f.subclass ?? ''}-${f.name ?? ''}-${idx}`}
							leftIcon={<MaterialIcons name="water" size={20} color="#ffffff" />}
							iconBackgroundColor="#3b82f6"
							title={f.name ?? f.waterway ?? f.class ?? `Gewässer ${idx + 1}`}
							value={JSON.stringify(f)}
							groupPosition={getListGroupPosition(idx, waterways.length)}
						/>
					))}
				</>
			)}
			{buildings.length > 0 && (
				<>
					<SettingsListGroupTitle title="Gebäude" />
					{buildings.map((f, idx) => (
						<SettingsList
							key={`building-${f.class ?? ''}-${f.subclass ?? ''}-${f.name ?? ''}-${idx}`}
							leftIcon={<MaterialIcons name="apartment" size={20} color="#ffffff" />}
							iconBackgroundColor="#8b5cf6"
							title={f.name ?? f.building ?? f.class ?? `Gebäude ${idx + 1}`}
							value={JSON.stringify(f)}
							groupPosition={getListGroupPosition(idx, buildings.length)}
						/>
					))}
				</>
			)}
			{pois.length > 0 && (
				<>
					<SettingsListGroupTitle title="Points of Interest" />
					{pois.map((f, idx) => (
						<SettingsList
							key={`poi-${f.class ?? ''}-${f.subclass ?? ''}-${f.name ?? ''}-${idx}`}
							leftIcon={<MaterialIcons name="place" size={20} color="#ffffff" />}
							iconBackgroundColor="#10b981"
							title={f.name ?? f.amenity ?? f.natural ?? f.landuse ?? f.subclass ?? f.class ?? `POI ${idx + 1}`}
							value={JSON.stringify(f)}
							groupPosition={getListGroupPosition(idx, pois.length)}
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

// ─── Map Search ───────────────────────────────────────────────────────────────

/**
 * Converts a MapFeatureInfo into a display key used for search filtering.
 * Format: "class/subclass" when both are present, otherwise whichever is non-null.
 */
function cellHasEnabledFeature(cell: string, cache: Map<string, MapFeatureInfo[]>, enabledKeys: string[]): boolean {
	const features = cache.get(cell) ?? [];
	return features.some((f) => enabledKeys.includes(featureToSearchKey(f)));
}

function featureToSearchKey(f: { class: string | null; subclass: string | null; layerId: string | null }): string {
	const parts = [f.class, f.subclass].filter((v): v is string => v !== null && v.length > 0);
	if (parts.length > 0) return parts.join('/');
	return f.layerId ?? 'unknown';
}

function MapSearchModalContent({ availableKeys }: Readonly<{ availableKeys: string[] }>) {
	const dispatch = useDispatch();
	const searchState = useSelector((state: RootState) => state.mapSearch.searchState);
	const enabledKeys = searchState?.enabledKeys ?? [];

	return (
		<>
			<SettingsListGroupTitle title="Suche zurücksetzen" />
			<SettingsList
				leftIcon={<MaterialIcons name="refresh" size={22} color="#ffffff" />}
				iconBgColor="#ef4444"
				label="Suche zurücksetzen"
				groupPosition="single"
				handleFunction={() => dispatch(resetMapSearchState())}
			/>
			<SettingsListGroupTitle title="Name der Suche" />
			<SettingsListTextInput
				title="Name"
				placeholder="z.B. Parks & Grünflächen"
				modalTitle="Suche benennen"
				groupPosition="single"
				value={searchState?.name ?? ''}
				initialValue={searchState?.name ?? ''}
				onSave={(name) => { dispatch(setMapSearchName(name.trim())); }}
			/>
			{availableKeys.length > 0 && (
				<>
					<SettingsListGroupTitle title="Map Features" />
					{availableKeys.map((key, idx) => (
						<SettingsListBoolean
							key={key}
							label={key}
							isEnabled={enabledKeys.includes(key)}
							onToggle={() => dispatch(toggleMapSearchKey(key))}
							groupPosition={getListGroupPosition(idx, availableKeys.length)}
						/>
					))}
				</>
			)}
		</>
	);
}

// ─── Interrupted Recording Reconstruction ────────────────────────────────────

/**
 * Reconstruct an interrupted recording by matching it against a saved route.
 * The interrupted activity's hex tiles are compared to the route's hex tiles.
 * For the portion of the route that the user hadn't reached yet (the "gap"),
 * synthetic GPS points are generated at hex tile centers using the average pace
 * observed during the recorded portion.
 *
 * @returns A new `RoutePoint[]` array containing the original points plus
 *          synthetic points for the gap, or `null` if reconstruction is not possible.
 */
/**
 * Resolve hex-center coordinates for each gap tile and the cumulative
 * great-circle distance along that path, starting from `startLat`/`startLng`.
 */
function computeGapTileCoordsAndDistance(
	gapTiles: string[],
	startLat: number,
	startLng: number,
): { gapCoords: Array<[number, number]>; totalGapKm: number } {
	const gapCoords: Array<[number, number]> = [];
	let prevLat = startLat;
	let prevLng = startLng;
	let totalGapKm = 0;
	for (const hexId of gapTiles) {
		const [lat, lng] = cellToLatLng(hexId);
		gapCoords.push([lat, lng]);
		if (lat !== 0 || lng !== 0) {
			totalGapKm += haversineKm(prevLat, prevLng, lat, lng);
			prevLat = lat;
			prevLng = lng;
		}
	}
	return { gapCoords, totalGapKm };
}

/**
 * Generate synthetic GPS points along the gap tiles' hex-center coordinates,
 * distributing the available time budget (`gapMs`) proportionally to distance
 * so the last synthetic point lands exactly at the end of that budget.
 */
interface BuildSyntheticGapPointsOptions {
	gapTiles: string[];
	gapCoords: Array<[number, number]>;
	totalGapKm: number;
	gapMs: number;
	startLat: number;
	startLng: number;
	startTimestamp: number;
	avgSpeedMs: number;
}

function buildSyntheticGapPoints({
	gapTiles,
	gapCoords,
	totalGapKm,
	gapMs,
	startLat,
	startLng,
	startTimestamp,
	avgSpeedMs,
}: BuildSyntheticGapPointsOptions): RoutePoint[] {
	let prevLat = startLat;
	let prevLng = startLng;
	let currentTimestamp = startTimestamp;
	const syntheticPoints: RoutePoint[] = [];

	for (let i = 0; i < gapTiles.length; i++) {
		const [lat, lng] = gapCoords[i];
		if (lat === 0 && lng === 0) continue;
		const segmentKm = haversineKm(prevLat, prevLng, lat, lng);
		const segmentMs = totalGapKm > 0
			? (segmentKm / totalGapKm) * gapMs
			: gapMs / gapTiles.length;
		currentTimestamp += segmentMs;
		syntheticPoints.push({
			lat,
			lng,
			altitude: null,
			speed: avgSpeedMs, // m/s, as per the Location API convention
			timestamp: currentTimestamp,
			interpolated: true,
		});
		prevLat = lat;
		prevLng = lng;
	}
	return syntheticPoints;
}

function reconstructInterruptedRoute(
	snapshot: InterruptedRecordingSnapshot,
	route: SavedRoute,
): RoutePoint[] | null {
	if (snapshot.routePoints.length < 2 || route.hexTiles.length < 2) return null;
	if (snapshot.hexTilesOrdered.length === 0) return null;

	const recordedSet = new Set(snapshot.hexTilesOrdered);

	// Find where the interrupted recording diverges from the route.
	// Walk through the route's hex tiles and find the last one that appears
	// in the recorded tiles (in order).
	let lastMatchIndex = -1;
	for (let i = 0; i < route.hexTiles.length; i++) {
		if (recordedSet.has(route.hexTiles[i])) {
			lastMatchIndex = i;
		}
	}

	if (lastMatchIndex < 0) return null; // No overlap at all

	// The remaining route tiles that were NOT visited form the gap.
	const gapTiles: string[] = [];
	for (let i = lastMatchIndex + 1; i < route.hexTiles.length; i++) {
		if (!recordedSet.has(route.hexTiles[i])) {
			gapTiles.push(route.hexTiles[i]);
		}
	}

	if (gapTiles.length === 0) return null; // Route was fully covered

	// Use current time as the end timestamp for the reconstructed activity so
	// that the saved activity reflects when the user performed the recovery.
	const nowMs = Date.now();
	const lastRecordedPoint = snapshot.routePoints.at(-1)!;
	const firstGpsTimestamp = snapshot.routePoints[0].timestamp;

	// Average speed (m/s) = total recorded distance / elapsed time from the
	// first GPS point to now (the moment the user assigns the route).
	const totalRecordedDistanceKm = computeRoutePointsDistance(snapshot.routePoints);
	const totalElapsedSec = (nowMs - firstGpsTimestamp) / 1000;
	if (totalElapsedSec <= 0) return null;
	// Fall back to a typical walking pace if no distance was recorded.
	const avgSpeedMs = totalRecordedDistanceKm > 0
		? (totalRecordedDistanceKm * 1000) / totalElapsedSec
		: 1.4; // ~5 km/h walking pace

	// Pre-pass: resolve hex-center coordinates and total gap distance so the
	// remaining time budget (lastRecordedPoint → nowMs) can be distributed
	// proportionally to distance across the synthetic points.
	const { gapCoords, totalGapKm } = computeGapTileCoordsAndDistance(gapTiles, lastRecordedPoint.lat, lastRecordedPoint.lng);

	// Time budget available for the interpolated section.
	const gapMs = nowMs - lastRecordedPoint.timestamp;

	// Generate interpolated GPS points along the gap tiles using their hex
	// center coordinates. Each point is flagged as `interpolated: true` to
	// indicate it was synthetically created to compensate for the GPS gap.
	const syntheticPoints = buildSyntheticGapPoints({
		gapTiles,
		gapCoords,
		totalGapKm,
		gapMs,
		startLat: lastRecordedPoint.lat,
		startLng: lastRecordedPoint.lng,
		startTimestamp: lastRecordedPoint.timestamp,
		avgSpeedMs,
	});

	return [...snapshot.routePoints, ...syntheticPoints];
}

/**
 * Compute the total distance in km from an array of RoutePoint.
 */
function computeRoutePointsDistance(points: RoutePoint[]): number {
	let totalKm = 0;
	for (let i = 1; i < points.length; i++) {
		totalKm += haversineKm(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng);
	}
	return totalKm;
}

// ─── Interrupted Recovery Content ────────────────────────────────────────────

function InterruptedRecoveryContent({
	snapshot,
	theme,
	onDiscard,
	onSave,
}: Readonly<{
	snapshot: InterruptedRecordingSnapshot;
	theme: ReturnType<typeof useTheme>['theme'];
	onDiscard: () => void;
	onSave: (activity: SavedActivity) => void;
}>) {
	const [routes, setRoutes] = useState<SavedRoute[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadRoutes().then((r) => {
			setRoutes(r);
			setLoading(false);
		});
	}, []);

	const durationSec = snapshot.accumulatedSeconds +
		(snapshot.routePoints.length > 1
			? (snapshot.routePoints.at(-1)!.timestamp - snapshot.routePoints[0].timestamp) / 1000
			: 0);
	const distKm = computeRoutePointsDistance(snapshot.routePoints);
	const dateStr = new Date(snapshot.startedAt).toLocaleString();

	const handleSaveAsIs = useCallback(() => {
		const stats = computeStats(snapshot.routePoints);
		const activity: SavedActivity = {
			id: String(snapshot.startedAt),
			startedAt: snapshot.startedAt,
			endedAt: snapshot.savedAt,
			routePoints: snapshot.routePoints,
			stats,
			sportType: snapshot.sportType,
			h3Resolution: snapshot.h3Resolution,
			visitedTileCount: snapshot.hexTilesOrdered.length,
			enclosedTileCount: 0,
			hexTilesOrdered: snapshot.hexTilesOrdered,
			routeId: snapshot.routeId,
		};
		activity.computed = computeActivityData(activity, []);
		onSave(activity);
	}, [snapshot, onSave]);

	const handleReconstructWithRoute = useCallback((route: SavedRoute) => {
		const reconstructed = reconstructInterruptedRoute(snapshot, route);
		const points = reconstructed ?? snapshot.routePoints;
		const stats = computeStats(points);
		const activity: SavedActivity = {
			id: String(snapshot.startedAt),
			startedAt: snapshot.startedAt,
			endedAt: Date.now(),
			routePoints: points,
			stats,
			sportType: snapshot.sportType,
			h3Resolution: snapshot.h3Resolution,
			visitedTileCount: snapshot.hexTilesOrdered.length,
			enclosedTileCount: 0,
			hexTilesOrdered: snapshot.hexTilesOrdered,
			routeId: route.id,
		};
		activity.computed = computeActivityData(activity, []);
		onSave(activity);
	}, [snapshot, onSave]);

	const matchingRoutes = useMemo(() => {
		if (routes.length === 0 || snapshot.hexTilesOrdered.length === 0) return [];
		return findMatchingRoutes(snapshot.hexTilesOrdered, routes, snapshot.h3Resolution, 0.3);
	}, [routes, snapshot]);

	return (
		<View style={{ paddingTop: 8, gap: 12 }}>
			<Text style={{ color: theme.screen.text, fontSize: 15, lineHeight: 22 }}>
				Eine Aktivität vom {dateStr} wurde durch einen App-Absturz unterbrochen.{'\n'}
				{snapshot.routePoints.length} GPS-Punkte, {distKm.toFixed(2)} km, {Math.round(durationSec)}s aufgezeichnet.
			</Text>

			<TouchableOpacity
				style={{ backgroundColor: '#2563eb', paddingVertical: 12, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
				onPress={handleSaveAsIs}
				activeOpacity={0.8}
			>
				<MaterialIcons name="save" size={18} color="#ffffff" />
				<Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '600' }}>Aktivität speichern (wie aufgezeichnet)</Text>
			</TouchableOpacity>

			{loading && (
				<Text style={{ color: theme.screen.text, opacity: 0.5 }}>Routen werden geladen…</Text>
			)}
			{!loading && matchingRoutes.length > 0 && (
				<>
					<Text style={{ color: theme.screen.text, fontSize: 14, fontWeight: '600' }}>
						Route zuordnen und fehlende Strecke ergänzen:
					</Text>
					{matchingRoutes.map((match) => (
						<TouchableOpacity
							key={match.route.id}
							style={{ backgroundColor: '#16a34a', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}
							onPress={() => handleReconstructWithRoute(match.route)}
							activeOpacity={0.8}
						>
							<MaterialIcons name="route" size={18} color="#ffffff" />
							<Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '600', flex: 1 }}>
								{match.route.name} ({Math.round(match.overlap * 100)}% Übereinstimmung)
							</Text>
						</TouchableOpacity>
					))}
				</>
			)}

			<TouchableOpacity
				style={{ paddingVertical: 12, alignItems: 'center' }}
				onPress={onDiscard}
				activeOpacity={0.8}
			>
				<Text style={{ color: theme.screen.text, fontSize: 15, fontWeight: '500' }}>Verwerfen</Text>
			</TouchableOpacity>
		</View>
	);
}

// ─── RecordScreen: loadAndSendCustomizations helpers ──────────────────────────

/** Image overlay entry sent to the map for a customized hex tile's terrain texture. */
type TileImageOverlay = MapOverlayIdentity & {
	coordinates: [[number, number], [number, number], [number, number], [number, number]];
	// Actual H3 hex vertices in [lng, lat] order for precise canvas clipping.
	polygonCoords: [number, number][];
	// Bearing from hex center to its first vertex (radians, 0 = North, CW positive).
	// Used to rotate the texture so it aligns with the H3 hex orientation.
	rotation: number;
};

/** [lat, lng] bounding box spanned by a hex boundary. */
function computeBoundaryBoundingBox(boundary: [number, number][]): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
	let minLat = Infinity, maxLat = -Infinity;
	let minLng = Infinity, maxLng = -Infinity;
	for (const [lat, lng] of boundary) {
		if (lat < minLat) minLat = lat;
		if (lat > maxLat) maxLat = lat;
		if (lng < minLng) minLng = lng;
		if (lng > maxLng) maxLng = lng;
	}
	return { minLat, maxLat, minLng, maxLng };
}

/**
 * Build a single tile's image overlay entry, or null when the tile has no
 * `tileImage` customization, no matching terrain asset, no resolvable url,
 * or a degenerate (< 3 vertex) boundary. Extracted from buildTileImageOverlays()
 * to keep that function's Cognitive Complexity manageable.
 */
async function buildTileImageOverlayForTile(
	h3Index: string,
	record: HexTileRecord,
	terrainLookup: Map<string, { moduleId: number; mimeType: string }>,
	textureAnchors: RootState['hexTextureConfig']['spriteAnchors'],
	currentHexTextureOpacity: number,
	loadAssetUrl: (cacheKey: string, moduleId: number, mimeType: string) => Promise<string | null>,
): Promise<TileImageOverlay | null> {
	if (!record.tileImage) return null;
	const terrainEntry = terrainLookup.get(record.tileImage);
	if (terrainEntry === undefined) return null;

	const url = await loadAssetUrl(`terrain:${record.tileImage}`, terrainEntry.moduleId, terrainEntry.mimeType);
	if (!url) return null;

	// Compute the bounding box of the hexagon in [lng, lat] GeoJSON order.
	const boundary = cellToBoundary(h3Index) as [number, number][]; // [[lat, lng], ...]
	if (boundary.length < 3) return null;

	const { minLat, maxLat, minLng, maxLng } = computeBoundaryBoundingBox(boundary);
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

	// Apply per-terrain anchor/scale overrides from hex texture config.
	const terrainOverride = textureAnchors[record.tileImage];
	const texAnchorX = terrainOverride?.anchorX ?? 0.5;
	const texAnchorY = terrainOverride?.anchorY ?? 0.5;
	const texScale = terrainOverride?.scaleMultiplier ?? 1.0;
	const bboxW = maxLng - minLng;
	const bboxH = maxLat - minLat;
	// Scale > 1 enlarges the image overlay so the hex clips a zoomed-in
	// portion of the texture (matching the HexFieldPreview behaviour).
	const scaledW = bboxW * texScale;
	const scaledH = bboxH * texScale;
	// Pin the anchor fraction of the image to the hex center.
	// This keeps the texture centred at scale 1 and lets the anchor
	// shift which part of the image is visible at other scales.
	// centerLng/centerLat are already computed above for the rotation calc.
	const adjMinLng = centerLng - texAnchorX * scaledW;
	const adjMaxLng = centerLng + (1 - texAnchorX) * scaledW;
	const adjMinLat = centerLat - texAnchorY * scaledH;
	const adjMaxLat = centerLat + (1 - texAnchorY) * scaledH;

	return {
		id: `tile-img-${h3Index}`,
		url,
		// MapLibre image source format: top-left, top-right, bottom-right, bottom-left
		coordinates: [
			[adjMinLng, adjMaxLat],
			[adjMaxLng, adjMaxLat],
			[adjMaxLng, adjMinLat],
			[adjMinLng, adjMinLat],
		],
		opacity: currentHexTextureOpacity,
		// Actual hex vertices in [lng, lat] for canvas polygon clipping.
		polygonCoords: boundary.map(([lat, lng]) => [lng, lat] as [number, number]),
		rotation,
	};
}

/**
 * Build the tile-image overlays (per customized hex tile) sent to the map as
 * MapLibre image sources, one per tile that has a `tileImage` customization.
 */
async function buildTileImageOverlays(
	records: Record<string, HexTileRecord>,
	textureAnchors: RootState['hexTextureConfig']['spriteAnchors'],
	currentHexTextureOpacity: number,
	loadAssetUrl: (cacheKey: string, moduleId: number, mimeType: string) => Promise<string | null>,
): Promise<TileImageOverlay[]> {
	// Flat lookup: terrain asset key → { moduleId, mimeType }
	const terrainLookup = new Map<string, { moduleId: number; mimeType: string }>();
	for (const assets of Object.values(TERRAIN_ASSETS)) {
		for (const entry of assets) {
			terrainLookup.set(entry.key, { moduleId: entry.source as number, mimeType: entry.mimeType ?? 'image/svg+xml' });
		}
	}

	const imageOverlays: TileImageOverlay[] = [];

	for (const [h3Index, record] of Object.entries(records)) {
		const overlay = await buildTileImageOverlayForTile(h3Index, record, terrainLookup, textureAnchors, currentHexTextureOpacity, loadAssetUrl);
		if (overlay) imageOverlays.push(overlay);
	}

	return imageOverlays;
}

type BillboardFeature = {
	type: 'Feature';
	geometry: { type: 'Point'; coordinates: [number, number] };
	properties: { iconKey: string; iconSizeAtRefZoom: number; anchorX: number; anchorY: number; flat: boolean };
};

type BillboardOverlaysResult = {
	images: Record<string, { url: string }>;
	features: BillboardFeature[];
};

/**
 * Build the billboard GeoJSON symbol-layer data (images + point features) sent
 * to the map: Hex Texture Adaptions (always flat) and Hex Objects (face-camera
 * by default, with legacy per-anchor flat flag support).
 *
 * Billboards are rendered as a MapLibre symbol layer whose icon-size is set to
 * a fixed value per feature. The zoom-based exponential expression in the
 * MapLibre HTML ensures the icon scales proportionally with the map so that
 * each billboard occupies a constant geographic area. Billboard size also
 * scales with the H3 edge length: larger on bigger hexagons, smaller on
 * smaller ones.
 *
 * Each unique billboard SVG is rasterized at 4× resolution (512×512 actual pixels
 * for a 128×128 logical icon) via canvas + pixelRatio, keeping SVGs crisp when
 * zoomed in or on high-DPI screens. Features carry an iconSizeAtRefZoom property
 * (= desiredPixelSize / BILLBOARD_STANDARD_ICON_SIZE at zoom 14) so the layer's
 * icon-size zoom expression scales it correctly at all zoom levels.
 * NOTE: Keep this value in sync with BILLBOARD_ICON_SIZE in the MapLibre HTML.
 */
/** Per-tile geometry shared by every billboard anchor resolved on that tile. */
type BillboardTileGeometry = {
	boundary: [number, number][];
	n: number;
	centerLng: number;
	centerLat: number;
	edgeLengthRatio: number;
};

/** External dependencies needed to resolve a billboard sprite's asset/url/size. */
type BillboardResolverDeps = {
	spriteAnchors: RootState['billboardConfig']['spriteAnchors'];
	billboardScaleRef: React.MutableRefObject<number>;
	loadAssetUrl: (cacheKey: string, moduleId: number, mimeType: string) => Promise<string | null>;
};

type ResolvedBillboardSprite = {
	iconKey: string;
	url: string;
	anchorX: number;
	anchorY: number;
	iconSizeAtRefZoom: number;
	lng: number;
	lat: number;
};

/**
 * Resolve the sprite/position/size data shared by Hex Texture Adaptions and Hex
 * Objects for one billboard anchor. Returns null when the billboard key can't be
 * parsed or its asset url can't be loaded. Billboard pixel size is determined by
 * the sprite's scaleFactor, the user-adjustable billboard scale multiplier, AND
 * the H3 edge length ratio relative to the reference resolution (10) — this
 * makes billboards larger on bigger hexagons and smaller on smaller ones.
 */
async function resolveBillboardSprite(
	anchorColor: string,
	billboardKey: string,
	geometry: BillboardTileGeometry,
	deps: BillboardResolverDeps,
): Promise<ResolvedBillboardSprite | null> {
	const parsed = parseBillboardKey(billboardKey);
	if (!parsed) return null;
	const { sprite, idx } = parsed;
	const url = await deps.loadAssetUrl(billboardKey, sprite.source as number, 'image/svg+xml');
	if (!url) return null;

	const { boundary, n, centerLng, centerLat, edgeLengthRatio } = geometry;
	const anchorOverride = deps.spriteAnchors[idx];
	const anchorX = anchorOverride?.anchorX ?? sprite.anchorX;
	const anchorY = anchorOverride?.anchorY ?? sprite.anchorY;
	const [lng, lat] = resolveAnchorPosition(anchorColor, boundary, n, centerLng, centerLat);
	const perSpriteScale = anchorOverride?.scaleMultiplier ?? 1.0;
	const billboardSizePx = Math.max(BILLBOARD_MIN_SIZE_PX, Math.round(
		BILLBOARD_UNIT_PX * sprite.scaleFactor * deps.billboardScaleRef.current * perSpriteScale * edgeLengthRatio,
	));
	const iconSizeAtRefZoom = billboardSizePx / BILLBOARD_STANDARD_ICON_SIZE;

	return { iconKey: `billboard-${billboardKey}`, url, anchorX, anchorY, iconSizeAtRefZoom, lng, lat };
}

/** Build one Hex Texture Adaption billboard feature (always flat, rotated by anchor angle). */
async function buildTextureAdaptionBillboardFeature(
	anchorColor: string,
	billboardKey: string,
	geometry: BillboardTileGeometry,
	deps: BillboardResolverDeps,
	currentHexTextureAdaptionOpacity: number,
	billboardImages: Record<string, { url: string }>,
): Promise<BillboardFeature | null> {
	const resolved = await resolveBillboardSprite(anchorColor, billboardKey, geometry, deps);
	if (!resolved) return null;

	if (!billboardImages[resolved.iconKey]) {
		billboardImages[resolved.iconKey] = { url: resolved.url };
	}
	// Hex Texture Adaptions are always flat and rotated by the position angle.
	const textureRotation = getAnchorAngleDeg(anchorColor);
	return {
		type: 'Feature',
		geometry: { type: 'Point', coordinates: [resolved.lng, resolved.lat] },
		properties: {
			iconKey: resolved.iconKey, iconSizeAtRefZoom: resolved.iconSizeAtRefZoom,
			anchorX: resolved.anchorX, anchorY: resolved.anchorY,
			flat: true, opacity: currentHexTextureAdaptionOpacity, textureRotation,
		},
	};
}

/** Build one Hex Object billboard feature (face-camera by default; legacy per-anchor flat flag respected). */
async function buildHexObjectBillboardFeature(
	anchorColor: string,
	billboardKey: string,
	geometry: BillboardTileGeometry,
	deps: BillboardResolverDeps,
	currentHexObjectOpacity: number,
	effectiveFlat: Record<string, boolean>,
	billboardImages: Record<string, { url: string }>,
): Promise<BillboardFeature | null> {
	const resolved = await resolveBillboardSprite(anchorColor, billboardKey, geometry, deps);
	if (!resolved) return null;

	// Hex Objects are face-camera by default; legacy per-anchor flat flag
	// is still respected for backward compatibility with existing data.
	const flat = effectiveFlat[anchorColor] === true;
	if (!billboardImages[resolved.iconKey]) {
		billboardImages[resolved.iconKey] = { url: resolved.url };
	}
	return {
		type: 'Feature',
		geometry: { type: 'Point', coordinates: [resolved.lng, resolved.lat] },
		properties: {
			iconKey: resolved.iconKey, iconSizeAtRefZoom: resolved.iconSizeAtRefZoom,
			anchorX: resolved.anchorX, anchorY: resolved.anchorY,
			flat, opacity: currentHexObjectOpacity,
		},
	};
}

/**
 * Build every billboard feature (Hex Texture Adaptions + Hex Objects) for one
 * tile, or an empty array if the tile has neither and/or has a degenerate boundary.
 */
async function collectTileBillboardFeatures(
	h3Index: string,
	record: HexTileRecord,
	deps: BillboardResolverDeps,
	currentHexTextureAdaptionOpacity: number,
	currentHexObjectOpacity: number,
	billboardImages: Record<string, { url: string }>,
): Promise<BillboardFeature[]> {
	// Build effective billboard maps for Hex Objects and Hex Texture Adaptions.
	const effectiveBillboards = getEffectiveBillboards(record);
	const effectiveBillboardsTexture = getEffectiveBillboardsTexture(record);
	// Per-anchor flat flags (legacy; used only for old `billboards` data).
	const effectiveFlat = getEffectiveBillboardsFlat(record);

	const hasBillboards = Object.keys(effectiveBillboards).length > 0;
	const hasTextureAdaptions = Object.keys(effectiveBillboardsTexture).length > 0;
	if (!hasBillboards && !hasTextureAdaptions) return [];

	// Compute hex boundary (centroid + vertices) once per tile.
	const boundary = cellToBoundary(h3Index, H3_GEOJSON_ORDER) as [number, number][]; // [[lng, lat], ...]
	const n = boundary.length - 1;
	if (n <= 0) return [];
	let sumLng = 0, sumLat = 0;
	for (let j = 0; j < n; j++) {
		const [bLng, bLat] = boundary[j];
		sumLng += bLng;
		sumLat += bLat;
	}
	const centerLng = sumLng / n;
	const centerLat = sumLat / n;

	// Size constants for this tile's resolution (shared across all anchors).
	const cellRes = getResolution(h3Index);
	const clampedRes = Math.max(0, Math.min(cellRes, H3_EDGE_LENGTH_KM.length - 1));
	const edgeLengthRatio = H3_EDGE_LENGTH_KM[clampedRes] / H3_EDGE_LENGTH_KM[BILLBOARD_REFERENCE_RESOLUTION];
	const geometry: BillboardTileGeometry = { boundary, n, centerLng, centerLat, edgeLengthRatio };

	const features: BillboardFeature[] = [];
	for (const [anchorColor, billboardKey] of Object.entries(effectiveBillboardsTexture)) {
		const feature = await buildTextureAdaptionBillboardFeature(
			anchorColor, billboardKey, geometry, deps, currentHexTextureAdaptionOpacity, billboardImages,
		);
		if (feature) features.push(feature);
	}
	for (const [anchorColor, billboardKey] of Object.entries(effectiveBillboards)) {
		const feature = await buildHexObjectBillboardFeature(
			anchorColor, billboardKey, geometry, deps, currentHexObjectOpacity, effectiveFlat, billboardImages,
		);
		if (feature) features.push(feature);
	}
	return features;
}

async function buildBillboardOverlays(
	records: Record<string, HexTileRecord>,
	spriteAnchors: RootState['billboardConfig']['spriteAnchors'],
	billboardScaleRef: React.MutableRefObject<number>,
	currentHexTextureAdaptionOpacity: number,
	currentHexObjectOpacity: number,
	loadAssetUrl: (cacheKey: string, moduleId: number, mimeType: string) => Promise<string | null>,
): Promise<BillboardOverlaysResult> {
	const billboardImages: Record<string, { url: string }> = {};
	const billboardFeatures: BillboardFeature[] = [];
	const deps: BillboardResolverDeps = { spriteAnchors, billboardScaleRef, loadAssetUrl };

	for (const [h3Index, record] of Object.entries(records)) {
		const features = await collectTileBillboardFeatures(
			h3Index, record, deps, currentHexTextureAdaptionOpacity, currentHexObjectOpacity, billboardImages,
		);
		billboardFeatures.push(...features);
	}

	return { images: billboardImages, features: billboardFeatures };
}

// ─── RecordScreen: handleMapMessage helpers ────────────────────────────────────

/** Handles the 'MapComponentMounted' map message: activates the hex tile
 * layer, resends the current route (if any) and player position, and
 * (re)sends the current tile/billboard customizations. */
function handleMapComponentMounted(
	mapRef: React.MutableRefObject<MyMapHandle | null>,
	routePointsRef: React.MutableRefObject<RoutePoint[]>,
	debugPlayerPositionRef: React.MutableRefObject<{ lat: number; lng: number } | null>,
	sendRouteToMap: (points: RoutePoint[]) => void,
	centerMapOnPosition: (pos: { lat: number; lng: number }, zoom?: number) => void,
	loadAndSendCustomizations: () => void,
): void {
	// Activate hex tile layer. strokeColor is intentionally omitted so that
	// the default gray value defined in hexTileScript.ts is preserved.
	const { hexLineOpacity: initHexLineOpacity, hexLineWidth: initHexLineWidth } = store.getState().displaySettings;
	mapRef.current?.sendToMap({
		hexTileLayer: { color: 'rgba(0, 0, 0, 0)', opacityMax: 0, lineOpacity: initHexLineOpacity, lineWidth: initHexLineWidth },
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
}

/** Handles the 'MapViewportChanged' map message: shows the selected route's
 * preview tiles/walk-path when a route is selected pre-recording, otherwise
 * refreshes the normal (global) tile display for the new viewport. */
function handleMapViewportChanged(
	vp: { bounds: ViewportBounds; zoom: number },
	selectedRouteRef: React.MutableRefObject<SavedRoute | null>,
	isRecordingRef: React.MutableRefObject<boolean>,
	debugViewportRef: React.MutableRefObject<DebugViewportInfo | null>,
	mapRef: React.MutableRefObject<MyMapHandle | null>,
	refreshNormalTileDisplay: (vp: { bounds: ViewportBounds; zoom: number }) => void,
): void {
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
}

/** Handles the 'HexTileClicked' map message: dispatches to whichever click
 * mode (set-home, coloring, magnify, or default tile-info) is currently active. */
function handleHexTileClicked(options: {
	clickedMsg: { h3Index?: string; mapFeatures?: MapFeatureInfo[] };
	isSettingHomeRef: React.MutableRefObject<boolean>;
	setIsSettingHome: (val: boolean) => void;
	coloringTileImageRef: React.MutableRefObject<string | null>;
	isMagnifyModeRef: React.MutableRefObject<boolean>;
	showMagnifyHexTileModal: (h3Index: string) => void;
	showHexTileModal: (h3Index: string) => void;
	dispatch: AppDispatch;
}): void {
	const {
		clickedMsg, isSettingHomeRef, setIsSettingHome, coloringTileImageRef,
		isMagnifyModeRef, showMagnifyHexTileModal, showHexTileModal, dispatch,
	} = options;
	if (clickedMsg.h3Index) {
		if (isSettingHomeRef.current) {
			// Set-home mode: place castle2 at the center of the selected tile
			// and store it as the player's home.
			const newHomeHex = clickedMsg.h3Index;
			dispatch(setBillboardAtAnchor({
				h3Index: newHomeHex,
				anchorColor: BillboardAnchorPosition.CENTER,
				billboard: BILLBOARD_CASTLE2_KEY,
			}));
			dispatch(setHomeHexTile(newHomeHex));
			isSettingHomeRef.current = false;
			setIsSettingHome(false);
		} else if (coloringTileImageRef.current !== null) {
			// Coloring mode active: directly apply the selected tile image.
			dispatch(setHexTileCustomization({ h3Index: clickedMsg.h3Index, tileImage: coloringTileImageRef.current }));
		} else if (isMagnifyModeRef.current) {
			// Magnify mode active: show detailed map info modal.
			showMagnifyHexTileModal(clickedMsg.h3Index);
		} else {
			showHexTileModal(clickedMsg.h3Index);
		}
	}
}

/** Handles the 'MapMeasurePoint' map message: appends the tapped point to the
 * in-progress measure route while measure mode is active. */
function handleMapMeasurePoint(
	ptMsg: { lat: number; lng: number },
	isMeasureModeRef: React.MutableRefObject<boolean>,
	measureWaypointsRef: React.MutableRefObject<Array<{ lat: number; lng: number }>>,
	mapRef: React.MutableRefObject<MyMapHandle | null>,
): void {
	if (isMeasureModeRef.current) {
		const newWaypoints = [...measureWaypointsRef.current, { lat: ptMsg.lat, lng: ptMsg.lng }];
		measureWaypointsRef.current = newWaypoints;
		const coords = newWaypoints.map((w) => [w.lng, w.lat]);
		mapRef.current?.sendToMap({ measureRouteCoords: coords });
		mapRef.current?.sendToMap({ measurePoints: coords });
	}
}

// ─── RecordScreen: handleLocationUpdate helpers ────────────────────────────────

/**
 * GPS speed/interval filter applied to real (non-joystick) GPS fixes.
 * Returns true when the point should be discarded as noise/glitch/too-frequent;
 * otherwise records it as the last accepted GPS point (matching the original
 * inline behaviour) and returns false.
 */
function maybeFilterGpsPoint(
	fromJoystick: boolean,
	point: RoutePoint,
	isRecordingRef: React.MutableRefObject<boolean>,
	joystickActiveRef: React.MutableRefObject<boolean>,
	movedPlayerManuallyRef: React.MutableRefObject<boolean>,
	lastAcceptedGpsPointRef: React.MutableRefObject<RoutePoint | null>,
	selectedSportTypeRef: React.MutableRefObject<SportType>,
): boolean {
	if (fromJoystick) return false;

	// While the joystick is actively held during a recording, skip GPS
	// route points entirely. The joystick is providing the authoritative
	// position; adding a real GPS fix would create a visible jump in the
	// recorded route from the virtual joystick position back to the
	// physical GPS location.
	if (isRecordingRef.current && (joystickActiveRef.current || movedPlayerManuallyRef.current)) {
		return true;
	}

	const lastAccepted = lastAcceptedGpsPointRef.current;
	if (lastAccepted) {
		const dtSec = (point.timestamp - lastAccepted.timestamp) / 1000;

		// ── GPS time-interval filter ──────────────────────────────────────────
		// During recording, skip this point if the elapsed time since the last
		// accepted GPS fix is less than 95 % of the configured GPS interval.
		// This prevents the platform from delivering points more frequently than
		// the user-selected accuracy setting, which would result in too many
		// recorded GPS points.
		if (isRecordingRef.current) {
			const gpsIntervalSeconds = store.getState().gpsInterval.intervalSeconds;
			const minElapsedSec = gpsIntervalSeconds * 0.95;
			if (dtSec < minElapsedSec) {
				return true;
			}
		}

		if (dtSec > 0) {
			const distKm = haversineKm(lastAccepted.lat, lastAccepted.lng, point.lat, point.lng);
			const impliedSpeedKmh = (distKm / dtSec) * 3600;
			const activeSportDef = SPORT_TYPES.find((s) => s.type === selectedSportTypeRef.current);
			const maxSpeedKmh = activeSportDef?.maxSpeedKmh ?? 250;
			if (impliedSpeedKmh > maxSpeedKmh) {
				console.warn(
					`[RecordScreen] GPS point filtered: implied speed ${impliedSpeedKmh.toFixed(1)} km/h` +
					` exceeds max ${maxSpeedKmh} km/h for sport "${selectedSportTypeRef.current}".`,
				);
				return true;
			}
		}
	}
	lastAcceptedGpsPointRef.current = point;
	return false;
}

/** Marks a single H3 cell as visited (if not already) and dispatches markVisited. */
function markHexCellVisited(
	cell: string,
	visitedHexIdsRef: React.MutableRefObject<Set<string>>,
	orderedHexTilesRef: React.MutableRefObject<string[]>,
	dispatch: AppDispatch,
	timestamp: number,
): void {
	if (visitedHexIdsRef.current.has(cell)) return;
	visitedHexIdsRef.current.add(cell);
	orderedHexTilesRef.current.push(cell);
	dispatch(markVisited({ h3Indices: [cell], timestamp }));
}

/**
 * Fill in all H3 cells on the straight-line path between lastCell and cell (GPS
 * gap interpolation), marking newly-visited intermediate cells and dispatching
 * their walked edges. This handles GPS dropouts where the device had no signal
 * for several updates: tiles the user actually passed through are still
 * counted as visited. Only fills when the gap is within a reasonable bound
 * (GPS_PATH_INTERPOLATION_MAX_CELLS) to avoid marking thousands of tiles on a
 * very long GPS outage.
 */
function fillHexGapCells(
	lastCell: string,
	cell: string,
	visitedHexIdsRef: React.MutableRefObject<Set<string>>,
	orderedHexTilesRef: React.MutableRefObject<string[]>,
	dispatch: AppDispatch,
	timestamp: number,
): void {
	try {
		const pathCells = gridPathCells(lastCell, cell);
		// pathCells[0] is lastCell (already visited), pathCells[last] is `cell`
		// (processed separately by the caller). pathCells.length - 2 is the number
		// of intermediate cells (excludes first and last).
		if (pathCells.length - 2 > GPS_PATH_INTERPOLATION_MAX_CELLS) return;

		const newEdges: string[] = [];
		for (let i = 0; i < pathCells.length - 1; i++) {
			const a = pathCells[i];
			const b = pathCells[i + 1];
			newEdges.push(a < b ? `${a}:${b}` : `${b}:${a}`);
			if (i > 0) {
				// Intermediate cell (not pathCells[0] which is lastCell, already visited)
				markHexCellVisited(pathCells[i], visitedHexIdsRef, orderedHexTilesRef, dispatch, timestamp);
			}
		}
		if (newEdges.length > 0) {
			dispatch(addWalkedEdges(newEdges));
		}
	} catch (pathErr) {
		// gridPathCells can throw when the two cells are on different
		// icosahedron faces – log at warn level for diagnosability and continue.
		console.warn('[RecordScreen] gridPathCells failed during gap interpolation:', pathErr);
	}
}

/**
 * Computes the walked edge(s) between the last and new red-line cell, falling
 * back to a single direct edge if gridPathCells throws (different icosahedron faces).
 */
function computeRedLineEdges(lastRedLineCell: string, redLineCell: string): string[] {
	try {
		const redLinePathCells = gridPathCells(lastRedLineCell, redLineCell);
		if (redLinePathCells.length - 2 > GPS_PATH_INTERPOLATION_MAX_CELLS) {
			return [];
		}
		const edges: string[] = [];
		for (let i = 0; i < redLinePathCells.length - 1; i++) {
			const a = redLinePathCells[i];
			const b = redLinePathCells[i + 1];
			edges.push(a < b ? `${a}:${b}` : `${b}:${a}`);
		}
		return edges;
	} catch {
		return [lastRedLineCell < redLineCell ? `${lastRedLineCell}:${redLineCell}` : `${redLineCell}:${lastRedLineCell}`];
	}
}

/** Tracks the finer red-line cell transition for the red walk-path line, dispatching its walked edge(s). */
function trackRedLineWalkEdge(
	point: RoutePoint,
	lastRedLineCellRef: React.MutableRefObject<string | null>,
	dispatch: AppDispatch,
): void {
	try {
		const redLineCell = latLngToCell(point.lat, point.lng, RED_LINE_GRID_RESOLUTION);
		if (!redLineCell || redLineCell === lastRedLineCellRef.current) return;

		if (lastRedLineCellRef.current) {
			const newRedLineEdges = computeRedLineEdges(lastRedLineCellRef.current, redLineCell);
			if (newRedLineEdges.length > 0) {
				dispatch(addWalkedEdgesRedLine(newRedLineEdges));
			}
		}
		lastRedLineCellRef.current = redLineCell;
	} catch {
		// latLngToCell can throw for invalid coordinates; skip silently
	}
}

/** Tracks the H3 cell (and finer red-line cell) visited by this GPS/joystick
 * point: fills in gap cells across GPS dropouts, dispatches markVisited for
 * newly-visited cells, and records walked edges for both the standard and
 * red-line resolutions. */
function trackVisitedHexCells(
	point: RoutePoint,
	h3ResolutionRef: React.MutableRefObject<number>,
	lastCellRef: React.MutableRefObject<string | null>,
	visitedHexIdsRef: React.MutableRefObject<Set<string>>,
	orderedHexTilesRef: React.MutableRefObject<string[]>,
	lastRedLineCellRef: React.MutableRefObject<string | null>,
	dispatch: AppDispatch,
): void {
	if (!isH3Available()) return;
	try {
		// Use the same base integer resolution as buildH3GeoJson so that the
		// visited cell ID matches the keys in the GeoJSON and the Redux records.
		// For fractional resolutions (e.g. 10.5) buildH3GeoJson uses Math.floor
		// as the base and subdivides into children; visits are tracked at the base
		// (parent) resolution so the colour update propagates to all sub-tiles.
		const h3Res = Math.max(H3_RESOLUTION_MIN, Math.min(H3_RESOLUTION_MAX, Math.floor(h3ResolutionRef.current)));
		const cell = latLngToCell(point.lat, point.lng, h3Res);
		if (!cell) return;

		// ── GPS gap interpolation ─────────────────────────────────────────
		// When moving from lastCellRef to the new cell, fill in all H3 cells
		// on the straight-line path between them.
		if (lastCellRef.current && cell !== lastCellRef.current) {
			fillHexGapCells(lastCellRef.current, cell, visitedHexIdsRef, orderedHexTilesRef, dispatch, point.timestamp);
		}

		// Only count each tile once per run so the level can rise by at most
		// one step during a single activity.
		markHexCellVisited(cell, visitedHexIdsRef, orderedHexTilesRef, dispatch, point.timestamp);
		if (cell !== lastCellRef.current) {
			lastCellRef.current = cell;
		}

		// ── Red-line walk-path edge tracking ────────────────────────────────
		// Track finer red-line cell transitions for the red walk-path line.
		trackRedLineWalkEdge(point, lastRedLineCellRef, dispatch);
	} catch (err) {
		console.warn('[RecordScreen] latLngToCell failed for visited hex tracking:', err);
	}
}

/** Speaks a TTS announcement, swallowing and logging (rather than throwing) any error. */
function trySpeakAnnouncement(
	text: string,
	langCode: string,
	options: Parameters<typeof speakAnnouncement>[2],
	source: string,
	logContext: string,
): void {
	try {
		speakAnnouncement(text, langCode, options, source);
	} catch (err) {
		console.warn(`[RecordScreen] ${logContext} failed:`, err);
	}
}

/** Announces a whole-km distance milestone via TTS when the runner crosses one
 * during this update, respecting the user's speech settings. */
function announceKmMilestoneIfNeeded(
	liveDistanceKm: number,
	speechSettingsRef: React.MutableRefObject<SpeechSettingsState>,
	lastAnnouncedKmRef: React.MutableRefObject<number>,
	startTimeRef: React.MutableRefObject<number>,
	accumulatedSecondsRef: React.MutableRefObject<number>,
): void {
	if (!speechSettingsRef.current.enabled) return;
	const crossedKm = Math.floor(liveDistanceKm);
	if (crossedKm > 0 && crossedKm > lastAnnouncedKmRef.current) {
		lastAnnouncedKmRef.current = crossedKm;
		const elapsedSec = startTimeRef.current > 0
				? (Date.now() - startTimeRef.current) / 1000 + accumulatedSecondsRef.current
				: accumulatedSecondsRef.current;
		const paceMinPerKm = elapsedSec > 0 && liveDistanceKm > 0 ? elapsedSec / 60 / liveDistanceKm : null;
		const locale = getLocales()[0]?.languageTag ?? 'en-US';
		const langCode = locale.split('-')[0].toLowerCase();
		const curSs = speechSettingsRef.current;
		const text = buildKmAnnouncement(crossedKm, paceMinPerKm, locale, {
			announcePace: curSs.announcePace,
			announceSpeedKmh: curSs.announceSpeed,
		});
		trySpeakAnnouncement(text, langCode, { rate: speechRateToNumber(curSs.speechRate) }, 'km_milestone', 'Km milestone announcement');
	}
}

/** Instantaneous pace (min/km) from GPS speed, or average pace as a fallback when GPS speed is unavailable/too low. */
function computeCurrentPaceMinPerKm(point: RoutePoint, elapsedSec: number, liveDistanceKm: number): number | null {
	if (point.speed != null && point.speed > 0.5) {
		return 1000 / (point.speed * 60); // instantaneous pace: min/km from m/s
	}
	if (elapsedSec > 0) {
		return elapsedSec / 60 / liveDistanceKm; // average fallback
	}
	return null;
}

/** Determines the pace-hint state for the current pace. Lower pace value = faster running. */
function computePaceHintState(
	currentPace: number,
	fasterBound: number,
	slowerBound: number,
	paceHintFasterEnabled: boolean,
	paceHintSlowerEnabled: boolean,
): PaceHintState {
	if (paceHintFasterEnabled && currentPace < fasterBound) return 'too_fast';
	if (paceHintSlowerEnabled && currentPace > slowerBound) return 'too_slow';
	return 'on_target';
}

/** Speaks the "too fast"/"too slow" transition announcement (only on transition from on_target, respecting the cooldown). */
function announcePaceHintTransitionIfDue(options: {
	next: PaceHintState;
	prev: PaceHintState;
	currentPace: number;
	targetPace: number;
	curSs: SpeechSettingsState;
	locale: string;
	langCode: string;
	lastPaceHintTimeRef: React.MutableRefObject<number>;
	paceHintCooldownMs: number;
}): void {
	const {
		next, prev, currentPace, targetPace, curSs, locale, langCode, lastPaceHintTimeRef, paceHintCooldownMs,
	} = options;
	const now = Date.now();
	if (next === 'on_target' || prev !== 'on_target' || now - lastPaceHintTimeRef.current < paceHintCooldownMs) return;

	const text = buildPaceHintAnnouncement(next, currentPace, targetPace, locale);
	trySpeakAnnouncement(text, langCode, {
		volume: curSs.volume,
		rate: speechRateToNumber(curSs.speechRate),
		useApplicationAudioSession: curSs.duckMusicDuringTTS,
	}, 'pace_hint', 'Pace hint announcement');
	lastPaceHintTimeRef.current = now;
}

/** Speaks the "Zielgeschwindigkeit erreicht" announcement when returning to on_target after a warning state. */
function announceOnTargetIfDue(next: PaceHintState, prev: PaceHintState, curSs: SpeechSettingsState, locale: string, langCode: string): void {
	if (next !== 'on_target' || prev === 'on_target') return;
	const text = buildOnTargetAnnouncement(locale);
	trySpeakAnnouncement(text, langCode, {
		volume: curSs.volume,
		rate: speechRateToNumber(curSs.speechRate),
		useApplicationAudioSession: curSs.duckMusicDuringTTS,
	}, 'pace_hint_on_target', 'On-target announcement');
}

/** Evaluates and (if needed) speaks a pace-hint transition announcement
 * ("too fast" / "too slow" / back to on-target), with hysteresis thresholds
 * and a cooldown between announcements. */
function evaluatePaceHintAnnouncement(options: {
	point: RoutePoint;
	liveDistanceKm: number;
	speechSettingsRef: React.MutableRefObject<SpeechSettingsState>;
	startTimeRef: React.MutableRefObject<number>;
	accumulatedSecondsRef: React.MutableRefObject<number>;
	paceHintStateRef: React.MutableRefObject<PaceHintState>;
	lastPaceHintTimeRef: React.MutableRefObject<number>;
	paceHintCooldownMs: number;
}): void {
	const {
		point, liveDistanceKm, speechSettingsRef, startTimeRef, accumulatedSecondsRef,
		paceHintStateRef, lastPaceHintTimeRef, paceHintCooldownMs,
	} = options;

	if (!speechSettingsRef.current.enabled || liveDistanceKm <= 0) return;
	const curSs = speechSettingsRef.current;
	if (!curSs.paceTargetEnabled) return;

	// Use instantaneous GPS speed for comparison so the hint reflects
	// the runner's current speed rather than the session average.
	// Fall back to the average pace when GPS speed is unavailable.
	const elapsedSec = startTimeRef.current > 0
		? (Date.now() - startTimeRef.current) / 1000 + accumulatedSecondsRef.current
		: accumulatedSecondsRef.current;
	const currentPace = computeCurrentPaceMinPerKm(point, elapsedSec, liveDistanceKm);
	if (currentPace == null) return;

	const targetPace = curSs.paceTargetMinutes + curSs.paceTargetSeconds / 60;
	const fasterThreshold = curSs.paceHintFasterMinutes + curSs.paceHintFasterSeconds / 60;
	const slowerThreshold = curSs.paceHintSlowerMinutes + curSs.paceHintSlowerSeconds / 60;

	// Lower pace value = faster running.  Thresholds are subtracted/added
	// from the target to define the acceptable range boundaries.
	const fasterBound = targetPace - fasterThreshold;
	const slowerBound = targetPace + slowerThreshold;

	const prev = paceHintStateRef.current;
	const next = computePaceHintState(currentPace, fasterBound, slowerBound, curSs.paceHintFasterEnabled, curSs.paceHintSlowerEnabled);

	const locale = getLocales()[0]?.languageTag ?? 'en-US';
	const langCode = locale.split('-')[0].toLowerCase();

	// Announce "too fast" / "too slow" only on transition from on_target.
	announcePaceHintTransitionIfDue({
		next, prev, currentPace, targetPace, curSs, locale, langCode, lastPaceHintTimeRef, paceHintCooldownMs,
	});

	// Announce "Zielgeschwindigkeit erreicht" when returning to on_target after a warning state.
	announceOnTargetIfDue(next, prev, curSs, locale, langCode);

	paceHintStateRef.current = next;
}

/** Persists a recording snapshot for crash recovery, throttled to at most once
 * every 10 seconds while actively (non-paused) recording. */
function persistRecordingSnapshotIfDue(options: {
	isRecordingRef: React.MutableRefObject<boolean>;
	isPausedRef: React.MutableRefObject<boolean>;
	lastSnapshotSaveRef: React.MutableRefObject<number>;
	startTimeRef: React.MutableRefObject<number>;
	accumulatedSecondsRef: React.MutableRefObject<number>;
	routePointsRef: React.MutableRefObject<RoutePoint[]>;
	orderedHexTilesRef: React.MutableRefObject<string[]>;
	h3ResolutionRef: React.MutableRefObject<number>;
	selectedSportTypeRef: React.MutableRefObject<SportType>;
	selectedRouteRef: React.MutableRefObject<SavedRoute | null>;
}): void {
	const {
		isRecordingRef, isPausedRef, lastSnapshotSaveRef, startTimeRef, accumulatedSecondsRef,
		routePointsRef, orderedHexTilesRef, h3ResolutionRef, selectedSportTypeRef, selectedRouteRef,
	} = options;
	if (isRecordingRef.current && !isPausedRef.current) {
		const now = Date.now();
		// Save a snapshot at most every 10 seconds to limit I/O.
		if (now - lastSnapshotSaveRef.current >= 10_000) {
			lastSnapshotSaveRef.current = now;
			saveRecordingSnapshot({
				startedAt: startTimeRef.current,
				accumulatedSeconds: accumulatedSecondsRef.current,
				segmentStart: startTimeRef.current,
				routePoints: routePointsRef.current,
				hexTilesOrdered: orderedHexTilesRef.current,
				h3Resolution: Math.floor(h3ResolutionRef.current),
				sportType: selectedSportTypeRef.current,
				routeId: selectedRouteRef.current?.id ?? null,
				savedAt: now,
			});
		}
	}
}

// ─── RecordScreen: render helpers ──────────────────────────────────────────────

/** Home button icon color: white while placing home, green when a home tile is set. */
function resolveHomeButtonIconColor(isSettingHome: boolean, homeHexTile: string | null): string {
	if (isSettingHome) return '#ffffff';
	if (homeHexTile !== null) return STATUS_SUCCESS_COLOR;
	return '#555555';
}

/** Central record button action: start when idle, resume when paused, otherwise pause. */
function resolveRecordButtonAction(
	isRecording: boolean,
	isPaused: boolean,
	pauseRecording: () => void,
	handleRecordButtonPress: () => Promise<void>,
	resumeRecording: () => void,
): () => void | Promise<void> {
	if (!isRecording) return handleRecordButtonPress;
	if (isPaused) return resumeRecording;
	return pauseRecording;
}

type MapOverlayButtonsProps = Readonly<{
	mapRef: React.MutableRefObject<MyMapHandle | null>;
	isHeadingMode: boolean;
	handleCompassPress: () => void;
	isFollowing: boolean;
	setFollowMode: (val: boolean) => void;
	movedPlayerManuallyRef: React.MutableRefObject<boolean>;
	isRecording: boolean;
	isSettingHome: boolean;
	homeHexTile: string | null;
	homeButtonIconColor: string;
	isSettingHomeRef: React.MutableRefObject<boolean>;
	setIsSettingHome: (val: boolean) => void;
	searchState: RootState['mapSearch']['searchState'];
	openSearchModal: () => Promise<void>;
	isDebugMode: boolean;
	coloringTileImage: string | null;
	openColoringModal: () => void;
	isMeasureMode: boolean;
	cancelMeasureMode: () => void;
	startMeasureMode: () => void;
	showDebugModal: () => void;
	finishMeasurement: () => Promise<void>;
	undoMeasurePoint: () => void;
}>;

/** Top-right map overlay button cluster: compass, locate-me, set-home, search,
 * and (in debug mode) coloring / measure / debug-menu / measure-confirm buttons. */
function MapOverlayButtons({
	mapRef,
	isHeadingMode,
	handleCompassPress,
	isFollowing,
	setFollowMode,
	movedPlayerManuallyRef,
	isRecording,
	isSettingHome,
	homeHexTile,
	homeButtonIconColor,
	isSettingHomeRef,
	setIsSettingHome,
	searchState,
	openSearchModal,
	isDebugMode,
	coloringTileImage,
	openColoringModal,
	isMeasureMode,
	cancelMeasureMode,
	startMeasureMode,
	showDebugModal,
	finishMeasurement,
	undoMeasurePoint,
}: MapOverlayButtonsProps) {
	return (
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
			{/* Set Home button – always visible when not recording */}
			{!isRecording && (
				<>
					<TouchableOpacity
						style={[
							styles.debugButton,
							isSettingHome && { backgroundColor: STATUS_WARNING_COLOR },
							!isSettingHome && homeHexTile !== null && { backgroundColor: STATUS_SUCCESS_COLOR + '22' },
						]}
						onPress={() => {
							if (!isSettingHome && homeHexTile !== null) {
								const [lat, lng] = cellToLatLng(homeHexTile);
								mapRef.current?.sendToMap({
									mapCenterPosition: { lat, lng },
									zoom: 17,
								});
							} else {
								isSettingHomeRef.current = !isSettingHome;
								setIsSettingHome(!isSettingHome);
							}
						}}
						activeOpacity={0.8}
					>
						<MaterialIcons
							name="home"
							size={20}
							color={homeButtonIconColor}
						/>
					</TouchableOpacity>
					<View style={styles.buttonSpacer} />
				</>
			)}
			{/* Search highlight button – always visible in RecordScreen */}
			<TouchableOpacity
				style={[
					styles.debugButton,
					searchState !== null && searchState.enabledKeys.length > 0 && { backgroundColor: '#ef4444' },
				]}
				onPress={() => { void openSearchModal(); }}
				activeOpacity={0.8}
			>
				<MaterialIcons
					name="search"
					size={20}
					color={searchState !== null && searchState.enabledKeys.length > 0 ? '#ffffff' : '#555555'}
				/>
			</TouchableOpacity>
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
					<TouchableOpacity
						style={styles.debugButton}
						onPress={showDebugModal}
						activeOpacity={0.8}
					>
						<MaterialIcons name="bug-report" size={20} color="#555555" />
					</TouchableOpacity>
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
	);
}

type LiveControlPanelProps = Readonly<{
	isPanelCollapsed: boolean;
	setIsPanelCollapsed: (val: boolean) => void;
	theme: ReturnType<typeof useTheme>['theme'];
	isRecording: boolean;
	liveDistanceValue: string;
	liveDistanceKm: number;
	livePaceMinPerKm: number | null;
	liveAvgSpeedKmh: number;
	selectedRoute: SavedRoute | null;
	setSelectedRoute: (route: SavedRoute | null) => void;
	isDebugMode: boolean;
	debugReplayActivity: SavedActivity | null;
	setDebugReplayActivity: (activity: SavedActivity | null) => void;
	stopRecording: () => Promise<void>;
	activeSport: SportTypeDefinition;
	showActivityTypeModal: () => void;
	recordButtonColor: string;
	recordButtonAction: () => void | Promise<void>;
	recordButtonIcon: 'play-arrow' | 'pause';
	showRouteSelectionModal: () => Promise<void>;
}>;

/** Bottom control panel: live stats row, selected-route/replay indicators, and
 * the stop/record-pause/route-picker controls row. Collapses to just a chevron
 * while recording if the user collapses it. */
function LiveControlPanel({
	isPanelCollapsed,
	setIsPanelCollapsed,
	theme,
	isRecording,
	liveDistanceValue,
	liveDistanceKm,
	livePaceMinPerKm,
	liveAvgSpeedKmh,
	selectedRoute,
	setSelectedRoute,
	isDebugMode,
	debugReplayActivity,
	setDebugReplayActivity,
	stopRecording,
	activeSport,
	showActivityTypeModal,
	recordButtonColor,
	recordButtonAction,
	recordButtonIcon,
	showRouteSelectionModal,
}: LiveControlPanelProps) {
	return (
		<View style={[styles.liveBar, { backgroundColor: theme.screen.background }]}>
			{isPanelCollapsed && (
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
			)}
			{!isPanelCollapsed && (
				<>
					{/* Stats row */}
					<View style={styles.liveBarStatsRow}>
						<View style={styles.liveStatCard}>
							<MaterialIcons name="straighten" size={20} color={PRIMARY_COLOR} />
							<Text style={[styles.liveStatBigValue, { color: theme.screen.text }]}>
								{isRecording ? liveDistanceValue : '--'}
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

					{/* Debug replay indicator (shown in debug mode before recording starts) */}
					{isDebugMode && !isRecording && debugReplayActivity && (
						<View style={styles.selectedRouteRow}>
							<MaterialIcons name="replay" size={14} color="#f97316" />
							<Text style={[styles.selectedRouteText, { color: '#f97316' }]} numberOfLines={1}>
								{'🔄 Replay: ' + new Date(debugReplayActivity.startedAt).toLocaleDateString() + ' ' + new Date(debugReplayActivity.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
							</Text>
							<TouchableOpacity onPress={() => setDebugReplayActivity(null)} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
								<MaterialIcons name="close" size={16} color={theme.screen.icon} />
							</TouchableOpacity>
						</View>
					)}


					{/* Controls row: [stop?] [record/pause – centred] [chevron-down] */}
					<View style={styles.liveBarControlsRow}>
						{/* Left side: stop button when recording, activity type picker otherwise */}
						<View style={styles.liveBarSideSlot}>
							{isRecording && (
								<TouchableOpacity
									style={[styles.stopButton, { backgroundColor: '#e53935' }]}
									onPress={stopRecording}
									activeOpacity={0.8}
								>
									<MaterialIcons name="stop" size={32} color="white" />
								</TouchableOpacity>
							)}
							{!isRecording && (
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
								{ backgroundColor: recordButtonColor },
							]}
							onPress={recordButtonAction}
							activeOpacity={0.8}
						>
							<MaterialIcons
								name={recordButtonIcon}
								size={32}
								color="white"
							/>
						</TouchableOpacity>

						{/* Chevron-down collapse button – right side */}
						<View style={styles.liveBarSideSlot}>
							{!isRecording && (
								<TouchableOpacity
									style={[styles.routeButton, selectedRoute ? { backgroundColor: PRIMARY_COLOR + '22' } : {}]}
									onPress={showRouteSelectionModal}
									activeOpacity={0.8}
								>
									<MaterialIcons name="route" size={24} color={selectedRoute ? PRIMARY_COLOR : theme.screen.icon} />
								</TouchableOpacity>
							)}
							{isRecording && (
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
	);
}

export default function RecordScreen() {
	const { theme } = useTheme();
	const { show: showModal, close: closeModal } = useMyScrollViewModal();
	const { show: showColoringModal, close: closeColoringModal } = useMyScrollViewModal();
	const { show: showRouteModal, close: closeRouteModal } = useMyScrollViewModal();
	const { show: showMagnifyModal, close: closeMagnifyModal } = useMyScrollViewModal();
	const { show: showRecoveryModal, close: closeRecoveryModal } = useMyScrollViewModal();
	const { show: showSearchModal, close: closeSearchModal } = useMyScrollViewModal();
	const { show: showDebugReplayModal, close: closeDebugReplayModal } = useMyScrollViewModal();
	const { showAlert } = useGeonexiaAlert();
	const navigation = useNavigation();
	const router = useRouter();
	const [osmConsent, setOsmConsent] = useState(false);
	const mapRef = useRef<MyMapHandle>(null);

	// Redux selectors
	const resetToken = useSelector((state: RootState) => state.hexTiles.resetToken);
	const selectedSportType = useSelector((state: RootState) => state.sportType.selectedType);
	const hexTileRecords = useSelector((state: RootState) => state.hexTiles.records);
	const isDebugMode = useDebugMode();
	const announceAppInBackground = useSelector((state: RootState) => state.speechSettings.announceAppInBackground);
	const speechSettings = useSelector((state: RootState) => state.speechSettings);
	const hexTextureOpacity = useSelector((state: RootState) => state.displaySettings.hexTextureOpacity);
	const hexTextureAdaptionOpacity = useSelector((state: RootState) => state.displaySettings.hexTextureAdaptionOpacity);
	const hexObjectOpacity = useSelector((state: RootState) => state.displaySettings.hexObjectOpacity);
	const mapTheme = useSelector((state: RootState) => state.displaySettings.mapTheme);
	const hexLineOpacity = useSelector((state: RootState) => state.displaySettings.hexLineOpacity);
	const hexLineWidth = useSelector((state: RootState) => state.displaySettings.hexLineWidth);
	const activeTileCount = useSelector((state: RootState) =>
		Object.values(state.hexTiles.records).filter((r) => r.level > 0).length,
	);
	const homeHexTile = useSelector((state: RootState) => state.playerInformation.homeHexTile);
	const searchState = useSelector((state: RootState) => state.mapSearch.searchState);
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
	const isMagnifyModeRef = useRef(false);

	// Search highlight (debug only): track viewport cells and cached features for red-border overlay
	const currentViewportCellsRef = useRef<string[]>([]);
	const searchFeatureCacheRef = useRef<Map<string, MapFeatureInfo[]>>(new Map());
	const searchHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// TTS: track the last whole-km milestone announced to avoid repeating.
	// Reset to 0 when recording starts.
	const lastAnnouncedKmRef = useRef(0);
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

	// Debug replay: selected activity to replay instead of using real GPS (debug mode only).
	const [debugReplayActivity, setDebugReplayActivity] = useState<SavedActivity | null>(null);
	const debugReplayActivityRef = useRef<SavedActivity | null>(null);
	debugReplayActivityRef.current = debugReplayActivity;
	// Timeout handles for the replay ticker – cleared when recording stops.
	const debugReplayTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

	// Coloring tool state:
	// - coloringTileImage: the currently selected tile key; null means coloring mode is off.
	// - coloringTileImageRef: ref copy for use in map message callbacks (avoids stale closures).
	// - coloringSelectionMadeRef: tracks whether the user made a selection in the modal,
	//   used to distinguish "closed by selection" vs "dismissed without selection".
	const [coloringTileImage, setColoringTileImage] = useState<string | null>(null);
	const coloringTileImageRef = useRef<string | null>(null);
	const coloringSelectionMadeRef = useRef(false);
	coloringTileImageRef.current = coloringTileImage;

	// Set-home mode: when active, the next hex tile tap sets that tile as the player's home.
	const [isSettingHome, setIsSettingHome] = useState(false);
	const isSettingHomeRef = useRef(false);
	isSettingHomeRef.current = isSettingHome;

	// Debug: last viewport info for the debug modal (ref avoids stale closure issues).
	const debugViewportRef = useRef<DebugViewportInfo | null>(null);

	// H3 grid settings (refs for synchronous access in callbacks)
	const showGridAlwaysRef = useRef(false);
	const [showGridAlways, setShowGridAlways] = useState(false); // NOSONAR: showGridAlways is currently unused; remove this comment once it is used
	const h3ResolutionRef = useRef(H3_DEFAULT_RESOLUTION);
	const [h3Resolution, setH3Resolution] = useState(H3_DEFAULT_RESOLUTION); // NOSONAR: h3Resolution is currently unused; remove this comment once it is used
	const h3MinZoomRef = useRef(H3_MIN_ZOOM_DEFAULT);

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

	const dispatch = useDispatch<AppDispatch>();

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
			.filter(([, r]) => r.tileImage || r.billboard || r.billboards || r.billboardsTexture)
			.map(([h3, r]) => `${h3}=${r.tileImage ?? ''}|${r.billboard ?? ''}|${JSON.stringify(r.billboards ?? {})}|${JSON.stringify(r.billboardsTexture ?? {})}`)
			.sort(compareByCodeUnit)
			.join('\n'),
	);

	// Stable key for billboard anchor config changes so the map is updated when
	// anchor overrides are adjusted in the Billboard Config or Hex Texture Config screens.
	const billboardConfigKey = useSelector((state: RootState) =>
		JSON.stringify(state.billboardConfig.spriteAnchors) + '|' + JSON.stringify(state.hexTextureConfig.spriteAnchors),
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
		const textureAnchors = store.getState().hexTextureConfig.spriteAnchors;
		const currentHexTextureOpacity = store.getState().displaySettings.hexTextureOpacity;
		const currentHexTextureAdaptionOpacity = store.getState().displaySettings.hexTextureAdaptionOpacity;
		const currentHexObjectOpacity = store.getState().displaySettings.hexObjectOpacity;

		const imageOverlays = await buildTileImageOverlays(records, textureAnchors, currentHexTextureOpacity, loadAssetUrl);
		const { images: billboardImages, features: billboardFeatures } = await buildBillboardOverlays(
			records,
			spriteAnchors,
			billboardScaleRef,
			currentHexTextureAdaptionOpacity,
			currentHexObjectOpacity,
			loadAssetUrl,
		);

		mapRef.current.sendToMap({
			imageOverlays,
			// Clear any legacy DOM markers from previous versions.
			mapMarkers: [],
			billboards: {
				images: billboardImages,
				// Sort features so flat objects are rendered first (under normal objects).
				// Render order: hex tiles → flat objects → normal objects.
				features: billboardFeatures.slice().sort((a, b) => (a.properties.flat ? 0 : 1) - (b.properties.flat ? 0 : 1)),
			},
		});
	}, [loadAssetUrl]);

	// Re-send customizations whenever tile image / model selections or
	// billboard anchor config change.
	// Billboard sizes scale proportionally with the H3 edge length.
	useEffect(() => {
		loadAndSendCustomizations();
	}, [hexTileCustomizationsKey, billboardConfigKey, loadAndSendCustomizations]);

	// Send updated hex grid line opacity to the map whenever the setting changes.
	useEffect(() => {
		if (!mapWebViewReadyRef.current) return;
		mapRef.current?.sendToMap({ hexLineOpacity });
	}, [hexLineOpacity]);

	// Send updated hex grid line width to the map whenever the setting changes.
	useEffect(() => {
		if (!mapWebViewReadyRef.current) return;
		mapRef.current?.sendToMap({ hexLineWidth });
	}, [hexLineWidth]);

	// Re-send customizations when any of the three layer opacities change:
	// hexTextureOpacity (terrain image overlays), hexTextureAdaptionOpacity (flat sprites),
	// or hexObjectOpacity (face-camera sprites).
	useEffect(() => {
		loadAndSendCustomizations();
	}, [hexTextureOpacity, hexTextureAdaptionOpacity, hexObjectOpacity, loadAndSendCustomizations]);

	// Re-apply display settings when the screen comes back into focus.
	// While the recording screen is hidden behind a drawer screen (e.g. Settings),
	// the WebView does not process injected JavaScript messages, so any opacity
	// changes dispatched from the settings screen are silently dropped.
	// Re-sending them on focus ensures the map is always in sync with the current settings.
	useFocusEffect(
		useCallback(() => {
			if (!mapWebViewReadyRef.current) return;
			const { hexLineOpacity: currentHexLineOpacity, hexLineWidth: currentHexLineWidth } = store.getState().displaySettings;
			mapRef.current?.sendToMap({ hexLineOpacity: currentHexLineOpacity });
			mapRef.current?.sendToMap({ hexLineWidth: currentHexLineWidth });
			loadAndSendCustomizations();
			// Refresh hex tile data and route track so the map shows the latest state
			// when returning from a drawer screen (e.g. Settings).  The WebView may not
			// have processed messages while it was covered, so re-send everything.
			const vp = debugViewportRef.current;
			if (vp) {
				refreshNormalTileDisplay(vp);
			}
			if (isRecordingRef.current && routePointsRef.current.length > 0) {
				sendRouteToMap(routePointsRef.current);
			}
			// Center the map on the current player position so it snaps back after
			// the user returns from another screen.
			const pos = debugPlayerPositionRef.current
				?? (routePointsRef.current.length > 0
					? routePointsRef.current[routePointsRef.current.length - 1]
					: null);
			if (pos) {
				centerMapOnPosition({ lat: pos.lat, lng: pos.lng });
			}
		}, [loadAndSendCustomizations, refreshNormalTileDisplay, sendRouteToMap, centerMapOnPosition]),
	);

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
	// The last red-line resolution cell; used to track finer red-line walk-path edges.
	const lastRedLineCellRef = useRef<string | null>(null);
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
	// Timestamp of the last recording snapshot persisted to disk (crash recovery).
	const lastSnapshotSaveRef = useRef(0);

	const centerMapOnPosition = useCallback((pos: { lat: number; lng: number }, zoom?: number) => {
		if (!mapRef.current) return;
		mapRef.current.sendToMap({ userLocation: { lat: pos.lat, lng: pos.lng } });
		mapRef.current.sendToMap({
			mapCenterPosition: { lat: pos.lat, lng: pos.lng },
			...(zoom != null ? { zoom } : {}),
			easeAnimation: true,
			easeDuration: 800,
		});
	}, []);

	const refreshSearchHighlight = useCallback((cells: string[]) => {
		currentViewportCellsRef.current = cells;
		if (searchHighlightTimerRef.current) clearTimeout(searchHighlightTimerRef.current);
		searchHighlightTimerRef.current = setTimeout(async () => {
			const enabledKeys = store.getState().mapSearch.searchState?.enabledKeys ?? [];
			if (enabledKeys.length === 0) {
				mapRef.current?.sendToMap({ hexSearchHighlightGeoJson: { type: 'FeatureCollection', features: [] } });
				return;
			}
			const cache = searchFeatureCacheRef.current;
			const uncachedCells = cells.filter((c) => !cache.has(c));
			await Promise.all(
				uncachedCells.map(async (cell) => {
					try {
						const features = await queryTileFeaturesForHexCell(cell);
						cache.set(cell, features);
					} catch {
						cache.set(cell, []);
					}
				}),
			);
			const matchingCells = cells.filter((cell) => cellHasEnabledFeature(cell, cache, enabledKeys));
			const highlightFeatures = matchingCells.map((h3Index) => {
				const boundary = cellToBoundary(h3Index, H3_GEOJSON_ORDER);
				return {
					type: 'Feature' as const,
					geometry: { type: 'Polygon' as const, coordinates: [boundary] },
					properties: { h3Index },
				};
			});
			mapRef.current?.sendToMap({
				hexSearchHighlightGeoJson: { type: 'FeatureCollection', features: highlightFeatures },
			});
		}, 400);
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
			geoJson = buildH3GeoJson(vp.bounds, vp.zoom, h3ResolutionRef.current, showGridAlwaysRef.current, store.getState().hexTiles.records, h3MinZoomRef.current);
		} catch {
			// ignore
		}
		if (debugViewportRef.current) {
			debugViewportRef.current.tileCount = geoJson.features.length;
		}
		const viewportCells = [...new Set(geoJson.features.map((f) => f.properties.h3Index))];
		const walkPathGeoJson = buildWalkPathGeoJson(viewportCells, store.getState().hexTiles.walkedEdges, store.getState().hexTiles.walkedEdgesRedLine);
		mapRef.current.sendToMap({ hexTileGeoJson: geoJson });
		mapRef.current.sendToMap({ hexWalkPathGeoJson: walkPathGeoJson });
		refreshSearchHighlight(viewportCells);
	}, [refreshSearchHighlight]);

	// Load persisted OSM consent on mount
	useEffect(() => {
		loadOsmConsent().then((consented) => {
			if (consented) setOsmConsent(true);
		});
	}, []);

	useEffect(() => {
		// A previous session may have been terminated mid-recording (app swiped
		// away), leaving the background location task registered with the OS.
		// Stop it on startup so GPS is not queried without an active recording.
		void (async () => {
			try {
				const isTaskRunning = await TaskManager.isTaskRegisteredAsync(ACTIVITY_LOCATION_TASK);
				if (isTaskRunning && !isRecordingRef.current) {
					await Location.stopLocationUpdatesAsync(ACTIVITY_LOCATION_TASK);
					console.log('[RecordScreen] Stopped leftover background location task from a previous session.');
				}
			} catch (err) {
				console.warn('[RecordScreen] Leftover background task check failed:', err);
			}
		})();
		return () => {
			// Cleanup on unmount: stop any active tracking
			_onLocationUpdate = null;
			fgSubRef.current?.remove();
			if (timerRef.current) clearInterval(timerRef.current);
			if (periodicAnnouncementTimerRef.current) clearInterval(periodicAnnouncementTimerRef.current);
			Location.stopLocationUpdatesAsync(ACTIVITY_LOCATION_TASK).catch(() => {});
		};
	}, []);

	// ── Check for an interrupted recording from a previous crash ──
	useEffect(() => {
		void (async () => {
			try {
				const snapshot = await loadRecordingSnapshot();
				if (!snapshot || snapshot.routePoints.length < 2) {
					// No interrupted recording or too few points – nothing to recover.
					clearRecordingSnapshot();
					return;
				}
				const ageMs = Date.now() - snapshot.savedAt;
				// Discard snapshots older than 24 hours – they are likely stale.
				if (ageMs > 24 * 60 * 60 * 1000) {
					clearRecordingSnapshot();
					return;
				}

				showRecoveryModal({
					title: '🔄 Unterbrochene Aktivität',
					children: (
						<InterruptedRecoveryContent
							snapshot={snapshot}
							theme={theme}
							onDiscard={() => {
								clearRecordingSnapshot();
								closeRecoveryModal();
							}}
							onSave={async (activity) => {
								try { await saveActivity(activity); } catch (err) { console.warn('[RecordScreen] Failed to save recovered activity:', err); }
								clearRecordingSnapshot();
								closeRecoveryModal();
								router.push(`/activities/${activity.id}`);
							}}
						/>
					),
				});
			} catch (err) {
				console.warn('[RecordScreen] Interrupted recording check failed:', err);
			}
		})();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// ── Announce when the app moves to the background during an active recording
	useEffect(() => {
		const subscription = AppState.addEventListener('change', (nextAppState) => {
			if (
				nextAppState === 'background' &&
				isRecordingRef.current &&
				speechSettingsRef.current.enabled &&
				announceAppInBackgroundRef.current
			) {
				const locale = getLocales()[0]?.languageTag ?? 'en-US';
				const langCode = locale.split('-')[0].toLowerCase();
				const text = buildBackgroundAnnouncement(locale);
				const curSs = speechSettingsRef.current;
				try {
					speakAnnouncement(text, langCode, {
						rate: speechRateToNumber(curSs.speechRate),
					}, 'background');
				} catch (err) {
					console.warn('[RecordScreen] Background announcement failed:', err);
				}
			}
		});
		return () => subscription.remove();
	}, []);

	// ── Refresh map display when returning from background during a recording ──
	// While the screen is off the WebView may not process messages, so hex tiles,
	// walk paths and the route line can be stale.  Re-send them once the app
	// becomes active again.  Also re-centre the camera on the current player
	// position so the map snaps back to the user after the screen was off.
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
				// Re-centre the map on the current player position
				const pos = debugPlayerPositionRef.current
					?? (routePointsRef.current.length > 0
						? routePointsRef.current[routePointsRef.current.length - 1]
						: null);
				if (pos) {
					centerMapOnPosition({ lat: pos.lat, lng: pos.lng });
				}
			}
		});
		return () => subscription.remove();
	}, [sendRouteToMap, refreshNormalTileDisplay, centerMapOnPosition]);

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
			geoJson = buildH3GeoJson(vp.bounds, vp.zoom, h3ResolutionRef.current, showGridAlwaysRef.current, store.getState().hexTiles.records, h3MinZoomRef.current);
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

	const handleH3MinZoomChange = useCallback((val: number) => {
		h3MinZoomRef.current = val;
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

	const openSearchModal = useCallback(async () => {
		const featureCache = await loadHexTileFeatureCache();
		const keySet = new Set<string>();
		for (const features of Object.values(featureCache)) {
			for (const f of features) {
				const key = featureToSearchKey(f);
				if (key !== 'unknown') keySet.add(key);
			}
		}
		const availableKeys = Array.from(keySet).sort((a, b) => a.localeCompare(b));
		showSearchModal({
			title: 'Karten-Suche',
			children: <MapSearchModalContent availableKeys={availableKeys} />,
			onClose: closeSearchModal,
		});
	}, [showSearchModal, closeSearchModal]);

	// Re-trigger search highlight whenever the active search state changes.
	useEffect(() => {
		refreshSearchHighlight(currentViewportCellsRef.current);
	}, [searchState, refreshSearchHighlight]);

	const undoMeasurePoint = useCallback(() => {
		const prev = measureWaypointsRef.current.slice(0, -1);
		measureWaypointsRef.current = prev;
		const coords = prev.map((w) => [w.lng, w.lat]);
		mapRef.current?.sendToMap({ measureRouteCoords: coords });
		mapRef.current?.sendToMap({ measurePoints: coords });
	}, []);

	const handleSaveMeasureAsActivity = useCallback((routeCells: string[], enclosedCells: string[]) => {
		if (routeCells.length < 2) return;
		const startTimestamp = Date.now();
		const speedBaseKmh = MEASURE_SPEED_BASE_KMH + (MathHelper.random() - 0.5) * MEASURE_SPEED_VARIATION_KMH;
		const routePoints = generateMeasureRoutePoints(routeCells, speedBaseKmh, MEASURE_SPEED_VARIATION_KMH, startTimestamp);
		if (routePoints.length < 2) return;
		const stats = computeStats(routePoints);
		const endedAt = routePoints.at(-1)!.timestamp;
		const activity: SavedActivity = {
			id: String(startTimestamp),
			startedAt: startTimestamp,
			endedAt,
			routePoints,
			stats,
			sportType: selectedSportTypeRef.current,
			h3Resolution: Math.max(H3_RESOLUTION_MIN, Math.min(H3_RESOLUTION_MAX, Math.floor(h3ResolutionRef.current))),
			visitedTileCount: routeCells.length,
			enclosedTileCount: enclosedCells.length,
			hexTilesOrdered: routeCells,
			walkedEdgesRedLine: computeEdgesFromRoutePoints(routePoints, RED_LINE_GRID_RESOLUTION),
			walkedEdgesRedLineResolution: RED_LINE_GRID_RESOLUTION,
		};
		activity.computed = computeActivityData(activity, enclosedCells);
		try {
			saveActivity(activity);
			showAlert(
				'Activity Saved',
				`Route saved: ${routeCells.length} hex tiles, ${enclosedCells.length} enclosed.`,
			);
		} catch {
			showAlert('Error', 'Failed to save activity.');
		}
		// Fire-and-forget: fetch and cache map features for enclosed cells so that
		// the next map rebuild can apply the pine tree billboard on forest tiles.
		if (enclosedCells.length > 0) {
			void (async () => {
				try {
					const newEntries: HexTileFeatureCache = {};
					for (const hexId of enclosedCells) {
						try {
							newEntries[hexId] = await queryTileFeaturesForHexCell(hexId);
						} catch {
							// ignore per-cell errors
						}
					}
					await mergeHexTileFeatureCache(newEntries);
				} catch (err) {
					console.warn('[MeasureSave] Feature cache update failed:', err);
				}
			})();
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
			showAlert('Route gespeichert', `"${route.name}" wurde als Route gespeichert.`);
		} catch {
			showAlert('Fehler', 'Die Route konnte nicht gespeichert werden.');
		}
	}, []);

	const finishMeasurement = useCallback(async () => {
		const waypoints = measureWaypointsRef.current;
		if (waypoints.length < 2) {
			showAlert('Not enough points', 'Tap at least 2 points on the map to measure a route.');
			return;
		}

		const routeCells = computeOrderedMeasureRouteCells(waypoints, h3ResolutionRef.current);
		const routeLengthInTiles = routeCells.length;

		// Compute enclosed tiles: use waypoints as the route polygon
		const routeAsPoints: RoutePoint[] = waypoints.map((w, i) => ({
			lat: w.lat, lng: w.lng, altitude: null, speed: null, timestamp: Date.now() + i * 1000,
		}));
		let enclosedCells: string[] = [];
		let enclosedTileCount = 0;
		try {
			const allEnclosed = findEnclosedCells(routeAsPoints, h3ResolutionRef.current);
			// Exclude cells that are part of the route itself
			const routeCellSet = new Set(routeCells);
			enclosedCells = allEnclosed.filter((c) => !routeCellSet.has(c));
			enclosedTileCount = enclosedCells.length;
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
					enclosedCells={enclosedCells}
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
			children: renderTerrainCategoryList((entry, position) => (
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
			)),
		});
	}, [showColoringModal, closeColoringModal]);

	const handleMapMessage = useCallback((data: object) => {
		const msg = data as { tag?: string };
		if (msg.tag === 'MapComponentMounted') {
			mapWebViewReadyRef.current = true;
			handleMapComponentMounted(mapRef, routePointsRef, debugPlayerPositionRef, sendRouteToMap, centerMapOnPosition, loadAndSendCustomizations);
		} else if (msg.tag === 'MapInteracted') {
			setFollowMode(false);
		} else if (msg.tag === 'MapViewportChanged') {
			const vp = msg as { bounds: ViewportBounds; zoom: number };
			handleMapViewportChanged(vp, selectedRouteRef, isRecordingRef, debugViewportRef, mapRef, refreshNormalTileDisplay);
		} else if (msg.tag === 'HexTileClicked') {
			const clickedMsg = msg as { h3Index?: string; mapFeatures?: MapFeatureInfo[] };
			handleHexTileClicked({
				clickedMsg, isSettingHomeRef, setIsSettingHome, coloringTileImageRef,
				isMagnifyModeRef, showMagnifyHexTileModal, showHexTileModal, dispatch,
			});
		} else if (msg.tag === 'MapMeasurePoint') {
			const ptMsg = msg as { lat: number; lng: number };
			handleMapMeasurePoint(ptMsg, isMeasureModeRef, measureWaypointsRef, mapRef);
		}
	}, [centerMapOnPosition, sendRouteToMap, setFollowMode, showHexTileModal, showMagnifyHexTileModal, loadAndSendCustomizations, dispatch, refreshNormalTileDisplay]);

	const handleExportMapSettings = useCallback(async () => {
		const exportData: Record<string, { tileImage?: string; billboards?: Record<string, string>; billboardsTexture?: Record<string, string> }> = {};
		for (const [h3Index, record] of Object.entries(hexTileRecords)) {
			const billboards = getEffectiveBillboards(record);
			const billboardsTexture = getEffectiveBillboardsTexture(record);
			const hasBillboards = Object.keys(billboards).length > 0;
			const hasBillboardsTexture = Object.keys(billboardsTexture).length > 0;
			if (record.tileImage || hasBillboards || hasBillboardsTexture) {
				exportData[h3Index] = {};
				if (record.tileImage) exportData[h3Index].tileImage = record.tileImage;
				if (hasBillboards) exportData[h3Index].billboards = billboards;
				if (hasBillboardsTexture) exportData[h3Index].billboardsTexture = billboardsTexture;
			}
		}
		const json = JSON.stringify({ version: 1, hexTiles: exportData }, null, 2);
		try {
			const result = await saveJsonToFile(json, buildJsonExportFilename('geonexia-map-settings'));
			if (result === 'cancelled') return;
			showAlert('Map Settings Exported', `${Object.keys(exportData).length} tile customization(s) saved as JSON file.`);
		} catch {
			showAlert('Export Failed', 'The export file could not be saved.');
		}
	}, [hexTileRecords]);

	const handleImportMapSettings = useCallback(async () => {
		let json: string | null;
		try {
			json = await pickJsonFromFile();
		} catch {
			showAlert('Import Failed', 'The selected file could not be read.');
			return;
		}
		if (json == null) return;
		let parsed: unknown;
		try {
			parsed = JSON.parse(json);
		} catch {
			showAlert('Import Failed', 'The file is not valid JSON.');
			return;
		}
		const data = parsed as { version?: number; hexTiles?: Record<string, HexTileCustomizationPayload> };
		if (!data.hexTiles || typeof data.hexTiles !== 'object') {
			showAlert('Import Failed', 'No "hexTiles" object found in the data.');
			return;
		}
		dispatch(applyMapCustomizations(data.hexTiles));
		showAlert('Map Settings Imported', `Applied customizations for ${Object.keys(data.hexTiles).length} tile(s).`);
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
					initialMinZoom={h3MinZoomRef.current}
					initialSpeed={debugMoveSpeedKmhRef.current}
					initialBillboardScale={billboardScaleRef.current}
					initialBillboardFaceCamera={billboardFaceCameraRef.current}
					initialShowBillboardAnchors={showBillboardAnchorsRef.current}
					initialShowDebugPoints={showDebugPointsRef.current}
					onShowGridAlwaysChange={handleShowGridAlwaysChange}
					onH3ResolutionChange={handleH3ResolutionChange}
					onMinZoomChange={handleH3MinZoomChange}
					onZoomAdjust={handleZoomAdjust}
					onSpeedChange={handleSpeedChange}
					onBillboardScaleChange={handleBillboardScaleChange}
					onBillboardFaceCameraChange={handleBillboardFaceCameraChange}
					onShowBillboardAnchorsChange={handleShowBillboardAnchorsChange}
					onShowDebugPointsChange={handleShowDebugPointsChange}
					onExportMapSettings={handleExportMapSettings}
					onImportMapSettings={handleImportMapSettings}
					onFlyToCell={(lat, lng) => centerMapOnPosition({ lat, lng })}
				/>
			),
		});
	}, [showModal, closeModal, theme, handleShowGridAlwaysChange, handleH3ResolutionChange, handleH3MinZoomChange, handleZoomAdjust, handleSpeedChange, handleBillboardScaleChange, handleBillboardFaceCameraChange, handleShowBillboardAnchorsChange, handleShowDebugPointsChange, handleExportMapSettings, handleImportMapSettings, centerMapOnPosition]);

	const showActivityTypeModal = useCallback(() => {
		showModal({
			title: '🏃 Select Activity Type',
			onClose: closeModal,
			children: (
				<View>
					<SettingsListGroupTitle title="Sport" />
					{SPORT_TYPES.map((sportDef, i) => {
						let position: 'top' | 'middle' | 'bottom' = 'middle';
						if (i === 0) position = 'top';
						else if (i === SPORT_TYPES.length - 1) position = 'bottom';
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
		if (maybeFilterGpsPoint(fromJoystick, point, isRecordingRef, joystickActiveRef, movedPlayerManuallyRef, lastAcceptedGpsPointRef, selectedSportTypeRef)) {
			return;
		}

		const next = [...routePointsRef.current, point];
		routePointsRef.current = next;

		// Update the visual player position only from GPS and only when the user
		// has not already overridden it via the joystick during this recording.
		if (!fromJoystick && !movedPlayerManuallyRef.current) {
			debugPlayerPositionRef.current = { lat: point.lat, lng: point.lng };
		}

		// Track the visited H3 cell and dispatch to Redux for persistent storage
		trackVisitedHexCells(point, h3ResolutionRef, lastCellRef, visitedHexIdsRef, orderedHexTilesRef, lastRedLineCellRef, dispatch);

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
		announceKmMilestoneIfNeeded(d, speechSettingsRef, lastAnnouncedKmRef, startTimeRef, accumulatedSecondsRef);

		// ── Pace hint announcements with hysteresis threshold ────────────
		evaluatePaceHintAnnouncement({
			point, liveDistanceKm: d, speechSettingsRef, startTimeRef, accumulatedSecondsRef,
			paceHintStateRef, lastPaceHintTimeRef, paceHintCooldownMs: PACE_HINT_COOLDOWN_MS,
		});

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
				geoJson = buildH3GeoJson(vp.bounds, vp.zoom, h3ResolutionRef.current, showGridAlwaysRef.current, store.getState().hexTiles.records, h3MinZoomRef.current);
			} catch (err) {
				console.warn('[RecordScreen] buildH3GeoJson failed during location update:', err);
			}
			debugViewportRef.current = { ...vp, tileCount: geoJson.features.length };
			const viewportCells = [...new Set(geoJson.features.map((f) => f.properties.h3Index))];
			const walkPathGeoJson = buildWalkPathGeoJson(viewportCells, store.getState().hexTiles.walkedEdges, store.getState().hexTiles.walkedEdgesRedLine);
			mapRef.current.sendToMap({ hexTileGeoJson: geoJson });
			mapRef.current.sendToMap({ hexWalkPathGeoJson: walkPathGeoJson });
			refreshSearchHighlight(viewportCells);
		}

		// ── Periodically persist a recording snapshot for crash recovery ──
		persistRecordingSnapshotIfDue({
			isRecordingRef, isPausedRef, lastSnapshotSaveRef, startTimeRef, accumulatedSecondsRef,
			routePointsRef, orderedHexTilesRef, h3ResolutionRef, selectedSportTypeRef, selectedRouteRef,
		});
	}, [centerMapOnPosition, sendRouteToMap, dispatch, refreshSearchHighlight]);

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
			if (!isRecordingRef.current || isPausedRef.current || !speechSettingsRef.current.enabled) return;
			const curSs = speechSettingsRef.current;

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
				announcePaceAvg: curSs.announcePaceAvg,
				announceSpeedAvg: curSs.announceSpeedAvg,
			});
			if (text.length > 0) {
				try {
					speakAnnouncement(text, langCode, {
						volume: curSs.volume,
						rate: speechRateToNumber(curSs.speechRate),
						useApplicationAudioSession: curSs.duckMusicDuringTTS,
					}, 'periodic');
				} catch (err) {
					console.warn('[RecordScreen] Periodic announcement failed:', err);
				}
			}
		}, intervalSec * 1000);
	}, [stopPeriodicAnnouncementTimer]);

	const startRecording = useCallback(async () => {
		const expoGo = isRunningInExpoGo();
		const gpsTimeIntervalMs = store.getState().gpsInterval.intervalSeconds * 1000;
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
				showAlert('GPS', 'Location permission is required for run recording.');
				return;
			}

			// Enable background audio so TTS announcements work when the app is backgrounded
			await enableBackgroundAudio();

			routePointsRef.current = [];
			visitedHexIdsRef.current = new Set();
			orderedHexTilesRef.current = [];
			lastCellRef.current = null;
			lastRedLineCellRef.current = null;
			lastAcceptedGpsPointRef.current = null;
			movedPlayerManuallyRef.current = false;
			lastSnapshotSaveRef.current = 0;
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
			// Initialise to now so the first pace-hint announcement is delayed by
			// PACE_HINT_COOLDOWN_MS (same warm-up concept as SPEED_WARMUP_MS).
			lastPaceHintTimeRef.current = Date.now();
			isRecordingRef.current = true;
			setRecordingActive(true);
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

			// ── Debug replay: emit GPS points from a recorded activity instead of real GPS ──
			if (isDebugMode && debugReplayActivityRef.current && debugReplayActivityRef.current.routePoints.length > 0) {
				const activity = debugReplayActivityRef.current;
				console.log('[RecordScreen] Debug replay mode: replaying activity', activity.id, 'with', activity.routePoints.length, 'points');
				const replayStartWallTime = Date.now();
				const activityStartTime = activity.routePoints[0].timestamp;
				const timeouts = activity.routePoints.map((point) => {
					const delay = Math.max(0, point.timestamp - activityStartTime);
					return setTimeout(() => {
						if (!isRecordingRef.current) return;
						handleLocationUpdate({
							lat: point.lat,
							lng: point.lng,
							altitude: point.altitude,
							speed: point.speed,
							timestamp: replayStartWallTime + delay,
						});
					}, delay);
				});
				debugReplayTimeoutsRef.current = timeouts;
				return;
			}

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
						// Stop the Android foreground service (and GPS) when the user
						// closes the app; tracking may only continue in the background.
						killServiceOnDestroy: true,
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
			showAlert('Error', 'Run recording could not be started.');
			isRecordingRef.current = false;
			setRecordingActive(false);
			setIsRecording(false);
			if (timerRef.current) {
				clearInterval(timerRef.current);
				timerRef.current = null;
			}
			stopPeriodicAnnouncementTimer();
		}
	}, [handleLocationUpdate, setFollowMode, showModal, theme, startPeriodicAnnouncementTimer, stopPeriodicAnnouncementTimer, refreshSearchHighlight, isDebugMode]);

	// Show a modal to select a saved route before starting a recording.
	const showRouteSelectionModal = useCallback(async () => {
		let routes: SavedRoute[] = [];
		try {
			routes = await loadRoutes();
		} catch {
			// ignore
		}
		if (routes.length === 0) {
			showAlert('🗺️ No Routes', 'You don\'t have any saved routes yet. Complete a run to save one.');
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

	// Show a modal to select a saved activity for debug replay.
	const showDebugActivitySelectionModal = useCallback(async (onSelected: (activity: SavedActivity | null) => void) => {
		let activities: SavedActivity[] = [];
		try {
			activities = await loadActivities();
		} catch {
			// ignore
		}
		showDebugReplayModal({
			title: '🔄 Replay Activity (Debug)',
			onClose: closeDebugReplayModal,
			children: (
				<View>
					<SettingsListGroupTitle title="Select a recorded activity" />
					<SettingsListSelectOptionSingle
						key="__none__"
						label="No Replay (Normal GPS)"
						isSelected={debugReplayActivityRef.current === null}
						selectionColor={PRIMARY_COLOR}
						onPress={() => {
							onSelected(null);
							closeDebugReplayModal();
						}}
						groupPosition={activities.length === 0 ? 'single' : 'top'}
					/>
					{activities.map((activity, i) => {
						const date = new Date(activity.startedAt);
						const label = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${activity.stats.distanceKm.toFixed(2)} km · ${activity.routePoints.length} Points`;
						const position = i === activities.length - 1 ? 'bottom' : 'middle';
						return (
							<SettingsListSelectOptionSingle
								key={activity.id}
								label={label}
								isSelected={debugReplayActivityRef.current?.id === activity.id}
								selectionColor={PRIMARY_COLOR}
								onPress={() => {
									onSelected(activity);
									closeDebugReplayModal();
								}}
								groupPosition={position}
							/>
						);
					})}
				</View>
			),
		});
	}, [showDebugReplayModal, closeDebugReplayModal]);

	const stopRecording = useCallback(async () => {
		console.log('[RecordScreen] stopRecording called.');
		_onLocationUpdate = null;
		fgSubRef.current?.remove();
		fgSubRef.current = null;

		// Clear any scheduled debug replay timeouts.
		for (const t of debugReplayTimeoutsRef.current) {
			clearTimeout(t);
		}
		debugReplayTimeoutsRef.current = [];

		// Clear the crash-recovery snapshot since this is a clean stop.
		clearRecordingSnapshot();

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
		setRecordingActive(false);
		setIsRecording(false);
		setIsPaused(false);
		isPausedRef.current = false;
		accumulatedSecondsRef.current = 0;
		movedPlayerManuallyRef.current = false;
		clearAudioQueue();
		await disableBackgroundAudio();

		// Exit heading mode and restore default pitch/bearing
		isHeadingModeRef.current = false;
		setIsHeadingMode(false);
		mapRef.current?.sendToMap({ pitch: 20, easeAnimation: true });
		mapRef.current?.sendToMap({ resetBearing: true });

		const points = routePointsRef.current;
		console.log('[RecordScreen] Recorded points count:', points.length);
		if (points.length < 2) {
			showAlert('Run finished', 'Too few GPS points were recorded.');
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
				// Fire-and-forget: fetch map features for enclosed cells, cache them,
				// and immediately apply the pine tree billboard on forest tiles.
				void (async () => {
					try {
						const newEntries: HexTileFeatureCache = {};
						for (const hexId of enclosedCells) {
							try {
								const features = await queryTileFeaturesForHexCell(hexId);
								newEntries[hexId] = features;
								if (hasForestFeature(features)) {
									dispatch(setBillboardAtAnchor({
										h3Index: hexId,
										anchorColor: BillboardAnchorPosition.CENTER,
										billboard: BILLBOARD_PINE_TREE_LARGE,
									}));
									dispatch(setBillboardAtAnchor({
										h3Index: hexId,
										anchorColor: getSmallTreeAnchorForHexId(hexId),
										billboard: BILLBOARD_PINE_TREE_SMALL,
									}));
								}
							} catch {
								// ignore per-cell errors
							}
						}
						await mergeHexTileFeatureCache(newEntries);
					} catch (err) {
						console.warn('[RecordScreen] Feature cache update failed:', err);
					}
				})();
			}
		} catch (err) {
			console.warn('[RecordScreen] Enclosed tile detection failed:', err);
		}

		// Refresh the map to show newly enclosed tiles and updated walk path.
		const vp = debugViewportRef.current;
		if (vp && mapRef.current) {
			let geoJson: H3FeatureCollection = { type: 'FeatureCollection', features: [] };
			try {
				geoJson = buildH3GeoJson(vp.bounds, vp.zoom, h3ResolutionRef.current, showGridAlwaysRef.current, store.getState().hexTiles.records, h3MinZoomRef.current);
			} catch {
				// ignore
			}
			const viewportCells = [...new Set(geoJson.features.map((f) => f.properties.h3Index))];
			const walkPathGeoJson = buildWalkPathGeoJson(viewportCells, store.getState().hexTiles.walkedEdges, store.getState().hexTiles.walkedEdgesRedLine);
			mapRef.current.sendToMap({ hexTileGeoJson: geoJson });
			mapRef.current.sendToMap({ hexWalkPathGeoJson: walkPathGeoJson });
			refreshSearchHighlight(viewportCells);
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
			walkedEdgesRedLine: store.getState().hexTiles.walkedEdgesRedLine.slice(),
			walkedEdgesRedLineResolution: RED_LINE_GRID_RESOLUTION,
		};
		activity.computed = computeActivityData(activity, enclosedCells);

		// Best-effort: look up the weather at the START GPS point for the time
		// the run started (free Open-Meteo API, no key required). Failures
		// (offline, 404, timeout, …) resolve to null and simply leave the
		// weather fields unset – the user can still fill them in manually.
		const weather = await fetchWeatherAtCoordinates({
			latitude: points[0].lat,
			longitude: points[0].lng,
			time: startTimeRef.current,
			timeoutMs: 8_000,
		});
		if (weather) {
			activity.weatherTemperature = Math.round(weather.temperatureCelsius * 10) / 10;
			activity.weatherType = weather.condition;
		}

		try {
			await saveActivity(activity);
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

	// Handle the record button press. In debug mode, show a replay selection modal first.
	// Outside debug mode (or if already recording), delegate directly to startRecording.
	const handleRecordButtonPress = useCallback(async () => {
		if (!isDebugMode) {
			startRecording();
			return;
		}
		// In debug mode: ask the user whether to start normally or replay an activity.
		await showDebugActivitySelectionModal((activity) => {
			// Update both the ref (for immediate synchronous access in startRecording) and
			// the state (for UI reactivity).
			debugReplayActivityRef.current = activity;
			setDebugReplayActivity(activity);
			// Start recording after the modal closes (slight delay lets the modal animate out).
			setTimeout(() => startRecording(), 50);
		});
	}, [isDebugMode, startRecording, showDebugActivitySelectionModal]);

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

	// Home button icon: white while placing home, green when a home tile is set.
	const homeButtonIconColor = resolveHomeButtonIconColor(isSettingHome, homeHexTile);

	// Live distance: metres below 1 km, kilometres afterwards.
	const liveDistanceValue = liveDistanceKm < 1 ? (liveDistanceKm * 1000).toFixed(0) : liveDistanceKm.toFixed(2);

	// Central record button: green when idle or paused (start/resume), amber while recording (pause).
	const recordButtonColor = !isRecording || isPaused ? '#43a047' : '#f59e0b';
	const recordButtonIcon = !isRecording || isPaused ? 'play-arrow' : 'pause';
	const recordButtonAction = resolveRecordButtonAction(isRecording, isPaused, pauseRecording, handleRecordButtonPress, resumeRecording);

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
					<MyMap ref={mapRef} initialZoom={17} initialCenter={mapInitialCenter} onMessage={handleMapMessage} injectScript={HEX_TILE_SCRIPT} loadingOverlay={<MapLoadingOverlay />} mapStyleKey={mapTheme as MapStyleKey} />
				)}

				{/* Map overlay buttons – top-right */}
				<MapOverlayButtons
					mapRef={mapRef}
					isHeadingMode={isHeadingMode}
					handleCompassPress={handleCompassPress}
					isFollowing={isFollowing}
					setFollowMode={setFollowMode}
					movedPlayerManuallyRef={movedPlayerManuallyRef}
					isRecording={isRecording}
					isSettingHome={isSettingHome}
					homeHexTile={homeHexTile}
					homeButtonIconColor={homeButtonIconColor}
					isSettingHomeRef={isSettingHomeRef}
					setIsSettingHome={setIsSettingHome}
					searchState={searchState}
					openSearchModal={openSearchModal}
					isDebugMode={isDebugMode}
					coloringTileImage={coloringTileImage}
					openColoringModal={openColoringModal}
					isMeasureMode={isMeasureMode}
					cancelMeasureMode={cancelMeasureMode}
					startMeasureMode={startMeasureMode}
					showDebugModal={showDebugModal}
					finishMeasurement={finishMeasurement}
					undoMeasurePoint={undoMeasurePoint}
				/>

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
			<LiveControlPanel
				isPanelCollapsed={isPanelCollapsed}
				setIsPanelCollapsed={setIsPanelCollapsed}
				theme={theme}
				isRecording={isRecording}
				liveDistanceValue={liveDistanceValue}
				liveDistanceKm={liveDistanceKm}
				livePaceMinPerKm={livePaceMinPerKm}
				liveAvgSpeedKmh={liveAvgSpeedKmh}
				selectedRoute={selectedRoute}
				setSelectedRoute={setSelectedRoute}
				isDebugMode={isDebugMode}
				debugReplayActivity={debugReplayActivity}
				setDebugReplayActivity={setDebugReplayActivity}
				stopRecording={stopRecording}
				activeSport={activeSport}
				showActivityTypeModal={showActivityTypeModal}
				recordButtonColor={recordButtonColor}
				recordButtonAction={recordButtonAction}
				recordButtonIcon={recordButtonIcon}
				showRouteSelectionModal={showRouteSelectionModal}
			/>
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
