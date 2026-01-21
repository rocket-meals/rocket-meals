import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { addDays } from 'date-fns';
import { useTheme } from '@/hooks/useTheme';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';
import { fetchFoodOffersByCanteen } from '@/redux/actions/FoodOffers/FoodOffers';
import { CollectionNames, DatabaseTypes, FoodSortOption, sortBySortField } from 'repo-depkit-common';
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
import FoodOfferInfoItem from '@/components/FoodOfferInfoItem/FoodOfferInfoItem';
import { getAppElementTranslation } from '@/helper/resourceHelper';
import CustomMarkdown from '@/components/CustomMarkdown/CustomMarkdown';
import { useMyContrastColor } from '@/helper/ColorHelper';
import { useSmartReadableDateMethod } from '@/helper/DateHelper';

interface FoodOffersScrollListProps {
	canteenId: string;
	startDate: string;
}

interface DayData {
	date: string;
	offers: DatabaseTypes.Foodoffers[];
}

interface DayItem {
	foodoffer: DatabaseTypes.Foodoffers | null;
	foodofferInfoItem: DatabaseTypes.FoodoffersInfoItems | null;
}

const FoodOffersScrollList: React.FC<FoodOffersScrollListProps> = ({ canteenId, startDate }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
        const { canteenFeedbackLabels, canteens } = useSelector((state: RootState) => state.canteenReducer);
        const { sortBy, language, amountColumnsForcard, appSettings, primaryColor, selectedTheme: mode } = useSelector((state: RootState) => state.settings);
        const { ownFoodFeedbacks, foodCategories, foodOfferCategories, foodOffersInfoItems } = useSelector((state: RootState) => state.food);
        const { profile } = useSelector((state: RootState) => state.authReducer);
	const { appElements } = useSelector((state: RootState) => state.appElements);
        const selectedCanteen = canteens?.find(c => c.id === canteenId) as DatabaseTypes.Canteens | undefined;
        const [days, setDays] = useState<DayData[]>([]);
        const [loading, setLoading] = useState(false);
        const [refreshing, setRefreshing] = useState(false);
        const [beforeElement, setBeforeElement] = useState<any>(null);
        const [afterElement, setAfterElement] = useState<any>(null);
        const [selectedSheet, setSelectedSheet] = useState<'menu' | keyof typeof SHEET_COMPONENTS | null>(null);
        const [sheetProps, setSheetProps] = useState<Record<string, any>>({});
        const bottomSheetRef = useRef<BottomSheet>(null);
        const [listWidth, setListWidth] = useState<number | null>(null);
        const MIN_CARD_WIDTH = 280;
	const { openDirectusImageEditModal } = useMyScrollviewDirectusImageEditModal();
        const foods_area_color = appSettings?.foods_area_color || primaryColor;
        const contrastColor = useMyContrastColor(theme.screen.background, theme, mode === 'dark');
	const smartReadableDate = useSmartReadableDateMethod();
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

	useEffect(() => {
		if (!appElements || !appSettings) return;
		const getElement = (id: string) => {
			const element = appElements?.find((el: any) => el.id === id);
			if (!element || !element.translations) return null;
			const { content, popup_button_text, popup_content } = getAppElementTranslation(element.translations, language);
			return { content, popup_button_text, popup_content };
		};
		const before = getElement(String(appSettings.foodoffers_list_before_element));
		const after = getElement(String(appSettings.foodoffers_list_after_element));
		setBeforeElement(before);
		setAfterElement(after);
	}, [appElements, appSettings, language]);

    const SheetComponent = selectedSheet && selectedSheet !== 'menu' ? SHEET_COMPONENTS[selectedSheet] : null;

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

	const getInfoItemContent = useCallback(
		(item: DatabaseTypes.FoodoffersInfoItems) => {
			const elementId = typeof item.name === 'string' ? item.name : item.name?.id;
			const element = appElements?.find((el: any) => el.id === elementId);
			if (!element || !element.translations) return { content: '' };
			return getAppElementTranslation(element.translations, language);
		},
		[appElements, language]
	);

	const buildDayItems = useCallback(
		(offers: DatabaseTypes.Foodoffers[]) => {
			const hasOffers = offers.length > 0;
			const infoItemsFiltered = (foodOffersInfoItems || []).filter(info => {
				if (info.canteen && selectedCanteen && info.canteen !== selectedCanteen.id) {
					return false;
				}
				if (info.show_only_when_no_foodoffers_found) {
					return !hasOffers;
				}
				return hasOffers;
			});

			const startInfos = sortBySortField(infoItemsFiltered.filter(i => i.placement === 'start'));
			const endInfos = sortBySortField(infoItemsFiltered.filter(i => i.placement === 'end'));

			const start = startInfos.map(i => ({ foodoffer: null, foodofferInfoItem: i }));
			const main = offers.map(o => ({ foodoffer: o, foodofferInfoItem: null }));
			const end = endInfos.map(i => ({ foodoffer: null, foodofferInfoItem: i }));

			return [...start, ...main, ...end] as DayItem[];
		},
		[foodOffersInfoItems, selectedCanteen]
	);

	const getDayItemKey = useCallback((item: DayItem, index: number) => {
		if (item.foodoffer?.id) return `f-${item.foodoffer.id}`;
		if (item.foodofferInfoItem?.id) return `i-${item.foodofferInfoItem.id}`;
		return `di-${index}`;
	}, []);

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

	const parseDateOnly = useCallback((date: string) => {
		const [year, month, day] = date.split('-').map(Number);
		if (!year || !month || !day) {
			return new Date(date);
		}
		return new Date(year, month - 1, day);
	}, []);

	const renderDay = ({ item }: { item: DayData }) => {
		const feedbacks = canteenFeedbackLabels?.map((label, idx) => <CanteenFeedbackLabels key={`fl-${idx}`} label={label} date={item.date} />);
		const dayItems = buildDayItems(item.offers);
		const hasInfoItems = dayItems.some(dayItem => dayItem.foodofferInfoItem);

		return (
			<View style={styles.dayContainer}>
				<View style={styles.dateHeaderRow}>
					<Text style={[styles.dateHeader, { color: theme.screen.text }]}>{smartReadableDate(parseDateOnly(item.date))}</Text>
				</View>
				{beforeElement && (
					<View style={styles.elementContainer}>
						<CustomMarkdown content={beforeElement?.content || ''} backgroundColor={foods_area_color} imageWidth={440} imageHeight={293} />
					</View>
				)}
				<View
					style={{
						...styles.foodContainer,
						justifyContent: 'flex-start',
					}}
					onLayout={e => {
						const w = e.nativeEvent.layout.width;
						if (w && w !== listWidth) setListWidth(w);
					}}
				>
					{dayItems.map((dayItem, idx) => (
						<View key={getDayItemKey(dayItem, idx)}
							style={{ width: cardWidth || '100%', marginHorizontal: 10, marginVertical: 10, alignItems: 'center' }}
						>
							{dayItem.foodoffer ? (
								<FoodItem
									item={dayItem.foodoffer}
									canteen={selectedCanteen as DatabaseTypes.Canteens}
									handleMenuSheet={openSheet}
									handleImageSheet={openManagementSheet}
									handleEatingHabitsSheet={openSheet}
									cardWidth={cardWidth}
								/>
							) : dayItem.foodofferInfoItem ? (
								<FoodOfferInfoItem
									item={dayItem.foodofferInfoItem}
									content={(getInfoItemContent(dayItem.foodofferInfoItem) || {}).content || ''}
									cardWidth={cardWidth}
								/>
							) : null}
						</View>
					))}
					{item.offers.length === 0 && !hasInfoItems && (
						<Text style={{ color: theme.screen.text }}>{translate(TranslationKeys.no_foodoffers_found_for_selection)}</Text>
					)}
				</View>
				{afterElement && (
					<View style={styles.elementContainer}>
						<CustomMarkdown content={afterElement?.content || ''} backgroundColor={foods_area_color} imageWidth={440} imageHeight={293} />
					</View>
				)}
				{feedbacks && feedbacks.length > 0 && <View style={styles.feebackContainer}>{feedbacks}</View>}
				<View style={[styles.dayDivider, { backgroundColor: contrastColor }]} />
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
			<FlatList
				data={days}
				keyExtractor={item => item.date}
				renderItem={renderDay}
				onEndReached={onEndReached}
				onEndReachedThreshold={0.5}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
				scrollEventThrottle={16}
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
