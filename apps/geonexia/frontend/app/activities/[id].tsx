import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
	Alert,
	Keyboard,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';

import * as Clipboard from 'expo-clipboard';
import * as Location from 'expo-location';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { MyMap, MyMapHandle, QrCode, SettingsList, SettingsListBoolean, SettingsListGroupTitle, SettingsListSelectOption, SettingsListSelectOptionItem, SettingsListSelectOptionSingle, useMyScrollViewModal, useTheme } from 'repo-depkit-common-ui';
import { useDispatch, useSelector } from 'react-redux';

import { deleteActivity, loadActivity, loadActivities, RoutePoint, RunStats, saveActivity, SavedActivity } from '../../helpers/ActivityStorage';
import { TimeHelper } from '../../helpers/TimeHelper';
import { SavedRoute, loadRoute, loadRoutes, saveRoute } from '../../helpers/RouteStorage';
import { RouteMatchResult, findMatchingRoutes } from '../../helpers/RouteMatchingHelper';
import { HEX_TILE_SCRIPT } from '../../assets/hexTileScript';
import { SPORT_TYPES } from '../../store/sportTypeSlice';
import { isAvailable as isH3Available, latLngToCell, cellToLatLng, cellToBoundary, gridPathCells, getHexagonEdgeLengthAvg, UNITS } from '../../helpers/H3Helper';
import { HexTileRecord } from '../../helpers/HexTileStorage';
import { computeEdgesFromRoutePoints } from '../../helpers/RouteDisplayHelper';
import ActivityAggregateStatsSection from '../../components/ActivityAggregateStatsSection';
import type { RootState, AppDispatch } from '../../store/store';
import { updateReplaySettings } from '../../store/replaySettingsSlice';
import { useDebugMode } from '../../hooks/useDebugMode';
import { computeActivityData, findEnclosedCellsFromHexTiles, buildFullRouteTileIds, H3_RESOLUTION_FALLBACK, MIN_TILES_FOR_ENCLOSED_POLYGON } from '../../helpers/ActivityMapRebuildHelper';

const AUTO_ROTATE_SPEED_DEG_PER_S = 5; // slow rotation for activity view

const PRIMARY_COLOR = '#2563eb';
const REPLAY_COLOR = '#7c3aed';

const REPLAY_SPEED_STEP = 0.5;
const REPLAY_SPEED_MIN = 0.5;
const REPLAY_SPEED_MAX = 100.0;


// ─── Stats / filter helpers ───────────────────────────────────────────────────

const DEFAULT_RUNNER_WEIGHT_KG = 75;
const KCAL_PER_KG_PER_KM = 0.9;
const AVERAGE_STRIDE_LENGTH_METERS = 0.77;
const FLUID_BASELINE_DURATION_SECONDS = 3600;
const FLUID_BASELINE_ML = 600;
const SPEED_WARMUP_MS = 10_000;
const SPEED_WINDOW_SIZE = 5;

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
 * Remove GPS points that imply an unrealistic speed relative to the last
 * accepted point.  Only the offending candidate is dropped; the previous
 * accepted point keeps serving as the reference for subsequent candidates.
 * Example: A→B ok, B→C 400 km/h → C removed, B→D 300 km/h → D removed,
 * B→E 10 km/h → E kept; now E is the new reference.
 */
function filterUnrealisticPoints(points: RoutePoint[], maxSpeedKmh: number): RoutePoint[] {
	if (points.length < 2) return [...points];
	const result: RoutePoint[] = [points[0]];
	let lastAccepted = points[0];
	for (let i = 1; i < points.length; i++) {
		const candidate = points[i];
		// Also reject if the GPS sensor itself reported an unrealistic speed.
		// computeActivityStats() uses point.speed preferentially, so without this check
		// a point with e.g. 500 km/h GPS-reported speed would survive the coordinate
		// filter and still inflate the Max Speed stat.
		const gpsSpeedKmh =
			candidate.speed != null && candidate.speed >= 0 ? candidate.speed * 3.6 : 0;
		if (gpsSpeedKmh > maxSpeedKmh) {
			continue; // GPS-reported speed is unrealistic – skip, keep lastAccepted as reference
		}
		const distKm = haversineKm(lastAccepted.lat, lastAccepted.lng, candidate.lat, candidate.lng);
		const dtHours = (candidate.timestamp - lastAccepted.timestamp) / 3_600_000;
		const speedKmh = dtHours > 0 ? distKm / dtHours : 0;
		if (speedKmh <= maxSpeedKmh) {
			result.push(candidate);
			lastAccepted = candidate;
		}
		// else: candidate is unrealistic – skip it, keep lastAccepted as reference
	}
	return result;
}

function computeActivityStats(points: RoutePoint[]): RunStats {
	if (points.length < 2) {
		const durationSeconds = points.length === 1 ? (Date.now() - points[0].timestamp) / 1000 : 0;
		return {
			distanceKm: 0, durationSeconds, paceMinPerKm: 0,
			maxSpeedKmh: 0, minSpeedKmh: 0, avgSpeedKmh: 0, medianSpeedKmh: 0,
			kcal: 0, steps: 0, elevationGainM: 0, elevationLossM: 0, fluidNeedsMl: 0,
		};
	}
	let distanceKm = 0;
	let elevationGainM = 0;
	let elevationLossM = 0;
	const speedsKmh: number[] = [];
	const startTimestamp = points[0].timestamp;
	let speedDistanceKm = 0;
	let speedDurationSeconds = 0;
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
		if (points[i].timestamp - startTimestamp >= SPEED_WARMUP_MS) {
			if (segSpeedKmh > 0) speedsKmh.push(segSpeedKmh);
			speedDistanceKm += segKm;
			speedDurationSeconds += dtSec;
		}
	}
	const durationSeconds = (points[points.length - 1].timestamp - points[0].timestamp) / 1000;
	const paceMinPerKm = distanceKm > 0 ? durationSeconds / 60 / distanceKm : 0;
	const windowedSpeeds: number[] = [];
	let windowSum = 0;
	for (let i = 0; i < speedsKmh.length; i++) {
		windowSum += speedsKmh[i];
		if (i >= SPEED_WINDOW_SIZE) windowSum -= speedsKmh[i - SPEED_WINDOW_SIZE];
		windowedSpeeds.push(windowSum / Math.min(i + 1, SPEED_WINDOW_SIZE));
	}
	const maxSpeedKmh = windowedSpeeds.length > 0 ? Math.max(...windowedSpeeds) : 0;
	const minSpeedKmh = windowedSpeeds.length > 0 ? Math.min(...windowedSpeeds) : 0;
	const avgSpeedKmh = speedDurationSeconds > 0 ? (speedDistanceKm / speedDurationSeconds) * 3600 : 0;
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
		distanceKm, durationSeconds, paceMinPerKm,
		maxSpeedKmh, minSpeedKmh, avgSpeedKmh, medianSpeedKmh,
		kcal, steps, elevationGainM, elevationLossM, fluidNeedsMl,
	};
}

function formatDate(timestamp: number): string {
	return new Date(timestamp).toLocaleDateString(undefined, {
		weekday: 'long',
		day: '2-digit',
		month: 'long',
		year: 'numeric',
	});
}

function formatTime(timestamp: number): string {
	return new Date(timestamp).toLocaleTimeString(undefined, {
		hour: '2-digit',
		minute: '2-digit',
	});
}

function formatDistance(km: number): string {
	if (km < 1) return `${Math.round(km * 1000)} m`;
	return `${km.toFixed(2)} km`;
}

function formatPace(minPerKm: number): string {
	if (minPerKm <= 0 || !isFinite(minPerKm)) return '--:-- min/km';
	const m = Math.floor(minPerKm);
	const s = Math.round((minPerKm - m) * 60);
	return `${m}:${String(s).padStart(2, '0')} min/km`;
}

function formatSpeedValue(kmh: number): string {
	return `${formatPace(60 / kmh)}\n${kmh.toFixed(1)} km/h`;
}

// ─── Share Content (shown inside bottom sheet modal) ──────────────────────────

const QR_MAX_BYTES = 2953;

function ShareContent({ activity, theme }: { activity: SavedActivity; theme: ReturnType<typeof useTheme>['theme'] }) {
	const compact = JSON.stringify(activity);
	const pretty = JSON.stringify(activity, null, 2);
	const showQr = compact.length <= QR_MAX_BYTES;

	const handleCopy = useCallback(async () => {
		await Clipboard.setStringAsync(compact);
		Alert.alert('Copied', 'Activity data copied to clipboard.');
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
					QR code not available – activity data exceeds size limit. Use "Copy JSON" instead.
				</Text>
			)}
		</View>
	);
}

// ─── Delete Confirm Content (shown inside bottom sheet modal) ─────────────────

function DeleteConfirmContent({
	onConfirm,
	onCancel,
	theme,
}: {
	onConfirm: () => void;
	onCancel: () => void;
	theme: ReturnType<typeof useTheme>['theme'];
}) {
	return (
		<View style={styles.deleteConfirmContainer}>
			<Text style={[styles.deleteConfirmText, { color: theme.screen.text }]}>
				Are you sure you want to delete this activity? This action cannot be undone.
			</Text>
			<TouchableOpacity
				style={[styles.shareButton, { backgroundColor: '#ef4444' }]}
				onPress={onConfirm}
				activeOpacity={0.8}
			>
				<MaterialIcons name="delete" size={18} color="#ffffff" />
				<Text style={styles.shareButtonText}>Delete</Text>
			</TouchableOpacity>
			<TouchableOpacity style={styles.cancelButton} onPress={onCancel} activeOpacity={0.8}>
				<Text style={[styles.cancelButtonText, { color: theme.screen.text }]}>Cancel</Text>
			</TouchableOpacity>
		</View>
	);
}

// ─── Speed Range Item ─────────────────────────────────────────────────────────

const GRADIENT_SEGMENTS = 32;

function interpolateSpeedColor(t: number): string {
	// t: 0 = red, 0.5 = green, 1 = blue
	// red: #ef4444, green: #22c55e, blue: #3b82f6
	let r: number, g: number, b: number;
	if (t <= 0.5) {
		const s = t * 2;
		r = Math.round(0xef + (0x22 - 0xef) * s);
		g = Math.round(0x44 + (0xc5 - 0x44) * s);
		b = Math.round(0x44 + (0x5e - 0x44) * s);
	} else {
		const s = (t - 0.5) * 2;
		r = Math.round(0x22 + (0x3b - 0x22) * s);
		g = Math.round(0xc5 + (0x82 - 0xc5) * s);
		b = Math.round(0x5e + (0xf6 - 0x5e) * s);
	}
	return `rgb(${r},${g},${b})`;
}

function SpeedRangeItem({
	minSpeedKmh,
	avgSpeedKmh,
	maxSpeedKmh,
	theme,
}: {
	minSpeedKmh: number;
	avgSpeedKmh: number;
	maxSpeedKmh: number;
	theme: ReturnType<typeof useTheme>['theme'];
}) {
	// Convert speeds to pace: min speed → slowest pace (highest min/km), max speed → fastest pace (lowest min/km)
	const paceFromSpeed = (kmh: number) => (kmh > 0 ? 60 / kmh : 0);
	const minPace = paceFromSpeed(maxSpeedKmh); // fastest pace (shown on right/blue side)
	const avgPace = paceFromSpeed(avgSpeedKmh);
	const maxPace = paceFromSpeed(minSpeedKmh); // slowest pace (shown on left/red side)

	return (
		<View style={[speedRangeStyles.container, { backgroundColor: theme.screen.iconBg }]}>
			<View style={[speedRangeStyles.labelsRow, { marginTop: 0 }]}>
				<Text style={[speedRangeStyles.labelMin, { color: '#ef4444' }]}>{formatPace(maxPace)}</Text>
				<Text style={[speedRangeStyles.labelAvg, { color: '#22c55e' }]}>{formatPace(avgPace)}</Text>
				<Text style={[speedRangeStyles.labelMax, { color: '#3b82f6' }]}>{formatPace(minPace)}</Text>
			</View>
			<View style={speedRangeStyles.barWrapper}>
				{Array.from({ length: GRADIENT_SEGMENTS }).map((_, i) => (
					<View
						key={i}
						style={[
							speedRangeStyles.barSegment,
							{ backgroundColor: interpolateSpeedColor(i / (GRADIENT_SEGMENTS - 1)) },
							i === 0 && speedRangeStyles.barSegmentFirst,
							i === GRADIENT_SEGMENTS - 1 && speedRangeStyles.barSegmentLast,
						]}
					/>
				))}
			</View>
			<View style={[speedRangeStyles.labelsRow, { marginBottom: 0 }]}>
				<Text style={[speedRangeStyles.labelMin, { color: '#ef4444' }]}>{minSpeedKmh.toFixed(1)} km/h</Text>
				<Text style={[speedRangeStyles.labelAvg, { color: '#22c55e' }]}>{avgSpeedKmh.toFixed(1)} km/h</Text>
				<Text style={[speedRangeStyles.labelMax, { color: '#3b82f6' }]}>{maxSpeedKmh.toFixed(1)} km/h</Text>
			</View>
			<View style={[speedRangeStyles.separator, { backgroundColor: theme.screen.background }]} />
		</View>
	);
}

const speedRangeStyles = StyleSheet.create({
	container: {
		paddingHorizontal: 16,
		paddingTop: 10,
		paddingBottom: 10,
	},
	labelsRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 6,
		marginTop: 6,
	},
	labelMin: {
		fontSize: 12,
		fontWeight: '600',
		textAlign: 'left',
	},
	labelAvg: {
		fontSize: 12,
		fontWeight: '600',
		textAlign: 'center',
	},
	labelMax: {
		fontSize: 12,
		fontWeight: '600',
		textAlign: 'right',
	},
	barWrapper: {
		flexDirection: 'row',
		height: 8,
		overflow: 'hidden',
	},
	barSegment: {
		flex: 1,
		height: 8,
	},
	barSegmentFirst: {
		borderTopLeftRadius: 4,
		borderBottomLeftRadius: 4,
	},
	barSegmentLast: {
		borderTopRightRadius: 4,
		borderBottomRightRadius: 4,
	},
	separator: {
		height: StyleSheet.hairlineWidth,
		marginTop: 0,
		marginLeft: 54,
	},
});

// ─── Route Assignment Modal Content ──────────────────────────────────────────

type RouteAssignmentProps = {
	activity: SavedActivity;
	savedRoutes: SavedRoute[];
	bestMatch: RouteMatchResult | null;
	onDone: (updatedActivity: SavedActivity) => void;
	theme: ReturnType<typeof useTheme>['theme'];
};

function RouteAssignmentModalContent({ activity, savedRoutes, bestMatch, onDone, theme }: RouteAssignmentProps) {
	const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
	const [routeName, setRouteName] = useState('');

	const assignRoute = useCallback(async (routeId: string | null) => {
		// Remove activity from old route (if any)
		if (typeof activity.routeId === 'string') {
			try {
				const oldRoute = await loadRoute(activity.routeId);
				if (oldRoute) {
					const updatedIds = (oldRoute.activityIds ?? []).filter((activityId) => activityId !== activity.id);
					saveRoute({ ...oldRoute, activityIds: updatedIds });
				}
			} catch (err) {
				console.warn('[RouteAssignment] Failed to update old route activityIds:', err);
			}
		}
		// Add activity to new route (if assigning to one)
		if (typeof routeId === 'string') {
			try {
				const newRoute = await loadRoute(routeId);
				if (newRoute) {
					const updatedIds = [...new Set([...(newRoute.activityIds ?? []), activity.id])];
					saveRoute({ ...newRoute, activityIds: updatedIds });
				}
			} catch (err) {
				console.warn('[RouteAssignment] Failed to update new route activityIds:', err);
			}
		}
		const updated: SavedActivity = { ...activity, routeId };
		try {
			saveActivity(updated);
		} catch {
			Alert.alert('Fehler', 'Die Aktivität konnte nicht gespeichert werden.');
			return;
		}
		onDone(updated);
	}, [activity, onDone]);

	const createAndAssign = useCallback(async (name: string) => {
		const trimmed = name.trim();
		if (!trimmed) return;
		const h3Res = activity.h3Resolution ?? 10;
		const newRoute: SavedRoute = {
			id: String(Date.now()),
			name: trimmed,
			hexTiles: activity.hexTilesOrdered ?? [],
			h3Resolution: h3Res,
			createdAt: Date.now(),
			sportType: activity.sportType,
			walkedEdges: computeEdgesFromRoutePoints(activity.routePoints, h3Res),
		};
		try {
			saveRoute(newRoute);
		} catch {
			Alert.alert('Fehler', 'Die Route konnte nicht gespeichert werden.');
			return;
		}
		await assignRoute(newRoute.id);
	}, [activity, assignRoute]);

	return (
		<View style={routeAssignStyles.container}>
			{bestMatch && (
				<>
					<SettingsListGroupTitle title="Vorschlag" />
					<View style={[routeAssignStyles.suggestionCard, { backgroundColor: theme.screen.card ?? theme.screen.background, borderColor: PRIMARY_COLOR + '44' }]}>
						<MaterialIcons name="route" size={20} color={PRIMARY_COLOR} />
						<View style={routeAssignStyles.suggestionText}>
							<Text style={[routeAssignStyles.suggestionName, { color: theme.screen.text }]} numberOfLines={1}>
								{bestMatch.route.name}
							</Text>
							<Text style={[routeAssignStyles.suggestionMeta, { color: theme.screen.icon }]}>
								{Math.round(bestMatch.overlap * 100)} % Übereinstimmung
							</Text>
						</View>
					</View>
					<TouchableOpacity
						style={[routeAssignStyles.assignButton, { backgroundColor: PRIMARY_COLOR }]}
						onPress={() => assignRoute(bestMatch.route.id)}
						activeOpacity={0.8}
					>
						<MaterialIcons name="check" size={18} color="#ffffff" />
						<Text style={routeAssignStyles.assignButtonText}>Ja, Route zuordnen</Text>
					</TouchableOpacity>
				</>
			)}

			{savedRoutes.length > 0 && (
				<>
					<SettingsListGroupTitle title="Andere Route wählen" />
					<SettingsListSelectOption
						options={savedRoutes.map((r) => ({ id: r.id, label: r.name }))}
						selectedOption={selectedRouteId}
						selectionColor={PRIMARY_COLOR}
						onSelect={(opt: SettingsListSelectOptionItem<string>) => {
							setSelectedRouteId(opt.id);
							assignRoute(opt.id);
						}}
					/>
				</>
			)}

			<SettingsListGroupTitle title="Neue Route erstellen" />
			<View style={routeAssignStyles.newRouteInputContainer}>
				<TextInput
					style={[routeAssignStyles.newRouteInput, { color: theme.sheet.text, backgroundColor: theme.sheet.inputBg, borderColor: theme.sheet.inputBorder }]}
					placeholder="Route Name"
					placeholderTextColor={theme.sheet.placeholder}
					value={routeName}
					onChangeText={setRouteName}
					returnKeyType="done"
					blurOnSubmit
					onSubmitEditing={() => {
						Keyboard.dismiss();
						createAndAssign(routeName);
					}}
				/>
				<TouchableOpacity
					style={[routeAssignStyles.newRouteSaveButton, { backgroundColor: PRIMARY_COLOR }]}
					onPress={() => {
						Keyboard.dismiss();
						createAndAssign(routeName);
					}}
					activeOpacity={0.8}
				>
					<MaterialIcons name="check" size={18} color="#ffffff" />
					<Text style={routeAssignStyles.assignButtonText}>Speichern und zuordnen</Text>
				</TouchableOpacity>
			</View>

			<SettingsListGroupTitle title="Optionen" />
			<SettingsListSelectOptionSingle
				label="Diesem Run keine Route zuordnen"
				isSelected={false}
				selectionColor="#ef4444"
				groupPosition="single"
				onPress={() => assignRoute(null)}
			/>
		</View>
	);
}

const routeAssignStyles = StyleSheet.create({
	container: {
		paddingBottom: 24,
	},
	suggestionCard: {
		flexDirection: 'row',
		alignItems: 'center',
		marginHorizontal: 16,
		marginBottom: 8,
		padding: 12,
		borderRadius: 10,
		borderWidth: 1,
		gap: 10,
	},
	suggestionText: {
		flex: 1,
		gap: 2,
	},
	suggestionName: {
		fontSize: 15,
		fontWeight: '600',
	},
	suggestionMeta: {
		fontSize: 13,
	},
	assignButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginHorizontal: 16,
		marginBottom: 12,
		paddingVertical: 12,
		borderRadius: 10,
		gap: 6,
	},
	assignButtonText: {
		color: '#ffffff',
		fontSize: 15,
		fontWeight: '600',
	},
	newRouteInputContainer: {
		marginHorizontal: 16,
		gap: 8,
	},
	newRouteInput: {
		height: 48,
		paddingHorizontal: 16,
		borderWidth: 1,
		borderRadius: 10,
		fontSize: 14,
	},
	newRouteSaveButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
		borderRadius: 10,
		gap: 6,
	},
});

// ─── Activity Detail Screen ───────────────────────────────────────────────────

const H3_GEOJSON_ORDER = true;
const ACTIVITY_GPS_PATH_INTERPOLATION_MAX_CELLS = 10;

/**
 * Derive the sequence of unique H3 cells visited during an activity, including
 * interpolated cells for GPS gaps, and build:
 *  - a hexTileGeoJSON with one polygon per visited cell, colored by its level
 *    from the global Redux store.
 *  - a hexWalkPathGeoJSON with LineString features for each actual transition
 *    between consecutive cells.
 */
function buildActivityHexGeoJson(
	routePoints: RoutePoint[],
	h3Resolution: number,
	hexTileRecords: Record<string, HexTileRecord>,
): {
	hexTileGeoJson: { type: 'FeatureCollection'; features: object[] };
	hexWalkPathGeoJson: { type: 'FeatureCollection'; features: object[] };
} {
	const visitedCells = new Set<string>();
	const edges = new Set<string>();
	let lastCell: string | null = null;

	for (const point of routePoints) {
		try {
			const cell = latLngToCell(point.lat, point.lng, h3Resolution);
			if (!cell) continue;
			if (lastCell && cell !== lastCell) {
				try {
					const pathCells = gridPathCells(lastCell, cell);
					if (pathCells.length - 2 <= ACTIVITY_GPS_PATH_INTERPOLATION_MAX_CELLS) {
						for (let i = 0; i < pathCells.length - 1; i++) {
							const a = pathCells[i];
							const b = pathCells[i + 1];
							visitedCells.add(a);
							visitedCells.add(b);
							edges.add(a < b ? `${a}:${b}` : `${b}:${a}`);
						}
					}
				} catch {
					// Different icosahedron faces – just add direct edge
					edges.add(lastCell < cell ? `${lastCell}:${cell}` : `${cell}:${lastCell}`);
				}
			}
			visitedCells.add(cell);
			lastCell = cell;
		} catch {
			// Skip invalid GPS points
		}
	}

	// Build hex tile polygon features
	const tileFeatures: object[] = [];
	for (const cell of visitedCells) {
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

	// Build walk path LineString features
	const pathFeatures: object[] = [];
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
				geometry: { type: 'LineString', coordinates: [[aLng, aLat], [bLng, bLat]] },
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

export default function ActivityDetailScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const { theme } = useTheme();
	const router = useRouter();
	const navigation = useNavigation();
	const { show: showShareModal, close: closeModal } = useMyScrollViewModal();
	const { show: showRouteModal, close: closeRouteModal } = useMyScrollViewModal();
	const mapRef = useRef<MyMapHandle>(null);
	const [mapKey, setMapKey] = useState(0);
	const isFirstFocusRef = useRef(true);
	const [activity, setActivity] = useState<SavedActivity | null>(null);
	const [notFound, setNotFound] = useState(false);
	const [mapMounted, setMapMounted] = useState(false);
	// undefined = not yet loaded, null = no route assigned, SavedRoute = assigned route
	const [assignedRoute, setAssignedRoute] = useState<SavedRoute | null | undefined>(undefined);
	const routeCenterRef = useRef<{ lat: number; lng: number } | null>(null);
	const hexTileRecords = useSelector((state: RootState) => state.hexTiles.records);
	const walkedEdges = useSelector((state: RootState) => state.hexTiles.walkedEdges);
	const replayIsDisabled = useSelector((state: RootState) => state.replaySettings.isDisabled);
	const replaySpeed = useSelector((state: RootState) => state.replaySettings.speed);
	const dispatch = useDispatch<AppDispatch>();
	const routeModalShownRef = useRef(false);
	const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
	const isDebugMode = useDebugMode();
	const { show: showDebugModal } = useMyScrollViewModal();
	const [routeSiblingActivities, setRouteSiblingActivities] = useState<SavedActivity[]>([]);

	// Stop map-side auto-rotate and replay animation on unmount
	useEffect(() => {
		return () => {
			if (mapRef.current) {
				mapRef.current.sendToMap({ autoRotate: false });
				mapRef.current.sendToMap({ replayAnimation: null });
			}
		};
	}, []);

	// Track the user's live GPS position in the background while the replay
	// screen is open, so the current position marker stays up to date.
	useEffect(() => {
		let sub: Location.LocationSubscription | null = null;
		let active = true;

		(async () => {
			const { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== 'granted' || !active) return;

			sub = await Location.watchPositionAsync(
				{ accuracy: Location.Accuracy.Balanced, timeInterval: 3000, distanceInterval: 5 },
				(loc) => {
					mapRef.current?.sendToMap({
						userLocation: { lat: loc.coords.latitude, lng: loc.coords.longitude },
					});
				},
			);
		})();

		return () => {
			active = false;
			sub?.remove();
		};
	}, []);

	// Remount the map whenever the screen is re-focused so the auto-rotate
	// initialization flow re-runs (the screen stays mounted in the navigator
	// stack, so without this the map would not restart rotation on revisit).
	useFocusEffect(
		useCallback(() => {
			if (isFirstFocusRef.current) {
				isFirstFocusRef.current = false;
				return;
			}
			setMapMounted(false);
			setMapKey((k) => k + 1);
		}, [])
	);

	useEffect(() => {
		loadRoutes().then(setSavedRoutes).catch(() => setSavedRoutes([]));
	}, []);

	// Load all activities belonging to the same route as this activity
	useEffect(() => {
		if (!activity || typeof activity.routeId !== 'string') {
			setRouteSiblingActivities([]);
			return;
		}
		const routeId = activity.routeId;
		loadActivities()
			.then((all) => {
				const siblings = all.filter((a) => a.routeId === routeId);
				siblings.sort((a, b) => b.startedAt - a.startedAt);
				setRouteSiblingActivities(siblings);
			})
			.catch(() => setRouteSiblingActivities([]));
	}, [activity?.routeId ?? null]);

	// Show back arrow instead of drawer hamburger; use theme colors so it stays
	// visible in both light and dark mode.
	useLayoutEffect(() => {
		navigation.setOptions({
			headerStyle: { backgroundColor: theme.header.background },
			headerTintColor: theme.header.text,
			headerLeft: () => (
				<TouchableOpacity
					onPress={() => router.navigate('/activities')}
					style={styles.headerBackButton}
					activeOpacity={0.7}
				>
					<MaterialIcons name="arrow-back" size={24} color={theme.header.text} />
				</TouchableOpacity>
			),
		});
	}, [navigation, router, theme.header.background, theme.header.text]);

	useEffect(() => {
		if (!id) { setNotFound(true); return; }
		loadActivity(id)
			.then(async (a) => {
				if (!a) { setNotFound(true); return; }
				setActivity(a);

				// Load the assigned route for display
				if (typeof a.routeId === 'string') {
					loadRoute(a.routeId).then(setAssignedRoute).catch(() => setAssignedRoute(null));
				} else {
					setAssignedRoute(a.routeId === null ? null : undefined);
				}

				// If routeId has never been decided, load routes and show assignment modal
				if (a.routeId === undefined && !routeModalShownRef.current) {
					routeModalShownRef.current = true;
					let routes: SavedRoute[] = [];
					let bestMatch: RouteMatchResult | null = null;
					try {
						routes = await loadRoutes();
						if (a.hexTilesOrdered && a.hexTilesOrdered.length > 0 && a.h3Resolution != null) {
							const matches = findMatchingRoutes(a.hexTilesOrdered, routes, a.h3Resolution);
							bestMatch = matches.length > 0 ? matches[0] : null;
						}
					} catch {
						// Show modal with empty routes on error
					}
					showRouteModal({
						title: '🗺️ Route zuordnen',
						children: (
							<RouteAssignmentModalContent
								activity={a}
								savedRoutes={routes}
								bestMatch={bestMatch}
								onDone={(updated) => {
									setActivity(updated);
									if (typeof updated.routeId === 'string') {
										loadRoute(updated.routeId).then(setAssignedRoute).catch(() => setAssignedRoute(null));
									} else {
										setAssignedRoute(updated.routeId === null ? null : undefined);
									}
									loadRoutes().then(setSavedRoutes).catch(() => {});
									closeRouteModal();
								}}
								theme={theme}
							/>
						),
					});
				}
			})
			.catch(() => setNotFound(true));
	// `showRouteModal`, `closeRouteModal`, and `theme` are intentionally omitted from deps:
	// they are stable references from their hooks, and the route-modal is guarded by
	// `routeModalShownRef.current` so it must only run once per screen mount.
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id]);

	// Build speed-colored segments from route points and send along with speed range
	// so the map can interpolate red (min) → green (avg) → blue (max).
	const buildRouteSegments = useCallback((points: RoutePoint[], stats: Pick<RunStats, 'minSpeedKmh' | 'avgSpeedKmh' | 'maxSpeedKmh'>) => {
		if (points.length < 2) return null;
		const segments = [];
		for (let i = 0; i < points.length - 1; i++) {
			const a = points[i];
			const b = points[i + 1];
			// Average speed of the two endpoints; * 3.6 converts m/s → km/h
		const speedKmh = (((a.speed ?? 0) + (b.speed ?? 0)) / 2) * 3.6;
			segments.push({ coords: [[a.lng, a.lat], [b.lng, b.lat]], speedKmh });
		}
		return { segments, speedRange: { min: stats.minSpeedKmh, avg: stats.avgSpeedKmh, max: stats.maxSpeedKmh } };
	}, []);

	// Compute the bounding box of a route using a loop (avoids spread-operator stack
	// overflow for routes with thousands of GPS points).
	const computeRouteBounds = useCallback((points: RoutePoint[]) => {
		if (points.length === 0) return null;
		let minLat = points[0].lat;
		let maxLat = points[0].lat;
		let minLng = points[0].lng;
		let maxLng = points[0].lng;
		for (const p of points) {
			if (p.lat < minLat) minLat = p.lat;
			if (p.lat > maxLat) maxLat = p.lat;
			if (p.lng < minLng) minLng = p.lng;
			if (p.lng > maxLng) maxLng = p.lng;
		}
		return { minLat, maxLat, minLng, maxLng };
	}, []);

	// Once both activity and map are ready, send the route with speed segments
	useEffect(() => {
		if (!mapMounted || !activity || !mapRef.current) return;
		const result = buildRouteSegments(activity.routePoints, activity.stats);
		if (result && result.segments.length > 0) {
			mapRef.current.sendToMap({ routeSegments: result.segments, routeSpeedRange: result.speedRange });
		} else {
			// Fallback: plain route without speed coloring
			const coords = activity.routePoints.map((p) => [p.lng, p.lat]);
			mapRef.current.sendToMap({ routeCoordinates: coords });
		}

		// Send start point circle (green, on top of the route lines)
		const pts = activity.routePoints;
		if (pts.length >= 1) {
			mapRef.current.sendToMap({ routeStartPoint: [pts[0].lng, pts[0].lat] });
		}

		// Debug mode: render raw GPS measurement points as small black circles on
		// top of the route line so the sampling density is visible.
		if (isDebugMode && pts.length > 0) {
			mapRef.current.sendToMap({ debugGpsPoints: pts.map((p) => [p.lng, p.lat]) });
		} else {
			mapRef.current.sendToMap({ debugGpsPoints: null });
		}

		// Send hex tile and walk path GeoJSON so the activity screen shows the
		// same hexagon visualization as the main map, but only for the tiles
		// that were visited during this specific activity.
		if (isH3Available() && activity.routePoints.length > 0) {
			try {
				const h3Res = activity.h3Resolution ?? 10;
				const { hexTileGeoJson, hexWalkPathGeoJson } = buildActivityHexGeoJson(
					activity.routePoints,
					h3Res,
					hexTileRecords,
				);
				mapRef.current.sendToMap({ hexTileGeoJson });
				mapRef.current.sendToMap({ hexWalkPathGeoJson });
			} catch (err) {
				console.warn('[ActivityDetailScreen] Failed to build activity hex GeoJSON:', err);
			}
		}

		// Fit the camera to the full route extent
		const points = activity.routePoints;
		if (points.length >= 2) {
			const bounds = computeRouteBounds(points)!;
			const { minLat, maxLat, minLng, maxLng } = bounds;
			routeCenterRef.current = { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
			// Expand the bounding box to 1.5× the route span so the route is
			// not clipped at the edges (adds 25 % padding on every side).
			const latPad = (maxLat - minLat) * 0.25;
			const lngPad = (maxLng - minLng) * 0.25;
			mapRef.current.sendToMap({
				fitBounds: [[minLng - lngPad, minLat - latPad], [maxLng + lngPad, maxLat + latPad]],
				fitBoundsPadding: 20,
				pitch: 45,
				bearing: 0,
			});
		} else if (points.length === 1) {
			routeCenterRef.current = { lat: points[0].lat, lng: points[0].lng };
			mapRef.current.sendToMap({
				mapCenterPosition: { lat: points[0].lat, lng: points[0].lng },
				pitch: 45,
				bearing: 0,
			});
		}

		// Start smooth auto-rotate after the fitBounds animation finishes.
		// fitBounds sets pitch=45 and the correct zoom; starting auto-rotate
		// immediately would interfere with that animation.
		// We send a single message to the map HTML which runs a
		// requestAnimationFrame loop for smooth, jitter-free rotation.
		const FIT_BOUNDS_ANIMATION_DELAY_MS = 1200;
		const delayTimer = setTimeout(() => {
			if (mapRef.current) {
				mapRef.current.sendToMap({
					autoRotate: true,
					autoRotateSpeed: AUTO_ROTATE_SPEED_DEG_PER_S,
				});
			}
		}, FIT_BOUNDS_ANIMATION_DELAY_MS);

		return () => {
			clearTimeout(delayTimer);
			if (mapRef.current) {
				mapRef.current.sendToMap({ autoRotate: false });
			}
		};
	}, [mapMounted, activity, buildRouteSegments, computeRouteBounds, hexTileRecords, isDebugMode]);

	// Send enclosed tiles GeoJSON to the map (light blue fill), mirroring routes/[id].tsx
	useEffect(() => {
		if (!mapMounted || !mapRef.current || !activity) return;
		if (!isH3Available()) return;

		const EMPTY_FC = { type: 'FeatureCollection' as const, features: [] };
		// Always recompute enclosed cells from the route so that stale stored values
		// (e.g. an activity whose computed.enclosedHexTiles contains tiles from a
		// previously-detected closed loop that no longer applies) are not shown.
		// Fall back to the stored value only when there are not enough walked tiles
		// to form a polygon (legacy activities without hexTilesOrdered).
		const enclosedCells = (() => {
			if ((activity.hexTilesOrdered?.length ?? 0) >= MIN_TILES_FOR_ENCLOSED_POLYGON) {
				const h3Res = activity.h3Resolution ?? H3_RESOLUTION_FALLBACK;
				return findEnclosedCellsFromHexTiles(
					buildFullRouteTileIds(activity.hexTilesOrdered ?? [], activity.routePoints, h3Res),
					h3Res,
				);
			}
			return activity.computed?.enclosedHexTiles ?? [];
		})();

		if (enclosedCells.length === 0) {
			mapRef.current.sendToMap({ hexEnclosedGeoJson: EMPTY_FC });
			return;
		}

		const features = enclosedCells.map((cell) => {
			try {
				const boundary = cellToBoundary(cell, true);
				return {
					type: 'Feature' as const,
					geometry: { type: 'Polygon' as const, coordinates: [boundary] },
					properties: { h3Index: cell },
				};
			} catch {
				return null;
			}
		}).filter((f): f is NonNullable<typeof f> => f !== null);

		mapRef.current.sendToMap({
			hexEnclosedGeoJson: { type: 'FeatureCollection', features },
		});
	}, [mapMounted, activity]);

	// Replay: animate the activity route on the map using the raw GPS points so
	// the marker moves at the speed the route was actually recorded.
	// The WebView runs the animation loop internally; the overview auto-rotate
	// continues uninterrupted so the map keeps its normal rotation behaviour.
	useEffect(() => {
		if (replayIsDisabled || !mapMounted || !activity) {
			if (mapRef.current && mapMounted) {
				mapRef.current.sendToMap({ replayAnimation: null });
			}
			return;
		}

		// Always use the raw GPS points so the marker follows the actual recorded
		// path at the recorded speed (real timestamps).
		const points = activity.routePoints;

		if (points.length < 2) {
			mapRef.current?.sendToMap({ replayAnimation: null });
			return;
		}

		mapRef.current?.sendToMap({ replayAnimation: { points, speed: replaySpeed } });

		return () => {
			mapRef.current?.sendToMap({ replayAnimation: null });
		};
	}, [replayIsDisabled, replaySpeed, mapMounted, activity]);

	const handleReplaySpeedDown = useCallback(() => {
		const next = Math.max(REPLAY_SPEED_MIN, Math.round((replaySpeed - REPLAY_SPEED_STEP) * 10) / 10);
		dispatch(updateReplaySettings({ speed: next }));
	}, [dispatch, replaySpeed]);

	const handleReplaySpeedUp = useCallback(() => {
		const next = Math.min(REPLAY_SPEED_MAX, Math.round((replaySpeed + REPLAY_SPEED_STEP) * 10) / 10);
		dispatch(updateReplaySettings({ speed: next }));
	}, [dispatch, replaySpeed]);

	const handleReplayToggle = useCallback(() => {
		dispatch(updateReplaySettings({ isDisabled: !replayIsDisabled }));
	}, [dispatch, replayIsDisabled]);

	const handleMapMessage = useCallback((data: object) => {
		const msg = data as { tag?: string };
		if (msg.tag === 'MapComponentMounted') {
			setMapMounted(true);
		}
		// Auto-rotate is stopped automatically on the map side when user interacts
	}, []);

	const handleOpenRouteAssignment = useCallback(() => {
		if (!activity) return;
		loadRoutes().then((routes) => {
			setSavedRoutes(routes);
			let bestMatch: RouteMatchResult | null = null;
			if (activity.hexTilesOrdered && activity.hexTilesOrdered.length > 0 && activity.h3Resolution != null) {
				const matches = findMatchingRoutes(activity.hexTilesOrdered, routes, activity.h3Resolution);
				bestMatch = matches.length > 0 ? matches[0] : null;
			}
			showRouteModal({
				title: '🗺️ Route zuordnen',
				onClose: closeRouteModal,
				children: (
					<RouteAssignmentModalContent
						activity={activity}
						savedRoutes={routes}
						bestMatch={bestMatch}
						onDone={(updated) => {
							setActivity(updated);
							if (typeof updated.routeId === 'string') {
								loadRoute(updated.routeId).then(setAssignedRoute).catch(() => setAssignedRoute(null));
							} else {
								setAssignedRoute(updated.routeId === null ? null : undefined);
							}
							loadRoutes().then(setSavedRoutes).catch(() => {});
							closeRouteModal();
						}}
						theme={theme}
					/>
				),
			});
		}).catch(() => {});
	}, [activity, showRouteModal, closeRouteModal, theme]);

	const handleFilterUnrealisticPoints = useCallback(() => {
		if (!activity) return;
		const sportDef = SPORT_TYPES.find((s) => s.type === activity.sportType);
		const maxSpeed = sportDef?.maxSpeedKmh ?? 90;
		const sportLabel = sportDef?.label ?? 'Default';
		Alert.alert(
			'Filter unrealistic Points',
			`Remove GPS points that imply a speed above ${maxSpeed} km/h (${sportLabel} limit)?\n\nThis will permanently update the saved activity.`,
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Filter',
					onPress: () => {
						const filtered = filterUnrealisticPoints(activity.routePoints, maxSpeed);
						const removedCount = activity.routePoints.length - filtered.length;
						const newStats = computeActivityStats(filtered);
						const updated: SavedActivity = { ...activity, routePoints: filtered, stats: newStats };
						saveActivity(updated);
						setActivity(updated);
						Alert.alert(
							'Done',
							removedCount > 0
								? `Removed ${removedCount} unrealistic point${removedCount !== 1 ? 's' : ''}.`
								: 'No unrealistic points found.',
						);
					},
				},
			],
		);
	}, [activity]);

	const handleRecalculateComputedValues = useCallback(() => {
		if (!activity) return;
		Alert.alert(
			'Berechnete Werte neu berechnen',
			'Die berechneten Werte dieser Aktivität werden neu berechnet. Fortfahren?',
			[
				{ text: 'Abbrechen', style: 'cancel' },
				{
					text: 'Neu berechnen',
					onPress: () => {
						if (!isH3Available()) {
							Alert.alert('Nicht verfügbar', 'H3 Bibliothek ist auf diesem Gerät nicht verfügbar.');
							return;
						}
						// Always recompute enclosed tiles from the route so that stale
						// stored values are corrected. Fall back to the stored value only
						// for legacy activities that lack a hexTilesOrdered list.
						let enclosedTiles: string[];
						if (activity.hexTilesOrdered?.length) {
							const h3Res = activity.h3Resolution ?? H3_RESOLUTION_FALLBACK;
							enclosedTiles = findEnclosedCellsFromHexTiles(
								buildFullRouteTileIds(activity.hexTilesOrdered, activity.routePoints, h3Res),
								h3Res,
							);
						} else {
							enclosedTiles =
								activity.computed?.enclosedHexTiles ??
								activity.enclosedHexTiles ??
								activity.hexTilesEnclosed ??
								[];
						}
						const newComputed = computeActivityData(activity, enclosedTiles);
						const updated: SavedActivity = { ...activity, computed: newComputed };
						saveActivity(updated);
						setActivity(updated);
						Alert.alert('Fertig', 'Berechnete Werte wurden neu berechnet.');
					},
				},
			],
		);
	}, [activity]);

	const handleShare = useCallback(() => {
		if (!activity) return;
		showShareModal({
			title: '📤 Share Activity',
			children: <ShareContent activity={activity} theme={theme} />,
		});
	}, [activity, showShareModal, theme]);

	const handleDelete = useCallback(() => {
		if (!activity) return;
		showShareModal({
			title: '🗑️ Delete Activity',
			children: (
				<DeleteConfirmContent
					onConfirm={() => {
						deleteActivity(activity.id);
						closeModal();
						router.replace('/activities');
					}}
					onCancel={closeModal}
					theme={theme}
				/>
			),
		});
	}, [activity, showShareModal, closeModal, router, theme]);

	if (notFound) {
		return (
			<View style={[styles.centeredContainer, { backgroundColor: theme.screen.background }]}>
				<MaterialIcons name="error-outline" size={48} color={theme.screen.icon} />
				<Text style={[styles.notFoundText, { color: theme.screen.text }]}>Activity not found.</Text>
				<TouchableOpacity style={styles.backButton} onPress={() => router.navigate('/activities')}>
					<Text style={styles.backButtonText}>Go back</Text>
				</TouchableOpacity>
			</View>
		);
	}

	if (!activity) {
		return (
			<View style={[styles.centeredContainer, { backgroundColor: theme.screen.background }]}>
				<Text style={[styles.loadingText, { color: theme.screen.icon }]}>Loading…</Text>
			</View>
		);
	}

	const { stats } = activity;

	const routeDisplayValue = assignedRoute
		? assignedRoute.name
		: activity.routeId === null
		? 'Keine'
		: '—';

	// Compute the route centre so the map starts at the correct position immediately.
	const routeInitialCenter = (() => {
		const bounds = computeRouteBounds(activity.routePoints);
		if (!bounds) return undefined;
		return { lat: (bounds.minLat + bounds.maxLat) / 2, lng: (bounds.minLng + bounds.maxLng) / 2 };
	})();

	const statsRows: { icon: React.ComponentProps<typeof MaterialIcons>['name']; label: string; value: string }[] = [
		{ icon: 'event', label: 'Date', value: formatDate(activity.startedAt) },
		{ icon: 'access-time', label: 'Start Time', value: formatTime(activity.startedAt) },
		{ icon: 'access-time', label: 'End Time', value: formatTime(activity.endedAt) },
		{ icon: 'straighten', label: 'Distance', value: formatDistance(stats.distanceKm) },
		{ icon: 'timer', label: 'Duration', value: TimeHelper.formatDuration(stats.durationSeconds) },
		{ icon: 'speed', label: 'Pace', value: formatPace(stats.paceMinPerKm) },
		{ icon: 'speed', label: 'Avg. Speed', value: formatSpeedValue(stats.avgSpeedKmh) },
		{ icon: 'speed', label: 'Median Speed', value: formatSpeedValue(stats.medianSpeedKmh ?? 0) },
		{ icon: 'arrow-upward', label: 'Max. Speed', value: formatSpeedValue(stats.maxSpeedKmh) },
		{ icon: 'arrow-downward', label: 'Min. Speed', value: formatSpeedValue(stats.minSpeedKmh) },
		{ icon: 'local-fire-department', label: 'Calories', value: `${stats.kcal} kcal` },
		{ icon: 'directions-walk', label: 'Steps (est.)', value: stats.steps.toLocaleString() },
		{ icon: 'trending-up', label: 'Elevation Gain', value: `${Math.round(stats.elevationGainM)} m` },
		{ icon: 'trending-down', label: 'Elevation Loss', value: `${Math.round(stats.elevationLossM)} m` },
		{ icon: 'water-drop', label: 'Fluid Needs', value: `${stats.fluidNeedsMl} ml` },
		{ icon: 'place', label: 'GPS Points', value: String(activity.routePoints.length) },
		...(activity.visitedTileCount != null
			? [{ icon: 'grid-on' as React.ComponentProps<typeof MaterialIcons>['name'], label: 'Tiles Walked', value: String(activity.visitedTileCount) }]
			: []),
		...(activity.enclosedTileCount != null
			? [{ icon: 'format-shapes' as React.ComponentProps<typeof MaterialIcons>['name'], label: 'Tiles Enclosed', value: String(activity.enclosedTileCount) }]
			: []),
		...((() => {
			const hexCount = activity.computed?.hexTilesVisited.length ?? activity.hexTilesOrdered?.length ?? 0;
			if (hexCount <= 0) return [];
			const secPerTile = stats.durationSeconds / hexCount;
			const m = Math.floor(secPerTile / 60);
			const s = Math.round(secPerTile % 60);
			return [{ icon: 'schedule' as React.ComponentProps<typeof MaterialIcons>['name'], label: 'Time per Hex Tile', value: `${m}:${String(s).padStart(2, '0')} mm:ss` }];
		})()),
		...((() => {
			const h3Res = activity.h3Resolution ?? H3_RESOLUTION_FALLBACK;
			const edgeLengthM = getHexagonEdgeLengthAvg(h3Res, UNITS?.m ?? 'm');
			if (edgeLengthM <= 0) return [];
			const diameterM = Math.round(2 * edgeLengthM);
			return [{ icon: 'crop-square' as React.ComponentProps<typeof MaterialIcons>['name'], label: 'Hex Diameter', value: `${diameterM} m` }];
		})()),
	];

	// Render: statsRows[0] (Date) at 'top', then SpeedRangeItem, then statsRows.slice(1) at
	// 'middle'/'bottom'. idx within the slice runs 0…statsRows.length-2; the last item (idx
	// === statsRows.length-2) gets groupPosition='bottom' and showSeparator=false.
	return (
		<ScrollView
			style={[styles.container, { backgroundColor: theme.screen.background }]}
			contentContainerStyle={styles.scrollContent}
			showsVerticalScrollIndicator={false}
		>
			{/* Map – 1:1 square at the top */}
			<View style={styles.mapContainer}>
				<MyMap key={mapKey} ref={mapRef} onMessage={handleMapMessage} injectScript={HEX_TILE_SCRIPT} centerAtUserLocationIfNoInitialPosition={false} initialCenter={routeInitialCenter} initialPitch={45} />
			</View>

			{/* Stats list */}
			<View style={styles.statsContent}>
				<SettingsListGroupTitle title="Replay Einstellungen" />
				<SettingsListBoolean
					iconBgColor={REPLAY_COLOR}
					leftIcon={<MaterialIcons name="replay" size={22} color="#ffffff" />}
					label="Replay anzeigen"
					isEnabled={!replayIsDisabled}
					onToggle={handleReplayToggle}
					valueActive="Eingeschaltet"
					valueInactive="Ausgeschaltet"
					groupPosition="top"
				/>
				<SettingsList
					iconBgColor={REPLAY_COLOR}
					leftIcon={<MaterialIcons name="speed" size={22} color="#ffffff" />}
					label="Rückblende Geschwindigkeit"
					value={`${replaySpeed.toFixed(1)}×`}
					rightElement={
						<View style={styles.stepper}>
							<TouchableOpacity style={styles.stepBtn} onPress={handleReplaySpeedDown} activeOpacity={0.7}>
								<Ionicons name="remove" size={18} color={REPLAY_COLOR} />
							</TouchableOpacity>
							<TouchableOpacity style={styles.stepBtn} onPress={handleReplaySpeedUp} activeOpacity={0.7}>
								<Ionicons name="add" size={18} color={REPLAY_COLOR} />
							</TouchableOpacity>
						</View>
					}
					groupPosition="bottom"
				/>

				<SettingsListGroupTitle title="Aktivität Informationen" />
				{/* Date row */}
				<SettingsList
					key={statsRows[0].label}
					leftIcon={<MaterialIcons name={statsRows[0].icon} size={20} color="#ffffff" />}
					iconBackgroundColor={PRIMARY_COLOR}
					title={statsRows[0].label}
					value={statsRows[0].value}
					showSeparator
					groupPosition="top"
				/>
				{/* Speed range item – directly under Date */}
				<SpeedRangeItem
					minSpeedKmh={stats.minSpeedKmh}
					avgSpeedKmh={stats.avgSpeedKmh}
					maxSpeedKmh={stats.maxSpeedKmh}
					theme={theme}
				/>
				{/* Remaining rows */}
				{statsRows.slice(1).map((row, idx) => (
					<SettingsList
						key={row.label}
						leftIcon={<MaterialIcons name={row.icon} size={20} color="#ffffff" />}
						iconBackgroundColor={PRIMARY_COLOR}
						title={row.label}
						value={row.value}
						showSeparator={idx < statsRows.length - 2}
						groupPosition={idx === statsRows.length - 2 ? 'bottom' : 'middle'}
					/>
				))}
				<View style={styles.filterRow}>
					<SettingsList
						leftIcon={<MaterialIcons name="filter-list" size={20} color="#ffffff" />}
						iconBackgroundColor="#f59e0b"
						title="Filter unrealistic Points"
						groupPosition="top"
						showSeparator
						onPress={handleFilterUnrealisticPoints}
					/>
					<SettingsList
						leftIcon={<MaterialIcons name="calculate" size={20} color="#ffffff" />}
						iconBackgroundColor="#7c3aed"
						title="Berechnete Werte neu berechnen"
						groupPosition="bottom"
						onPress={handleRecalculateComputedValues}
					/>
				</View>
				<SettingsListGroupTitle title="Routen Information" />
				<SettingsList
					leftIcon={<MaterialIcons name="route" size={20} color="#ffffff" />}
					iconBackgroundColor={PRIMARY_COLOR}
					title="Route auswählen"
					value={routeDisplayValue}
					groupPosition={assignedRoute ? 'top' : 'single'}
					showSeparator={!!assignedRoute}
					onPress={handleOpenRouteAssignment}
				/>
				{assignedRoute && (
					<SettingsList
						leftIcon={<MaterialIcons name="open-in-new" size={20} color="#ffffff" />}
						iconBackgroundColor={PRIMARY_COLOR}
						title="Route öffnen"
						groupPosition="bottom"
					onPress={() => router.navigate(`/routes/${assignedRoute.id}`)}
					/>
				)}
				{/* ── Route statistics (only when a route is assigned) ──── */}
				{routeSiblingActivities.length > 0 && (
					<>
						<SettingsListGroupTitle title="Routen Statistiken" />
						<ActivityAggregateStatsSection activities={routeSiblingActivities} />
					</>
				)}
				<TouchableOpacity style={[styles.shareButton, { backgroundColor: PRIMARY_COLOR }]} onPress={handleShare} activeOpacity={0.8}>
					<MaterialIcons name="share" size={18} color="#ffffff" />
					<Text style={styles.shareButtonText}>Share Activity</Text>
				</TouchableOpacity>
				<TouchableOpacity style={[styles.deleteButton]} onPress={handleDelete} activeOpacity={0.8}>
					<MaterialIcons name="delete-outline" size={18} color="#ef4444" />
					<Text style={styles.deleteButtonText}>Delete Activity</Text>
				</TouchableOpacity>

				{/* ── Debug: Storage JSON (debug mode only) ───────────────── */}
				{isDebugMode && (
					<>
						<SettingsListGroupTitle title="🐛 Debug: Storage Info" />
						<SettingsList
							leftIcon={<MaterialIcons name="bug-report" size={20} color="#ffffff" />}
							iconBackgroundColor="#0f766e"
							title="Activity Store"
							value={activity.routePoints.length + ' pts'}
							showSeparator
							groupPosition="top"
							onPress={() => {
								showDebugModal({
									title: '🐛 Activity Store',
									children: (
										<View style={{ paddingBottom: 24, paddingHorizontal: 12 }}>
											<Text style={{ color: theme.screen.text, fontSize: 11, fontFamily: 'monospace' }} selectable>
												{JSON.stringify(activity, null, 2)}
											</Text>
										</View>
									),
								});
							}}
						/>
						<SettingsList
							leftIcon={<MaterialIcons name="hexagon" size={20} color="#ffffff" />}
							iconBackgroundColor="#0f766e"
							title="World Store (Hex Tiles)"
							value={Object.keys(hexTileRecords).length + ' tiles'}
							showSeparator
							groupPosition="middle"
							onPress={() => {
								// Show only tile records that belong to this activity's hex tiles
								const activityTileIds = new Set(activity.hexTilesOrdered ?? []);
								const relevantRecords: Record<string, HexTileRecord> = {};
								for (const tileId of activityTileIds) {
									if (hexTileRecords[tileId]) {
										relevantRecords[tileId] = hexTileRecords[tileId];
									}
								}
								const worldStoreData = {
									totalTiles: Object.keys(hexTileRecords).length,
									activityTiles: activityTileIds.size,
									walkedEdges: walkedEdges.length,
									relevantRecords,
								};
								showDebugModal({
									title: '🐛 World Store',
									children: (
										<View style={{ paddingBottom: 24, paddingHorizontal: 12 }}>
											<Text style={{ color: theme.screen.text, fontSize: 11, fontFamily: 'monospace' }} selectable>
												{JSON.stringify(worldStoreData, null, 2)}
											</Text>
										</View>
									),
								});
							}}
						/>
						<SettingsList
							leftIcon={<MaterialIcons name="route" size={20} color="#ffffff" />}
							iconBackgroundColor="#0f766e"
							title="Routes Store"
							value={savedRoutes.length + ' routes'}
							showSeparator
							groupPosition="middle"
							onPress={() => {
								showDebugModal({
									title: '🐛 Routes Store',
									children: (
										<View style={{ paddingBottom: 24, paddingHorizontal: 12 }}>
											<Text style={{ color: theme.screen.text, fontSize: 11, fontFamily: 'monospace' }} selectable>
												{JSON.stringify(savedRoutes, null, 2)}
											</Text>
										</View>
									),
								});
							}}
						/>
						<SettingsList
							leftIcon={<MaterialIcons name="data-object" size={20} color="#ffffff" />}
							iconBackgroundColor="#0f766e"
							title="Computed Values"
							value={activity.computed ? `${activity.computed.hexTilesVisited.length} tiles, ${activity.computed.enclosedHexTiles.length} enclosed` : 'none'}
							groupPosition="bottom"
							onPress={() => {
								showDebugModal({
									title: '🐛 Computed Values',
									children: (
										<View style={{ paddingBottom: 24, paddingHorizontal: 12 }}>
											<Text style={{ color: theme.screen.text, fontSize: 11, fontFamily: 'monospace' }} selectable>
												{JSON.stringify(activity.computed ?? null, null, 2)}
											</Text>
										</View>
									),
								});
							}}
						/>
					</>
				)}
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	scrollContent: {
		flexGrow: 1,
	},
	mapContainer: {
		width: '100%',
		aspectRatio: 1,
	},
	statsContent: {
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 32,
	},
	centeredContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 12,
		paddingHorizontal: 24,
	},
	notFoundText: {
		fontSize: 16,
		fontWeight: '600',
		textAlign: 'center',
	},
	loadingText: {
		fontSize: 15,
	},
	backButton: {
		marginTop: 8,
		backgroundColor: PRIMARY_COLOR,
		paddingVertical: 10,
		paddingHorizontal: 24,
		borderRadius: 8,
	},
	backButtonText: {
		color: '#ffffff',
		fontSize: 15,
		fontWeight: '600',
	},
	headerBackButton: {
		marginLeft: 8,
		padding: 4,
	},
	shareButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
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
	deleteButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 4,
		marginBottom: 8,
		paddingVertical: 12,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#ef4444',
		gap: 8,
	},
	deleteButtonText: {
		color: '#ef4444',
		fontSize: 15,
		fontWeight: '600',
	},
	deleteConfirmContainer: {
		paddingTop: 8,
		gap: 4,
	},
	deleteConfirmText: {
		fontSize: 15,
		lineHeight: 22,
		marginBottom: 8,
	},
	cancelButton: {
		alignItems: 'center',
		paddingVertical: 12,
		borderRadius: 10,
	},
	cancelButtonText: {
		fontSize: 15,
		fontWeight: '500',
	},
	shareCodeScroll: {
		maxHeight: 200,
		marginHorizontal: 16,
		marginTop: 12,
	},
	shareCodeContent: {
		paddingBottom: 8,
	},
	shareCodeText: {
		fontFamily: 'monospace',
		fontSize: 12,
	},
	shareQrContainer: {
		alignItems: 'center',
		marginTop: 12,
		marginBottom: 8,
	},
	shareQrHint: {
		fontSize: 13,
		textAlign: 'center',
		marginHorizontal: 16,
		marginTop: 8,
		marginBottom: 8,
	},
	filterRow: {
		marginTop: 16,
	},
	stepper: {
		flexDirection: 'row',
		gap: 4,
	},
	stepBtn: {
		width: 32,
		height: 32,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		alignItems: 'center',
		justifyContent: 'center',
	},
});
