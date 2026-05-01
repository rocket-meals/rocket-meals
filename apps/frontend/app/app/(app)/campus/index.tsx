import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
	RefreshControl,
	SafeAreaView,
	View,
	useWindowDimensions,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { CampusSortOption, CollectionNames, DatabaseTypes, shouldApplyLastOpenedBoost } from 'repo-depkit-common';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation } from 'expo-router';
import BuildingItem from '@/components/BuildingItem/BuildingItem';
import { useDispatch, shallowEqual } from 'react-redux';
import { useAppSelector } from '@/redux/hooks';
import useSelectedCanteen from '@/hooks/useSelectedCanteen';
import { CampusHelper } from '@/redux/actions/Campus/Campus';
import { SET_CAMPUSES, SET_CAMPUSES_DICT, SET_CAMPUSES_LOCAL, SET_UNSORTED_CAMPUSES } from '@/redux/Types/types';
import { BuildingsHelper } from '@/redux/actions/Buildings/Buildings';
import { calculateDistanceInMeter } from '@/helper/distanceHelper';
import DistanceModal from '@/components/DistanceModal';
import * as Location from 'expo-location';
import useToast from '@/hooks/useToast';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import useCampusSortingModal from '@/hooks/useCampusSortingModal';
import useMyScrollviewDirectusImageEditModal from '@/hooks/useMyScrollviewDirectusImageEditModal';
import useLastOpenedBuildings from '@/hooks/useLastOpenedBuildings';

import { RootDrawerParamList } from './types';
import CampusHeader from './components/CampusHeader';
import CampusListHeader from './components/CampusListHeader';
import CampusEmptyState from './components/CampusEmptyState';
import CardDimensionHelper from '@/helper/CardDimensionHelper';

// Types
type BuildingWithDistance = DatabaseTypes.Buildings & { distance?: number };

const Index: React.FC = () => {
	useSetPageTitle(TranslationKeys.campus);
	const { theme } = useTheme();
	const toast = useToast();
	const dispatch = useDispatch();
	const { translate } = useLanguage();
	const { width: windowWidth } = useWindowDimensions();

	// Refs for helpers to avoid recreation
	const campusHelper = useRef(new CampusHelper()).current;
	const buildingsHelper = useRef(new BuildingsHelper()).current;

	// Local State
	const [query, setQuery] = useState<string>('');
	const [refreshing, setRefreshing] = useState(false);
	const [hasLoaded, setHasLoaded] = useState(false);
	const [loading, setLoading] = useState(true);
	const [campusesDispatched, setCampusesDispatched] = useState(false);
	const [selectedBuilding, setSelectedBuilding] = useState<DatabaseTypes.Buildings | null>(null);
	const [listWidth, setListWidth] = useState<number>(windowWidth);
	const [distanceModalVisible, setDistanceModalVisible] = useState(false);

	// Redux Selectors
	const {
		drawerPosition,
		campusesSortBy,
		amountColumnsForcard,
		primaryColor,
		serverInfo,
		appSettings,
		selectedTheme
	} = useAppSelector((state) => ({
		drawerPosition: state.settings.drawerPosition,
		campusesSortBy: state.settings.campusesSortBy,
		amountColumnsForcard: state.settings.amountColumnsForcard,
		primaryColor: state.settings.primaryColor,
		serverInfo: state.settings.serverInfo,
		appSettings: state.settings.appSettings,
		selectedTheme: state.settings.selectedTheme,
	}), shallowEqual);

	const campuses = useAppSelector((state) => state.campus.campuses, shallowEqual);

	const { isManagement } = useAppSelector((state) => state.authReducer, shallowEqual);

	const selectedCanteen = useSelectedCanteen();
	const drawerNavigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();

	const { openCampusSortingModal } = useCampusSortingModal();
	const { openDirectusImageEditModal } = useMyScrollviewDirectusImageEditModal();
	const { buildingsLastOpenedIds } = useLastOpenedBuildings();

	// Handlers
	const openDistanceSheet = useCallback(() => setDistanceModalVisible(true), []);
	const closeDistanceSheet = useCallback(() => setDistanceModalVisible(false), []);
	const toggleDrawer = useCallback(() => drawerNavigation.toggleDrawer(), [drawerNavigation]);

	// Grid Layout Logic
	const numColumns = useMemo(() => {
		return CardDimensionHelper.getGridNumColumns(listWidth || windowWidth, amountColumnsForcard);
	}, [amountColumnsForcard, listWidth, windowWidth]);

	const itemGap = useMemo(() => {
		return CardDimensionHelper.getItemGap(windowWidth);
	}, [windowWidth]);

	// Data Processing
	const ensureStableIds = useCallback((arr: DatabaseTypes.Buildings[] = []) => {
		return arr.map((c, idx) => {
			const stableId = c.id ?? `__generated__${idx}_${String(c.alias ?? '').slice(0, 10)}`;
			if (c.id === stableId) return c;
			return { ...c, id: stableId };
		});
	}, []);

	const addDistanceToList = useCallback((list: BuildingWithDistance[] | undefined, base: DatabaseTypes.Buildings | null) => {
		if (!list) return [];
		if (!base) return list;
		try {
			const baseCoords = (base as any)?.coordinates?.coordinates as [number, number] | undefined;
			if (!Array.isArray(baseCoords) || baseCoords.length !== 2) return list;

			return list.map(c => {
				const coords = (c as any)?.coordinates?.coordinates as [number, number] | undefined;
				let dist = 0;
				if (Array.isArray(coords) && coords.length === 2) {
					dist = calculateDistanceInMeter(baseCoords, coords);
				} else if (Number.isFinite(Number((c as any)?.distance))) {
					dist = Number((c as any)?.distance);
				}

				// Only create new object if distance changed significantly or wasn't set
				if (c.distance === dist) return c;
				return { ...c, distance: dist };
			}) as BuildingWithDistance[];
		} catch (e) {
			console.warn('addDistance error', e);
			return list;
		}
	}, []);

	const fetchSelectedBuilding = useCallback(async () => {
		if (!selectedCanteen?.building) return null;
		try {
			const buildingData = (await buildingsHelper.fetchBuildingById(String(selectedCanteen.building))) as DatabaseTypes.Buildings;
			if (buildingData) {
				setSelectedBuilding(buildingData);
				return buildingData;
			}
			return null;
		} catch (e) {
			toast('Please select canteen', 'error');
			return null;
		}
	}, [buildingsHelper, selectedCanteen, toast]);

	const fetchAllCampuses = useCallback(
		async (baseBuilding: DatabaseTypes.Buildings | null = null, showLoading = true) => {
			try {
				if (showLoading) setLoading(true);
				const campusDataRaw = (await campusHelper.fetchCampus({})) as DatabaseTypes.Buildings[] | undefined;
				const campusData = ensureStableIds(campusDataRaw ?? []);

				// Deep merge to preserve object references
				const currentCampuses = campuses || [];
				const currentMap = new Map(currentCampuses.map((c: DatabaseTypes.Buildings) => [c.id, c]));

				const mergedData = campusData.map((newCampus) => {
					const oldCampus = currentMap.get(newCampus.id);
					if (oldCampus) {
						// If date_updated matches, assume equal. 
						// Fallback to JSON comparison if no date or dates differ (to catch other changes)
						// Note: JSON.stringify is expensive but safer than missing updates.
						// Given the severe performance issues, we prioritize stability.
						const isDateMatch = newCampus.date_updated && oldCampus.date_updated && newCampus.date_updated === oldCampus.date_updated;
						
						if (isDateMatch) return oldCampus;
						
						// Fallback deep compare
						if (JSON.stringify(newCampus) === JSON.stringify(oldCampus)) {
							return oldCampus;
						}
					}
					return newCampus;
				});

				// Check if the array itself is effectively the same (all items are same references)
				const isSameArray = mergedData.length === currentCampuses.length &&
					mergedData.every((c, i) => c === currentCampuses[i]);

				if (!isSameArray) {
					const dict = mergedData.reduce((acc: Record<string, DatabaseTypes.Buildings>, campus) => {
						if (campus?.id) acc[campus.id] = campus;
						return acc;
					}, {});

					dispatch({ type: SET_CAMPUSES, payload: mergedData });
					dispatch({ type: SET_CAMPUSES_DICT, payload: dict });
					dispatch({ type: SET_UNSORTED_CAMPUSES, payload: mergedData });
					dispatch({ type: SET_CAMPUSES_LOCAL, payload: mergedData });
				}

				setCampusesDispatched(true);
				setHasLoaded(true);
			} catch (e) {
				console.error('fetchAllCampuses error', e);
				toast('Failed to load campuses', 'error');
			} finally {
				if (showLoading) setLoading(false);
			}
		},
		[campusHelper, dispatch, ensureStableIds, toast, campuses]
	);

	// Effects
	useEffect(() => {
		let mounted = true;
		(async () => {
			const hasData = campuses && campuses.length > 0;
			if (!hasData) setLoading(true);

			const base = await fetchSelectedBuilding();
			if (mounted) await fetchAllCampuses(base ?? null, !hasData);
			if (mounted) setLoading(false);
		})();
		return () => { mounted = false; };
	}, []); // Run once

	// Sorting Logic
	const sortCampuses = useCallback((list: BuildingWithDistance[], sortBy: CampusSortOption) => {
		 const newList = [...list];
		 if (sortBy === CampusSortOption.ALPHABETICAL) {
			 return newList.sort((a, b) => (a?.alias ?? '').localeCompare(b?.alias ?? ''));
		 } else if (sortBy === CampusSortOption.DISTANCE || sortBy === CampusSortOption.INTELLIGENT) {
			 return newList.sort((a, b) => (a?.distance || 0) - (b?.distance || 0));
		 }
		 return newList;
	}, []);

	// Memoized Processing Pipeline
	const campusesWithDistance = useMemo(() => {
		if (!campuses) return [];
		return addDistanceToList(campuses as BuildingWithDistance[], selectedBuilding);
	}, [campuses, selectedBuilding, addDistanceToList]);

	const sortedCampuses = useMemo(() => {
		return sortCampuses(campusesWithDistance, campusesSortBy);
	}, [campusesWithDistance, campusesSortBy, sortCampuses]);

	// Lift last-opened buildings to the top only for INTELLIGENT and LAST_OPENED sort modes
	const sortedWithLastOpened = useMemo(() => {
		if (!shouldApplyLastOpenedBoost(campusesSortBy) || !buildingsLastOpenedIds || buildingsLastOpenedIds.length === 0) return sortedCampuses;
		const lastOpenedSet = new Set(buildingsLastOpenedIds);
		// Build a Map for O(1) lookup by ID
		const campusById = new Map(sortedCampuses.map(c => [c.id ?? '', c]));
		// Preserve the order from buildingsLastOpenedIds (most recent first)
		const lastOpenedItems = buildingsLastOpenedIds
			.map(id => campusById.get(id))
			.filter((c): c is BuildingWithDistance => c !== undefined);
		const otherItems = sortedCampuses.filter(c => !lastOpenedSet.has(c.id ?? ''));
		return [...lastOpenedItems, ...otherItems];
	}, [sortedCampuses, buildingsLastOpenedIds, campusesSortBy]);

	const visibleCampuses: BuildingWithDistance[] = useMemo(() => {
		const src = sortedWithLastOpened;
		if (!query || query.trim() === '') return src;
		const q = query.toLowerCase().trim();
		return src.filter(campus => (campus?.alias ?? '').toLowerCase().includes(q));
	}, [sortedWithLastOpened, query]);

	const onRefresh = useCallback(() => {
		setRefreshing(true);
		fetchAllCampuses(selectedBuilding ?? null).finally(() => setRefreshing(false));
	}, [fetchAllCampuses, selectedBuilding]);

	const useCurrentLocationForDistance = useCallback(async () => {
		try {
			const { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== 'granted') {
				toast('Permission denied', 'error');
				return;
			}
			const loc = await Location.getCurrentPositionAsync({});
			const fakeBuilding = { coordinates: { coordinates: [loc.coords.longitude, loc.coords.latitude] } } as any;
			setSelectedBuilding(fakeBuilding);
			closeDistanceSheet();
		} catch (error) {
			console.error('Error getting location:', error);
		}
	}, [toast, closeDistanceSheet]);

	// Image Management
	const fetchAllCampusesRef = useRef(fetchAllCampuses);
	useEffect(() => { fetchAllCampusesRef.current = fetchAllCampuses; }, [fetchAllCampuses]);

	const openImageManagementModal = useCallback(
		(campus: DatabaseTypes.Buildings) => {
			if (!campus?.id) return;
			openDirectusImageEditModal({
				itemId: campus.id,
				field: 'image',
				collection: CollectionNames.BUILDINGS,
				onUpdated: () => {
					setCampusesDispatched(false);
					fetchAllCampusesRef.current();
				},
			});
		},
		[openDirectusImageEditModal]
	);

	// Memoized Props for Item
	const projectLogo = serverInfo?.info?.project?.project_logo;
	const campusAreaColor = appSettings?.campus_area_color;

	const renderItem = useCallback(
		({ item }: { item: BuildingWithDistance }) => {
			const isLastOpened = Boolean(item.id && buildingsLastOpenedIds.includes(item.id));
			return (
				<View style={{
					flex: 1,
					marginHorizontal: itemGap,
					marginVertical: itemGap,
					alignItems: 'center',
				}}>
					<BuildingItem
						campus={item}
						onEditImage={openImageManagementModal}
						openDistanceSheet={openDistanceSheet}
						amountColumnsForcard={amountColumnsForcard}
						primaryColor={primaryColor}
						projectLogo={projectLogo ?? undefined}
						campusAreaColor={campusAreaColor ?? undefined}
						selectedTheme={selectedTheme}
						screenWidth={windowWidth}
						isManagement={isManagement}
						isLastOpened={isLastOpened}
					/>
				</View>
			);
		},
		[
			openImageManagementModal, 
			openDistanceSheet, 
			amountColumnsForcard, 
			primaryColor, 
			projectLogo, 
			campusAreaColor, 
			selectedTheme, 
			windowWidth, 
			isManagement,
			buildingsLastOpenedIds,
			itemGap,
		]
	);

	const keyExtractor = useCallback((item: BuildingWithDistance, index: number) => (item.id ? String(item.id) : `campus-${index}`), []);

	const widthStyle = useMemo(() => ({
		width: windowWidth > 768 ? Math.floor(windowWidth * 0.6) : Math.floor(windowWidth)
	}), [windowWidth]);

	const headerComponent = useMemo(() => (
		<CampusListHeader
			widthStyle={widthStyle}
			theme={theme}
			query={query}
			setQuery={setQuery}
			translate={translate}
		/>
	), [widthStyle, theme, query, translate, setQuery]); // Added setQuery

	const emptyComponent = useMemo(() => (
		<CampusEmptyState loading={loading} theme={theme} translate={translate} />
	), [loading, theme, translate]);

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: theme.screen.background }}>
			<View style={styles.container}>
				<CampusHeader
					theme={theme}
					translate={translate}
					onToggleDrawer={toggleDrawer}
					onSort={openCampusSortingModal}
					drawerPosition={drawerPosition}
				/>

				<View style={{ flex: 1, alignItems: 'center' }}>
					<View
						style={{
							width: '100%',
							maxWidth: 1420,
							flex: 1,
						}}
						onLayout={e => {
							const w = e.nativeEvent.layout.width;
							// Only update if difference is significant to avoid jitter
							if (w && Math.abs(w - listWidth) > 1) {
								setListWidth(w);
							}
						}}
					>
						<FlashList
							key={`list-${numColumns}`}
							data={visibleCampuses}
							extraData={[
								amountColumnsForcard,
								primaryColor,
								projectLogo,
								campusAreaColor,
								selectedTheme,
								windowWidth,
								isManagement,
								buildingsLastOpenedIds,
								itemGap,
							]}
							renderItem={renderItem}
							keyExtractor={keyExtractor}
							numColumns={numColumns}
							contentContainerStyle={{ paddingBottom: 20 }}
							ListHeaderComponent={headerComponent}
							ListEmptyComponent={emptyComponent}
							refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
							removeClippedSubviews={true}
							showsVerticalScrollIndicator={false}
							// @ts-ignore: estimatedItemSize is missing in the type definition but required for performance
							estimatedItemSize={250}
							onEndReachedThreshold={0.4}
						/>
					</View>
				</View>

				<DistanceModal visible={distanceModalVisible} onClose={closeDistanceSheet} onUseCurrentPosition={useCurrentLocationForDistance} />
			</View>
		</SafeAreaView>
	);
};

export default Index;
