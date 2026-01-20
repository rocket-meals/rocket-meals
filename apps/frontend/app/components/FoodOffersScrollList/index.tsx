import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { addDays, format } from 'date-fns';
import { useTheme } from '@/hooks/useTheme';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';
import { fetchFoodOffersByCanteen } from '@/redux/actions/FoodOffers/FoodOffers';
import { CollectionNames, DatabaseTypes, FoodSortOption } from 'repo-depkit-common';
import FoodItem from '@/components/FoodItem/FoodItem';
import CanteenFeedbackLabels from '@/components/CanteenFeedbackLabels/CanteenFeedbackLabels';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { sortFoodOffers } from '@/helper/foodOfferSortHelper';
import styles from './styles';
import BaseBottomSheet from '@/components/BaseBottomSheet';
import type BottomSheet from '@gorhom/bottom-sheet';
import MarkingBottomSheet from '@/components/MarkingBottomSheet';
import { SHEET_COMPONENTS } from '@/app/(app)/foodoffers';
import useMyScrollviewDirectusImageEditModal from '@/hooks/useMyScrollviewDirectusImageEditModal';

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
	const { sortBy, language, amountColumnsForcard } = useSelector((state: RootState) => state.settings);
	const { ownFoodFeedbacks, foodCategories, foodOfferCategories } = useSelector((state: RootState) => state.food);
        const { profile } = useSelector((state: RootState) => state.authReducer);
        const selectedCanteen = canteens?.find(c => c.id === canteenId) as DatabaseTypes.Canteens | undefined;
        const [days, setDays] = useState<DayData[]>([]);
        const [loading, setLoading] = useState(false);
        const [refreshing, setRefreshing] = useState(false);
	const [selectedSheet, setSelectedSheet] = useState<'menu' | keyof typeof SHEET_COMPONENTS | null>(null);
	const [sheetProps, setSheetProps] = useState<Record<string, any>>({});
	const [listWidth, setListWidth] = useState<number | null>(null);
	const bottomSheetRef = useRef<BottomSheet>(null);
	const { openDirectusImageEditModal } = useMyScrollviewDirectusImageEditModal();
        const openSheet = useCallback(
                (sheet: 'menu' | keyof typeof SHEET_COMPONENTS, props = {}) => {
                        setSelectedSheet(sheet);
                        setSheetProps(props);
                },
                []
        );

	const closeSheet = useCallback(() => {
		bottomSheetRef.current?.snapToIndex(-1);
		bottomSheetRef.current?.close();
		setTimeout(() => {
			setSelectedSheet(null);
			setSheetProps({});
		}, 150);
	}, []);

	useEffect(() => {
		if (selectedSheet) {
			setTimeout(() => {
				bottomSheetRef.current?.expand();
			}, 150);
		}
	}, [selectedSheet]);

	const SheetComponent = selectedSheet && selectedSheet !== 'menu' ? SHEET_COMPONENTS[selectedSheet] : null;
	const MIN_CARD_WIDTH = 280;
	const numColumns = useMemo(() => {
		if (amountColumnsForcard && amountColumnsForcard > 0) {
			return amountColumnsForcard;
		}

		if (!listWidth) return 2;

		const cols = Math.floor(listWidth / MIN_CARD_WIDTH);
		return Math.max(2, cols);
	}, [amountColumnsForcard, listWidth]);

	const cardWidth = useMemo(() => {
		if (!listWidth || !numColumns) return undefined;

		const horizontalMargin = 10;
		const totalMargin = horizontalMargin * 2 * numColumns;

		const availableWidth = listWidth - totalMargin;
		return availableWidth / numColumns;
	}, [listWidth, numColumns]);

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

	useEffect(() => {
		setDays(prev => prev.map(d => ({ ...d, offers: sortOffers(d.offers) })));
	}, [sortOffers]);

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

	const openManagementSheet = useCallback(
		(food: DatabaseTypes.Foods) => {
			if (!food?.id) return;
			openDirectusImageEditModal({
				itemId: food.id,
				field: 'image',
				collection: CollectionNames.FOODS,
				onUpdated: init,
			});
		},
		[init, openDirectusImageEditModal]
	);

	useEffect(() => {
		init();
	}, [init]);

	const loadNext = async () => {
		const lastDate = days[days.length - 1].date;
		const nextDate = addDays(new Date(lastDate), 1).toISOString().split('T')[0];
		const nextDay = await loadDay(nextDate);
		setDays(prev => [...prev, nextDay]);
	};

	const onEndReached = () => {
		loadNext();
	};

	const onRefresh = async () => {
		setRefreshing(true);
		await init();
		setRefreshing(false);
	};

	const renderDay = ({ item }: { item: DayData }) => {
		const feedbacks = canteenFeedbackLabels?.map((label, idx) => <CanteenFeedbackLabels key={`fl-${idx}`} label={label} date={item.date} />);

		return (
			<View style={styles.dayContainer}>
				<Text style={[styles.dateHeader, { color: theme.screen.text }]}> {format(new Date(item.date), 'dd.MM.yyyy')} </Text>
				<View
					style={[
						styles.foodContainer,
						{
							justifyContent: 'center',
						},
					]}
					onLayout={event => {
						const width = event.nativeEvent.layout.width;
						if (!listWidth || width > listWidth) {
							setListWidth(width);
						}
					}}
				>
					{item.offers.map(offer => (
						<View
							key={offer.id}
							style={{
								width: cardWidth || '100%',
								marginHorizontal: 10,
								marginVertical: 10,
								alignItems: 'center',
							}}
						>
							<FoodItem
								item={offer}
								canteen={selectedCanteen as DatabaseTypes.Canteens}
								handleMenuSheet={openSheet}
								handleImageSheet={openManagementSheet}
								handleEatingHabitsSheet={openSheet}
								cardWidth={cardWidth}
							/>
						</View>
					))}
					{item.offers.length === 0 && <Text style={{ color: theme.screen.text }}>{translate(TranslationKeys.no_foodoffers_found_for_selection)}</Text>}
				</View>
				{feedbacks && feedbacks.length > 0 && <View style={styles.feebackContainer}>{feedbacks}</View>}
			</View>
		);
	};

	if (loading) {
		return (
			<View style={[styles.loader, { backgroundColor: theme.screen.background }]}>
				<ActivityIndicator />
			</View>
		);
	}

	return (
		<>
			<FlatList data={days} keyExtractor={item => item.date} renderItem={renderDay} onEndReached={onEndReached} onEndReachedThreshold={0.5} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} scrollEventThrottle={16} style={{ flex: 1 }} contentContainerStyle={{ backgroundColor: theme.screen.background }} />
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
