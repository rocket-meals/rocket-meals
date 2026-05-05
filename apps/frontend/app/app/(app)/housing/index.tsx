import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, SafeAreaView, useWindowDimensions, View, unstable_batchedUpdates } from 'react-native';
import { ApartmentSortOption, CollectionNames, DatabaseTypes, shouldApplyLastOpenedBoost } from 'repo-depkit-common';
import { FlashList } from '@shopify/flash-list';
import * as Location from 'expo-location';
import { useDispatch, shallowEqual } from 'react-redux';

import {
	SET_APARTMENTS,
	SET_APARTMENTS_DICT,
	SET_APARTMENTS_LOCAL,
	SET_UNSORTED_APARTMENTS,
} from '@/redux/Types/types';
import { ApartmentsHelper } from '@/redux/actions/Apartments/Apartments';
import { BuildingsHelper } from '@/redux/actions/Buildings/Buildings';
import { useAppSelector } from '@/redux/hooks';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import useSelectedCanteen from '@/hooks/useSelectedCanteen';
import useToast from '@/hooks/useToast';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import useHousingSortingModal from '@/hooks/useHousingSortingModal';
import useMyScrollviewDirectusImageEditModal from '@/hooks/useMyScrollviewDirectusImageEditModal';
import useLastOpenedBuildings from '@/hooks/useLastOpenedBuildings';
import { TranslationKeys } from '@/locales/keys';
import ApartmentItem from '@/components/ApartmentItem/ApartmentItem';
import DistanceModal from '@/components/DistanceModal';
import { getImageUrl } from '@/constants/HelperFunctions';

import styles from './styles';
import { addDistanceToApartments, getSortedApartments } from './utils';
import HousingHeader from './components/HousingHeader';
import HousingListHeader from './components/HousingListHeader';
import HousingListEmpty from './components/HousingListEmpty';
import CardDimensionHelper, { MIN_CARD_WIDTH } from '@/helper/CardDimensionHelper';

const apartmentsHelper = new ApartmentsHelper();
const buildingsHelper = new BuildingsHelper();

const Index: React.FC = () => {
	useSetPageTitle(TranslationKeys.housing);
	const toast = useToast();
	const { translate } = useLanguage();
	const { theme } = useTheme();
	const dispatch = useDispatch();
	const { width: screenWidth } = useWindowDimensions();

	// Global State
	const drawerPosition = useAppSelector((state) => state.settings.drawerPosition);
	const apartmentsSortBy = useAppSelector((state) => state.settings.apartmentsSortBy);
	const primaryColor = useAppSelector((state) => state.settings.primaryColor);
	const housingAreaColorFromSettings = useAppSelector((state) => state.settings.appSettings?.housing_area_color);
	const housingTranslations = useAppSelector((state) => state.settings.appSettings?.housing_translations, shallowEqual);
	const language = useAppSelector((state) => state.settings.language);
	const amountColumnsForcard = useAppSelector((state) => state.settings.amountColumnsForcard);
	const projectLogo = useAppSelector((state) => state.settings.serverInfo?.info?.project?.project_logo);
	const isManagement = useAppSelector((state) => state.authReducer.isManagement);
	const selectedTheme = useAppSelector((state) => state.settings.selectedTheme);

	const unSortedApartments = useAppSelector((state) => state.apartment.unSortedApartments, shallowEqual);

	const selectedCanteen = useSelectedCanteen();

	// Local State
	// Optimization: Initialize loading to false if we already have data in Redux
	const [query, setQuery] = useState<string>('');
	const [loading, setLoading] = useState(!unSortedApartments || unSortedApartments.length === 0);
	const [distanceModalVisible, setDistanceModalVisible] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [selectedBuilding, setSelectedBuilding] = useState<DatabaseTypes.Buildings | null>();
	const [listWidth, setListWidth] = useState<number | null>(null);

	// Helpers
	const { openHousingSortingModal } = useHousingSortingModal();
	const { openDirectusImageEditModal } = useMyScrollviewDirectusImageEditModal();
	const { buildingsLastOpenedIds } = useLastOpenedBuildings();

	const housingAreaColor = housingAreaColorFromSettings
		? housingAreaColorFromSettings
		: primaryColor;

	const defaultImage = useMemo(
		() => getImageUrl(projectLogo),
		[projectLogo]
	);

	// Callbacks
	const openDistanceSheet = useCallback(() => {
		setDistanceModalVisible(true);
	}, []);

	const closeDistanceSheet = useCallback(() => {
		setDistanceModalVisible(false);
	}, []);

	const fetchAllApartments = useCallback(async (isRefresh = false) => {
		if (!isRefresh && unSortedApartments && unSortedApartments.length > 0) {
			setLoading(false);
			return;
		}
		if ((!unSortedApartments || unSortedApartments.length === 0) && !isRefresh) {
			setLoading(true);
		}
		try {
			const apartmentData = (await apartmentsHelper.fetchApartments({})) as DatabaseTypes.Apartments[];
			const list = apartmentData || [];

			const apartmentWithBuilding = await Promise.all(
				list.map(async (apartment) => {
					const buildingData = (await buildingsHelper.fetchBuildingById(
						String(apartment?.building)
					)) as DatabaseTypes.Buildings;

					return {
						...apartment,
						...buildingData,
					};
				})
			);

			const apartmentsDict = apartmentWithBuilding.reduce((acc, apt: any) => {
				if (apt.id) {
					acc[apt.id] = apt;
				}
				return acc;
			}, {} as Record<string, any>);

			unstable_batchedUpdates(() => {
				dispatch({ type: SET_APARTMENTS, payload: apartmentWithBuilding });
				dispatch({ type: SET_UNSORTED_APARTMENTS, payload: apartmentWithBuilding });
				dispatch({ type: SET_APARTMENTS_LOCAL, payload: apartmentWithBuilding });
				dispatch({ type: SET_APARTMENTS_DICT, payload: apartmentsDict });
			});
		} catch (error) {
			console.error('Error fetching apartments or buildings:', error);
			toast('Failed to load apartments', 'error');
		} finally {
			setLoading(false);
		}
	}, [dispatch, toast, unSortedApartments]);

	const onRefresh = useCallback(() => {
		setRefreshing(true);
		fetchAllApartments(true).finally(() => {
			setRefreshing(false);
		});
	}, [fetchAllApartments]);

	const fetchSelectedBuilding = useCallback(async () => {
		if (selectedCanteen?.building) {
			const buildingData = (await buildingsHelper.fetchBuildingById(
				String(selectedCanteen.building)
			)) as DatabaseTypes.Buildings;
			const building = buildingData || [];
			if (building) {
				setSelectedBuilding(building);
			}
		} else {
			// toast('Please select canteen', 'error'); // Optional: suppressing this error on mount if not selected
		}
	}, [selectedCanteen]);

	const useCurrentLocationForDistance = useCallback(async () => {
		try {
			const { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== 'granted') {
				toast('Permission denied', 'error');
				return;
			}
			const loc = await Location.getCurrentPositionAsync({});
			setSelectedBuilding({
				coordinates: { coordinates: [loc.coords.longitude, loc.coords.latitude] },
			} as any);
			closeDistanceSheet();
		} catch (error) {
			console.error('Error getting location:', error);
		}
	}, [closeDistanceSheet, toast]);

	const openImageManagementModal = useCallback(
		(apartment: DatabaseTypes.Apartments) => {
			if (!apartment?.id) return;
			const buildingId =
				typeof apartment.building === 'object' ? apartment.building?.id : apartment.building;
			if (!buildingId) return;
			openDirectusImageEditModal({
				itemId: buildingId,
				field: 'image',
				collection: CollectionNames.BUILDINGS,
				onUpdated: () => {
					fetchAllApartments();
				},
			});
		},
		[fetchAllApartments, openDirectusImageEditModal]
	);

	// Effects
	useEffect(() => {
		fetchSelectedBuilding();
		fetchAllApartments();
	}, []); // Run once on mount

	// Computed Data
	const apartmentsWithDistance = useMemo(() => {
		return addDistanceToApartments(unSortedApartments || [], selectedBuilding);
	}, [unSortedApartments, selectedBuilding]);

	const sortedApartments = useMemo(() => {
		// If apartmentsSortBy is null/undefined, getSortedApartments handles default
		// Note: We cast to any because ApartmentSortOption enum might not match exactly if Redux state is loose
		return getSortedApartments(apartmentsWithDistance, apartmentsSortBy as any);
	}, [apartmentsWithDistance, apartmentsSortBy]);

	// Lift last-opened buildings to the top only for INTELLIGENT and LAST_OPENED sort modes
	const sortedWithLastOpened = useMemo(() => {
		if (!shouldApplyLastOpenedBoost(apartmentsSortBy as any) || !buildingsLastOpenedIds || buildingsLastOpenedIds.length === 0) return sortedApartments;
		const lastOpenedSet = new Set(buildingsLastOpenedIds);
		// Build a Map for O(1) lookup by ID (apartment.id is building ID after data merge)
		const apartmentById = new Map(sortedApartments.map((a: any) => [a.id ?? '', a]));
		// Preserve the order from buildingsLastOpenedIds (most recent first)
		const lastOpenedItems = buildingsLastOpenedIds
			.map(id => apartmentById.get(id))
			.filter((a): a is DatabaseTypes.Apartments => a !== undefined);
		const otherItems = sortedApartments.filter((a: any) => !lastOpenedSet.has(a.id ?? ''));
		return [...lastOpenedItems, ...otherItems];
	}, [sortedApartments, buildingsLastOpenedIds, apartmentsSortBy]);

	const visibleApartments = useMemo(() => {
		if (!query || query.trim() === '') return sortedWithLastOpened;
		const q = query.toLowerCase().trim();
		return sortedWithLastOpened.filter((apartment: any) =>
			(apartment?.alias ?? '').toLowerCase().includes(q)
		);
	}, [sortedWithLastOpened, query]);

	const numColumns = useMemo(() => {
		return CardDimensionHelper.getGridNumColumns(listWidth || 0, amountColumnsForcard);
	}, [amountColumnsForcard, listWidth]);

	const itemGap = useMemo(() => {
		return CardDimensionHelper.getItemGap(screenWidth);
	}, [screenWidth]);

	const cardWidth = useMemo(() => {
		if (!listWidth) return MIN_CARD_WIDTH;
		return CardDimensionHelper.getGridCardWidth(listWidth, numColumns, itemGap);
	}, [listWidth, numColumns, itemGap]);

	// Render Helpers
	const renderItem = useCallback(
		({ item }: { item: any }) => (
			<View style={{
				flex: 1,
				marginHorizontal: itemGap,
				marginVertical: itemGap,
				alignItems: 'center',
			}}>
				<ApartmentItem
					apartment={item}
					onEditImage={openImageManagementModal}
					openDistanceSheet={openDistanceSheet}
					knownCardWidth={cardWidth}
					housingAreaColor={housingAreaColor}
					defaultImage={defaultImage}
					theme={theme}
					translate={translate}
					isManagement={isManagement}
					mode={selectedTheme as 'light' | 'dark' | 'systematic'}
				/>
			</View>
		),
		[openImageManagementModal, openDistanceSheet, cardWidth, housingAreaColor, defaultImage, theme, translate, isManagement, selectedTheme, itemGap]
	);

	const keyExtractor = useCallback(
		(item: any, index: number) => (item.id ? String(item.id) : `apartment-${index}`),
		[]
	);

	const ListHeader = useMemo(
		() => (
			<HousingListHeader
				screenWidth={screenWidth}
				housingTranslations={housingTranslations}
				language={language}
				housingAreaColor={housingAreaColor}
				theme={theme}
				query={query}
				setQuery={setQuery}
				translate={translate}
			/>
		),
		[screenWidth, housingTranslations, language, housingAreaColor, theme, query, translate]
	);

	const ListEmpty = useMemo(
		() => <HousingListEmpty loading={loading} theme={theme} />,
		[loading, theme]
	);

	const extraData = useMemo(() => ([
		cardWidth,
		housingAreaColor,
		defaultImage,
		theme,
		translate,
		isManagement,
		selectedTheme,
		itemGap
	]), [cardWidth, housingAreaColor, defaultImage, theme, translate, isManagement, selectedTheme, itemGap]);

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: theme.screen.background }]}>
			<View style={styles.container}>
				<HousingHeader
					theme={theme}
					translate={translate}
					drawerPosition={drawerPosition}
					openHousingSortingModal={openHousingSortingModal}
				/>

				<View style={{ flex: 1, alignItems: 'center' }}>
					<View
						style={{
							width: '100%',
							maxWidth: 1420,
							flex: 1,
						}}
						onLayout={(e) => {
							const w = e.nativeEvent.layout.width;
							if (w && (!listWidth || Math.abs(w - listWidth) > 10)) {
								setListWidth(w);
							}
						}}
					>
						<FlashList
							key={numColumns}
							data={visibleApartments}
							extraData={extraData}
							renderItem={renderItem}
							keyExtractor={keyExtractor}
							numColumns={numColumns}
							// @ts-ignore
							estimatedItemSize={300}
							contentContainerStyle={{
								paddingBottom: 20,
							}}
							ListHeaderComponent={ListHeader}
							ListEmptyComponent={ListEmpty}
							refreshControl={
								<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
							}
							removeClippedSubviews={true}
							showsVerticalScrollIndicator={false}
							onEndReachedThreshold={0.4}
						/>
					</View>
				</View>
				{distanceModalVisible && (
					<DistanceModal
						visible={distanceModalVisible}
						onClose={closeDistanceSheet}
						onUseCurrentPosition={useCurrentLocationForDistance}
					/>
				)}
			</View>
		</SafeAreaView>
	);
};

export default Index;
