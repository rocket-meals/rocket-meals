import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import {
	MyMap,
	MyMapHandle,
	SettingsList,
	SettingsListGroupTitle,
	SettingsListTextInput,
	type SettingsListTextInputSuggestion,
	useMyScrollViewModal,
	useTheme,
} from 'repo-depkit-common-ui';
import { useDispatch, useSelector } from 'react-redux';

import { SavedRoute, loadRoute, saveRoute, deleteRoute } from '../../helpers/RouteStorage';
import { loadActivities, saveActivity, SavedActivity, RoutePoint } from '../../helpers/ActivityStorage';
import SettingsListActivity from '../../components/SettingsListActivity';
import ActivityAggregateStatsSection from '../../components/ActivityAggregateStatsSection';
import SettingsListMapFeature from '../../components/SettingsListMapFeature';
import CalendarDatePickerContent from '../../components/CalendarDatePicker';
import { HEX_TILE_SCRIPT } from '../../assets/hexTileScript';
import { isAvailable as isH3Available, computeRouteLengthKm, formatDistanceKm, gridDisk, cellToLatLng, cellToBoundary, getResolution, polygonToCells, areNeighborCells, type CoordPair } from '../../helpers/H3Helper';
import { buildRouteDisplayData, computeHexBounds, computeEdgesFromHexTiles, computeEdgesFromRoutePoints } from '../../helpers/RouteDisplayHelper';
import type { MapFeatureInfo } from '../../helpers/RouteNameSuggestionHelper';
import { suggestRouteNamesForHexTiles } from '../../helpers/RouteNameSuggestionHelper';
import { queryTileFeaturesForHexCell } from '../../helpers/TileFeatureHelper';
import { ROUTE_NAME_LANDMARK_NAME_NULL_ALLOW } from '../../helpers/OpenMapTilesSchema';
import { computeActivityData, findEnclosedCellsFromHexTiles, RED_LINE_GRID_RESOLUTION, MIN_TILES_FOR_ENCLOSED_POLYGON, synthesizeManualActivityRoutePoints } from '../../helpers/ActivityMapRebuildHelper';
import type { AppDispatch, RootState } from '../../store/store';
import { startRun, markVisited, markEnclosed, addWalkedEdges } from '../../store/hexTileSlice';
import { useDebugMode } from '../../hooks/useDebugMode';
import useGeonexiaAlert from '../../hooks/useGeonexiaAlert';

const DEFAULT_RUNNER_WEIGHT_KG = 75;
const KCAL_PER_KG_PER_KM = 0.9;
const AVERAGE_STRIDE_LENGTH_METERS = 0.77;
const FLUID_BASELINE_DURATION_SECONDS = 3600;
const FLUID_BASELINE_ML = 600;

const AUTO_ROTATE_SPEED_DEG_PER_S = 5;
const PRIMARY_COLOR = '#2563eb';

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

type MapEditSubMode = 'add' | 'remove';

/** Aggregated feature entry keyed by layerId+name+class+subclass. */
type AggregatedFeatureEntry = {
	count: number;
	feature: MapFeatureInfo;
};

function featureAggregationKey(f: MapFeatureInfo): string {
	return `${f.layerId ?? ''}|${f.name ?? ''}|${f.class ?? ''}|${f.subclass ?? ''}`;
}

function buildAggregatedFeatures(featureMap: Record<string, MapFeatureInfo[]>): Record<string, AggregatedFeatureEntry> {
	const aggregated: Record<string, AggregatedFeatureEntry> = {};
	for (const features of Object.values(featureMap)) {
		for (const f of features) {
			const key = featureAggregationKey(f);
			const existing = aggregated[key];
			if (existing) {
				existing.count += 1;
			} else {
				aggregated[key] = { count: 1, feature: f };
			}
		}
	}
	return aggregated;
}

function formatDate(timestamp: number): string {
	return new Date(timestamp).toLocaleDateString(undefined, {
		weekday: 'long',
		day: '2-digit',
		month: 'long',
		year: 'numeric',
	});
}

// ─── Manual Activity Modal Content ───────────────────────────────────────────

function ManualActivityContent({
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
		const h = parseInt(hours, 10) || 0;
		const m = parseInt(minutes, 10) || 0;
		const s = parseInt(seconds, 10) || 0;
		const totalSeconds = h * 3600 + m * 60 + s;
		if (totalSeconds <= 0) return;

		const startedAt = dateStringToStartOfDay(selectedDate);
		const hexTilesOrdered = route.hexTiles;
		const distanceKm = isH3Available() ? computeRouteLengthKm(hexTilesOrdered) : 0;
		const paceMinPerKm = distanceKm > 0 ? totalSeconds / 60 / distanceKm : 0;
		const kcal = Math.round(distanceKm * DEFAULT_RUNNER_WEIGHT_KG * KCAL_PER_KG_PER_KM);
		const steps = Math.round((distanceKm * 1000) / AVERAGE_STRIDE_LENGTH_METERS);
		const fluidNeedsMl = Math.round((totalSeconds / FLUID_BASELINE_DURATION_SECONDS) * FLUID_BASELINE_ML);

		// Synthesize route points from hex tile centers with evenly-distributed
		// timestamps so that rebuild / recalculate flows derive correct distance
		// and per-tile speed metrics. Each point is marked interpolated: true so
		// it is treated the same way as gap-filling points added to incomplete
		// recorded routes.
		const routePoints: RoutePoint[] = synthesizeManualActivityRoutePoints(
			hexTilesOrdered,
			startedAt,
			totalSeconds * 1000,
			distanceKm,
		);

		// Pre-compute enclosed tiles from the route hex tiles so they are stored
		// on the activity and used by the map rebuild / activity detail screen.
		let enclosedHexTiles: string[] = [];
		if (isH3Available() && hexTilesOrdered.length >= MIN_TILES_FOR_ENCLOSED_POLYGON) {
			try {
				enclosedHexTiles = findEnclosedCellsFromHexTiles(hexTilesOrdered, route.h3Resolution);
			} catch {
				// ignore – enclosed tiles remain empty if detection fails
			}
		}

		const activity: SavedActivity = {
			id: `${startedAt}-${Math.random().toString(36).substring(2, 9)}`,
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

	const totalSeconds = (parseInt(hours, 10) || 0) * 3600 + (parseInt(minutes, 10) || 0) * 60 + (parseInt(seconds, 10) || 0);

	return (
		<View style={{ paddingTop: 4, gap: 12 }}>
			<SettingsList
				leftIcon={<MaterialIcons name="calendar-today" size={20} color="#ffffff" />}
				iconBackgroundColor={PRIMARY_COLOR}
				title="Datum"
				value={formatDateDisplay(selectedDate)}
				groupPosition="single"
				onPress={openCalendar}
				rightIcon={<MaterialIcons name="chevron-right" size={20} color={theme.screen.icon} />}
			/>
			<Text style={{ fontSize: 14, lineHeight: 20, color: theme.screen.text }}>
				Dauer der Aktivität eingeben:
			</Text>
			<View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
				<TextInput
					style={{ flex: 1, borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 16, color: theme.screen.text, borderColor: theme.screen.text + '33', backgroundColor: theme.screen.background, textAlign: 'center' }}
					placeholder="Std"
					placeholderTextColor={theme.screen.icon}
					value={hours}
					onChangeText={setHours}
					keyboardType="numeric"
					maxLength={2}
				/>
				<Text style={{ fontSize: 20, color: theme.screen.text, fontWeight: '700' }}>:</Text>
				<TextInput
					style={{ flex: 1, borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 16, color: theme.screen.text, borderColor: theme.screen.text + '33', backgroundColor: theme.screen.background, textAlign: 'center' }}
					placeholder="Min"
					placeholderTextColor={theme.screen.icon}
					value={minutes}
					onChangeText={setMinutes}
					keyboardType="numeric"
					maxLength={2}
					autoFocus
				/>
				<Text style={{ fontSize: 20, color: theme.screen.text, fontWeight: '700' }}>:</Text>
				<TextInput
					style={{ flex: 1, borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 16, color: theme.screen.text, borderColor: theme.screen.text + '33', backgroundColor: theme.screen.background, textAlign: 'center' }}
					placeholder="Sek"
					placeholderTextColor={theme.screen.icon}
					value={seconds}
					onChangeText={setSeconds}
					keyboardType="numeric"
					maxLength={2}
				/>
			</View>
			<TouchableOpacity
				style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#2563eb', gap: 8, opacity: totalSeconds <= 0 ? 0.4 : 1 }}
				onPress={handleSave}
				disabled={totalSeconds <= 0}
				activeOpacity={0.8}
			>
				<MaterialIcons name="check" size={18} color="#ffffff" />
				<Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '600' }}>Aktivität speichern</Text>
			</TouchableOpacity>
			<TouchableOpacity style={{ alignItems: 'center', paddingVertical: 10 }} onPress={onClose} activeOpacity={0.8}>
				<Text style={{ fontSize: 15, fontWeight: '500', color: theme.screen.text }}>Abbrechen</Text>
			</TouchableOpacity>
		</View>
	);
}

export default function RouteDetailScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const { theme } = useTheme();
	const router = useRouter();
	const navigation = useNavigation();
	const mapRef = useRef<MyMapHandle>(null);
	const [mapKey, setMapKey] = useState(0);
	const isFirstFocusRef = useRef(true);
	const [route, setRoute] = useState<SavedRoute | null>(null);
	const [notFound, setNotFound] = useState(false);
	const [mapMounted, setMapMounted] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [editedHexTiles, setEditedHexTiles] = useState<string[]>([]);
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
	const [mapEditSubMode, setMapEditSubMode] = useState<MapEditSubMode>('add');
	const [addAnchorTileIndex, setAddAnchorTileIndex] = useState<number | null>(null);
	const [routeActivities, setRouteActivities] = useState<SavedActivity[]>([]);
	const hexTileRecords = useSelector((state: RootState) => state.hexTiles.records);
	const dispatch = useDispatch<AppDispatch>();
	const isDebugMode = useDebugMode();
	const { showAlert } = useGeonexiaAlert();
	const { show: showActivitiesModal, close: closeActivitiesModal } = useMyScrollViewModal();
	const { show: showHexTileModal } = useMyScrollViewModal();
	const { show: showAggregatedModal } = useMyScrollViewModal();
	const { show: showEnclosedAggregatedModal } = useMyScrollViewModal();

	// ── Hex tile feature data ────────────────────────────────────────────
	const [hexTileFeatureMap, setHexTileFeatureMap] = useState<Record<string, MapFeatureInfo[]>>({});
	const [aggregatedFeatures, setAggregatedFeatures] = useState<Record<string, AggregatedFeatureEntry>>({});
	const [featuresLoading, setFeaturesLoading] = useState(false);
	const featureQuerySentRef = useRef(false);

	// ── Enclosed area data ────────────────────────────────────────────────
	const [enclosedTiles, setEnclosedTiles] = useState<string[]>([]);
	const [enclosedTilesReady, setEnclosedTilesReady] = useState(false);
	const [aggregatedEnclosedFeatures, setAggregatedEnclosedFeatures] = useState<Record<string, AggregatedFeatureEntry>>({});
	const [enclosedFeaturesLoading, setEnclosedFeaturesLoading] = useState(false);
	const enclosedQuerySentRef = useRef(false);

	// ── Route name suggestions ────────────────────────────────────────────
	const [nameSuggestions, setNameSuggestions] = useState<SettingsListTextInputSuggestion[]>([]);
	const nameSuggestionsSentRef = useRef(false);
	// Stable ref so handleMapMessage can always read the latest edit state without
	// being recreated on every state change.
	const editStateRef = useRef({
		isEditing: false,
		mapEditSubMode: 'add' as MapEditSubMode,
		addAnchorTileIndex: null as number | null,
		editedHexTiles: [] as string[],
	});
	editStateRef.current = { isEditing, mapEditSubMode, addAnchorTileIndex, editedHexTiles };

	// Resets the query guards and derived state so enclosed tiles and tile
	// features are recalculated the next time the relevant useEffect hooks run.
	const resetTileQueryState = useCallback(() => {
		enclosedQuerySentRef.current = false;
		featureQuerySentRef.current = false;
		nameSuggestionsSentRef.current = false;
		setEnclosedTiles([]);
		setEnclosedTilesReady(false);
		setAggregatedEnclosedFeatures({});
		setHexTileFeatureMap({});
		setAggregatedFeatures({});
		setNameSuggestions([]);
	}, []);

	// Stop map-side auto-rotate on unmount
	useEffect(() => {
		return () => {
			if (mapRef.current) {
				mapRef.current.sendToMap({ autoRotate: false });
			}
		};
	}, []);

	// Remount the map whenever the screen is re-focused so auto-rotate re-runs.
	// Also reset enclosed tile and feature query guards so they re-run on re-focus.
	useFocusEffect(
		useCallback(() => {
			if (isFirstFocusRef.current) {
				isFirstFocusRef.current = false;
				return;
			}
			setMapMounted(false);
			setMapKey((k) => k + 1);
			resetTileQueryState();
		}, [resetTileQueryState])
	);

	// Show back arrow and route name in header
	useLayoutEffect(() => {
		navigation.setOptions({
			headerStyle: { backgroundColor: theme.header.background },
			headerTintColor: theme.header.text,
			title: route?.name ?? '',
			headerLeft: () => (
				<TouchableOpacity
					onPress={() => router.navigate('/routes')}
					style={styles.headerBackButton}
					activeOpacity={0.7}
				>
					<MaterialIcons name="arrow-back" size={24} color={theme.header.text} />
				</TouchableOpacity>
			),
		});
	}, [navigation, router, theme.header.background, theme.header.text, route?.name]);

	// Load route by id
	useEffect(() => {
		if (!id) {
			setNotFound(true);
			return;
		}
		loadRoute(id)
			.then((r) => {
				if (!r) {
					setNotFound(true);
					return;
				}
				setRoute(r);
			})
			.catch(() => setNotFound(true));
	}, [id]);

	// Load activities for this route
	useEffect(() => {
		if (!id) return;
		loadActivities().then((all) => {
			const filtered = all.filter((a) => a.routeId === id);
			filtered.sort((a, b) => b.startedAt - a.startedAt);
			setRouteActivities(filtered);
		}).catch(() => setRouteActivities([]));
	}, [id]);

	// Migration: compute walkedEdgesRedLine from the first activity's routePoints
	// when the field is absent (older saves that pre-date this feature).
	useEffect(() => {
		if (!route || !isH3Available()) return;
		if (route.walkedEdgesRedLine !== undefined) return;
		// Find the oldest activity with routePoints to use as the reference path.
		// routeActivities is sorted newest-first, so iterate backwards.
		let reference: SavedActivity | undefined;
		for (let i = routeActivities.length - 1; i >= 0; i--) {
			const a = routeActivities[i];
			if (a.routePoints && a.routePoints.length > 0) {
				reference = a;
				break;
			}
		}
		if (!reference) return;
		const redLineEdges = computeEdgesFromRoutePoints(reference.routePoints, RED_LINE_GRID_RESOLUTION);
		const updatedRoute: SavedRoute = { ...route, walkedEdgesRedLine: redLineEdges, walkedEdgesRedLineResolution: RED_LINE_GRID_RESOLUTION };
		try {
			saveRoute(updatedRoute);
			setRoute(updatedRoute);
		} catch {
			// Non-critical: display will fall back to walkedEdges
		}
	}, [route, routeActivities]);

	// Once both route and map are ready, send hex tiles and fit bounds
	useEffect(() => {
		if (!mapMounted || !route || !mapRef.current) return;
		if (!isH3Available() || route.hexTiles.length === 0) return;

		// Build and send hexagon tile GeoJSON and walk path lines
		try {
			const { hexTileGeoJson, hexWalkPathGeoJson } = buildRouteDisplayData(route, hexTileRecords);
			mapRef.current.sendToMap({ hexRouteOutlineMode: true });
			mapRef.current.sendToMap({ hexTileGeoJson });
			mapRef.current.sendToMap({ hexWalkPathGeoJson });
		} catch (err) {
			console.warn('[RouteDetailScreen] Failed to build route display GeoJSON:', err);
		}

		// Fit the camera to the full route extent
		const bounds = computeHexBounds(route.hexTiles);
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

		// Start smooth auto-rotate after the fitBounds animation finishes
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
	}, [mapMounted, route, hexTileRecords]);

	// ── Fetch tile features for each hex tile using TileFeatureHelper ────
	useEffect(() => {
		if (!route || route.hexTiles.length === 0) return;
		if (!isH3Available()) return;
		if (featureQuerySentRef.current) return;
		featureQuerySentRef.current = true;

		let cancelled = false;

		(async () => {
			setFeaturesLoading(true);

			// 1. Build hex tile → features dict
			const featureMap: Record<string, MapFeatureInfo[]> = {};
			for (const hexId of route.hexTiles) {
				if (cancelled) return;
				try {
					const features = await queryTileFeaturesForHexCell(
						hexId,
						undefined,
						{ nameNullAllowList: ROUTE_NAME_LANDMARK_NAME_NULL_ALLOW },
					);
					featureMap[hexId] = features;
				} catch (err) {
					console.warn('[RouteDetailScreen] Failed to query features for hex tile', hexId, err);
					featureMap[hexId] = [];
				}
			}

			if (cancelled) return;
			setHexTileFeatureMap(featureMap);

			// 2. Build aggregated features dict (key = layerId|name|class|subclass)
			if (cancelled) return;
			setAggregatedFeatures(buildAggregatedFeatures(featureMap));
			setFeaturesLoading(false);
		})();

		return () => { cancelled = true; };
	}, [route, mapKey]);

	// ── Fetch tile features for the enclosed area ────────────────────────
	// Depends on `mapKey` so it re-runs whenever the screen is re-focused
	// (useFocusEffect increments mapKey on every non-first focus).
	useEffect(() => {
		if (!route || route.hexTiles.length === 0) return;
		if (!isH3Available()) return;
		if (enclosedQuerySentRef.current) return;
		enclosedQuerySentRef.current = true;

		let cancelled = false;

		(async () => {
			let tiles: string[];

			// Use cached enclosed tiles if already stored on the route object to
			// avoid recomputing the polygon fill on every screen visit.
			if (route.enclosedTiles !== undefined) {
				tiles = route.enclosedTiles;
			} else {
				// 1. Compute enclosed tiles using the same algorithm as the activity end screen:
				//    build a polygon from the ordered tile center points and fill it with
				//    polygonToCells.  cellsToMultiPolygon + polygonToCells does NOT work here
				//    because for a ring of tiles it produces a donut, and filling a donut just
				//    returns the ring tiles themselves (leaving 0 enclosed cells after exclusion).
				tiles = [];
				try {
					const firstTile = route.hexTiles[0];
					const lastTile = route.hexTiles[route.hexTiles.length - 1];
					if (firstTile && lastTile && route.hexTiles.length >= 3) {
						const res = getResolution(firstTile);

						// Check loop closure: first and last tiles must be adjacent (neighbors).
						if (areNeighborCells(firstTile, lastTile)) {
							// Build closed ring from ordered tile center points [lat, lng]
							const ring: CoordPair[] = route.hexTiles.map((cell) => cellToLatLng(cell) as CoordPair);
							ring.push(ring[0]); // close the ring

							// Fill the polygon interior with H3 cells, then exclude the route tiles
							const filledCells = polygonToCells([ring], res, false);
							const routeSet = new Set(route.hexTiles);
							for (const cell of filledCells) {
								if (!routeSet.has(cell)) {
									tiles.push(cell);
								}
							}
						}
					}
				} catch (err) {
					console.warn('[RouteDetailScreen] Failed to compute enclosed tiles:', err);
				}

				if (cancelled) return;

				// Persist computed tiles on the route object so they are available
				// immediately on subsequent screen visits without recomputation.
				const updatedRoute: SavedRoute = { ...route, enclosedTiles: tiles };
				try {
					saveRoute(updatedRoute);
				} catch (err) {
					console.warn('[RouteDetailScreen] Failed to save enclosed tiles to route:', err);
				}
				// Update in-memory state regardless of whether the file write succeeded,
				// so the UI reflects the computed tiles on this visit.
				setRoute(updatedRoute);
			}

			if (cancelled) return;
			setEnclosedTiles(tiles);
			setEnclosedTilesReady(true);

			if (tiles.length === 0) {
				setEnclosedFeaturesLoading(false);
				return;
			}

			setEnclosedFeaturesLoading(true);

			// 2. Query features for each enclosed tile
			const featureMap: Record<string, MapFeatureInfo[]> = {};
			for (const hexId of tiles) {
				if (cancelled) return;
				try {
					const features = await queryTileFeaturesForHexCell(
						hexId,
						undefined,
						{ nameNullAllowList: ROUTE_NAME_LANDMARK_NAME_NULL_ALLOW },
					);
					featureMap[hexId] = features;
				} catch (err) {
					console.warn('[RouteDetailScreen] Failed to query features for enclosed tile', hexId, err);
					featureMap[hexId] = [];
				}
			}

			if (cancelled) return;

			// 3. Aggregate enclosed tile features
			if (cancelled) return;
			setAggregatedEnclosedFeatures(buildAggregatedFeatures(featureMap));
			setEnclosedFeaturesLoading(false);
		})();

		return () => { cancelled = true; };
	}, [route, mapKey]);

	// ── Compute route name suggestions once enclosed tiles are ready ──────
	useEffect(() => {
		if (!route || route.hexTiles.length === 0) return;
		if (!enclosedTilesReady) return;
		if (nameSuggestionsSentRef.current) return;
		nameSuggestionsSentRef.current = true;

		let cancelled = false;

		(async () => {
			try {
				const suggestions = await suggestRouteNamesForHexTiles(route.hexTiles, enclosedTiles);
				if (!cancelled) {
					setNameSuggestions(suggestions.slice(0, 20).map((name, idx) => ({ key: String(idx), value: name, label: name })));
				}
			} catch (err) {
				console.warn('[RouteDetailScreen] Failed to compute name suggestions:', err);
			}
		})();

		return () => { cancelled = true; };
	}, [route, enclosedTilesReady, enclosedTiles, mapKey]);

	// Send enclosed tiles GeoJSON to the map once computed; clear during editing
	useEffect(() => {
		if (!mapMounted || !mapRef.current) return;
		if (!isH3Available()) return;

		const EMPTY_FC = { type: 'FeatureCollection' as const, features: [] };

		// Hide enclosed tiles while editing (route shape is in flux)
		if (isEditing || !enclosedTilesReady) {
			mapRef.current.sendToMap({ hexEnclosedGeoJson: EMPTY_FC });
			return;
		}

		const features = enclosedTiles.map((cell) => {
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
	}, [mapMounted, enclosedTilesReady, enclosedTiles, isEditing]);

	// Live map update during editing
	useEffect(() => {
		if (!isEditing || !mapMounted || !mapRef.current || !route) return;
		if (!isH3Available()) return;

		if (editedHexTiles.length === 0) {
			mapRef.current.sendToMap({ hexTileGeoJson: { type: 'FeatureCollection', features: [] } });
			mapRef.current.sendToMap({ hexWalkPathGeoJson: { type: 'FeatureCollection', features: [] } });
			return;
		}

		const tempRoute: SavedRoute = {
			...route,
			hexTiles: editedHexTiles,
			walkedEdges: computeEdgesFromHexTiles(editedHexTiles),
		};

		try {
			const { hexTileGeoJson, hexWalkPathGeoJson } = buildRouteDisplayData(tempRoute, hexTileRecords);
			mapRef.current.sendToMap({ hexTileGeoJson });
			mapRef.current.sendToMap({ hexWalkPathGeoJson });
		} catch {
			// Skip if build fails
		}
	}, [isEditing, editedHexTiles, mapMounted, hexTileRecords, route]);

	// ─── Route editing ─────────────────────────────────────────────────────

	const handleRemoveTile = useCallback((index: number) => {
		setEditedHexTiles((prev) => {
			const updated = [...prev];
			updated.splice(index, 1);
			return updated;
		});
		setAddAnchorTileIndex(null);
		setHasUnsavedChanges(true);
	}, []);

	const handleInsertTile = useCallback((index: number, h3Index: string) => {
		setEditedHexTiles((prev) => {
			const updated = [...prev];
			updated.splice(index, 0, h3Index);
			return updated;
		});
		setHasUnsavedChanges(true);
	}, []);

	const handleMapMessage = useCallback((data: object) => {
		const msg = data as { tag?: string; h3Index?: string };
		if (msg.tag === 'MapComponentMounted') {
			setMapMounted(true);
			return;
		}

		const state = editStateRef.current;
		if (!state.isEditing || !msg.h3Index) return;

		if (msg.tag === 'HexTileClicked') {
			const tileIdx = state.editedHexTiles.indexOf(msg.h3Index);
			if (tileIdx === -1) return;
			if (state.mapEditSubMode === 'remove') {
				handleRemoveTile(tileIdx);
			} else if (state.mapEditSubMode === 'add') {
				// Select (or re-select) anchor tile; tapping a different tile while
				// anchor is active simply switches the anchor.
				setAddAnchorTileIndex(tileIdx);
			}
		}

		if (msg.tag === 'HexNeighborClicked' && state.addAnchorTileIndex !== null) {
			handleInsertTile(state.addAnchorTileIndex + 1, msg.h3Index);
			setAddAnchorTileIndex(null);
		}
	}, [handleRemoveTile, handleInsertTile]);

	const handleStartEditing = useCallback(() => {
		if (!route) return;
		setEditedHexTiles([...route.hexTiles]);
		setHasUnsavedChanges(false);
		setMapEditSubMode('add');
		setAddAnchorTileIndex(null);
		setIsEditing(true);
		// Stop auto-rotate while editing so the map stays stable
		if (mapRef.current) {
			mapRef.current.sendToMap({ autoRotate: false });
		}
	}, [route]);

	const handleCancelEditing = useCallback(() => {
		const doCancel = () => {
			setIsEditing(false);
			setHasUnsavedChanges(false);
			setAddAnchorTileIndex(null);
			if (mapRef.current) {
				mapRef.current.sendToMap({ routeEditLabels: null });
				mapRef.current.sendToMap({ routeEditNeighbors: null });
			}
		};
		if (hasUnsavedChanges) {
			showAlert('Änderungen verwerfen?', 'Ungespeicherte Änderungen gehen verloren.', [
				{ text: 'Weiter bearbeiten', style: 'cancel' },
				{
					text: 'Verwerfen',
					style: 'destructive',
					onPress: doCancel,
				},
			]);
		} else {
			doCancel();
		}
	}, [hasUnsavedChanges]);

	const handleSaveEdits = useCallback(() => {
		if (!route || editedHexTiles.length === 0) return;
		const updatedRoute: SavedRoute = {
			...route,
			hexTiles: editedHexTiles,
			walkedEdges: computeEdgesFromHexTiles(editedHexTiles),
			// Clear cached enclosed tiles so they are recomputed for the new tile set.
			enclosedTiles: undefined,
			// Clear the red-line path so it is recomputed from activities after saving.
			walkedEdgesRedLine: undefined,
			walkedEdgesRedLineResolution: undefined,
		};
		try {
			saveRoute(updatedRoute);
			// Reset query guards and state so enclosed tiles and features are
			// recalculated for the updated hex tile set.
			resetTileQueryState();
			setRoute(updatedRoute);
			setIsEditing(false);
			setHasUnsavedChanges(false);
			setAddAnchorTileIndex(null);
			if (mapRef.current) {
				mapRef.current.sendToMap({ routeEditLabels: null });
				mapRef.current.sendToMap({ routeEditNeighbors: null });
			}
		} catch {
			showAlert('Fehler', 'Die Änderungen konnten nicht gespeichert werden.');
		}
	}, [route, editedHexTiles, resetTileQueryState]);

	// Send route-edit overlay (labels + neighbor highlight) to the map
	useEffect(() => {
		if (!isEditing || !mapMounted || !mapRef.current || !isH3Available()) return;

		// Build label GeoJSON: one Point feature per route tile
		const labelFeatures = editedHexTiles.map((cell, idx) => {
			let label: string;
			if (mapEditSubMode === 'remove') {
				label = '−';
			} else if (addAnchorTileIndex === null) {
				label = '+';
			} else {
				label = idx === addAnchorTileIndex ? '★' : '';
			}
			try {
				const [lat, lng] = cellToLatLng(cell);
				return {
					type: 'Feature' as const,
					geometry: { type: 'Point' as const, coordinates: [lng, lat] },
					properties: { h3Index: cell, label },
				};
			} catch (err) {
				console.warn('[RouteDetailScreen] Failed to get center for label cell', cell, err);
				return null;
			}
		}).filter(Boolean);

		mapRef.current.sendToMap({
			routeEditLabels: { type: 'FeatureCollection', features: labelFeatures },
		});

		// Build neighbor GeoJSON when an anchor tile is selected
		if (addAnchorTileIndex !== null && addAnchorTileIndex < editedHexTiles.length) {
			const anchorTile = editedHexTiles[addAnchorTileIndex];
			const tileSet = new Set(editedHexTiles);
			const neighbors = gridDisk(anchorTile, 1).filter((n) => n !== anchorTile && !tileSet.has(n));
			const neighborFeatures = neighbors.map((cell) => {
				try {
					const boundary = cellToBoundary(cell, true);
					return {
						type: 'Feature' as const,
						geometry: { type: 'Polygon' as const, coordinates: [boundary] },
						properties: { h3Index: cell },
					};
				} catch (err) {
					console.warn('[RouteDetailScreen] Failed to get boundary for neighbor cell', cell, err);
					return null;
				}
			}).filter(Boolean);
			mapRef.current.sendToMap({
				routeEditNeighbors: { type: 'FeatureCollection', features: neighborFeatures },
			});
		} else {
			mapRef.current.sendToMap({ routeEditNeighbors: null });
		}
	}, [isEditing, editedHexTiles, mapEditSubMode, addAnchorTileIndex, mapMounted]);

	// ── Add manual (duration-only) activity ──────────────────────────────
	const { show: showManualActivityModal, close: closeManualActivityModal } = useMyScrollViewModal();

	const handleAddManualActivity = useCallback(() => {
		if (!route) return;
		showManualActivityModal({
			title: '⏱️ Manuelle Aktivität',
			keyboardShouldPersistTaps: 'handled',
			children: (
				<ManualActivityContent
					route={route}
					onSave={(activity) => {
						saveActivity(activity);
						// Also add activity ID to route.activityIds
						const updatedIds = [...new Set([...(route.activityIds ?? []), activity.id])];
						saveRoute({ ...route, activityIds: updatedIds });
						setRoute({ ...route, activityIds: updatedIds });
						setRouteActivities((prev) => [activity, ...prev]);
						// Apply the route's hex tiles and edges to the in-memory map state
						if (isH3Available() && route.hexTiles.length > 0) {
							dispatch(startRun());
							dispatch(markVisited({ h3Indices: route.hexTiles, timestamp: activity.startedAt }));
							// Apply enclosed tiles so the map rebuild produces the correct terrain
							const enclosed = activity.computed?.enclosedHexTiles ?? activity.enclosedHexTiles ?? [];
							if (enclosed.length > 0) {
								dispatch(markEnclosed({ h3Indices: enclosed, timestamp: activity.startedAt }));
							}
							// Record hex-to-hex transitions so walk path spokes are drawn
							const edges = computeEdgesFromHexTiles(activity.hexTilesOrdered ?? route.hexTiles);
							if (edges.length > 0) {
								dispatch(addWalkedEdges(edges));
							}
						}
						closeManualActivityModal();
						router.push(`/activities/${activity.id}`);
					}}
					onClose={closeManualActivityModal}
					theme={theme}
				/>
			),
		});
	}, [route, showManualActivityModal, closeManualActivityModal, theme, router, dispatch]);

	const handleDelete = useCallback(() => {
		if (!route) return;
		showAlert('Route löschen', 'Möchtest du diese Route wirklich löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.', [
			{ text: 'Abbrechen', style: 'cancel' },
			{
				text: 'Löschen',
				style: 'destructive',
				onPress: () => {
					deleteRoute(route.id);
					router.replace('/routes');
				},
			},
		]);
	}, [route, router]);

	if (notFound) {
		return (
			<View style={[styles.centeredContainer, { backgroundColor: theme.screen.background }]}>
				<MaterialIcons name="error-outline" size={48} color={theme.screen.icon} />
				<Text style={[styles.notFoundText, { color: theme.screen.text }]}>Route nicht gefunden.</Text>
				<TouchableOpacity style={styles.backButton} onPress={() => router.navigate('/routes')}>
					<Text style={styles.backButtonText}>Zurück</Text>
				</TouchableOpacity>
			</View>
		);
	}

	if (!route) {
		return (
			<View style={[styles.centeredContainer, { backgroundColor: theme.screen.background }]}>
				<Text style={[styles.loadingText, { color: theme.screen.icon }]}>Laden…</Text>
			</View>
		);
	}

	const activeTiles = isEditing ? editedHexTiles : route.hexTiles;
	const distanceKm = computeRouteLengthKm(activeTiles);
	const tileCount = activeTiles.length;

	// Compute initial map center from route bounds
	const routeInitialCenter = (() => {
		const bounds = computeHexBounds(route.hexTiles);
		if (!bounds) return undefined;
		return { lat: (bounds.minLat + bounds.maxLat) / 2, lng: (bounds.minLng + bounds.maxLng) / 2 };
	})();

	const infoRows: { icon: React.ComponentProps<typeof MaterialIcons>['name']; label: string; value: string }[] = [
		{ icon: 'straighten', label: 'Streckenlänge', value: formatDistanceKm(distanceKm) },
		{ icon: 'grid-on', label: 'Kacheln', value: String(tileCount) },
		{ icon: 'crop-free', label: 'Eingeschlossene Kacheln', value: enclosedTilesReady ? String(enclosedTiles.length) : '…' },
		...(route.sportType
			? [{ icon: 'directions-run' as React.ComponentProps<typeof MaterialIcons>['name'], label: 'Sportart', value: route.sportType }]
			: []),
	];

	const lastInfoIdx = infoRows.length - 1;

	const addModeHasAnchor = isEditing && mapEditSubMode === 'add' && addAnchorTileIndex !== null;

	return (
		<ScrollView
			style={[styles.container, { backgroundColor: theme.screen.background }]}
			contentContainerStyle={styles.scrollContent}
			showsVerticalScrollIndicator={false}
		>
			{/* Map – 1:1 square at the top with edit overlay controls */}
			<View style={styles.mapContainer}>
				<MyMap
					key={mapKey}
					ref={mapRef}
					onMessage={handleMapMessage}
					injectScript={HEX_TILE_SCRIPT}
					centerAtUserLocationIfNoInitialPosition={false}
					initialCenter={routeInitialCenter}
					initialPitch={45}
				/>

				{/* Edit-mode toggle – top-right corner, always visible */}
				<TouchableOpacity
					style={[styles.mapOverlayButton, styles.mapEditToggle, isEditing && styles.mapOverlayButtonActive]}
					onPress={isEditing ? handleCancelEditing : handleStartEditing}
					activeOpacity={0.8}
				>
					<MaterialIcons name="edit" size={20} color={isEditing ? '#ffffff' : PRIMARY_COLOR} />
				</TouchableOpacity>

				{/* Sub-mode buttons (+/-) and anchor hint – only in edit mode */}
				{isEditing && (
					<>
						{/* Sub-mode switcher – top-left */}
						<View style={styles.mapSubModeRow}>
							<TouchableOpacity
								style={[styles.mapSubModeButton, mapEditSubMode === 'add' && styles.mapSubModeButtonActive]}
								onPress={() => { setMapEditSubMode('add'); setAddAnchorTileIndex(null); }}
								activeOpacity={0.8}
							>
								<MaterialIcons name="add" size={22} color={mapEditSubMode === 'add' ? '#ffffff' : PRIMARY_COLOR} />
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.mapSubModeButton, mapEditSubMode === 'remove' && styles.mapSubModeButtonRemove]}
								onPress={() => { setMapEditSubMode('remove'); setAddAnchorTileIndex(null); }}
								activeOpacity={0.8}
							>
								<MaterialIcons name="remove" size={22} color={mapEditSubMode === 'remove' ? '#ffffff' : '#ef4444'} />
							</TouchableOpacity>
						</View>

						{/* Anchor-selection hint banner */}
						{mapEditSubMode === 'add' && (
							<View style={styles.mapHintBanner}>
								<Text style={styles.mapHintText} numberOfLines={1}>
									{addModeHasAnchor
										? 'Nachbar-Kachel antippen zum Einfügen'
										: 'Kachel antippen als Einfügepunkt wählen'}
								</Text>
								{addModeHasAnchor && (
									<TouchableOpacity onPress={() => setAddAnchorTileIndex(null)} activeOpacity={0.8} style={styles.mapHintClose}>
										<MaterialIcons name="close" size={14} color="#ffffff" />
									</TouchableOpacity>
								)}
							</View>
						)}

						{/* Save / Cancel – bottom of map */}
						<View style={styles.mapEditActions}>
							<TouchableOpacity
								style={styles.mapCancelButton}
								onPress={handleCancelEditing}
								activeOpacity={0.8}
							>
								<MaterialIcons name="close" size={16} color="#ffffff" />
								<Text style={styles.mapActionButtonText}>Abbrechen</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.mapSaveButton, editedHexTiles.length === 0 && styles.mapSaveButtonDisabled]}
								onPress={handleSaveEdits}
								disabled={editedHexTiles.length === 0}
								activeOpacity={0.8}
							>
								<MaterialIcons name="save" size={16} color="#ffffff" />
								<Text style={styles.mapActionButtonText}>Speichern</Text>
							</TouchableOpacity>
						</View>
					</>
				)}
			</View>

			{/* Info list */}
			<View style={styles.statsContent}>
				<SettingsListGroupTitle title="Routen-Informationen" />
				<SettingsList
					leftIcon={<MaterialIcons name="event" size={20} color="#ffffff" />}
					iconBackgroundColor={PRIMARY_COLOR}
					title="Erstellt am"
					value={formatDate(route.createdAt)}
					showSeparator={true}
					groupPosition="top"
				/>
				<SettingsListTextInput
					leftIcon={<MaterialIcons name="edit" size={20} color="#ffffff" />}
					iconBackgroundColor={PRIMARY_COLOR}
					title="Name"
					value={route.name}
					placeholder="Route Name"
					modalTitle="Route umbenennen"
					initialValue={route.name}
					groupPosition={infoRows.length === 0 ? 'bottom' : 'middle'}
					showSeparator={infoRows.length > 0}
					onSave={(newName) => {
						const trimmed = newName.trim();
						if (!trimmed) return;
						const updated: SavedRoute = { ...route, name: trimmed };
						try {
							saveRoute(updated);
						} catch {
							showAlert('Fehler', 'Der Name der Route konnte nicht gespeichert werden.');
							return;
						}
						setRoute(updated);
					}}
					suggestions={nameSuggestions.length > 0 ? nameSuggestions : undefined}
				/>
				{infoRows.map((row, idx) => (
					<SettingsList
						key={row.label}
						leftIcon={<MaterialIcons name={row.icon} size={20} color="#ffffff" />}
						iconBackgroundColor={PRIMARY_COLOR}
						title={row.label}
						value={row.value}
						showSeparator={idx < lastInfoIdx}
						groupPosition={idx === lastInfoIdx ? 'bottom' : 'middle'}
					/>
				))}

				<SettingsListGroupTitle title="Aktivitäten" />
				<SettingsList
					leftIcon={<MaterialIcons name="directions-run" size={20} color="#ffffff" />}
					iconBackgroundColor={PRIMARY_COLOR}
					title="Aktivitäten"
					value={String(routeActivities.length)}
					rightIcon={<MaterialIcons name="chevron-right" size={20} color={theme.screen.icon} />}
					groupPosition="top"
					showSeparator
					onPress={() => {
						showActivitiesModal({
							title: '🏃 Aktivitäten',
							children: (
								<View style={{ paddingBottom: 24 }}>
									{routeActivities.length === 0 ? (
										<Text style={{ color: theme.screen.icon, textAlign: 'center', marginTop: 16, fontSize: 14 }}>Keine Aktivitäten</Text>
									) : (
										routeActivities.map((act, idx) => (
											<SettingsListActivity
												key={act.id}
												activity={act}
												groupPosition={routeActivities.length === 1 ? 'single' : idx === 0 ? 'top' : idx === routeActivities.length - 1 ? 'bottom' : 'middle'}
												showSeparator={idx < routeActivities.length - 1}
												onPress={() => { closeActivitiesModal(); router.navigate(`/activities/${act.id}`); }}
											/>
										))
									)}
								</View>
							),
						});
					}}
				/>
				<SettingsList
					leftIcon={<MaterialIcons name="add" size={20} color="#ffffff" />}
					iconBackgroundColor="#22c55e"
					title="Manuelle Aktivität hinzufügen"
					groupPosition="bottom"
					onPress={handleAddManualActivity}
				/>

				{/* ── Route Statistics ────────────────────────────────────── */}
				{routeActivities.length > 0 && (
					<>
						<SettingsListGroupTitle title="Statistiken" />
						<ActivityAggregateStatsSection activities={routeActivities} />
					</>
				)}

				{/* ── Hex Tile Feature Map (debug only) ───────────────────── */}
				{isDebugMode && featuresLoading && (
					<View style={styles.loadingFeatures}>
						<ActivityIndicator size="small" color={PRIMARY_COLOR} />
						<Text style={{ color: theme.screen.icon, fontSize: 13, marginLeft: 8 }}>Lade Karten-Features…</Text>
					</View>
				)}
				{isDebugMode && !featuresLoading && route.hexTiles.length > 0 && Object.keys(hexTileFeatureMap).length > 0 && (
					<>
						<SettingsListGroupTitle title="Hex Tiles" />
						{route.hexTiles.map((hexId, idx) => {
							const features = hexTileFeatureMap[hexId] ?? [];
							return (
								<SettingsList
									key={`hextile-${hexId}`}
									leftIcon={<MaterialIcons name="hexagon" size={20} color="#ffffff" />}
									iconBackgroundColor="#6b7280"
									title={hexId}
									value={String(features.length)}
									showSeparator={idx < route.hexTiles.length - 1}
									groupPosition={route.hexTiles.length === 1 ? 'single' : idx === 0 ? 'top' : idx === route.hexTiles.length - 1 ? 'bottom' : 'middle'}
									onPress={() => {
										showHexTileModal({
											title: `⬡ ${hexId}`,
											children: (
												<View style={{ paddingBottom: 24, paddingHorizontal: 12 }}>
													{features.length === 0 ? (
														<Text style={{ color: theme.screen.icon, textAlign: 'center', marginTop: 16, fontSize: 14 }}>Keine Features</Text>
													) : (
														<Text style={{ color: theme.screen.text, fontSize: 11, fontFamily: 'monospace' }} selectable>
															{JSON.stringify(features, null, 2)}
														</Text>
													)}
												</View>
											),
										});
									}}
								/>
							);
						})}
					</>
				)}

				{/* ── Aggregated Features (debug only) ────────────────────── */}
			{isDebugMode && !featuresLoading && Object.keys(aggregatedFeatures).length > 0 && (() => {
				const entries = Object.entries(aggregatedFeatures).sort((a, b) => b[1].count - a[1].count);
				return (
					<>
						<SettingsListGroupTitle title="Aggregierte Features" />
						{entries.map(([key, entry], idx) => (
							<SettingsListMapFeature
								key={`agg-${key}`}
								feature={entry.feature}
								count={entry.count}
								showSeparator={idx < entries.length - 1}
								groupPosition={entries.length === 1 ? 'single' : idx === 0 ? 'top' : idx === entries.length - 1 ? 'bottom' : 'middle'}
								iconBackgroundColor="#7c3aed"
								onPress={() => {
									showAggregatedModal({
										title: `📊 ${key}`,
										children: (
											<View style={{ paddingBottom: 24, paddingHorizontal: 12 }}>
												<Text style={{ color: theme.screen.text, fontSize: 11, fontFamily: 'monospace' }} selectable>
													{JSON.stringify(entry.feature, null, 2)}
												</Text>
											</View>
										),
									});
								}}
							/>
						))}
					</>
				);
			})()}

			{/* ── Enclosed Area Aggregated Features ───────────────────── */}
			{isDebugMode && enclosedFeaturesLoading && (
				<View style={styles.loadingFeatures}>
					<ActivityIndicator size="small" color={PRIMARY_COLOR} />
					<Text style={{ color: theme.screen.icon, fontSize: 13, marginLeft: 8 }}>Lade Features der eingeschlossenen Fläche…</Text>
				</View>
			)}
			{isDebugMode && !enclosedFeaturesLoading && Object.keys(aggregatedEnclosedFeatures).length > 0 && (() => {
				const entries = Object.entries(aggregatedEnclosedFeatures).sort((a, b) => b[1].count - a[1].count);
				return (
					<>
						<SettingsListGroupTitle title="Aggregierte Features (eingeschlossene Fläche)" />
						{entries.map(([key, entry], idx) => (
							<SettingsListMapFeature
								key={`enc-agg-${key}`}
								feature={entry.feature}
								count={entry.count}
								showSeparator={idx < entries.length - 1}
								groupPosition={entries.length === 1 ? 'single' : idx === 0 ? 'top' : idx === entries.length - 1 ? 'bottom' : 'middle'}
								iconBackgroundColor="#059669"
								onPress={() => {
									showEnclosedAggregatedModal({
										title: `📊 ${key}`,
										children: (
											<View style={{ paddingBottom: 24, paddingHorizontal: 12 }}>
												<Text style={{ color: theme.screen.text, fontSize: 11, fontFamily: 'monospace' }} selectable>
													{JSON.stringify(entry.feature, null, 2)}
												</Text>
											</View>
										),
									});
								}}
							/>
						))}
					</>
				);
			})()}

				{isDebugMode && (
				<TouchableOpacity
					style={styles.deleteButton}
					onPress={handleDelete}
					activeOpacity={0.8}
				>
					<MaterialIcons name="delete-outline" size={18} color="#ef4444" />
					<Text style={styles.deleteButtonText}>Route löschen</Text>
				</TouchableOpacity>
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
	deleteButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 16,
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
	loadingFeatures: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 16,
	},
	// ─── Map overlay controls ─────────────────────────────────────────────
	mapOverlayButton: {
		position: 'absolute',
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: 'rgba(255,255,255,0.92)',
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.25,
		shadowRadius: 3,
		elevation: 4,
	},
	mapOverlayButtonActive: {
		backgroundColor: PRIMARY_COLOR,
	},
	mapEditToggle: {
		top: 10,
		right: 10,
	},
	mapSubModeRow: {
		position: 'absolute',
		top: 10,
		left: 10,
		flexDirection: 'column',
		gap: 6,
	},
	mapSubModeButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: 'rgba(255,255,255,0.92)',
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 2,
		borderColor: PRIMARY_COLOR,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.2,
		shadowRadius: 2,
		elevation: 3,
	},
	mapSubModeButtonActive: {
		backgroundColor: PRIMARY_COLOR,
		borderColor: PRIMARY_COLOR,
	},
	mapSubModeButtonRemove: {
		backgroundColor: '#ef4444',
		borderColor: '#ef4444',
	},
	mapHintBanner: {
		position: 'absolute',
		bottom: 52,
		left: 10,
		right: 10,
		backgroundColor: 'rgba(0,0,0,0.65)',
		borderRadius: 8,
		paddingVertical: 6,
		paddingHorizontal: 10,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	mapHintText: {
		flex: 1,
		color: '#ffffff',
		fontSize: 12,
		fontWeight: '500',
	},
	mapHintClose: {
		padding: 2,
	},
	mapEditActions: {
		position: 'absolute',
		bottom: 10,
		left: 10,
		right: 10,
		flexDirection: 'row',
		gap: 8,
	},
	mapCancelButton: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 5,
		paddingVertical: 10,
		borderRadius: 10,
		backgroundColor: 'rgba(100,100,100,0.85)',
	},
	mapSaveButton: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 5,
		paddingVertical: 10,
		borderRadius: 10,
		backgroundColor: PRIMARY_COLOR,
	},
	mapSaveButtonDisabled: {
		opacity: 0.5,
	},
	mapActionButtonText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: '600',
	},
});
