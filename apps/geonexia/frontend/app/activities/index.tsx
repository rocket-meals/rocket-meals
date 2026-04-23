import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { useFocusEffect, useNavigation } from 'expo-router';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { SettingsListGroupTitle, SettingsListSelectOption, SettingsListSelectOptionSingle, useMyScrollViewModal, useTheme } from 'repo-depkit-common-ui';

import SettingsListActivity from '../../components/SettingsListActivity';
import ActivityCalendarSheet from '../../components/ActivityCalendarSheet';
import { useDispatch } from 'react-redux';

import { loadActivities, saveActivity, SavedActivity } from '../../helpers/ActivityStorage';
import { loadRoutes, SavedRoute } from '../../helpers/RouteStorage';
import { isAvailable as isH3Available, latLngToCell } from '../../helpers/H3Helper';
import { rebuildMapFromActivities, computeActivityData, findEnclosedCellsFromHexTiles, buildFullRouteTileIds, H3_RESOLUTION_FALLBACK, MIN_TILES_FOR_ENCLOSED_POLYGON, hasForestFeature, BILLBOARD_PINE_TREE_LARGE, applyRouteBenches } from '../../helpers/ActivityMapRebuildHelper';
import { loadHexTileFeatureCache, mergeHexTileFeatureCache, HexTileFeatureCache } from '../../helpers/HexTileFeatureStorage';
import { startRun, markVisited, loadPersistedState, loadWalkedEdgesState, setBillboardAtAnchor } from '../../store/hexTileSlice';
import { BillboardAnchorPosition } from '../../helpers/HexTileStorage';
import { queryTileFeaturesForHexCell } from '../../helpers/TileFeatureHelper';
import { AppDispatch, store } from '../../store/store';
import useGeonexiaAlert from '../../hooks/useGeonexiaAlert';
import { useTranslation } from '../../hooks/useTranslation';
import { GeonexiaTranslationKeys } from '../../locales/keys';
import { SPORT_TYPES, SportType } from '../../store/sportTypeSlice';
import { timestampToDateStr } from '../../helpers/DateHelper';

const PRIMARY_COLOR = '#2563eb';

// ─── Sort & Filter types ──────────────────────────────────────────────────────

type SortField = 'date' | 'distance' | 'duration' | 'pace';
type SortDirection = 'asc' | 'desc';

type ActivityFilters = {
	fromDate: string | null; // 'YYYY-MM-DD'
	toDate: string | null; // 'YYYY-MM-DD'
	sportType: SportType | null; // null = all
	routeId: string | null | undefined; // undefined = all, null = unassigned, string = specific route
};

const DEFAULT_SORT_FIELD: SortField = 'date';
const DEFAULT_SORT_DIRECTION: SortDirection = 'desc';

function applyFilters(activities: SavedActivity[], filters: ActivityFilters): SavedActivity[] {
	return activities.filter((a) => {
		if (filters.fromDate) {
			const activityDate = timestampToDateStr(a.startedAt);
			if (activityDate < filters.fromDate) return false;
		}
		if (filters.toDate) {
			const activityDate = timestampToDateStr(a.startedAt);
			if (activityDate > filters.toDate) return false;
		}
		if (filters.sportType !== null) {
			if (a.sportType !== filters.sportType) return false;
		}
		if (filters.routeId !== undefined) {
			if (filters.routeId === null) {
				// Show only unassigned activities
				if (a.routeId != null) return false;
			} else {
				if (a.routeId !== filters.routeId) return false;
			}
		}
		return true;
	});
}

function sortActivities(activities: SavedActivity[], field: SortField, direction: SortDirection): SavedActivity[] {
	const sorted = [...activities].sort((a, b) => {
		let cmp = 0;
		switch (field) {
			case 'date':
				cmp = a.startedAt - b.startedAt;
				break;
			case 'distance':
				cmp = a.stats.distanceKm - b.stats.distanceKm;
				break;
			case 'duration':
				cmp = a.stats.durationSeconds - b.stats.durationSeconds;
				break;
			case 'pace':
				cmp = a.stats.paceMinPerKm - b.stats.paceMinPerKm;
				break;
		}
		return direction === 'asc' ? cmp : -cmp;
	});
	return sorted;
}

// ─── Sort Modal Content ───────────────────────────────────────────────────────

function SortModalContent({
	sortField,
	sortDirection,
	onFieldChange,
	onDirectionChange,
	translate,
}: {
	sortField: SortField;
	sortDirection: SortDirection;
	onFieldChange: (f: SortField) => void;
	onDirectionChange: (d: SortDirection) => void;
	translate: (key: GeonexiaTranslationKeys) => string;
}) {
	const sortFieldOptions: { id: SortField; label: string; icon: React.ReactNode }[] = [
		{ id: 'date', label: translate(GeonexiaTranslationKeys.date), icon: <MaterialIcons name="calendar-today" size={18} color="#ffffff" /> },
		{ id: 'distance', label: translate(GeonexiaTranslationKeys.distance), icon: <MaterialIcons name="straighten" size={18} color="#ffffff" /> },
		{ id: 'duration', label: translate(GeonexiaTranslationKeys.duration), icon: <MaterialIcons name="timer" size={18} color="#ffffff" /> },
		{ id: 'pace', label: translate(GeonexiaTranslationKeys.pace), icon: <MaterialIcons name="speed" size={18} color="#ffffff" /> },
	];

	const directionOptions: { id: SortDirection; label: string; icon: React.ReactNode }[] = [
		{ id: 'asc', label: translate(GeonexiaTranslationKeys.ascending), icon: <MaterialIcons name="arrow-upward" size={18} color="#ffffff" /> },
		{ id: 'desc', label: translate(GeonexiaTranslationKeys.descending), icon: <MaterialIcons name="arrow-downward" size={18} color="#ffffff" /> },
	];

	return (
		<View style={{ gap: 16, paddingBottom: 8 }}>
			<SettingsListGroupTitle title={translate(GeonexiaTranslationKeys.sort_by)} />
			<SettingsListSelectOption
				options={sortFieldOptions}
				selectedOption={sortField}
				onSelect={(opt) => onFieldChange(opt.id)}
				iconBgColor={PRIMARY_COLOR}
				selectionColor={PRIMARY_COLOR}
			/>
			<SettingsListGroupTitle title={translate(GeonexiaTranslationKeys.sort_direction)} />
			<SettingsListSelectOption
				options={directionOptions}
				selectedOption={sortDirection}
				onSelect={(opt) => onDirectionChange(opt.id)}
				iconBgColor={PRIMARY_COLOR}
				selectionColor={PRIMARY_COLOR}
			/>
		</View>
	);
}

// ─── Filter Modal Content ─────────────────────────────────────────────────────

function FilterModalContent({
	filters,
	activities,
	routes,
	onFiltersChange,
	onReset,
	translate,
}: {
	filters: ActivityFilters;
	activities: SavedActivity[];
	routes: SavedRoute[];
	onFiltersChange: (f: ActivityFilters) => void;
	onReset: () => void;
	translate: (key: GeonexiaTranslationKeys) => string;
}) {
	const { theme } = useTheme();
	const [showFromCalendar, setShowFromCalendar] = useState(false);
	const [showToCalendar, setShowToCalendar] = useState(false);

	// Sport type options
	const sportTypeOptions: { id: string; label: string; icon?: React.ReactNode }[] = [
		{ id: '__all__', label: translate(GeonexiaTranslationKeys.all_sport_types) },
		...SPORT_TYPES.map((st) => ({
			id: st.type,
			label: st.label,
			icon: st.iconLibrary === 'MaterialCommunityIcons'
				? <MaterialCommunityIcons name={st.iconName as any} size={18} color="#ffffff" />
				: <MaterialIcons name={st.iconName as any} size={18} color="#ffffff" />,
		})),
	];

	// Route options
	const routeOptions: { id: string; label: string }[] = [
		{ id: '__all__', label: translate(GeonexiaTranslationKeys.all_routes) },
		{ id: '__none__', label: translate(GeonexiaTranslationKeys.no_route) },
		...routes.map((r) => ({ id: r.id, label: r.name || r.id })),
	];

	const selectedSportType = filters.sportType === null ? '__all__' : filters.sportType;
	const selectedRoute = filters.routeId === undefined ? '__all__' : (filters.routeId === null ? '__none__' : filters.routeId);

	return (
		<View style={{ gap: 16, paddingBottom: 8 }}>
			{/* Date filter */}
			<SettingsListGroupTitle title={translate(GeonexiaTranslationKeys.filter_by_date)} />
			<TouchableOpacity
				onPress={() => setShowFromCalendar(!showFromCalendar)}
				activeOpacity={0.7}
			>
				<SettingsListSelectOptionSingle
					label={`${translate(GeonexiaTranslationKeys.from_date)}: ${filters.fromDate ?? '–'}`}
					isSelected={filters.fromDate !== null}
					selectionColor={PRIMARY_COLOR}
					onPress={() => setShowFromCalendar(!showFromCalendar)}
					groupPosition={showFromCalendar ? 'top' : (showToCalendar ? 'top' : 'top')}
					showSeparator
					noIconIndent
				/>
			</TouchableOpacity>
			{showFromCalendar && (
				<ActivityCalendarSheet
					activities={activities}
					selectedDate={filters.fromDate ?? undefined}
					onSelect={(dateStr) => {
						onFiltersChange({ ...filters, fromDate: dateStr });
						setShowFromCalendar(false);
					}}
				/>
			)}
			<TouchableOpacity
				onPress={() => setShowToCalendar(!showToCalendar)}
				activeOpacity={0.7}
			>
				<SettingsListSelectOptionSingle
					label={`${translate(GeonexiaTranslationKeys.to_date)}: ${filters.toDate ?? '–'}`}
					isSelected={filters.toDate !== null}
					selectionColor={PRIMARY_COLOR}
					onPress={() => setShowToCalendar(!showToCalendar)}
					groupPosition="bottom"
					showSeparator={false}
					noIconIndent
				/>
			</TouchableOpacity>
			{showToCalendar && (
				<ActivityCalendarSheet
					activities={activities}
					selectedDate={filters.toDate ?? undefined}
					onSelect={(dateStr) => {
						onFiltersChange({ ...filters, toDate: dateStr });
						setShowToCalendar(false);
					}}
				/>
			)}

			{/* Sport type filter */}
			<SettingsListGroupTitle title={translate(GeonexiaTranslationKeys.filter_by_sport_type)} />
			<SettingsListSelectOption
				options={sportTypeOptions}
				selectedOption={selectedSportType}
				onSelect={(opt) => {
					onFiltersChange({
						...filters,
						sportType: opt.id === '__all__' ? null : (opt.id as SportType),
					});
				}}
				iconBgColor={PRIMARY_COLOR}
				selectionColor={PRIMARY_COLOR}
			/>

			{/* Route filter */}
			<SettingsListGroupTitle title={translate(GeonexiaTranslationKeys.filter_by_route)} />
			<SettingsListSelectOption
				options={routeOptions}
				selectedOption={selectedRoute}
				onSelect={(opt) => {
					onFiltersChange({
						...filters,
						routeId: opt.id === '__all__' ? undefined : (opt.id === '__none__' ? null : opt.id),
					});
				}}
				iconBgColor={PRIMARY_COLOR}
				selectionColor={PRIMARY_COLOR}
			/>

			{/* Reset button */}
			<TouchableOpacity
				style={styles.resetButton}
				onPress={onReset}
				activeOpacity={0.8}
			>
				<MaterialIcons name="refresh" size={18} color={PRIMARY_COLOR} />
				<Text style={[styles.resetButtonText, { color: PRIMARY_COLOR }]}>
					{translate(GeonexiaTranslationKeys.reset)}
				</Text>
			</TouchableOpacity>
		</View>
	);
}

// ─── Import Content (shown inside bottom sheet modal) ─────────────────────────

const H3_IMPORT_RESOLUTION = 10;

function ImportContent({
	onImport,
	onCancel,
	theme,
}: {
	onImport: (code: string) => void;
	onCancel: () => void;
	theme: ReturnType<typeof useTheme>['theme'];
}) {
	const [code, setCode] = useState('');
	return (
		<View style={styles.importContainer}>
			<Text style={[styles.importDescription, { color: theme.screen.text }]}>
				Paste the export code from the "Share Activity" button of another run.
			</Text>
			<TextInput
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

// ─── Activities Screen ────────────────────────────────────────────────────────

export default function ActivitiesScreen() {
	const { theme } = useTheme();
	const router = useRouter();
	const navigation = useNavigation();
	const dispatch = useDispatch<AppDispatch>();
	const { show: showImportModal, close: closeImportModal } = useMyScrollViewModal();
	const { show: showSortModal, close: closeSortModal } = useMyScrollViewModal();
	const { show: showFilterModal, close: closeFilterModal } = useMyScrollViewModal();
	const { showAlert } = useGeonexiaAlert();
	const { translate } = useTranslation();
	const [activities, setActivities] = useState<SavedActivity[]>([]);
	const [routes, setRoutes] = useState<SavedRoute[]>([]);
	const [loading, setLoading] = useState(true);

	// Sort & filter state
	const [sortField, setSortField] = useState<SortField>(DEFAULT_SORT_FIELD);
	const [sortDirection, setSortDirection] = useState<SortDirection>(DEFAULT_SORT_DIRECTION);
	const [filters, setFilters] = useState<ActivityFilters>({
		fromDate: null,
		toDate: null,
		sportType: null,
		routeId: undefined,
	});

	const hasActiveFilters = filters.fromDate !== null || filters.toDate !== null || filters.sportType !== null || filters.routeId !== undefined;

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

	const handleImport = useCallback((code: string) => {
		let parsed: unknown;
		try {
			parsed = JSON.parse(code);
		} catch {
			showAlert('Import Failed', 'The code is not valid JSON.');
			return;
		}

		// Support both a single activity object and an array of activities.
		const rawActivities: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
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
		for (const activity of validActivities) {
			saveActivity(activity);
			applyImportedHexTiles(activity);
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
		const json = JSON.stringify(allActivities, null, 2);
		await Clipboard.setStringAsync(json);
		const count = allActivities.length;
		showAlert('Exported', `${count} ${count === 1 ? 'activity' : 'activities'} copied to clipboard as JSON.`);
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
								try { saveActivity(activity); } catch (err) { console.warn('[Rebuild] Failed to save migrated activity:', activity.id, err); }
							}
						}

						// Rebuild from activity data (hexTilesVisited + enclosedHexTiles),
						// applying dirt/grass terrain automatically after counting visits.
						// All existing tile state (including manual customizations) is discarded.
						const sorted = [...allActivities].sort((a, b) => a.startedAt - b.startedAt);
						const hexTileFeatureCache = await loadHexTileFeatureCache();
						const homeHexTile = store.getState().playerInformation.homeHexTile;
						const { records, walkedEdges } = rebuildMapFromActivities(sorted, hexTileFeatureCache, homeHexTile);
						const routes = await loadRoutes();
						applyRouteBenches(records, sorted, routes);
						dispatch(loadPersistedState(records));
						dispatch(loadWalkedEdgesState(walkedEdges));

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

	const openImportModal = useCallback(() => {
		showImportModal({
			title: '📥 Import Run',
			children: (
				<ImportContent
					onImport={handleImport}
					onCancel={closeImportModal}
					theme={theme}
				/>
			),
			keyboardShouldPersistTaps: 'handled',
		});
	}, [showImportModal, handleImport, closeImportModal, theme]);

	const openSortModal = useCallback(() => {
		showSortModal({
			title: `🔀 ${translate(GeonexiaTranslationKeys.sort)}`,
			children: (
				<SortModalContent
					sortField={sortField}
					sortDirection={sortDirection}
					onFieldChange={(f) => {
						setSortField(f);
						closeSortModal();
					}}
					onDirectionChange={(d) => {
						setSortDirection(d);
						closeSortModal();
					}}
					translate={translate}
				/>
			),
		});
	}, [showSortModal, closeSortModal, sortField, sortDirection, translate]);

	const resetFilters = useCallback(() => {
		setFilters({ fromDate: null, toDate: null, sportType: null, routeId: undefined });
	}, []);

	const openFilterModal = useCallback(() => {
		showFilterModal({
			title: `🔍 ${translate(GeonexiaTranslationKeys.filter)}`,
			children: (
				<FilterModalContent
					filters={filters}
					activities={activities}
					routes={routes}
					onFiltersChange={setFilters}
					onReset={() => {
						resetFilters();
						closeFilterModal();
					}}
					translate={translate}
				/>
			),
		});
	}, [showFilterModal, closeFilterModal, filters, activities, routes, resetFilters, translate]);

	// Apply filters and sorting
	const processedActivities = useMemo(() => {
		const filtered = applyFilters(activities, filters);
		return sortActivities(filtered, sortField, sortDirection);
	}, [activities, filters, sortField, sortDirection]);

	// Show sort, filter, import, export, and rebuild buttons in the header
	useLayoutEffect(() => {
		navigation.setOptions({
			headerRight: () => (
				<View style={styles.headerButtons}>
					<TouchableOpacity onPress={openSortModal} style={styles.headerImportButton} activeOpacity={0.7}>
						<MaterialCommunityIcons name="sort" size={24} color={PRIMARY_COLOR} />
					</TouchableOpacity>
					<TouchableOpacity onPress={openFilterModal} style={styles.headerImportButton} activeOpacity={0.7}>
						<MaterialCommunityIcons
							name={hasActiveFilters ? 'filter' : 'filter-outline'}
							size={24}
							color={hasActiveFilters ? PRIMARY_COLOR : theme.screen.icon}
						/>
					</TouchableOpacity>
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
	}, [navigation, openImportModal, openSortModal, openFilterModal, handleExportAll, handleRebuildMap, hasActiveFilters, theme.screen.icon]);

	const handleActivityPress = useCallback((id: string) => {
		router.push(`/activities/${id}`);
	}, [router]);

	if (!loading && activities.length === 0) {
		return (
			<View style={[styles.emptyContainer, { backgroundColor: theme.screen.background }]}>
				<Ionicons name="fitness-outline" size={64} color={theme.screen.icon} />
				<Text style={[styles.emptyTitle, { color: theme.screen.text }]}>No activities yet</Text>
				<Text style={[styles.emptySubtitle, { color: theme.screen.icon }]}>
					Start recording to see your activities here.
				</Text>
			</View>
		);
	}

	// Build a map from routeId → SavedRoute for quick lookups
	const routeMap = new Map<string, SavedRoute>(routes.map((r) => [r.id, r]));

	// Group processed (filtered + sorted) activities by routeId
	const groupMap = new Map<string | null, SavedActivity[]>();
	for (const activity of processedActivities) {
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
			{hasActiveFilters && (
				<View style={styles.activeFilterBanner}>
					<MaterialCommunityIcons name="filter" size={16} color={PRIMARY_COLOR} />
					<Text style={[styles.activeFilterText, { color: PRIMARY_COLOR }]}>
						{processedActivities.length} / {activities.length} {translate(GeonexiaTranslationKeys.activities)}
					</Text>
					<TouchableOpacity onPress={resetFilters} activeOpacity={0.7}>
						<MaterialIcons name="close" size={18} color={PRIMARY_COLOR} />
					</TouchableOpacity>
				</View>
			)}
			{processedActivities.length === 0 && hasActiveFilters && (
				<View style={[styles.emptyContainer, { paddingTop: 48 }]}>
					<MaterialCommunityIcons name="filter-off" size={48} color={theme.screen.icon} />
					<Text style={[styles.emptySubtitle, { color: theme.screen.icon }]}>
						{translate(GeonexiaTranslationKeys.no_filter_results)}
					</Text>
				</View>
			)}
			{groupOrder.map((routeId) => {
				const groupActivities = groupMap.get(routeId) ?? [];
				const routeName = routeId !== null ? (routeMap.get(routeId)?.name ?? routeId) : translate(GeonexiaTranslationKeys.no_route);
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
	resetButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
		gap: 8,
	},
	resetButtonText: {
		fontSize: 15,
		fontWeight: '600',
	},
	activeFilterBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderRadius: 8,
		backgroundColor: '#2563eb18',
	},
	activeFilterText: {
		fontSize: 13,
		fontWeight: '600',
		flex: 1,
	},
});
