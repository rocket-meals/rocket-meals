import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
	Keyboard,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';

import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { MyMap, MyMapHandle, QrCode, SettingsList, SettingsListBoolean, SettingsListBoxplot, SettingsListGroupTitle, SettingsListSelectOption, SettingsListSelectOptionItem, SettingsListSelectOptionSingle, useMyScrollViewModal, useTheme } from 'repo-depkit-common-ui';
import { computeBoxplotStats, DateHelper } from 'repo-depkit-common';
import { useDispatch, useSelector } from 'react-redux';

import { deleteActivity, getEffectiveEnclosedHexTiles, loadActivity, loadActivities, RoutePoint, RunStats, saveActivity, SavedActivity, WEATHER_TYPES, WeatherType, ActivityRating } from '../../helpers/ActivityStorage';
import { SavedRoute, loadRoute, loadRoutes, saveRoute } from '../../helpers/RouteStorage';
import { RouteMatchResult, findMatchingRoutes } from '../../helpers/RouteMatchingHelper';
import { HEX_TILE_SCRIPT } from '../../assets/hexTileScript';
import { SPORT_TYPES } from '../../store/sportTypeSlice';
import { isAvailable as isH3Available, latLngToCell, cellToBoundary, gridPathCells, getHexagonEdgeLengthAvg, UNITS } from '../../helpers/H3Helper';
import { HexTileRecord } from '../../helpers/HexTileStorage';
import { computeEdgesFromRoutePoints, computeHexBounds } from '../../helpers/RouteDisplayHelper';
import ActivityAggregateStatsSection from '../../components/ActivityAggregateStatsSection';
import ModalTextInput from '../../components/ModalTextInput';
import type { RootState, AppDispatch } from '../../store/store';
import { updateReplaySettings } from '../../store/replaySettingsSlice';
import { updateDisplaySettings } from '../../store/displaySettingsSlice';
import { useDebugMode } from '../../hooks/useDebugMode';
import { computeActivityData, findEnclosedCellsFromHexTiles, buildFullRouteTileIds, H3_RESOLUTION_FALLBACK, RED_LINE_GRID_RESOLUTION, MIN_TILES_FOR_ENCLOSED_POLYGON, synthesizeManualActivityRoutePoints } from '../../helpers/ActivityMapRebuildHelper';
import useGeonexiaAlert from '../../hooks/useGeonexiaAlert';
import { buildJsonExportFilename, saveJsonToFile } from '../../helpers/JsonFileTransferHelper';
import { snapToRoad, ROUTE_SMOOTHING_WINDOWS } from '../../helpers/RouteSmootherHelper';
import { fetchRoadWaysForBounds, matchRouteToRoads } from '../../helpers/RoadMatchHelper';
import type { RoadWay } from '../../helpers/RoadMatchHelper';

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
/** Speed variation of ±this many km/h around the median counts as "normal"/green, both in the boxplot and on the map. */
const SPEED_BAND_KMH = 1;

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
function computeSegmentSpeedKmh(prev: RoutePoint, curr: RoutePoint, segKm: number): number {
	const dtSec = (curr.timestamp - prev.timestamp) / 1000;
	const derivedSpeedKmh = dtSec > 0 ? (segKm / dtSec) * 3600 : 0;
	const gpsSpeed = curr.speed;
	return gpsSpeed != null && gpsSpeed >= 0 ? gpsSpeed * 3.6 : derivedSpeedKmh;
}

/**
 * Accumulate distance, elevation change and per-segment speeds across the
 * given points. Extracted from computeActivityStats() to keep that function's
 * cognitive complexity manageable.
 */
function accumulateDistanceElevationAndSpeeds(
	points: RoutePoint[],
	startTimestamp: number,
): { distanceKm: number; elevationGainM: number; elevationLossM: number; speedsKmh: number[] } {
	let distanceKm = 0;
	let elevationGainM = 0;
	let elevationLossM = 0;
	const speedsKmh: number[] = [];
	for (let i = 1; i < points.length; i++) {
		const prev = points[i - 1];
		const curr = points[i];
		const segKm = haversineKm(prev.lat, prev.lng, curr.lat, curr.lng);
		distanceKm += segKm;

		const { gainM, lossM } = computeElevationDelta(prev.altitude, curr.altitude);
		elevationGainM += gainM;
		elevationLossM += lossM;

		const segSpeedKmh = computeSegmentSpeedKmh(prev, curr, segKm);
		if (curr.timestamp - startTimestamp >= SPEED_WARMUP_MS && segSpeedKmh > 0) {
			speedsKmh.push(segSpeedKmh);
		}
	}
	return { distanceKm, elevationGainM, elevationLossM, speedsKmh };
}

/**
 * Smooth the given speed samples with a trailing moving-average window.
 * Extracted from computeActivityStats() to keep that function's cognitive
 * complexity manageable.
 */
function computeWindowedSpeeds(speedsKmh: number[], windowSize: number): number[] {
	const windowedSpeeds: number[] = [];
	let windowSum = 0;
	for (let i = 0; i < speedsKmh.length; i++) {
		windowSum += speedsKmh[i];
		if (i >= windowSize) windowSum -= speedsKmh[i - windowSize];
		windowedSpeeds.push(windowSum / Math.min(i + 1, windowSize));
	}
	return windowedSpeeds;
}

function computeActivityStats(points: RoutePoint[]): RunStats {
	if (points.length < 2) {
		const durationSeconds = points.length === 1 ? (Date.now() - points[0].timestamp) / 1000 : 0;
		return {
			distanceKm: 0, durationSeconds, paceMinPerKm: 0,
			maxSpeedKmh: 0, minSpeedKmh: 0, avgSpeedKmh: 0, medianSpeedKmh: 0,
			q1SpeedKmh: 0, q3SpeedKmh: 0,
			kcal: 0, steps: 0, elevationGainM: 0, elevationLossM: 0, fluidNeedsMl: 0,
		};
	}
	const startTimestamp = points[0].timestamp;
	const { distanceKm, elevationGainM, elevationLossM, speedsKmh } =
		accumulateDistanceElevationAndSpeeds(points, startTimestamp);
	const durationSeconds = (points.at(-1)!.timestamp - points[0].timestamp) / 1000;
	const paceMinPerKm = distanceKm > 0 ? durationSeconds / 60 / distanceKm : 0;
	const windowedSpeeds = computeWindowedSpeeds(speedsKmh, SPEED_WINDOW_SIZE);
	// min/max/median/q1/q3 AND avg all come from the same windowed speed samples,
	// so they can never contradict each other (e.g. avg ending up below min, which
	// happened when avg was separately computed as a raw distance/time ratio while
	// min/max used the smoothed window - two different underlying data sets).
	const { min: minSpeedKmh, q1: q1SpeedKmh, median: medianSpeedKmh, q3: q3SpeedKmh, max: maxSpeedKmh } = computeBoxplotStats(windowedSpeeds);
	const avgSpeedKmh = windowedSpeeds.length > 0
		? windowedSpeeds.reduce((sum, v) => sum + v, 0) / windowedSpeeds.length
		: 0;
	const kcal = Math.round(distanceKm * DEFAULT_RUNNER_WEIGHT_KG * KCAL_PER_KG_PER_KM);
	const steps = Math.round((distanceKm * 1000) / AVERAGE_STRIDE_LENGTH_METERS);
	const fluidNeedsMl = Math.round((durationSeconds / FLUID_BASELINE_DURATION_SECONDS) * FLUID_BASELINE_ML);
	return {
		distanceKm, durationSeconds, paceMinPerKm,
		maxSpeedKmh, minSpeedKmh, avgSpeedKmh, medianSpeedKmh,
		q1SpeedKmh, q3SpeedKmh,
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
	if (minPerKm <= 0 || !Number.isFinite(minPerKm)) return '--:-- min/km';
	const m = Math.floor(minPerKm);
	const s = Math.round((minPerKm - m) * 60);
	return `${m}:${String(s).padStart(2, '0')} min/km`;
}

function formatSpeedValue(kmh: number): string {
	return `${formatPace(60 / kmh)}\n${kmh.toFixed(1)} km/h`;
}

// ─── Share Content (shown inside bottom sheet modal) ──────────────────────────

const QR_MAX_BYTES = 2953;

function ShareContent({ activity, theme }: Readonly<{ activity: SavedActivity; theme: ReturnType<typeof useTheme>['theme'] }>) {
	const compact = JSON.stringify(activity);
	const pretty = JSON.stringify(activity, null, 2);
	const showQr = compact.length <= QR_MAX_BYTES;
	const { showAlert } = useGeonexiaAlert();

	const handleSaveFile = useCallback(async () => {
		try {
			const result = await saveJsonToFile(pretty, buildJsonExportFilename('geonexia-activity'));
			if (result === 'saved') showAlert('Exported', 'Activity data saved as JSON file.');
		} catch {
			showAlert('Export Failed', 'The export file could not be saved.');
		}
	}, [pretty]);

	const handleCopy = useCallback(async () => {
		await Clipboard.setStringAsync(compact);
		showAlert('Copied', 'Activity data copied to clipboard.');
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
}: Readonly<{
	onConfirm: () => void;
	onCancel: () => void;
	theme: ReturnType<typeof useTheme>['theme'];
}>) {
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

// ─── Temperature Input Content (shown inside bottom sheet modal) ──────────────

function TemperatureInputContent({
	currentValue,
	onSave,
	onClose,
	theme,
}: Readonly<{
	currentValue: number | null;
	onSave: (value: string) => void;
	onClose: () => void;
	theme: ReturnType<typeof useTheme>['theme'];
}>) {
	const [text, setText] = useState(currentValue != null ? String(currentValue) : '');
	return (
		<View style={{ paddingTop: 4, gap: 12 }}>
			<Text style={{ fontSize: 14, lineHeight: 20, color: theme.screen.text }}>
				Temperatur in °C eingeben (leer lassen zum Entfernen):
			</Text>
			<ModalTextInput
				style={{ borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 16, color: theme.screen.text, borderColor: theme.screen.text + '33', backgroundColor: theme.screen.background }}
				placeholder="z.B. 18"
				placeholderTextColor={theme.screen.icon}
				value={text}
				onChangeText={setText}
				keyboardType="numeric"
				autoFocus
			/>
			<TouchableOpacity
				style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#2563eb', gap: 8 }}
				onPress={() => { onSave(text); onClose(); }}
				activeOpacity={0.8}
			>
				<MaterialIcons name="check" size={18} color="#ffffff" />
				<Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '600' }}>Speichern</Text>
			</TouchableOpacity>
			<TouchableOpacity style={{ alignItems: 'center', paddingVertical: 10 }} onPress={onClose} activeOpacity={0.8}>
				<Text style={{ fontSize: 15, fontWeight: '500', color: theme.screen.text }}>Abbrechen</Text>
			</TouchableOpacity>
		</View>
	);
}

// ─── Weather Type Picker Content (shown inside bottom sheet modal) ─────────────

function WeatherTypePickerContent({
	currentValue,
	onSelect,
	onClose,
	theme,
}: Readonly<{
	currentValue: WeatherType | null;
	onSelect: (type: WeatherType | null) => void;
	onClose: () => void;
	theme: ReturnType<typeof useTheme>['theme'];
}>) {
	return (
		<View style={{ paddingTop: 4, gap: 8 }}>
			{WEATHER_TYPES.map((w) => (
				<TouchableOpacity
					key={w.type}
					style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, backgroundColor: currentValue === w.type ? '#2563eb22' : 'transparent' }}
					onPress={() => { onSelect(w.type); onClose(); }}
					activeOpacity={0.7}
				>
					<MaterialIcons name={w.icon as React.ComponentProps<typeof MaterialIcons>['name']} size={24} color={currentValue === w.type ? '#2563eb' : theme.screen.icon} />
					<Text style={{ marginLeft: 12, fontSize: 16, color: currentValue === w.type ? '#2563eb' : theme.screen.text, fontWeight: currentValue === w.type ? '600' : '400' }}>{w.label}</Text>
					{currentValue === w.type && <MaterialIcons name="check" size={20} color="#2563eb" style={{ marginLeft: 'auto' }} />}
				</TouchableOpacity>
			))}
			{currentValue != null && (
				<TouchableOpacity
					style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10 }}
					onPress={() => { onSelect(null); onClose(); }}
					activeOpacity={0.7}
				>
					<MaterialIcons name="close" size={24} color="#ef4444" />
					<Text style={{ marginLeft: 12, fontSize: 16, color: '#ef4444' }}>Entfernen</Text>
				</TouchableOpacity>
			)}
		</View>
	);
}

// ─── Route Assignment Modal Content ──────────────────────────────────────────

type RouteAssignmentProps = {
	activity: SavedActivity;
	savedRoutes: SavedRoute[];
	bestMatch: RouteMatchResult | null;
	onDone: (updatedActivity: SavedActivity) => void;
	theme: ReturnType<typeof useTheme>['theme'];
};

function RouteAssignmentModalContent({ activity, savedRoutes, bestMatch, onDone, theme }: Readonly<RouteAssignmentProps>) {
	const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
	const [routeName, setRouteName] = useState('');
	const { showAlert } = useGeonexiaAlert();

	const assignRoute = useCallback(async (routeId: string | null) => {
		// Remove activity from old route (if any)
		if (typeof activity.routeId === 'string') {
			try {
				const oldRoute = await loadRoute(activity.routeId);
				if (oldRoute) {
					const updatedIds = (oldRoute.activityIds ?? []).filter((activityId) => activityId !== activity.id);
					await saveRoute({ ...oldRoute, activityIds: updatedIds });
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
					await saveRoute({ ...newRoute, activityIds: updatedIds });
				}
			} catch (err) {
				console.warn('[RouteAssignment] Failed to update new route activityIds:', err);
			}
		}
		const updated: SavedActivity = { ...activity, routeId };
		try {
			await saveActivity(updated);
		} catch {
			showAlert('Fehler', 'Die Aktivität konnte nicht gespeichert werden.');
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
			walkedEdgesRedLine: computeEdgesFromRoutePoints(activity.routePoints, RED_LINE_GRID_RESOLUTION),
			walkedEdgesRedLineResolution: RED_LINE_GRID_RESOLUTION,
		};
		try {
			await saveRoute(newRoute);
		} catch {
			showAlert('Fehler', 'Die Route konnte nicht gespeichert werden.');
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
				<ModalTextInput
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

/** Mark all cells on the H3 grid path between two adjacent visited cells, unless the gap is too large. */
function addInterpolatedCellsIfClose(
	lastCell: string,
	cell: string,
	maxInterpolationCells: number,
	visitedCells: Set<string>,
): void {
	try {
		const pathCells = gridPathCells(lastCell, cell);
		if (pathCells.length - 2 > maxInterpolationCells) {
			return;
		}
		for (const c of pathCells) visitedCells.add(c);
	} catch {
		// Different icosahedron faces; just mark the two endpoints
	}
}

/** Resolve a single GPS point to its H3 cell, mark it (and any interpolated gap cells) as visited. */
function visitHexCellForPoint(
	point: RoutePoint,
	h3Resolution: number,
	lastCell: string | null,
	maxInterpolationCells: number,
	visitedCells: Set<string>,
): string | null {
	try {
		const cell = latLngToCell(point.lat, point.lng, h3Resolution);
		if (!cell) {
			return lastCell;
		}
		if (lastCell && cell !== lastCell) {
			addInterpolatedCellsIfClose(lastCell, cell, maxInterpolationCells, visitedCells);
		}
		visitedCells.add(cell);
		return cell;
	} catch {
		return lastCell; // Skip invalid GPS points
	}
}

/**
 * Walk the route's GPS points and derive the sequence of unique H3 cells
 * visited, including interpolated cells for GPS gaps. Extracted from
 * buildActivityHexGeoJson() to keep that function's cognitive complexity
 * manageable.
 */
function computeVisitedHexCells(
	routePoints: RoutePoint[],
	h3Resolution: number,
	maxInterpolationCells: number,
): Set<string> {
	const visitedCells = new Set<string>();
	let lastCell: string | null = null;

	for (const point of routePoints) {
		lastCell = visitHexCellForPoint(point, h3Resolution, lastCell, maxInterpolationCells, visitedCells);
	}

	return visitedCells;
}

/**
 * Build one hex tile GeoJSON polygon Feature per given H3 cell, colored by
 * its level from the global Redux store. Extracted from
 * buildActivityHexGeoJson() (and reused for the manual-activity variant) to
 * keep the cognitive complexity of its callers manageable.
 */
function buildHexTileFeaturesFromCells(
	cells: Iterable<string>,
	hexTileRecords: Record<string, HexTileRecord>,
): object[] {
	const tileFeatures: object[] = [];
	for (const cell of cells) {
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
	return tileFeatures;
}

/**
 * Derive the sequence of unique H3 cells visited during an activity, including
 * interpolated cells for GPS gaps, and build a hexTileGeoJSON with one polygon
 * per visited cell (at `h3Resolution`, typically h10), colored by its level
 * from the global Redux store.
 */
function buildActivityHexGeoJson(
	routePoints: RoutePoint[],
	h3Resolution: number,
	hexTileRecords: Record<string, HexTileRecord>,
): {
	hexTileGeoJson: { type: 'FeatureCollection'; features: object[] };
} {
	const visitedCells = computeVisitedHexCells(routePoints, h3Resolution, ACTIVITY_GPS_PATH_INTERPOLATION_MAX_CELLS);
	const tileFeatures = buildHexTileFeaturesFromCells(visitedCells, hexTileRecords);

	return {
		hexTileGeoJson: { type: 'FeatureCollection', features: tileFeatures },
	};
}

/**
 * Compute the lat/lng bounding box covering all boundary points of the given
 * H3 cells, used to filter GPS points/roads/ways for test-case export.
 */
function computeSelectedHexTilesBounds(selectedHexIds: string[]): {
	minLat: number;
	maxLat: number;
	minLng: number;
	maxLng: number;
} {
	let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
	for (const h3Index of selectedHexIds) {
		for (const [lat, lng] of cellToBoundary(h3Index)) {
			if (lat < minLat) minLat = lat;
			if (lat > maxLat) maxLat = lat;
			if (lng < minLng) minLng = lng;
			if (lng > maxLng) maxLng = lng;
		}
	}
	return { minLat, maxLat, minLng, maxLng };
}

function ActivityDetailBackHeaderButton({ color, onPress }: Readonly<{ color: string; onPress: () => void }>) {
	return (
		<TouchableOpacity
			onPress={onPress}
			style={styles.headerBackButton}
			activeOpacity={0.7}
		>
			<MaterialIcons name="arrow-back" size={24} color={color} />
		</TouchableOpacity>
	);
}

function makeActivityDetailHeaderLeft(color: string, onPress: () => void) {
	return () => <ActivityDetailBackHeaderButton color={color} onPress={onPress} />;
}

/**
 * Migrate an activity saved before the `computed` field was introduced by
 * deriving and persisting it. Returns the activity unchanged if migration is
 * not applicable or fails. Extracted from the activity-loading effect to keep
 * its cognitive complexity manageable.
 */
async function migrateActivityComputedField(a: SavedActivity): Promise<SavedActivity> {
	if (a.computed || (a.hexTilesOrdered?.length ?? 0) === 0 || !isH3Available()) {
		return a;
	}
	try {
		const h3Res = a.h3Resolution ?? H3_RESOLUTION_FALLBACK;
		const enclosed = a.hexTilesOrdered!.length >= MIN_TILES_FOR_ENCLOSED_POLYGON
			? findEnclosedCellsFromHexTiles(
				buildFullRouteTileIds(a.hexTilesOrdered!, a.routePoints, h3Res),
				h3Res,
			)
			: getEffectiveEnclosedHexTiles(a);
		const computedData = computeActivityData(a, enclosed);
		const updated = { ...a, computed: computedData };
		saveActivity(updated);
		return updated;
	} catch {
		// Migration failed; continue without computed
		return a;
	}
}

/**
 * Migrate an activity saved before the speed boxplot quartiles were
 * introduced by deriving and persisting them. Returns the activity unchanged
 * if migration is not applicable. Extracted from the activity-loading effect
 * to keep its cognitive complexity manageable.
 */
function migrateActivityStatsQuartiles(a: SavedActivity): SavedActivity {
	if (a.stats.q1SpeedKmh !== undefined && a.stats.q3SpeedKmh !== undefined) {
		return a;
	}
	const { q1SpeedKmh, q3SpeedKmh } = computeActivityStats(a.routePoints);
	const updated = { ...a, stats: { ...a.stats, q1SpeedKmh, q3SpeedKmh } };
	saveActivity(updated);
	return updated;
}

/**
 * Straßen/Wege mode: the GPS-connected track is not rendered at all. The
 * road-match effect sends the road-matched line as speed-colored
 * routeSegments once the road network has been fetched.
 */
function clearActivityRouteSegmentsOnMap(mapHandle: MyMapHandle): void {
	mapHandle.sendToMap({ routeSegments: null, routeCoordinates: null });
}

/**
 * Send the (possibly smoothed) GPS-connected route line to the map,
 * speed-colored when segment data is available. Extracted from the "send
 * route to map" effect to keep its cognitive complexity manageable.
 */
function sendActivityGpsRouteSegmentsToMap(
	mapHandle: MyMapHandle,
	displayCoords: [number, number][],
	result: { segments: { coords: number[][]; speedKmh: number }[]; speedRange: unknown } | null,
): void {
	if (result && result.segments.length > 0) {
		// Rebuild segments using the (possibly smoothed) display coordinates
		// while preserving the speed value from each original segment.
		const smoothedSegments = result.segments.map((seg, i) => ({
			...seg,
			coords: [displayCoords[i], displayCoords[i + 1]] as [[number, number], [number, number]],
		}));
		// Also clear the plain track line so a previously shown raw-GPS
		// straight-line route does not linger under the colored segments.
		mapHandle.sendToMap({ routeSegments: smoothedSegments, routeSpeedRange: result.speedRange, routeCoordinates: null });
	} else {
		// Fallback: plain route without speed coloring
		mapHandle.sendToMap({ routeCoordinates: displayCoords });
	}
}

/**
 * Send hex tile GeoJSON to the map, either derived from the GPS route or (for
 * manual activities without GPS points) from the ordered hex tile list.
 * Extracted from the "send route to map" effect to keep its cognitive
 * complexity manageable.
 */
function sendActivityHexTileGeoJsonToMap(
	mapHandle: MyMapHandle,
	activity: SavedActivity,
	hexTileRecords: Record<string, HexTileRecord>,
): void {
	if (isH3Available() && activity.routePoints.length > 0) {
		try {
			const h3Res = activity.h3Resolution ?? 10;
			const { hexTileGeoJson } = buildActivityHexGeoJson(
				activity.routePoints,
				h3Res,
				hexTileRecords,
			);
			mapHandle.sendToMap({ hexTileGeoJson });
		} catch (err) {
			console.warn('[ActivityDetailScreen] Failed to build activity hex GeoJSON:', err);
		}
	} else if (isH3Available() && activity.isManual && (activity.hexTilesOrdered?.length ?? 0) > 0) {
		// Manual activity has no GPS points – build the hex tile GeoJSON
		// directly from the ordered hex tile list.
		try {
			const tileFeatures = buildHexTileFeaturesFromCells(activity.hexTilesOrdered!, hexTileRecords);
			mapHandle.sendToMap({ hexTileGeoJson: { type: 'FeatureCollection', features: tileFeatures } });
		} catch (err) {
			console.warn('[ActivityDetailScreen] Failed to build manual activity hex GeoJSON:', err);
		}
	}
}

/**
 * Compute the camera fit (center + fitBounds/mapCenterPosition map message)
 * for an activity's route, falling back to the hex tile bounding box for
 * manual activities without GPS points. Returns null when there is nothing
 * to fit to. Extracted from the "send route to map" effect to keep its
 * cognitive complexity manageable.
 */
function computeActivityCameraFit(
	activity: SavedActivity,
	computeRouteBoundsFn: (points: RoutePoint[]) => { minLat: number; maxLat: number; minLng: number; maxLng: number } | null,
): { center: { lat: number; lng: number }; mapMessage: Record<string, unknown> } | null {
	const points = activity.routePoints;
	if (points.length >= 2) {
		const bounds = computeRouteBoundsFn(points)!;
		const { minLat, maxLat, minLng, maxLng } = bounds;
		const center = { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
		// Expand the bounding box to 1.5× the route span so the route is
		// not clipped at the edges (adds 25 % padding on every side).
		// Use at least 0.001 deg (~100 m) so very short routes don't get
		// a degenerate zero-size bounding box that fitBounds ignores.
		const latPad = Math.max((maxLat - minLat) * 0.25, 0.001);
		const lngPad = Math.max((maxLng - minLng) * 0.25, 0.001);
		return {
			center,
			mapMessage: {
				fitBounds: [[minLng - lngPad, minLat - latPad], [maxLng + lngPad, maxLat + latPad]],
				fitBoundsPadding: 20,
				pitch: 45,
				bearing: 0,
			},
		};
	}
	if (points.length === 1) {
		const center = { lat: points[0].lat, lng: points[0].lng };
		return {
			center,
			mapMessage: { mapCenterPosition: center, pitch: 45, bearing: 0 },
		};
	}
	if (activity.isManual && (activity.hexTilesOrdered?.length ?? 0) >= 1) {
		// Manual activity: fit the camera to the hex tile bounding box
		const hexBounds = computeHexBounds(activity.hexTilesOrdered!);
		if (hexBounds) {
			const { minLat, maxLat, minLng, maxLng } = hexBounds;
			const center = { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
			const latPad = Math.max((maxLat - minLat) * 0.25, 0.001);
			const lngPad = Math.max((maxLng - minLng) * 0.25, 0.001);
			return {
				center,
				mapMessage: {
					fitBounds: [[minLng - lngPad, minLat - latPad], [maxLng + lngPad, maxLat + latPad]],
					fitBoundsPadding: 20,
					pitch: 45,
					bearing: 0,
				},
			};
		}
	}
	return null;
}

/**
 * Load the saved routes and find the best matching route for the given
 * activity, for pre-filling the route-assignment modal. Returns empty
 * results on error (the modal is then shown with empty routes). Extracted
 * from the activity-loading effect to keep its cognitive complexity
 * manageable.
 */
async function resolveRouteAssignmentCandidates(
	a: SavedActivity,
): Promise<{ routes: SavedRoute[]; bestMatch: RouteMatchResult | null }> {
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
	return { routes, bestMatch };
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
	const routeSmoothingLevel = useSelector((state: RootState) => state.displaySettings.routeSmoothingLevel);
	const showGpsPoints = useSelector((state: RootState) => state.displaySettings.showGpsPoints);
	const showRawGpsRoute = useSelector((state: RootState) => state.displaySettings.showRawGpsRoute);
	const showRoadMatch = useSelector((state: RootState) => state.displaySettings.showRoadMatch);
	const roadMatchJunctionMode = useSelector((state: RootState) => state.displaySettings.roadMatchJunctionMode);
	const dispatch = useDispatch<AppDispatch>();
	const routeModalShownRef = useRef(false);
	const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);

	// Shared onDone handler for RouteAssignmentModalContent: applies the user's route
	// choice, refreshes the assigned-route display and the saved-routes list, then closes.
	const handleRouteAssignmentDone = useCallback((updated: SavedActivity) => {
		setActivity(updated);
		if (typeof updated.routeId === 'string') {
			loadRoute(updated.routeId).then(setAssignedRoute).catch(() => setAssignedRoute(null));
		} else {
			setAssignedRoute(updated.routeId === null ? null : undefined);
		}
		loadRoutes().then(setSavedRoutes).catch(() => {});
		closeRouteModal();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const isDebugMode = useDebugMode();
	const { showAlert } = useGeonexiaAlert();
	const { show: showDebugModal } = useMyScrollViewModal();
	const [routeSiblingActivities, setRouteSiblingActivities] = useState<SavedActivity[]>([]);
	// Road-match test-case export tooling (debug): lets a developer tap hex tiles
	// to select an area, then export the raw GPS points + road-matched line +
	// road network within that area as JSON, for building RoadMatchHelper test cases.
	const [testExportMode, setTestExportMode] = useState(false);
	const [selectedHexIds, setSelectedHexIds] = useState<string[]>([]);
	const [lastRoadWays, setLastRoadWays] = useState<RoadWay[] | null>(null);
	const [lastMatchedRoadCoords, setLastMatchedRoadCoords] = useState<[number, number][] | null>(null);

	// Stop map-side auto-rotate and replay animation on unmount
	useEffect(() => {
		return () => {
			if (mapRef.current) {
				mapRef.current.sendToMap({ autoRotate: false });
				mapRef.current.sendToMap({ replayAnimation: null });
			}
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
			headerLeft: makeActivityDetailHeaderLeft(theme.header.text, () => router.navigate('/activities')),
		});
	}, [navigation, router, theme.header.background, theme.header.text]);

	useEffect(() => {
		if (!id) { setNotFound(true); return; }
		loadActivity(id)
			.then(async (a) => {
				if (!a) { setNotFound(true); return; }

				// Migrate activities saved before the computed field was introduced.
				// Compute and persist it so subsequent loads skip this step.
				a = await migrateActivityComputedField(a);

				// Migrate activities saved before the speed boxplot quartiles were introduced.
				a = migrateActivityStatsQuartiles(a);

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
					const { routes, bestMatch } = await resolveRouteAssignmentCandidates(a);
					showRouteModal({
						title: '🗺️ Route zuordnen',
						children: (
							<RouteAssignmentModalContent
								activity={a}
								savedRoutes={routes}
								bestMatch={bestMatch}
								onDone={handleRouteAssignmentDone}
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

	// Build speed-colored segments from route points and send along with the speed
	// boxplot's median/band, so the map can color each segment the same way the
	// speed boxplot does: below median-band → red, within median±band → green,
	// above median+band → blue.
	const buildRouteSegments = useCallback((points: RoutePoint[], stats: Pick<RunStats, 'minSpeedKmh' | 'maxSpeedKmh' | 'medianSpeedKmh'>) => {
		if (points.length < 2) return null;
		const segments = [];
		for (let i = 0; i < points.length - 1; i++) {
			const a = points[i];
			const b = points[i + 1];
			// Average speed of the two endpoints; * 3.6 converts m/s → km/h
		const speedKmh = (((a.speed ?? 0) + (b.speed ?? 0)) / 2) * 3.6;
			segments.push({ coords: [[a.lng, a.lat], [b.lng, b.lat]], speedKmh });
		}
		return {
			segments,
			speedRange: {
				min: stats.minSpeedKmh,
				median: stats.medianSpeedKmh ?? (stats.minSpeedKmh + stats.maxSpeedKmh) / 2,
				band: SPEED_BAND_KMH,
				max: stats.maxSpeedKmh,
			},
		};
	}, []);

	// Build speed-colored segments along the road-matched line so that the road
	// rendering uses the same red/green/blue speed gradient as the raw GPS track.
	// The matched line has a different (usually higher) point count than the raw
	// track, so each matched point takes the speed of the raw GPS point it
	// originated from, tracked with a monotone forward sweep (both lines follow
	// the same path in the same order).
	const buildRoadMatchedSegments = useCallback((matchedCoords: [number, number][], points: RoutePoint[]) => {
		if (matchedCoords.length < 2 || points.length === 0) return [];
		const distSq = (coord: [number, number], p: RoutePoint) => {
			const dLng = coord[0] - p.lng;
			const dLat = coord[1] - p.lat;
			return dLng * dLng + dLat * dLat;
		};
		const speedsKmh: number[] = [];
		let rawIdx = 0;
		for (const coord of matchedCoords) {
			while (rawIdx < points.length - 1 && distSq(coord, points[rawIdx + 1]) <= distSq(coord, points[rawIdx])) {
				rawIdx++;
			}
			speedsKmh.push((points[rawIdx].speed ?? 0) * 3.6);
		}
		const segments: { coords: [[number, number], [number, number]]; speedKmh: number }[] = [];
		for (let i = 0; i < matchedCoords.length - 1; i++) {
			segments.push({
				coords: [matchedCoords[i], matchedCoords[i + 1]],
				speedKmh: (speedsKmh[i] + speedsKmh[i + 1]) / 2,
			});
		}
		return segments;
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

	// When enabled, fetch the real road/path network around the route and snap
	// the raw GPS points onto it, so the map shows the actual street/path that
	// was likely walked instead of the raw track. The matched line replaces the
	// GPS track entirely and is rendered with the same red/green/blue speed
	// gradient as the raw track (via the routeSegments layer), not in yellow.
	useEffect(() => {
		// Raw-GPS mode overrides road matching – the plain straight-line track is shown instead.
		if (!showRoadMatch || showRawGpsRoute || !mapMounted || !activity || !mapRef.current) {
			mapRef.current?.sendToMap({ matchedRoadCoordinates: null });
			setLastRoadWays(null);
			setLastMatchedRoadCoords(null);
			return;
		}
		const bounds = computeRouteBounds(activity.routePoints);
		if (!bounds) return;

		let cancelled = false;
		const marginDeg = 0.01; // ~1km padding so nearby roads just outside the route's bbox are still found
		fetchRoadWaysForBounds({
			minLat: bounds.minLat - marginDeg,
			minLng: bounds.minLng - marginDeg,
			maxLat: bounds.maxLat + marginDeg,
			maxLng: bounds.maxLng + marginDeg,
		})
			.then((ways) => {
				if (cancelled) return;
				const rawCoords: [number, number][] = activity.routePoints.map((p) => [p.lng, p.lat]);
				const matched = matchRouteToRoads(rawCoords, ways, { junctionMode: roadMatchJunctionMode });
				// The dedicated yellow road-match layer stays hidden; the matched
				// line is shown speed-colored through the routeSegments layer.
				mapRef.current?.sendToMap({ matchedRoadCoordinates: null });
				const roadSegments = buildRoadMatchedSegments(matched, activity.routePoints);
				const speedRange = buildRouteSegments(activity.routePoints, activity.stats)?.speedRange;
				if (roadSegments.length > 0 && speedRange) {
					mapRef.current?.sendToMap({ routeSegments: roadSegments, routeSpeedRange: speedRange });
				}
				setLastRoadWays(ways);
				setLastMatchedRoadCoords(matched);
			})
			.catch((err) => {
				console.warn('[ActivityDetailScreen] Failed to match route to roads:', err);
			});

		return () => { cancelled = true; };
	}, [showRoadMatch, showRawGpsRoute, mapMounted, activity, computeRouteBounds, roadMatchJunctionMode, buildRoadMatchedSegments, buildRouteSegments]);

	// Highlight the hex tiles selected for test-case export.
	useEffect(() => {
		if (!mapMounted || !mapRef.current) return;
		if (selectedHexIds.length === 0) {
			mapRef.current.sendToMap({ selectedHexTilesGeoJson: null });
			return;
		}
		const features = selectedHexIds
			.map((h3Index) => {
				const boundary = cellToBoundary(h3Index, H3_GEOJSON_ORDER);
				if (boundary.length === 0) return null;
				return {
					type: 'Feature',
					geometry: { type: 'Polygon', coordinates: [[...boundary, boundary[0]]] },
					properties: { h3Index },
				};
			})
			.filter((f): f is NonNullable<typeof f> => f !== null);
		mapRef.current.sendToMap({ selectedHexTilesGeoJson: { type: 'FeatureCollection', features } });
	}, [mapMounted, selectedHexIds]);

	// Debug tool: bundles the raw GPS points, the road-matched line, and the
	// underlying road network within the selected hex tiles' bounding box into
	// JSON on the clipboard, for building RoadMatchHelper regression test cases.
	const handleExportTestCase = useCallback(async () => {
		if (!activity || selectedHexIds.length === 0) return;

		const { minLat, maxLat, minLng, maxLng } = computeSelectedHexTilesBounds(selectedHexIds);
		const inBounds = (lat: number, lng: number) => lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;

		const filteredRoutePoints = activity.routePoints.filter((p) => inBounds(p.lat, p.lng));
		const filteredMatchedRoadCoordinates = (lastMatchedRoadCoords ?? []).filter(([lng, lat]) => inBounds(lat, lng));
		const filteredWays = (lastRoadWays ?? []).filter((way) => way.points.some(([lng, lat]) => inBounds(lat, lng)));

		const testCase = {
			hexIds: selectedHexIds,
			bounds: { minLat, minLng, maxLat, maxLng },
			roadMatchJunctionMode,
			routePoints: filteredRoutePoints,
			matchedRoadCoordinates: filteredMatchedRoadCoordinates,
			ways: filteredWays,
		};

		await Clipboard.setStringAsync(JSON.stringify(testCase, null, 2));
		showAlert(
			'Testfall exportiert',
			`${filteredRoutePoints.length} GPS-Punkte, ${filteredMatchedRoadCoordinates.length} Linienpunkte und ${filteredWays.length} Straßen/Wege in die Zwischenablage kopiert.`,
		);
	}, [activity, selectedHexIds, lastMatchedRoadCoords, lastRoadWays, roadMatchJunctionMode, showAlert]);

	// Once both activity and map are ready, send the route with speed segments
	useEffect(() => {
		if (!mapMounted || !activity || !mapRef.current) return;

		// Apply centre-line projection when route smoothing is enabled.
		// We compute smoothed [lng, lat] coordinates and use those for display
		// while keeping the original speed values from the raw route points.
		// In raw-GPS mode the smoothing is skipped entirely.
		const rawCoords: [number, number][] = activity.routePoints.map((p) => [p.lng, p.lat]);
		const displayCoords: [number, number][] = !showRawGpsRoute && routeSmoothingLevel !== 'off'
			? snapToRoad(rawCoords, activity.routePoints.map((p) => !!p.interpolated), ROUTE_SMOOTHING_WINDOWS[routeSmoothingLevel])
			: rawCoords;

		const result = buildRouteSegments(activity.routePoints, activity.stats);
		if (showRawGpsRoute) {
			// Raw-GPS mode: connect the raw GPS points with plain straight lines
			// (no smoothing, no speed coloring, no road match).
			mapRef.current.sendToMap({ routeSegments: null, routeCoordinates: rawCoords });
		} else if (showRoadMatch) {
			clearActivityRouteSegmentsOnMap(mapRef.current);
		} else {
			sendActivityGpsRouteSegmentsToMap(mapRef.current, displayCoords, result);
		}

		// Send start point circle (green, on top of the route lines)
		const pts = activity.routePoints;
		if (pts.length >= 1) {
			mapRef.current.sendToMap({ routeStartPoint: displayCoords[0] });
		}

		// Render raw GPS measurement points as small black circles on top of the
		// route line when the "GPS-Punkte anzeigen" setting or the raw-GPS route
		// mode is enabled.
		if ((showGpsPoints || showRawGpsRoute) && pts.length > 0) {
			mapRef.current.sendToMap({ debugGpsPoints: pts.map((p) => [p.lng, p.lat]) });
		} else {
			mapRef.current.sendToMap({ debugGpsPoints: null });
		}

		// The red-line walk path (h12, legacy h11) is never shown on the activity
		// screen – the speed-colored GPS track (or road-matched line) already
		// represents the route. Send an empty collection to clear the map layer.
		mapRef.current.sendToMap({ hexWalkPathGeoJson: { type: 'FeatureCollection', features: [] } });

		// Send hex tile GeoJSON so the activity screen shows the same hexagon
		// visualization as the main map, but only for the tiles that were
		// visited during this specific activity.
		sendActivityHexTileGeoJsonToMap(mapRef.current, activity, hexTileRecords);

		// Fit the camera to the full route extent
		const cameraFit = computeActivityCameraFit(activity, computeRouteBounds);
		if (cameraFit) {
			routeCenterRef.current = cameraFit.center;
			mapRef.current.sendToMap(cameraFit.mapMessage);
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
	}, [mapMounted, activity, buildRouteSegments, computeRouteBounds, hexTileRecords, showGpsPoints, showRawGpsRoute, routeSmoothingLevel, showRoadMatch]);

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
	// For manual activities that have no GPS points, synthetic points are
	// derived from the hex tile centres with evenly-distributed timestamps.
	useEffect(() => {
		if (replayIsDisabled || !mapMounted || !activity) {
			if (mapRef.current && mapMounted) {
				mapRef.current.sendToMap({ replayAnimation: null });
			}
			return;
		}

		// For manual activities without GPS points, synthesize route points from
		// hex tile centres with evenly-distributed timestamps so the replay
		// marker can still traverse the walked path.
		let points: typeof activity.routePoints = activity.routePoints;
		if (points.length < 2 && activity.isManual && (activity.hexTilesOrdered?.length ?? 0) >= 2 && isH3Available()) {
			const durationMs = (activity.endedAt ?? activity.startedAt + activity.stats.durationSeconds * 1000) - activity.startedAt;
			points = synthesizeManualActivityRoutePoints(
				activity.hexTilesOrdered!,
				activity.startedAt,
				durationMs,
				activity.stats.distanceKm,
			);
		}

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
		const msg = data as { tag?: string; h3Index?: string };
		if (msg.tag === 'MapComponentMounted') {
			setMapMounted(true);
		}
		if (msg.tag === 'HexTileClicked' && testExportMode && msg.h3Index) {
			const h3Index = msg.h3Index;
			setSelectedHexIds((prev) => (prev.includes(h3Index) ? prev.filter((id) => id !== h3Index) : [...prev, h3Index]));
		}
		// Auto-rotate is stopped automatically on the map side when user interacts
	}, [testExportMode]);

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
						onDone={handleRouteAssignmentDone}
						theme={theme}
					/>
				),
			});
		}).catch(() => {});
	}, [activity, showRouteModal, closeRouteModal, theme, handleRouteAssignmentDone]);

	const handleFilterUnrealisticPoints = useCallback(() => {
		if (!activity) return;
		const sportDef = SPORT_TYPES.find((s) => s.type === activity.sportType);
		const maxSpeed = sportDef?.maxSpeedKmh ?? 90;
		const sportLabel = sportDef?.label ?? 'Default';
		showAlert(
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
						const pointsSuffix = removedCount !== 1 ? 's' : '';
						showAlert(
							'Done',
							removedCount > 0
								? `Removed ${removedCount} unrealistic point${pointsSuffix}.`
								: 'No unrealistic points found.',
						);
					},
				},
			],
		);
	}, [activity]);

	const handleRecalculateComputedValues = useCallback(() => {
		if (!activity) return;
		showAlert(
			'Berechnete Werte neu berechnen',
			'Die berechneten Werte dieser Aktivität werden neu berechnet. Fortfahren?',
			[
				{ text: 'Abbrechen', style: 'cancel' },
				{
					text: 'Neu berechnen',
					onPress: () => {
						if (!isH3Available()) {
							showAlert('Nicht verfügbar', 'H3 Bibliothek ist auf diesem Gerät nicht verfügbar.');
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
						showAlert('Fertig', 'Berechnete Werte wurden neu berechnet.');
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

	// ── Weather & Rating handlers ─────────────────────────────────────────────
	const handleWeatherTemperatureChange = useCallback((value: string) => {
		if (!activity) return;
		const trimmed = value.trim();
		const numVal = trimmed === '' ? null : Number.parseFloat(trimmed);
		if (trimmed !== '' && (numVal === null || Number.isNaN(numVal))) return;
		const updated: SavedActivity = { ...activity, weatherTemperature: numVal };
		saveActivity(updated);
		setActivity(updated);
	}, [activity]);

	const handleWeatherTypeChange = useCallback((type: WeatherType | null) => {
		if (!activity) return;
		const updated: SavedActivity = { ...activity, weatherType: type };
		saveActivity(updated);
		setActivity(updated);
	}, [activity]);

	const handleRatingChange = useCallback((newRating: ActivityRating | null) => {
		if (!activity) return;
		// Tap same star again → clear rating
		const updated: SavedActivity = { ...activity, rating: activity.rating === newRating ? null : newRating };
		saveActivity(updated);
		setActivity(updated);
	}, [activity]);

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

	const noRouteDisplayValue = activity.routeId === null ? 'Keine' : '—';
	const routeDisplayValue = assignedRoute ? assignedRoute.name : noRouteDisplayValue;

	const currentWeatherDef = activity.weatherType ? WEATHER_TYPES.find(w => w.type === activity.weatherType) : null;

	// Compute the route centre so the map starts at the correct position immediately.
	// For manual activities without GPS points, fall back to the hex tile bounding box centre.
	const routeInitialCenter = (() => {
		const bounds = computeRouteBounds(activity.routePoints);
		if (bounds) return { lat: (bounds.minLat + bounds.maxLat) / 2, lng: (bounds.minLng + bounds.maxLng) / 2 };
		if (activity.isManual && (activity.hexTilesOrdered?.length ?? 0) > 0 && isH3Available()) {
			const hexBounds = computeHexBounds(activity.hexTilesOrdered!);
			if (hexBounds) return { lat: (hexBounds.minLat + hexBounds.maxLat) / 2, lng: (hexBounds.minLng + hexBounds.maxLng) / 2 };
		}
		return undefined;
	})();

	const statsRows: { icon: React.ComponentProps<typeof MaterialIcons>['name']; label: string; value: string }[] = [
		{ icon: 'event', label: 'Date', value: formatDate(activity.startedAt) },
		{ icon: 'access-time', label: 'Start Time', value: formatTime(activity.startedAt) },
		{ icon: 'access-time', label: 'End Time', value: formatTime(activity.endedAt) },
		{ icon: 'straighten', label: 'Distance', value: formatDistance(stats.distanceKm) },
		{ icon: 'timer', label: 'Duration', value: DateHelper.formatDurationFromSeconds(stats.durationSeconds) },
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

	// Render: statsRows[0] (Date) at 'top', then the speed boxplot, then
	// statsRows.slice(1) at 'middle'/'bottom'. idx within the slice runs
	// 0…statsRows.length-2; the last item (idx === statsRows.length-2) gets
	// groupPosition='bottom' and showSeparator=false.
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

				<SettingsListGroupTitle title="Darstellung" />
				<SettingsListBoolean
					iconBgColor={PRIMARY_COLOR}
					leftIcon={<MaterialIcons name="timeline" size={22} color="#ffffff" />}
					label="Nur GPS-Punkte (gerade Linien)"
					isEnabled={showRawGpsRoute}
					onToggle={() => dispatch(updateDisplaySettings({ showRawGpsRoute: !showRawGpsRoute }))}
					valueActive="Eingeschaltet"
					valueInactive="Ausgeschaltet"
					groupPosition="single"
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
				{/* Speed boxplot – collapsed explanation, expands on tap */}
				<SettingsListBoxplot
					iconBackgroundColor={PRIMARY_COLOR}
					leftIcon={<MaterialIcons name="ssid-chart" size={20} color="#ffffff" />}
					title="Geschwindigkeitsverteilung"
					stats={{
						min: stats.minSpeedKmh,
						q1: stats.q1SpeedKmh ?? stats.minSpeedKmh,
						median: stats.medianSpeedKmh ?? stats.avgSpeedKmh,
						q3: stats.q3SpeedKmh ?? stats.maxSpeedKmh,
						max: stats.maxSpeedKmh,
					}}
					medianBandValue={SPEED_BAND_KMH}
					formatValue={(value) => `${value.toFixed(1)} km/h`}
					description={`Grün = Geschwindigkeit innerhalb von ±${SPEED_BAND_KMH.toFixed(1)} km/h um den Median (die normale Schwankung). Langsamer als das ist rot, schneller ist blau – dieselben Farben werden für die Streckenlinie auf der Karte verwendet.`}
					groupPosition="middle"
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
				<SettingsListGroupTitle title="Testfall-Export (Debug)" />
				<SettingsListBoolean
					leftIcon={<MaterialIcons name="touch-app" size={20} color="#ffffff" />}
					iconBgColor="#9333ea"
					label="Hex-Tiles auswählen"
					valueActive="Eingeschaltet"
					valueInactive="Ausgeschaltet"
					isEnabled={testExportMode}
					onToggle={() => {
						setTestExportMode((v) => !v);
						setSelectedHexIds([]);
					}}
					groupPosition="top"
				/>
				<SettingsList
					leftIcon={<MaterialIcons name="ios-share" size={20} color="#ffffff" />}
					iconBackgroundColor="#9333ea"
					title="Auswahl exportieren"
					value={`${selectedHexIds.length} Tile${selectedHexIds.length === 1 ? '' : 's'}`}
					groupPosition="bottom"
					onPress={handleExportTestCase}
				/>
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

				{/* ── Weather & Rating ──────────────────────────────────── */}
				<SettingsListGroupTitle title="Wetter & Bewertung" />
				<SettingsList
					leftIcon={<MaterialIcons name="thermostat" size={20} color="#ffffff" />}
					iconBackgroundColor="#f59e0b"
					title="Temperatur"
					value={activity.weatherTemperature != null ? `${activity.weatherTemperature} °C` : '—'}
					groupPosition="top"
					showSeparator
					onPress={() => {
						showShareModal({
							title: '🌡️ Temperatur',
							keyboardShouldPersistTaps: 'handled',
							children: (
								<TemperatureInputContent
									currentValue={activity.weatherTemperature ?? null}
									onSave={handleWeatherTemperatureChange}
									onClose={closeModal}
									theme={theme}
								/>
							),
						});
					}}
				/>
				<SettingsList
					leftIcon={<MaterialIcons name={(currentWeatherDef?.icon ?? 'cloud') as React.ComponentProps<typeof MaterialIcons>['name']} size={20} color="#ffffff" />}
					iconBackgroundColor="#3b82f6"
					title="Wetter"
					value={currentWeatherDef?.label ?? '—'}
					groupPosition="middle"
					showSeparator
					onPress={() => {
						showShareModal({
							title: '🌤️ Wetter',
							children: (
								<WeatherTypePickerContent
									currentValue={activity.weatherType ?? null}
									onSelect={handleWeatherTypeChange}
									onClose={closeModal}
									theme={theme}
								/>
							),
						});
					}}
				/>
				<View style={ratingStyles.ratingRow}>
					<View style={[ratingStyles.ratingRowInner, { backgroundColor: theme.screen.iconBg }]}>
						<View style={ratingStyles.ratingLabelRow}>
							<View style={[ratingStyles.ratingIconBg, { backgroundColor: '#eab308' }]}>
								<MaterialIcons name="star" size={20} color="#ffffff" />
							</View>
							<Text style={[ratingStyles.ratingLabel, { color: theme.screen.text }]}>Bewertung</Text>
						</View>
						<View style={ratingStyles.starsRow}>
							{([1, 2, 3, 4, 5] as ActivityRating[]).map((star) => (
								<TouchableOpacity key={star} onPress={() => handleRatingChange(star)} activeOpacity={0.7}>
									<MaterialIcons
										name={activity.rating != null && star <= activity.rating ? 'star' : 'star-border'}
										size={32}
										color="#eab308"
									/>
								</TouchableOpacity>
							))}
						</View>
					</View>
				</View>

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

const ratingStyles = StyleSheet.create({
	ratingRow: {
		marginTop: 0,
	},
	ratingRowInner: {
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	ratingLabelRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	ratingIconBg: {
		width: 30,
		height: 30,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
	},
	ratingLabel: {
		fontSize: 15,
		fontWeight: '500',
	},
	starsRow: {
		flexDirection: 'row',
		gap: 2,
	},
});

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
