import React, { useCallback, useLayoutEffect, useState } from 'react';
import {
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { useFocusEffect, useNavigation } from 'expo-router';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { SettingsList, SettingsListGroupTitle, useMyScrollViewModal, useTheme } from 'repo-depkit-common-ui';

import ModalTextInput from '../../components/ModalTextInput';
import SettingsListActivity from '../../components/SettingsListActivity';
import CalendarDatePickerContent from '../../components/CalendarDatePicker';
import { useDispatch } from 'react-redux';

import { loadActivities, saveActivity, SavedActivity, RoutePoint } from '../../helpers/ActivityStorage';
import { generateRandomIdSuffix } from '../../helpers/IdHelper';
import { loadRoutes, saveRoute, SavedRoute } from '../../helpers/RouteStorage';
import { isAvailable as isH3Available, latLngToCell, computeRouteLengthKm } from '../../helpers/H3Helper';
import { rebuildMapFromActivities, computeActivityData, findEnclosedCellsFromHexTiles, buildFullRouteTileIds, H3_RESOLUTION_FALLBACK, RED_LINE_GRID_RESOLUTION, MIN_TILES_FOR_ENCLOSED_POLYGON, hasForestFeature, BILLBOARD_PINE_TREE_LARGE, applyRouteBenches, synthesizeManualActivityRoutePoints } from '../../helpers/ActivityMapRebuildHelper';
import { loadHexTileFeatureCache, mergeHexTileFeatureCache, HexTileFeatureCache } from '../../helpers/HexTileFeatureStorage';
import { computeEdgesFromHexTiles, computeEdgesFromRoutePoints } from '../../helpers/RouteDisplayHelper';
import { startRun, markVisited, markEnclosed, addWalkedEdges, addWalkedEdgesRedLine, loadPersistedState, loadWalkedEdgesState, loadWalkedEdgesRedLineState, setBillboardAtAnchor } from '../../store/hexTileSlice';
import { BillboardAnchorPosition } from '../../helpers/HexTileStorage';
import { queryTileFeaturesForHexCell } from '../../helpers/TileFeatureHelper';
import { AppDispatch, store } from '../../store/store';
import useGeonexiaAlert from '../../hooks/useGeonexiaAlert';
import { findMatchingRoutes } from '../../helpers/RouteMatchingHelper';
import { buildJsonExportFilename, pickJsonFromFile, saveJsonToFile } from '../../helpers/JsonFileTransferHelper';

const PRIMARY_COLOR = '#2563eb';

// ─── Stats helpers for manual activities ─────────────────────────────────────

/** Assumed runner body weight used for calorie estimation. */
const DEFAULT_RUNNER_WEIGHT_KG = 75;
/** Energy expenditure per kg per km of running (MET-based approximation). */
const KCAL_PER_KG_PER_KM = 0.9;
/** Average stride length in metres for pace-based step count. */
const AVERAGE_STRIDE_LENGTH_METERS = 0.77;
/** Reference duration (seconds) for fluid-needs baseline. */
const FLUID_BASELINE_DURATION_SECONDS = 3600;
/** Fluid intake recommended for the reference duration (ml). */
const FLUID_BASELINE_ML = 600;

function todayString(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateStringToStartOfDay(dateStr: string): number {
	const [year, month, day] = dateStr.split('-').map(Number);
	return new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
}

function formatDateDisplay(dateStr: string): string {
	const [year, month, day] = dateStr.split('-');
	return `${day}.${month}.${year}`;
}

// ─── Import Content (shown inside bottom sheet modal) ─────────────────────────

const H3_IMPORT_RESOLUTION = 10;

function ImportContent({
	onImport,
	onImportFile,
	onCancel,
	theme,
}: {
	onImport: (code: string) => void;
	onImportFile: () => void;
	onCancel: () => void;
	theme: ReturnType<typeof useTheme>['theme'];
}) {
	const [code, setCode] = useState('');
	return (
		<View style={styles.importContainer}>
			<Text style={[styles.importDescription, { color: theme.screen.text }]}>
				Select the exported .json file from the "Export" button of another device.
			</Text>
			<TouchableOpacity
				style={[styles.importConfirmButton, { backgroundColor: PRIMARY_COLOR }]}
				onPress={onImportFile}
				activeOpacity={0.8}
			>
				<MaterialIcons name="folder-open" size={18} color="#ffffff" />
				<Text style={styles.importConfirmButtonText}>Import from File</Text>
			</TouchableOpacity>
			<Text style={[styles.importDescription, { color: theme.screen.text }]}>
				Alternatively, paste the export code from the "Share Activity" button of another run.
			</Text>
			<ModalTextInput
				style={[styles.importInput, { color: theme.screen.text, borderColor: theme.screen.text + '33', backgroundColor: theme.screen.background }]}
				placeholder="Paste export code here…"
				placeholderTextColor={theme.screen.icon}
				value={code}
				onChangeText={setCode}
				multiline
				numberOfLines={5}
				autoCapitalize="none"
				autoCorrect={false}
			/>
			<TouchableOpacity
				style={[styles.importConfirmButton, { backgroundColor: PRIMARY_COLOR, opacity: code.trim().length === 0 ? 0.4 : 1 }]}
				onPress={() => onImport(code.trim())}
				disabled={code.trim().length === 0}
				activeOpacity={0.8}
			>
				<MaterialIcons name="file-download" size={18} color="#ffffff" />
				<Text style={styles.importConfirmButtonText}>Import Run</Text>
			</TouchableOpacity>
			<TouchableOpacity style={styles.importCancelButton} onPress={onCancel} activeOpacity={0.8}>
				<Text style={[styles.importCancelButtonText, { color: theme.screen.text }]}>Cancel</Text>
			</TouchableOpacity>
		</View>
	);
}

// ─── Manual Activity: Duration Input ──────────────────────────────────────────

function ManualActivityDurationContent({
	route,
	onSave,
	onClose,
	theme,
}: {
	route: SavedRoute;
	onSave: (activity: SavedActivity) => void;
	onClose: () => void;
	theme: ReturnType<typeof useTheme>['theme'];
}) {
	const [hours, setHours] = useState('');
	const [minutes, setMinutes] = useState('');
	const [seconds, setSeconds] = useState('');
	const [selectedDate, setSelectedDate] = useState(todayString());
	const { show: showCalendarModal, close: closeCalendarModal } = useMyScrollViewModal();

	const openCalendar = () => {
		showCalendarModal({
			title: 'Datum auswählen',
			children: (
				<CalendarDatePickerContent
					selectedDate={selectedDate}
					onSelect={(dateString) => {
						setSelectedDate(dateString);
						closeCalendarModal();
					}}
				/>
			),
		});
	};

	const handleSave = () => {
		const h = Number.parseInt(hours, 10) || 0;
		const m = Number.parseInt(minutes, 10) || 0;
		const s = Number.parseInt(seconds, 10) || 0;
		const totalSeconds = h * 3600 + m * 60 + s;
		if (totalSeconds <= 0) return;

		const startedAt = dateStringToStartOfDay(selectedDate);
		const hexTilesOrdered = route.hexTiles;
		let distanceKm = 0;
		if (isH3Available()) {
			distanceKm = computeRouteLengthKm(hexTilesOrdered);
		} else {
			console.warn('[ManualActivity] H3 not available – distance defaults to 0');
		}
		const paceMinPerKm = distanceKm > 0 ? totalSeconds / 60 / distanceKm : 0;
		const kcal = Math.round(distanceKm * DEFAULT_RUNNER_WEIGHT_KG * KCAL_PER_KG_PER_KM);
		const steps = Math.round((distanceKm * 1000) / AVERAGE_STRIDE_LENGTH_METERS);
		const fluidNeedsMl = Math.round((totalSeconds / FLUID_BASELINE_DURATION_SECONDS) * FLUID_BASELINE_ML);

		// Synthesize route points from hex tile centers with evenly-distributed
		// timestamps so that rebuild / recalculate flows derive correct distance
		// and per-tile speed metrics. Points are marked interpolated: true.
		const routePoints: RoutePoint[] = synthesizeManualActivityRoutePoints(
			hexTilesOrdered,
			startedAt,
			totalSeconds * 1000,
			distanceKm,
		);

		// Pre-compute enclosed tiles so they are stored on the activity and used
		// by the map rebuild / activity detail screen.
		let enclosedHexTiles: string[] = [];
		if (isH3Available() && hexTilesOrdered.length >= MIN_TILES_FOR_ENCLOSED_POLYGON) {
			try {
				enclosedHexTiles = findEnclosedCellsFromHexTiles(hexTilesOrdered, route.h3Resolution);
			} catch {
				// ignore – enclosed tiles remain empty if detection fails
			}
		}

		const activity: SavedActivity = {
			id: `${startedAt}-${generateRandomIdSuffix()}`,
			startedAt,
			endedAt: startedAt + totalSeconds * 1000,
			routePoints,
			stats: {
				distanceKm,
				durationSeconds: totalSeconds,
				paceMinPerKm,
				maxSpeedKmh: 0,
				minSpeedKmh: 0,
				avgSpeedKmh: distanceKm > 0 && totalSeconds > 0 ? (distanceKm / totalSeconds) * 3600 : 0,
				medianSpeedKmh: 0,
				kcal,
				steps,
				elevationGainM: 0,
				elevationLossM: 0,
				fluidNeedsMl,
			},
			routeId: route.id,
			h3Resolution: route.h3Resolution,
			hexTilesOrdered,
			visitedTileCount: hexTilesOrdered.length,
			enclosedTileCount: enclosedHexTiles.length,
			enclosedHexTiles,
			isManual: true,
		};
		activity.computed = computeActivityData(activity, enclosedHexTiles);
		onSave(activity);
	};

	const totalSeconds = (Number.parseInt(hours, 10) || 0) * 3600 + (Number.parseInt(minutes, 10) || 0) * 60 + (Number.parseInt(seconds, 10) || 0);

	return (
		<View style={styles.manualContainer}>
			<SettingsList
				leftIcon={<MaterialIcons name="calendar-today" size={20} color="#ffffff" />}
				iconBackgroundColor={PRIMARY_COLOR}
				title="Datum"
				value={formatDateDisplay(selectedDate)}
				groupPosition="single"
				onPress={openCalendar}
				rightIcon={<MaterialIcons name="chevron-right" size={20} color={theme.screen.icon} />}
			/>
			<Text style={[styles.manualDescription, { color: theme.screen.text }]}>
				Dauer der Aktivität eingeben:
			</Text>
			<View style={styles.manualTimeRow}>
				<ModalTextInput
					style={[styles.manualTimeInput, { color: theme.screen.text, borderColor: theme.screen.text + '33', backgroundColor: theme.screen.background }]}
					placeholder="Std"
					placeholderTextColor={theme.screen.icon}
					value={hours}
					onChangeText={setHours}
					keyboardType="numeric"
					maxLength={2}
				/>
				<Text style={[styles.manualTimeSeparator, { color: theme.screen.text }]}>:</Text>
				<ModalTextInput
					style={[styles.manualTimeInput, { color: theme.screen.text, borderColor: theme.screen.text + '33', backgroundColor: theme.screen.background }]}
					placeholder="Min"
					placeholderTextColor={theme.screen.icon}
					value={minutes}
					onChangeText={setMinutes}
					keyboardType="numeric"
					maxLength={2}
					autoFocus
				/>
				<Text style={[styles.manualTimeSeparator, { color: theme.screen.text }]}>:</Text>
				<ModalTextInput
					style={[styles.manualTimeInput, { color: theme.screen.text, borderColor: theme.screen.text + '33', backgroundColor: theme.screen.background }]}
					placeholder="Sek"
					placeholderTextColor={theme.screen.icon}
					value={seconds}
					onChangeText={setSeconds}
					keyboardType="numeric"
					maxLength={2}
				/>
			</View>
			<TouchableOpacity
				style={[styles.manualSaveButton, { opacity: totalSeconds <= 0 ? 0.4 : 1 }]}
				onPress={handleSave}
				disabled={totalSeconds <= 0}
				activeOpacity={0.8}
			>
				<MaterialIcons name="check" size={18} color="#ffffff" />
				<Text style={styles.manualSaveButtonText}>Aktivität speichern</Text>
			</TouchableOpacity>
			<TouchableOpacity style={styles.manualCancelButton} onPress={onClose} activeOpacity={0.8}>
				<Text style={[styles.manualCancelButtonText, { color: theme.screen.text }]}>Abbrechen</Text>
			</TouchableOpacity>
		</View>
	);
}

// ─── Manual Activity: Route Selection ────────────────────────────────────────

function RouteSelectionContent({
	routes,
	onSelect,
	onClose,
	theme,
}: {
	routes: SavedRoute[];
	onSelect: (route: SavedRoute) => void;
	onClose: () => void;
	theme: ReturnType<typeof useTheme>['theme'];
}) {
	if (routes.length === 0) {
		return (
			<View style={styles.manualContainer}>
				<Text style={[styles.manualDescription, { color: theme.screen.icon, textAlign: 'center', marginTop: 16 }]}>
					Keine Routen vorhanden. Erstelle zuerst eine Route.
				</Text>
				<TouchableOpacity style={styles.manualCancelButton} onPress={onClose} activeOpacity={0.8}>
					<Text style={[styles.manualCancelButtonText, { color: theme.screen.text }]}>Schließen</Text>
				</TouchableOpacity>
			</View>
		);
	}

	return (
		<View style={styles.manualContainer}>
			<Text style={[styles.manualDescription, { color: theme.screen.text }]}>
				Route auswählen:
			</Text>
			<View>
				{routes.map((route, idx) => {
					const count = routes.length;
					const groupPosition = count === 1 ? 'single' : idx === 0 ? 'top' : idx === count - 1 ? 'bottom' : 'middle';
					return (
						<SettingsList
							key={route.id}
							leftIcon={<MaterialIcons name="route" size={20} color="#ffffff" />}
							iconBackgroundColor={PRIMARY_COLOR}
							title={route.name}
							groupPosition={groupPosition}
							showSeparator={idx < count - 1}
							onPress={() => onSelect(route)}
							rightIcon={<MaterialIcons name="chevron-right" size={20} color={theme.screen.icon} />}
						/>
					);
				})}
			</View>
			<TouchableOpacity style={styles.manualCancelButton} onPress={onClose} activeOpacity={0.8}>
				<Text style={[styles.manualCancelButtonText, { color: theme.screen.text }]}>Abbrechen</Text>
			</TouchableOpacity>
		</View>
	);
}

// ─── Activities Screen ────────────────────────────────────────────────────────

export default function ActivitiesScreen() {
	const { theme } = useTheme();
	const router = useRouter();
	const navigation = useNavigation();
	const dispatch = useDispatch<AppDispatch>();
	const { show: showImportModal, close: closeImportModal } = useMyScrollViewModal();
	const { show: showManualModal, close: closeManualModal } = useMyScrollViewModal();
	const { showAlert } = useGeonexiaAlert();
	const [activities, setActivities] = useState<SavedActivity[]>([]);
	const [routes, setRoutes] = useState<SavedRoute[]>([]);
	const [loading, setLoading] = useState(true);

	const loadData = useCallback(() => {
		setLoading(true);
		Promise.all([loadActivities(), loadRoutes()])
			.then(([acts, rts]) => {
				setActivities(acts);
				setRoutes(rts);
			})
			.finally(() => setLoading(false));
	}, []);

	// Reload when screen comes into focus (e.g. after returning from detail or record)
	useFocusEffect(loadData);

	const applyImportedHexTiles = useCallback((activity: SavedActivity) => {
		if (!isH3Available()) return;
		dispatch(startRun());
		const h3Set = new Set<string>();
		for (const point of activity.routePoints) {
			try {
				const cell = latLngToCell(point.lat, point.lng, H3_IMPORT_RESOLUTION);
				if (cell && !h3Set.has(cell)) {
					h3Set.add(cell);
					dispatch(markVisited({ h3Indices: [cell], timestamp: point.timestamp }));
				}
			} catch {
				// Skip invalid points
			}
		}
	}, [dispatch]);

	const handleImport = useCallback(async (code: string) => {
		let parsed: unknown;
		try {
			parsed = JSON.parse(code);
		} catch {
			showAlert('Import Failed', 'The code is not valid JSON.');
			return;
		}

		// Support three formats:
		//  1. New: { activities: [...], routes: [...] }
		//  2. Old: [...] (array of activities)
		//  3. Old: single activity object
		let rawActivities: unknown[];
		let exportedRoutes: SavedRoute[] = [];
		if (
			typeof parsed === 'object' &&
			parsed !== null &&
			!Array.isArray(parsed) &&
			Array.isArray((parsed as Record<string, unknown>).activities)
		) {
			const wrapper = parsed as Record<string, unknown>;
			rawActivities = wrapper.activities as unknown[];
			if (Array.isArray(wrapper.routes)) {
				exportedRoutes = wrapper.routes as SavedRoute[];
			}
		} else {
			rawActivities = Array.isArray(parsed) ? parsed : [parsed];
		}

		const validActivities: SavedActivity[] = [];
		for (const item of rawActivities) {
			const activity = item as SavedActivity;
			if (
				typeof activity.id !== 'string' ||
				typeof activity.startedAt !== 'number' ||
				!Array.isArray(activity.routePoints)
			) {
				showAlert('Import Failed', 'One or more entries do not look like valid activities.');
				return;
			}
			validActivities.push(activity);
		}

		// Build a lookup map for exported route names so new routes inherit the
		// original name instead of a generated date-based fallback.
		const exportedRouteMap = new Map(exportedRoutes.map((r) => [r.id, r]));

		// Load existing routes once so we can check for matches without
		// re-reading from disk for every activity.
		const existingRoutes = await loadRoutes();
		let routeIdOffset = 0;

		for (const activity of validActivities) {
			const hexTiles = activity.hexTilesOrdered ?? [];
			const h3Res = activity.h3Resolution ?? H3_RESOLUTION_FALLBACK;
			let routeId: string | null | undefined = activity.routeId;

			if (hexTiles.length > 0 && isH3Available()) {
				const match = findMatchingRoutes(hexTiles, existingRoutes, h3Res)[0];
				if (match) {
					// Link to the existing matching route.
					routeId = match.route.id;
					const updatedRoute: SavedRoute = {
						...match.route,
						activityIds: [...new Set([...(match.route.activityIds ?? []), activity.id])],
					};
					saveRoute(updatedRoute);
					const idx = existingRoutes.findIndex((r) => r.id === match.route.id);
					if (idx >= 0) existingRoutes[idx] = updatedRoute;
				} else {
					// No matching route on this device — create one from the imported tiles.
					// Prefer the exported route's name when available.
					const exportedRoute = activity.routeId ? exportedRouteMap.get(activity.routeId) : undefined;
					const d = new Date(activity.startedAt);
					const name = exportedRoute?.name ?? `Route ${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
					const routePoints =
						activity.routePoints.length > 0
							? activity.routePoints
							: synthesizeManualActivityRoutePoints(
								hexTiles,
								activity.startedAt,
								(activity.endedAt - activity.startedAt),
								activity.stats.distanceKm,
							);
					const newRoute: SavedRoute = {
						id: String(Date.now() + routeIdOffset++),
						name,
						hexTiles,
						h3Resolution: h3Res,
						createdAt: activity.startedAt,
						sportType: activity.sportType,
						walkedEdges: computeEdgesFromRoutePoints(routePoints, h3Res),
						walkedEdgesRedLine: computeEdgesFromRoutePoints(routePoints, RED_LINE_GRID_RESOLUTION),
						walkedEdgesRedLineResolution: RED_LINE_GRID_RESOLUTION,
						activityIds: [activity.id],
					};
					saveRoute(newRoute);
					existingRoutes.push(newRoute);
					routeId = newRoute.id;
				}
			}

			const activityToSave: SavedActivity =
				routeId !== activity.routeId ? { ...activity, routeId } : activity;
			saveActivity(activityToSave);
			applyImportedHexTiles(activityToSave);
		}
		closeImportModal();
		loadData();
		const count = validActivities.length;
		showAlert('Imported', count === 1 ? 'The run has been imported successfully.' : `${count} runs have been imported successfully.`);
	}, [applyImportedHexTiles, closeImportModal, loadData]);

	const handleExportAll = useCallback(async () => {
		const allActivities = await loadActivities();
		if (allActivities.length === 0) {
			showAlert('Nothing to Export', 'There are no activities to export.');
			return;
		}
		// Collect the routes referenced by the exported activities so the
		// receiver knows route names and can re-use them on import.
		const allRoutes = await loadRoutes();
		const referencedRouteIds = new Set(
			allActivities.map((a) => a.routeId).filter((id): id is string => typeof id === 'string'),
		);
		const exportedRoutes = allRoutes.filter((r) => referencedRouteIds.has(r.id));

		// Ensure every activity carries its id (guard against legacy saves).
		const exportedActivities = allActivities.map((a, idx) => ({
			...a,
			id: a.id ?? `${a.startedAt}-export-${idx}`,
		}));

		const json = JSON.stringify({ activities: exportedActivities, routes: exportedRoutes }, null, 2);
		try {
			const result = await saveJsonToFile(json, buildJsonExportFilename('geonexia-activities'));
			if (result === 'cancelled') return;
			const count = allActivities.length;
			showAlert('Exported', `${count} ${count === 1 ? 'activity' : 'activities'} saved as JSON file.`);
		} catch {
			showAlert('Export Failed', 'The export file could not be saved.');
		}
	}, []);

	const handleRebuildMap = useCallback(() => {
		showAlert(
			'Rebuild Map from Activities',
			'This will recalculate the explored map from all your saved activities. All tile customizations (including manually set tiles) will be reset. Continue?',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Rebuild',
					style: 'destructive',
					onPress: async () => {
						if (!isH3Available()) {
							showAlert('Not Available', 'H3 library is not available on this device.');
							return;
						}
						const allActivities = await loadActivities();
						if (allActivities.length === 0) {
							showAlert('No Activities', 'There are no activities to rebuild the map from.');
							return;
						}

						// Recompute enclosed tiles for every activity that has enough walked tiles.
						// This corrects stale stored values (e.g. open-route activities that were
						// previously recorded with a closed loop) and fills in missing data for
						// activities saved before the computed field was introduced.
						// The canonical home for enclosed-tile data is computed.enclosedHexTiles.
						// The top-level fields enclosedHexTiles / hexTilesEnclosed are legacy and
						// must never be written; they are only kept for reading old activity files.
						for (const activity of allActivities) {
							let updated = false;

							// Always recompute from the route when enough walked tiles are available.
							// Include interpolated GPS point tiles so routes closed via route
							// interpolation also form a proper closed loop for the polygon check.
							// Fall back to stored values only for legacy activities without hexTilesOrdered.
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

							if (!activity.computed) {
								activity.computed = computeActivityData(activity, enclosedTiles);
								if (activity.enclosedTileCount == null) {
									activity.enclosedTileCount = enclosedTiles.length;
								}
								updated = true;
							} else if (
								!Array.isArray(activity.computed.enclosedHexTiles) ||
								activity.computed.enclosedHexTiles.length !== enclosedTiles.length ||
								activity.computed.enclosedHexTiles.some((id, i) => id !== enclosedTiles[i])
							) {
								activity.computed = { ...activity.computed, enclosedHexTiles: enclosedTiles };
								activity.enclosedTileCount = enclosedTiles.length;
								updated = true;
							}

							if (updated) {
								try { await saveActivity(activity); } catch (err) { console.warn('[Rebuild] Failed to save migrated activity:', activity.id, err); }
							}
						}

						// Rebuild from activity data (hexTilesVisited + enclosedHexTiles),
						// applying dirt/grass terrain automatically after counting visits.
						// All existing tile state (including manual customizations) is discarded.
						const sorted = [...allActivities].sort((a, b) => a.startedAt - b.startedAt);
						const hexTileFeatureCache = await loadHexTileFeatureCache();
						const homeHexTile = store.getState().playerInformation.homeHexTile;
						const { records, walkedEdges, walkedEdgesRedLine } = rebuildMapFromActivities(sorted, hexTileFeatureCache, homeHexTile);
						const routes = await loadRoutes();
						applyRouteBenches(records, sorted, routes);
						dispatch(loadPersistedState(records));
						dispatch(loadWalkedEdgesState(walkedEdges));
						dispatch(loadWalkedEdgesRedLineState(walkedEdgesRedLine));

						// Fire-and-forget: fetch map features for enclosed-only tiles that
						// have no cached feature data yet, so the pine tree billboard can be
						// applied even when the feature cache was empty or incomplete.
						void (async () => {
							try {
								const enclosedWithoutCache = Object.entries(records)
									.filter(([hexId, rec]) => rec.enclosedCount > 0 && !rec.walkedOn && !hexTileFeatureCache[hexId])
									.map(([hexId]) => hexId);

								if (enclosedWithoutCache.length === 0) return;

								const newEntries: HexTileFeatureCache = {};
								for (const hexId of enclosedWithoutCache) {
									try {
										const features = await queryTileFeaturesForHexCell(hexId);
										newEntries[hexId] = features;
										if (hasForestFeature(features)) {
											dispatch(setBillboardAtAnchor({
												h3Index: hexId,
												anchorColor: BillboardAnchorPosition.CENTER,
												billboard: BILLBOARD_PINE_TREE_LARGE,
											}));
										}
									} catch {
										// ignore per-cell errors
									}
								}
								await mergeHexTileFeatureCache(newEntries);
							} catch (err) {
								console.warn('[Rebuild] Feature cache update failed:', err);
							}
						})();

						const count = allActivities.length;
						showAlert('Map Rebuilt', `Map rebuilt from ${count} ${count === 1 ? 'activity' : 'activities'}.`);
					},
				},
			],
		);
	}, [dispatch]);

	const handleImportFromFile = useCallback(async () => {
		let content: string | null;
		try {
			content = await pickJsonFromFile();
		} catch {
			showAlert('Import Failed', 'The selected file could not be read.');
			return;
		}
		if (content == null) return;
		await handleImport(content.trim());
	}, [handleImport]);

	const openImportModal = useCallback(() => {
		showImportModal({
			title: '📥 Import Run',
			children: (
				<ImportContent
					onImport={handleImport}
					onImportFile={handleImportFromFile}
					onCancel={closeImportModal}
					theme={theme}
				/>
			),
			keyboardShouldPersistTaps: 'handled',
		});
	}, [showImportModal, handleImport, handleImportFromFile, closeImportModal, theme]);

	const openManualActivityModal = useCallback(() => {
		if (routes.length === 0) {
			showAlert('Keine Routen', 'Erstelle zuerst eine Route, bevor du eine manuelle Aktivität hinzufügen kannst.');
			return;
		}
		showManualModal({
			title: '➕ Manuelle Aktivität',
			children: (
				<RouteSelectionContent
					routes={routes}
					onSelect={(selectedRoute) => {
						closeManualModal();
						// Show duration input in a fresh modal
						showManualModal({
							title: '⏱️ Dauer eingeben',
							keyboardShouldPersistTaps: 'handled',
							children: (
								<ManualActivityDurationContent
									route={selectedRoute}
									onSave={(activity) => {
										saveActivity(activity);
										// Add activity ID to route.activityIds
										const updatedIds = [...new Set([...(selectedRoute.activityIds ?? []), activity.id])];
										const updatedRoute = { ...selectedRoute, activityIds: updatedIds };
										saveRoute(updatedRoute);
										setRoutes((prev) => prev.map((r) => r.id === updatedRoute.id ? updatedRoute : r));
										setActivities((prev) => [activity, ...prev]);
										// Apply the route's hex tiles and edges to the in-memory map state
										if (isH3Available() && selectedRoute.hexTiles.length > 0) {
											dispatch(startRun());
											dispatch(markVisited({ h3Indices: selectedRoute.hexTiles, timestamp: activity.startedAt }));
											// Apply enclosed tiles so the map rebuild produces the correct terrain
											const enclosed = activity.computed?.enclosedHexTiles ?? activity.enclosedHexTiles ?? [];
											if (enclosed.length > 0) {
												dispatch(markEnclosed({ h3Indices: enclosed, timestamp: activity.startedAt }));
											}
											// Record hex-to-hex transitions so walk path spokes are drawn
											const hexTilesOrdered = activity.hexTilesOrdered ?? selectedRoute.hexTiles;
											const edges = computeEdgesFromHexTiles(hexTilesOrdered);
											if (edges.length > 0) {
												dispatch(addWalkedEdges(edges));
											}
											// Record red-line edges using the activity's already-computed
											// red-line route points (synthesized in handleSave).
											const edgesRedLine = computeEdgesFromRoutePoints(activity.routePoints, RED_LINE_GRID_RESOLUTION);
											if (edgesRedLine.length > 0) {
												dispatch(addWalkedEdgesRedLine(edgesRedLine));
											}
										}
										closeManualModal();
										router.push(`/activities/${activity.id}`);
									}}
									onClose={closeManualModal}
									theme={theme}
								/>
							),
						});
					}}
					onClose={closeManualModal}
					theme={theme}
				/>
			),
		});
	}, [routes, showManualModal, closeManualModal, showAlert, theme, router, dispatch]);

	// Show import, export, and rebuild buttons in the header
	useLayoutEffect(() => {
		navigation.setOptions({
			headerRight: () => (
				<View style={styles.headerButtons}>
					<TouchableOpacity onPress={handleRebuildMap} style={styles.headerImportButton} activeOpacity={0.7}>
						<MaterialIcons name="refresh" size={24} color={PRIMARY_COLOR} />
					</TouchableOpacity>
					<TouchableOpacity onPress={handleExportAll} style={styles.headerImportButton} activeOpacity={0.7}>
						<MaterialIcons name="file-upload" size={24} color={PRIMARY_COLOR} />
					</TouchableOpacity>
					<TouchableOpacity onPress={openImportModal} style={styles.headerImportButton} activeOpacity={0.7}>
						<MaterialIcons name="file-download" size={24} color={PRIMARY_COLOR} />
					</TouchableOpacity>
				</View>
			),
		});
	}, [navigation, openImportModal, handleExportAll, handleRebuildMap]);

	const handleActivityPress = useCallback((id: string) => {
		router.push(`/activities/${id}`);
	}, [router]);

	if (!loading && activities.length === 0) {
		return (
			<ScrollView style={[styles.container, { backgroundColor: theme.screen.background }]} contentContainerStyle={styles.listContent}>
				<SettingsList
					leftIcon={<MaterialIcons name="add" size={20} color="#ffffff" />}
					iconBackgroundColor="#22c55e"
					title="Manuelle Aktivität hinzufügen"
					groupPosition="single"
					onPress={openManualActivityModal}
					rightIcon={<MaterialIcons name="chevron-right" size={20} color={theme.screen.icon} />}
				/>
				<View style={styles.emptyInnerContainer}>
					<Ionicons name="fitness-outline" size={64} color={theme.screen.icon} />
					<Text style={[styles.emptyTitle, { color: theme.screen.text }]}>No activities yet</Text>
					<Text style={[styles.emptySubtitle, { color: theme.screen.icon }]}>
						Start recording to see your activities here.
					</Text>
				</View>
			</ScrollView>
		);
	}

	// Build a map from routeId → SavedRoute for quick lookups
	const routeMap = new Map<string, SavedRoute>(routes.map((r) => [r.id, r]));

	// Group activities by routeId; undefined/null go into the 'unassigned' bucket
	const groupMap = new Map<string | null, SavedActivity[]>();
	for (const activity of activities) {
		const key = activity.routeId ?? null;
		if (!groupMap.has(key)) groupMap.set(key, []);
		groupMap.get(key)!.push(activity);
	}

	// Sort groups: named routes first (by name), then unassigned last
	const assignedRouteIds = [...groupMap.keys()]
		.filter((k): k is string => k !== null)
		.sort((a, b) => {
			const nameA = routeMap.get(a)?.name ?? a;
			const nameB = routeMap.get(b)?.name ?? b;
			return nameA.localeCompare(nameB);
		});
	const groupOrder: Array<string | null> = [...assignedRouteIds];
	if (groupMap.has(null)) groupOrder.push(null);

	return (
		<ScrollView style={[styles.container, { backgroundColor: theme.screen.background }]} contentContainerStyle={styles.listContent}>
			<SettingsList
				leftIcon={<MaterialIcons name="add" size={20} color="#ffffff" />}
				iconBackgroundColor="#22c55e"
				title="Manuelle Aktivität hinzufügen"
				groupPosition="single"
				onPress={openManualActivityModal}
				rightIcon={<MaterialIcons name="chevron-right" size={20} color={theme.screen.icon} />}
			/>
			{groupOrder.map((routeId) => {
				const groupActivities = groupMap.get(routeId) ?? [];
				const routeName = routeId !== null ? (routeMap.get(routeId)?.name ?? routeId) : 'Ohne Route';
				return (
					<View key={routeId ?? '__unassigned__'}>
						<SettingsListGroupTitle title={routeName} />
						{groupActivities.map((item, idx) => {
							const count = groupActivities.length;
							const groupPosition =
								count === 1 ? 'single' : idx === 0 ? 'top' : idx === count - 1 ? 'bottom' : 'middle';
							return (
								<SettingsListActivity
									key={item.id}
									activity={item}
									groupPosition={groupPosition}
									showSeparator={idx < count - 1}
									onPress={() => handleActivityPress(item.id)}
								/>
							);
						})}
					</View>
				);
			})}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	listContent: {
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 24,
		gap: 10,
	},
	emptyContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 12,
		paddingHorizontal: 32,
	},
	emptyInnerContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		gap: 12,
		paddingHorizontal: 32,
		paddingTop: 48,
	},
	emptyTitle: {
		fontSize: 20,
		fontWeight: '700',
	},
	emptySubtitle: {
		fontSize: 14,
		textAlign: 'center',
		lineHeight: 20,
	},
	headerImportButton: {
		marginRight: 4,
		padding: 4,
	},
	headerButtons: {
		flexDirection: 'row',
		alignItems: 'center',
		marginRight: 8,
		gap: 4,
	},
	importContainer: {
		paddingTop: 4,
		gap: 12,
	},
	importDescription: {
		fontSize: 14,
		lineHeight: 20,
	},
	importInput: {
		borderWidth: 1,
		borderRadius: 8,
		padding: 10,
		fontSize: 12,
		fontFamily: 'monospace',
		minHeight: 100,
		textAlignVertical: 'top',
	},
	importConfirmButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
		borderRadius: 10,
		gap: 8,
	},
	importConfirmButtonText: {
		color: '#ffffff',
		fontSize: 15,
		fontWeight: '600',
	},
	importCancelButton: {
		alignItems: 'center',
		paddingVertical: 10,
		borderRadius: 10,
	},
	importCancelButtonText: {
		fontSize: 15,
		fontWeight: '500',
	},
	manualContainer: {
		paddingTop: 4,
		gap: 12,
	},
	manualDescription: {
		fontSize: 14,
		lineHeight: 20,
	},
	manualTimeRow: {
		flexDirection: 'row',
		gap: 8,
		alignItems: 'center',
	},
	manualTimeInput: {
		flex: 1,
		borderWidth: 1,
		borderRadius: 8,
		padding: 10,
		fontSize: 16,
		textAlign: 'center',
	},
	manualTimeSeparator: {
		fontSize: 20,
		fontWeight: '700',
	},
	manualSaveButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
		borderRadius: 10,
		backgroundColor: '#2563eb',
		gap: 8,
	},
	manualSaveButtonText: {
		color: '#ffffff',
		fontSize: 15,
		fontWeight: '600',
	},
	manualCancelButton: {
		alignItems: 'center',
		paddingVertical: 10,
		borderRadius: 10,
	},
	manualCancelButtonText: {
		fontSize: 15,
		fontWeight: '500',
	},
});
