import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { FlatList, View, Text, RefreshControl, ActivityIndicator, Dimensions } from 'react-native';
import { addDays, format } from 'date-fns';
import { useTheme } from '@/hooks/useTheme';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';
import { fetchFoodOffersByCanteen } from '@/redux/actions/FoodOffers/FoodOffers';
import { DatabaseTypes } from 'repo-depkit-common';
import FoodItem from '@/components/FoodItem/FoodItem';
import CanteenFeedbackLabels from '@/components/CanteenFeedbackLabels/CanteenFeedbackLabels';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { sortFoodOffers } from '@/helper/foodOfferSortHelper';
import { FoodSortOption } from 'repo-depkit-common';
import styles from './styles';
import BaseBottomSheet from '@/components/BaseBottomSheet';
import type BottomSheet from '@gorhom/bottom-sheet';
import MarkingBottomSheet from '@/components/MarkingBottomSheet';
import { SHEET_COMPONENTS } from '@/app/(app)/foodoffers';

interface FoodOffersScrollListProps {
	canteenId: string;
	startDate: string;
}

interface DayData {
	date: string;
	offers: DatabaseTypes.Foodoffers[];
}

const FoodOffersScrollList: React.FC<FoodOffersScrollListProps> = ({ canteenId, startDate }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { canteenFeedbackLabels, canteens } = useSelector((state: RootState) => state.canteenReducer);
	const { sortBy, language } = useSelector((state: RootState) => state.settings);
	const { ownFoodFeedbacks, foodCategories, foodOfferCategories } = useSelector((state: RootState) => state.food);
	const { profile } = useSelector((state: RootState) => state.authReducer);
	const selectedCanteen = canteens?.find(c => c.id === canteenId) as DatabaseTypes.Canteens | undefined;
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
	const [days, setDays] = useState<DayData[]>([]);
	const [loading, setLoading] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	const [selectedSheet, setSelectedSheet] = useState<'menu' | keyof typeof SHEET_COMPONENTS | null>(null);
	const [sheetProps, setSheetProps] = useState<Record<string, any>>({});
	const [selectedFoodId, setSelectedFoodId] = useState('');
	const bottomSheetRef = useRef<BottomSheet>(null);

	const openSheet = useCallback((sheet: 'menu' | keyof typeof SHEET_COMPONENTS, props = {}) => {
		setSelectedSheet(sheet);
		setSheetProps(props);
	}, []);

	const closeSheet = useCallback(() => {
		bottomSheetRef.current?.snapToIndex(-1);
		bottomSheetRef.current?.close();
		setTimeout(() => {
			setSelectedSheet(null);
			setSheetProps({});
		}, 150);
	}, []);

	const openManagementSheet = (id: string) => {
		if (id) {
			openSheet('imageManagement', {
				selectedFoodId: id,
				fileName: 'foods',
				closeSheet,
				handleFetch: init,
			});
		}
	};

	useEffect(() => {
		if (selectedSheet) {
			setTimeout(() => {
				bottomSheetRef.current?.expand();
			}, 150);
		}
	}, [selectedSheet]);

	const SheetComponent = selectedSheet && selectedSheet !== 'menu' ? SHEET_COMPONENTS[selectedSheet] : null;

	const sortOffers = useCallback(
		(foodOffers: DatabaseTypes.Foodoffers[]) =>
			sortFoodOffers(sortBy as FoodSortOption, foodOffers, {
				languageCode: language,
				ownFoodFeedbacks,
				profile,
				foodCategories,
				foodOfferCategories,
				useFoodOfferCategoryOnly: true,
			}),
		[sortBy, language, ownFoodFeedbacks, profile, foodCategories, foodOfferCategories]
	);

	// Optimized dimension change handler with debouncing
	const handleDimensionChange = useCallback(
		({ window }: { window: { width: number; height: number } }) => {
			setScreenWidth(window.width);
		},
		[]
	);

	useEffect(() => {
		const sub = Dimensions.addEventListener('change', handleDimensionChange);
		return () => sub?.remove();
	}, [handleDimensionChange]);

	useEffect(() => {
		setDays(prev => prev.map(d => ({ ...d, offers: sortOffers(d.offers) })));
	}, [sortOffers]);

	// Memoized calculations for performance
	const averageItemHeight = useMemo(() => {
		// Estimate item height based on screen width and content
		// Base height + estimated content height
		const baseHeight = 100; // Header height
		const itemHeight = screenWidth > 550 ? 350 : 300; // Estimated food item height
		return baseHeight + itemHeight;
	}, [screenWidth]);

	// Performance optimized getItemLayout
	const getItemLayout = useCallback(
		(data: DayData[] | null | undefined, index: number) => ({
			length: averageItemHeight,
			offset: averageItemHeight * index,
			index,
		}),
		[averageItemHeight]
	);

	// Optimized keyExtractor for better performance
	const keyExtractor = useCallback((item: DayData) => item.date, []);

	const loadDay = useCallback(
		async (date: string) => {
			try {
				const res = await fetchFoodOffersByCanteen(canteenId, date);
				const offers = res?.data || [];
				const sortedOffers = sortOffers(offers);
				return { date, offers: sortedOffers } as DayData;
			} catch (e) {
				console.error('Error loading food offers', e);
				return { date, offers: [] } as DayData;
			}
		},
		[canteenId, sortOffers]
	);

	const init = useCallback(async () => {
		setLoading(true);
		const baseDate = new Date(startDate);
		const toLoad = [0, 1, 2];
		const loaded: DayData[] = [];
		for (const offset of toLoad) {
			const d = addDays(baseDate, offset).toISOString().split('T')[0];
			loaded.push(await loadDay(d));
		}
		setDays(loaded);
		setLoading(false);
	}, [startDate, loadDay]);

	useEffect(() => {
		init();
	}, [init]);

	const loadNext = useCallback(async () => {
		if (loading || loadingMore) return; // Prevent multiple concurrent loads
		
		setLoadingMore(true);
		try {
			const lastDate = days[days.length - 1].date;
			const nextDate = addDays(new Date(lastDate), 1).toISOString().split('T')[0];
			const nextDay = await loadDay(nextDate);
			setDays(prev => [...prev, nextDay]);
		} catch (error) {
			console.error('Error loading next day:', error);
		} finally {
			setLoadingMore(false);
		}
	}, [loading, loadingMore, days, loadDay]);

	const onEndReached = useCallback(() => {
		loadNext();
	}, [loadNext]);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await init();
		setRefreshing(false);
	}, [init]);

	// Memoized render function for better performance
	const renderDay = useCallback(({ item }: { item: DayData }) => {
		const feedbacks = canteenFeedbackLabels?.map((label, idx) => <CanteenFeedbackLabels key={`fl-${idx}`} label={label} date={item.date} />);

		return (
			<View style={styles.dayContainer}>
				<Text style={[styles.dateHeader, { color: theme.screen.text }]}> {format(new Date(item.date), 'dd.MM.yyyy')} </Text>
				<View
					style={{
						...styles.foodContainer,
						gap: screenWidth > 550 ? 10 : 10,
						justifyContent: 'center',
					}}
				>
					{item.offers.map(offer => (
						<FoodItem key={offer.id} item={offer} canteen={selectedCanteen as DatabaseTypes.Canteens} handleMenuSheet={openSheet} handleImageSheet={openManagementSheet} handleEatingHabitsSheet={openSheet} setSelectedFoodId={setSelectedFoodId} />
					))}
					{item.offers.length === 0 && <Text style={{ color: theme.screen.text }}>{translate(TranslationKeys.no_foodoffers_found_for_selection)}</Text>}
				</View>
				{feedbacks && feedbacks.length > 0 && <View style={styles.feebackContainer}>{feedbacks}</View>}
			</View>
		);
	}, [canteenFeedbackLabels, theme.screen.text, screenWidth, selectedCanteen, openSheet, openManagementSheet, setSelectedFoodId, translate]);

	if (loading) {
		return (
			<View style={[styles.loader, { backgroundColor: theme.screen.background }]}>
				<ActivityIndicator />
			</View>
		);
	}

	return (
		<>
			<FlatList 
				data={days} 
				keyExtractor={keyExtractor}
				renderItem={renderDay} 
				onEndReached={onEndReached} 
				onEndReachedThreshold={0.5} 
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} 
				scrollEventThrottle={16}
				getItemLayout={getItemLayout}
				initialNumToRender={3}
				maxToRenderPerBatch={5}
				windowSize={10}
				removeClippedSubviews={true}
				updateCellsBatchingPeriod={100}
				style={{ flex: 1 }} 
				contentContainerStyle={{ backgroundColor: theme.screen.background }} 
			/>
			{selectedSheet &&
				(selectedSheet === 'menu' ? (
					<MarkingBottomSheet ref={bottomSheetRef} onClose={closeSheet} />
				) : (
					<BaseBottomSheet key={selectedSheet} ref={bottomSheetRef} backgroundStyle={{ backgroundColor: theme.sheet.sheetBg }} handleComponent={null} onClose={closeSheet}>
						{SheetComponent && <SheetComponent closeSheet={closeSheet} {...sheetProps} />}
					</BaseBottomSheet>
				))}
		</>
	);
};

export default FoodOffersScrollList;
