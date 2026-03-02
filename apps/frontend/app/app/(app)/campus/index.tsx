import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
	ActivityIndicator,
	Dimensions,
	RefreshControl,
	SafeAreaView,
	TextInput,
	View,
	Text,
	StyleSheet,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { CampusSortOption, CollectibleAt, CollectionNames, DatabaseTypes } from 'repo-depkit-common';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { isWeb } from '@/constants/Constants';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { DrawerContentComponentProps, DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation } from 'expo-router';
import BuildingItem from '@/components/BuildingItem/BuildingItem';
import { useDispatch, useSelector } from 'react-redux';
import useSelectedCanteen from '@/hooks/useSelectedCanteen';
import { CampusHelper } from '@/redux/actions/Campus/Campus';
import { SET_CAMPUSES, SET_CAMPUSES_DICT, SET_CAMPUSES_LOCAL, SET_UNSORTED_CAMPUSES } from '@/redux/Types/types';
import { BuildingsHelper } from '@/redux/actions/Buildings/Buildings';
import { calculateDistanceInMeter } from '@/helper/distanceHelper';
import DistanceModal from '@/components/DistanceModal';
import * as Location from 'expo-location';
import useToast from '@/hooks/useToast';
import { useLanguage } from '@/hooks/useLanguage';
import { Tooltip, TooltipContent, TooltipText } from '@gluestack-ui/themed';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { RootState } from '@/redux/reducer';
import useCampusSortingModal from '@/hooks/useCampusSortingModal';
import useMyScrollviewDirectusImageEditModal from '@/hooks/useMyScrollviewDirectusImageEditModal';

import IconButton from '@/components/UI/IconButton';
import Button from '@/components/UI/Button';
import CollectibleSpot from '@/components/CollectibleItem/CollectibleSpot';

const ITEM_HEIGHT = 140;

const Index: React.FC<DrawerContentComponentProps> = () => {
	useSetPageTitle(TranslationKeys.campus);
	const { theme } = useTheme();
	const toast = useToast();
	const dispatch = useDispatch();
	const { translate } = useLanguage();
	const campusHelper = useRef(new CampusHelper()).current;
	const buildingsHelper = useRef(new BuildingsHelper()).current;

	const [query, setQuery] = useState<string>('');
	const [refreshing, setRefreshing] = useState(false);
	const [hasLoaded, setHasLoaded] = useState(false);
	const [loading, setLoading] = useState(true);
	const [campusesDispatched, setCampusesDispatched] = useState(false);
	const [selectedBuilding, setSelectedBuilding] = useState<DatabaseTypes.Buildings | null>(null);
	const [distanceAdded, setDistanceAdded] = useState(false);
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
	const [listWidth, setListWidth] = useState<number | null>(null);

	const { drawerPosition, campusesSortBy, amountColumnsForcard, primaryColor, serverInfo, appSettings, selectedTheme } =
		useSelector((state: RootState) => state.settings);
	const { campuses, campusesLocal, unSortedCampuses } = useSelector((state: RootState) => state.campus);
	const { isManagement } = useSelector((state: RootState) => state.authReducer);
	const selectedCanteen = useSelectedCanteen();
	const drawerNavigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();

	const [distanceModalVisible, setDistanceModalVisible] = useState(false);
	const { openCampusSortingModal } = useCampusSortingModal();
	const { openDirectusImageEditModal } = useMyScrollviewDirectusImageEditModal();

	const openDistanceSheet = useCallback(() => setDistanceModalVisible(true), []);
	const closeDistanceSheet = useCallback(() => setDistanceModalVisible(false), []);

	const MIN_CARD_WIDTH = 280;
	const numColumns = useMemo(() => {
		if (amountColumnsForcard && amountColumnsForcard > 0) {
			return amountColumnsForcard;
		}

		if (!listWidth) return 2;

		const cols = Math.floor(listWidth / MIN_CARD_WIDTH);
		return Math.max(2, cols);
	}, [amountColumnsForcard, listWidth]);

	const itemGap = useMemo(() => {
		if (screenWidth >= 1600) return 28;
		if (screenWidth >= 1300) return 24;
		if (screenWidth >= 1000) return 20;
		if (screenWidth >= 700) return 16;
		if (screenWidth >= 500) return 12;
		if (screenWidth >= 300) return 10;
		return 8;
	}, [screenWidth]);

	const ensureStableIds = useCallback((arr: DatabaseTypes.Buildings[] = []) => {
		return arr.map((c, idx) => {
			const stableId = c.id ?? c._id ?? `__generated__${idx}_${String(c.alias ?? '').slice(0, 10)}`;
			if (c.id === stableId || c._id === stableId) return c;
			return { ...c, id: stableId };
		});
	}, []);

	const addDistanceToList = useCallback((list: DatabaseTypes.Buildings[] | undefined, base: DatabaseTypes.Buildings | null) => {
		if (!list) return list;
		if (!base || !base.coordinates) return list;
		try {
			const baseCoords = base.coordinates?.coordinates;
			return list.map(c => {
				const dist = calculateDistanceInMeter(baseCoords, c?.coordinates?.coordinates);
				return { ...c, distance: dist };
			});
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
		async (baseBuilding: DatabaseTypes.Buildings | null = null) => {
			try {
				setLoading(true);
				const campusDataRaw = (await campusHelper.fetchCampus({})) as DatabaseTypes.Buildings[] | undefined;
				const campusData = ensureStableIds(campusDataRaw ?? []);
				// build dict
				const dict = campusData.reduce((acc: Record<string, DatabaseTypes.Buildings>, campus) => {
					if (campus?.id) acc[campus.id] = campus;
					return acc;
				}, {});

				const campusDataWithDistance = baseBuilding ? addDistanceToList(campusData, baseBuilding) : campusData.map(c => ({ ...c, distance: Number.isFinite(Number(c?.distance)) ? Number(c.distance) : 0 }));

				dispatch({ type: SET_CAMPUSES, payload: campusDataWithDistance });
				dispatch({ type: SET_CAMPUSES_DICT, payload: dict });
				dispatch({ type: SET_UNSORTED_CAMPUSES, payload: campusDataWithDistance });
				dispatch({ type: SET_CAMPUSES_LOCAL, payload: campusDataWithDistance });

				setCampusesDispatched(true);
				setHasLoaded(true);
			} catch (e) {
				console.error('fetchAllCampuses error', e);
				toast('Failed to load campuses', 'error');
			} finally {
				setLoading(false);
			}
		},
		[campusHelper, dispatch, ensureStableIds, addDistanceToList, toast]
	);

	useEffect(() => {
		(async () => {
			setLoading(true);
			const base = await fetchSelectedBuilding();
			await fetchAllCampuses(base ?? null);
			setLoading(false);
		})();
	}, []);

	useEffect(() => {
		if (!campusesDispatched || !selectedBuilding) return;

		const nextList = addDistanceToList(campusesLocal ?? [], selectedBuilding);
		if (nextList) {
			const equal = (campuses ?? []).length === nextList.length && (campuses ?? []).every((c, i) => String(c?.id ?? '') === String(nextList[i]?.id ?? ''));
			if (!equal) {
				dispatch({ type: SET_CAMPUSES, payload: nextList });
				dispatch({ type: SET_UNSORTED_CAMPUSES, payload: nextList });
				setDistanceAdded(true);
			}
		}
	}, [selectedBuilding, campusesDispatched, addDistanceToList, campusesLocal, campuses, dispatch]);

	const sortCampusesWithDistance = useCallback((list: DatabaseTypes.Buildings[] | undefined) => {
		if (!list) return list;
		return [...list].sort((a: any, b: any) => (a?.distance || 0) - (b?.distance || 0));
	}, []);

	const sortCampusesAlphabetically = useCallback((list: DatabaseTypes.Buildings[] | undefined) => {
		if (!list) return list;
		return [...list].sort((a: any, b: any) => (a?.alias ?? '').localeCompare(b?.alias ?? ''));
	}, []);

	useEffect(() => {
		if (!campuses || campuses.length === 0) return;
		let next = campuses;
		if (campusesSortBy === CampusSortOption.ALPHABETICAL) next = sortCampusesAlphabetically(campuses);
		else if (campusesSortBy === CampusSortOption.DISTANCE || campusesSortBy === CampusSortOption.INTELLIGENT) next = sortCampusesWithDistance(campuses);

		const same = next.length === campuses.length && next.every((c, i) => String(c?.id ?? '') === String(campuses[i]?.id ?? ''));
		if (!same) {
			dispatch({ type: SET_CAMPUSES, payload: next });
			dispatch({ type: SET_CAMPUSES_LOCAL, payload: next });
		}
	}, [campusesSortBy, campuses]);

	useEffect(() => {
		if (!hasLoaded) return;
		const t = setTimeout(() => {
		}, 300);
		return () => clearTimeout(t);
	}, [query, hasLoaded]);

	const visibleCampuses = useMemo(() => {
		const src = campusesLocal ?? campuses ?? [];
		if (!query || query.trim() === '') return src;
		const q = query.toLowerCase().trim();
		return src.filter(campus => (campus?.alias ?? '').toLowerCase().includes(q));
	}, [campusesLocal, campuses, query]);

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

			const updated = addDistanceToList(campusesLocal ?? campuses ?? [], fakeBuilding);
			if (updated) {
				dispatch({ type: SET_CAMPUSES, payload: updated });
				dispatch({ type: SET_CAMPUSES_LOCAL, payload: updated });
			}
			closeDistanceSheet();
		} catch (error) {
			console.error('Error getting location:', error);
		}
	}, [addDistanceToList, campusesLocal, campuses, dispatch, toast, closeDistanceSheet]);

	useEffect(() => {
		const handleResize = () => {
			const w = Dimensions.get('window').width;
			setScreenWidth(Number.isFinite(w) && w > 0 ? w : 360);
		};
		handleResize();
		const subscription = Dimensions.addEventListener('change', handleResize);
		return () => subscription?.remove();
	}, []);

	const settingsForItem = useMemo(() => ({
		amountColumnsForcard,
		primaryColor,
		serverInfo,
		appSettings,
		selectedTheme,
		screenWidth,
		isManagement,
	}), [amountColumnsForcard, primaryColor, serverInfo, appSettings, selectedTheme, screenWidth, isManagement]);

	const openImageManagementModal = useCallback(
		(campus: DatabaseTypes.Buildings) => {
			if (!campus?.id) return;
			openDirectusImageEditModal({
				itemId: campus.id,
				field: 'image',
				collection: CollectionNames.BUILDINGS,
				onUpdated: () => {
					setCampusesDispatched(false);
					fetchAllCampuses();
				},
			});
		},
		[fetchAllCampuses, openDirectusImageEditModal]
	);

	const renderItem = useCallback(
		({ item }: { item: DatabaseTypes.Buildings }) => {
			return (
				<View
					style={{
						flex: 1,
						marginHorizontal: 10,
						marginVertical: 10,
						alignItems: 'center'
					}}
				>
					<BuildingItem
						campus={item}
						onEditImage={openImageManagementModal}
						openDistanceSheet={openDistanceSheet}
						settings={settingsForItem}
					/>
				</View>
			);
		},
		[
			openImageManagementModal,
			openDistanceSheet,
			settingsForItem,
			itemGap,
		]
	);

	const keyExtractor = useCallback((item: DatabaseTypes.Buildings, index: number) => (item.id ? String(item.id) : `campus-${index}`), []);

	const ListHeaderComponent = useMemo(() => {
		const widthStyle = { width: screenWidth > 768 ? '60%' : '100%' };
		return (
			<View style={{ width: '100%', paddingHorizontal: 5, marginBottom: 10, alignItems: 'center' }}>

				<CollectibleSpot collectibleKey={CollectibleAt.collectible_at_campus} />

				<View style={[styles.searchContainer, widthStyle]}>
					<TextInput
						style={[styles.searchInput, { color: theme.screen.text }]}
						cursorColor={theme.screen.text}
						placeholderTextColor={theme.screen.placeholder}
						onChangeText={setQuery}
						value={query}
						placeholder={translate(TranslationKeys.search_campus_here)}
					/>
				</View>
			</View>
		);
	}, [screenWidth, theme.screen.text, theme.screen.placeholder, query, translate]);

	const ListEmptyComponent = useMemo(() => {
		if (loading) {
			return (
				<View style={emptyStyles.container}>
					<ActivityIndicator size={30} color={theme.screen.text} />
				</View>
			);
		}

		return (
			<View style={emptyStyles.container}>
				<Text style={{ fontSize: 16, fontFamily: 'Poppins_400Regular', color: theme.screen.text }}>{translate(TranslationKeys.no_campus_found)}</Text>
			</View>
		);
	}, [loading, theme.screen.text, translate]);

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: theme.screen.background }}>
			<View style={{ ...styles.container }}>
				<View style={{ ...styles.header, backgroundColor: theme.header.background, paddingHorizontal: isWeb ? 20 : 10 }}>
					<View style={[styles.row, { flexDirection: drawerPosition === 'right' ? 'row-reverse' : 'row' }]}>
						<View style={[styles.col1, { flexDirection: drawerPosition === 'right' ? 'row-reverse' : 'row' }]}>
							<Tooltip
								placement="top"
								trigger={triggerProps => (
									<IconButton {...triggerProps} onPress={() => drawerNavigation.toggleDrawer()} style={{ padding: 10 }}>
										<Ionicons name="menu" size={24} color={theme.header.text} />
									</IconButton>
								)}
							>
								<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
									<TooltipText fontSize="$sm" color={theme.tooltip.text}>
										{`${translate(TranslationKeys.open_drawer)}`}
									</TooltipText>
								</TooltipContent>
							</Tooltip>

							<Text style={{ ...styles.heading, color: theme.header.text }}>{translate(TranslationKeys.campus)}</Text>
						</View>

						<View style={{ ...styles.col2, gap: isWeb ? 30 : 15 }}>
							<Tooltip
								placement="top"
								trigger={triggerProps => (
									<IconButton {...triggerProps} onPress={openCampusSortingModal} style={{ padding: 10 }}>
										<MaterialIcons name="sort" size={24} color={theme.header.text} />
									</IconButton>
								)}
							>
								<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
									<TooltipText fontSize="$sm" color={theme.tooltip.text}>
										{`${translate(TranslationKeys.sort)}: ${translate(TranslationKeys.buildings)}`}
									</TooltipText>
								</TooltipContent>
							</Tooltip>
						</View>
					</View>
				</View>

				<View style={{ flex: 1, alignItems: 'center' }}>
					<View
						style={{
							width: '100%',
							maxWidth: 1420,
							flex: 1,
						}}
						onLayout={e => {
							const w = e.nativeEvent.layout.width;
							if (w && w !== listWidth) {
								setListWidth(w);
							}
						}}
					>
						<FlashList
							key={numColumns}
							data={visibleCampuses}
							renderItem={renderItem}
							keyExtractor={keyExtractor}
							numColumns={numColumns}
                                                        contentContainerStyle={{
                                                                marginTop: 20,
                                                        }}
                                                        ListHeaderComponent={ListHeaderComponent}
                                                        ListEmptyComponent={ListEmptyComponent}
                                                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
							removeClippedSubviews={false}
							showsVerticalScrollIndicator={false}
							onEndReachedThreshold={0.4}
						/>
					</View>
				</View>

				<DistanceModal visible={distanceModalVisible} onClose={closeDistanceSheet} onUseCurrentPosition={useCurrentLocationForDistance} />
			</View>
		</SafeAreaView>
	);
};

const itemWrapperStyle = StyleSheet.create({
	container: {
		flex: 1,
		margin: 8,
	},
});

const emptyStyles = StyleSheet.create({
	container: {
		height: 200,
		width: '100%',
		justifyContent: 'center',
		alignItems: 'center',
	},
});

export default Index;
