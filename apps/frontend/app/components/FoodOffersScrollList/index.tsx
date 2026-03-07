import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, RefreshControl, Text, View } from 'react-native';
import { addDays, format } from 'date-fns';
import { useTheme } from '@/hooks/useTheme';
import { fetchFoodOffersByCanteen } from '@/redux/actions/FoodOffers/FoodOffers';
import { CollectibleAt, CollectionNames, DatabaseTypes, FoodSortOption, sortBySortField } from 'repo-depkit-common';
import FoodItem from '@/components/FoodItem/FoodItem';
import CanteenFeedbackLabels from '@/components/CanteenFeedbackLabels/CanteenFeedbackLabels';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { sortFoodOffers } from '@/helper/foodOfferSortHelper';
import styles from './styles';
import BaseBottomSheet from '@/components/BaseBottomSheet';
import type BottomSheet from '@gorhom/bottom-sheet';
import { useDispatch } from 'react-redux';
import { CanteenFeedbackLabelHelper } from '@/redux/actions/CanteenFeedbacksLabel/CanteenFeedbacksLabel';
import { SET_CANTEEN_FEEDBACK_LABELS } from '@/redux/Types/types';

import { SHEET_COMPONENTS } from '@/app/(app)/foodoffers';
import useMyScrollviewDirectusImageEditModal from '@/hooks/useMyScrollviewDirectusImageEditModal';
import { useAppSelector } from '@/redux/hooks';
import { useMyContrastColor } from '@/helper/ColorHelper';
import { useSmartReadableDateMethod } from '@/helper/DateHelper';
import CustomMarkdown from '@/components/CustomMarkdown/CustomMarkdown';
import { getAppElementTranslation } from '@/helper/resourceHelper';
import CollectibleSpot from '@/components/CollectibleItem/CollectibleSpot';
import FoodOfferInfoItem from '@/components/FoodOfferInfoItem/FoodOfferInfoItem';

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

const EMPTY_FEEDBACKS: any[] = [];
const daysCache: Record<string, DayData[]> = {};

const FoodOffersScrollList: React.FC<FoodOffersScrollListProps> = ({ canteenId, startDate }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const dispatch = useDispatch();
	const { canteenFeedbackLabels, canteens } = useAppSelector((state) => state.canteenReducer);
	const { sortBy, language, amountColumnsForcard, appSettings, primaryColor, selectedTheme: mode } = useAppSelector((state) => state.settings);
	const { ownFoodFeedbacks, foodCategories, foodOfferCategories, foodOffersInfoItems } = useAppSelector((state) => state.food);
	const { profile } = useAppSelector((state) => state.authReducer);
	const { appElements } = useAppSelector((state) => state.appElements);
	
	const selectedCanteen = canteens?.find(c => c.id === canteenId) as DatabaseTypes.Canteens | undefined;
	const [days, setDays] = useState<DayData[]>([]);
	const [loading, setLoading] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [selectedSheet, setSelectedSheet] = useState<keyof typeof SHEET_COMPONENTS | null>(null);
	const [sheetProps, setSheetProps] = useState<Record<string, any>>({});
	const [listWidth, setListWidth] = useState<number | null>(null);
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
	const bottomSheetRef = useRef<BottomSheet>(null);
	const { openDirectusImageEditModal } = useMyScrollviewDirectusImageEditModal();
	const foods_area_color = appSettings?.foods_area_color || primaryColor;
	const contrastColor = useMyContrastColor(theme.screen.background, theme, mode === 'dark');
	const smartReadableDate = useSmartReadableDateMethod();
	const languageCode = language;

	const cacheKey = useMemo(
		() => `${canteenId}_${format(new Date(startDate), 'yyyy-MM-dd')}`,
		[canteenId, startDate]
	);

	const updateCache = useCallback(
		(newDays: DayData[]) => {
			daysCache[cacheKey] = newDays;
		},
		[cacheKey]
	);

	const appElementsMap = useMemo(() => {
		if (!appElements) return new Map();
		const map = new Map(appElements.map((el: any) => [el.id, el]));
		return map;
	}, [appElements]);

	const [beforeElement, setBeforeElement] = useState<any>(null);
	const [afterElement, setAfterElement] = useState<any>(null);

	useEffect(() => {
		if (!appElementsMap || !appSettings) return;
		const getElement = (id: string) => {
			const element = appElementsMap.get(id);
			if (!element || !element.translations) return null;
			const { content, popup_button_text, popup_content } = getAppElementTranslation(element.translations, languageCode);
			return { content, popup_button_text, popup_content };
		};
		const before = getElement(String(appSettings.foodoffers_list_before_element));
		const after = getElement(String(appSettings.foodoffers_list_after_element));

		setBeforeElement((prev: any) => {
			if (JSON.stringify(prev) === JSON.stringify(before)) return prev;
			return before;
		});
		setAfterElement((prev: any) => {
			if (JSON.stringify(prev) === JSON.stringify(after)) return prev;
			return after;
		});
	}, [appElementsMap, appSettings, languageCode]);

	const canteenFeedbackLabelHelper = useMemo(() => new CanteenFeedbackLabelHelper(), []);

	useEffect(() => {
		canteenFeedbackLabelHelper.fetchCanteenFeedbackLabels()
			.then((labels) => {
				dispatch({ type: SET_CANTEEN_FEEDBACK_LABELS, payload: labels });
			})
			.catch((error) => {
				console.error('Error fetching Canteen Feedback Labels:', error);
			});
	}, [canteenFeedbackLabelHelper, dispatch]);

	const parseDateOnly = useCallback((date: string) => {
		const [year, month, day] = date.split('-').map(Number);
		if (!year || !month || !day) {
			return new Date(date);
		}
		return new Date(year, month - 1, day);
	}, []);

	const buildDayItems = useCallback((offers: DatabaseTypes.Foodoffers[], date: string) => {
		const hasOffers = offers.length > 0;
		const dayOfWeek = parseDateOnly(date).getDay();
		// Index matches getDay() return values: 0=Sunday, 1=Monday, ..., 6=Saturday
		const weekdayFields: string[] = [
			'show_on_sundays',
			'show_on_mondays',
			'show_on_tuesdays',
			'show_on_wednesdays',
			'show_on_thursdays',
			'show_on_fridays',
			'show_on_saturdays',
		];
		const infoItemsFiltered = (foodOffersInfoItems || []).filter(info => {
			if (info.canteen && selectedCanteen && info.canteen !== selectedCanteen.id) {
				return false;
			}
			// Weekday filter: null/undefined and true are both treated as "show on this day" (default true).
			// Only an explicit false value excludes the item on this day.
			const weekdayField = weekdayFields[dayOfWeek];
			const fieldValue = (info as DatabaseTypes.FoodoffersInfoItems & Record<string, boolean | null | undefined>)[weekdayField];
			if (fieldValue != null && !fieldValue) {
				return false;
			}
			if (info.show_only_when_no_foodoffers_found) {
				return !hasOffers;
			}
			return hasOffers;
		});

		const startInfos = sortBySortField(infoItemsFiltered.filter(i => i.placement === 'start'));
		const endInfos = sortBySortField(infoItemsFiltered.filter(i => i.placement === 'end'));

		const startItems = startInfos.map(i => ({ foodoffer: null, foodofferInfoItem: i }));
		const main = offers.map(o => ({ foodoffer: o, foodofferInfoItem: null }));
		const endItems = endInfos.map(i => ({ foodoffer: null, foodofferInfoItem: i }));

		return [...startItems, ...main, ...endItems] as DayItem[];
	}, [foodOffersInfoItems, selectedCanteen, parseDateOnly]);

	const getInfoItemContent = useCallback(
		(item: DatabaseTypes.FoodoffersInfoItems) => {
			if (!item || !appElementsMap) return null;
			const elementId = typeof item.name === 'string' ? item.name : item.name?.id;
			const element = appElementsMap.get(elementId);
			if (!element) return null;
			const { content, popup_button_text, popup_content } = getAppElementTranslation(element.translations, languageCode);
			return { content, popup_button_text, popup_content };
		},
		[appElementsMap, languageCode]
	);

	const openSheet = useCallback(
			(sheet: keyof typeof SHEET_COMPONENTS, props = {}) => {
				setSelectedSheet(sheet);
				setSheetProps(props);
			},
			[]
	);

	useEffect(() => {
		if (!listWidth && screenWidth) {
			setListWidth(screenWidth);
		}
	}, [listWidth, screenWidth]);

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

	const SheetComponent = selectedSheet ? SHEET_COMPONENTS[selectedSheet] : null;
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

	const cardWidth = useMemo(() => {
		if (!listWidth || !numColumns) return undefined;

		const horizontalMargin = itemGap;
		const totalMargin = horizontalMargin * 2 * numColumns;

		const availableWidth = listWidth - totalMargin;
		return availableWidth / numColumns;
	}, [itemGap, listWidth, numColumns]);

	const ownFoodFeedbacksForSort = useMemo(() => {
		if (sortBy === FoodSortOption.FAVORITE || sortBy === FoodSortOption.INTELLIGENT) {
			return ownFoodFeedbacks;
		}
		return EMPTY_FEEDBACKS;
	}, [sortBy]);

	const sortOffers = useCallback(
		(foodOffers: DatabaseTypes.Foodoffers[]) =>
			sortFoodOffers(sortBy as FoodSortOption, foodOffers, {
				languageCode: language,
				ownFoodFeedbacks: ownFoodFeedbacksForSort,
				profile,
				foodCategories,
				foodOfferCategories,
				useFoodOfferCategoryOnly: true,
			}),
		[sortBy, language, ownFoodFeedbacksForSort, profile, foodCategories, foodOfferCategories]
	);

	useEffect(() => {
		setDays(prev => {
			const updated = prev.map(d => ({ ...d, offers: sortOffers(d.offers) }));
			if (updated.length > 0) {
				updateCache(updated);
			}
			return updated;
		});
	}, [sortOffers, updateCache]);

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

	const init = useCallback(
		async (forceReload = false) => {
			if (!forceReload && daysCache[cacheKey]) {
				setDays(daysCache[cacheKey]);
				setLoading(false);
				return;
			}

			setLoading(true);
			const baseDate = new Date(startDate);
			const toLoad = [0, 1, 2];
			const loaded: DayData[] = [];
			for (const offset of toLoad) {
				const d = addDays(baseDate, offset).toISOString().split('T')[0];
				loaded.push(await loadDay(d));
			}
			setDays(loaded);
			updateCache(loaded);
			setLoading(false);
		},
		[startDate, loadDay, cacheKey, updateCache]
	);

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

	useEffect(() => {
		const handleResize = () => setScreenWidth(Dimensions.get('window').width);
		const subscription = Dimensions.addEventListener('change', handleResize);
		return () => subscription?.remove();
	}, []);

	const loadNext = async () => {
		if (!days.length) return;
		const lastDate = days[days.length - 1].date;
		const nextDate = addDays(new Date(lastDate), 1).toISOString().split('T')[0];
		const nextDay = await loadDay(nextDate);
		setDays(prev => {
			const updated = [...prev, nextDay];
			updateCache(updated);
			return updated;
		});
	};

	const onEndReached = () => {
		loadNext();
	};

	const onRefresh = async () => {
		setRefreshing(true);
		await init(true);
		setRefreshing(false);
	};

	const renderDay = ({ item }: { item: DayData }) => {
		const feedbacks = canteenFeedbackLabels?.map((label, idx) => {
			const total = canteenFeedbackLabels.length;
			const groupPosition = total === 1 ? 'single' : idx === 0 ? 'top' : idx === total - 1 ? 'bottom' : 'middle';
			return <CanteenFeedbackLabels key={`fl-${idx}`} label={label} date={item.date} groupPosition={groupPosition} />;
		});
		const dayItems = buildDayItems(item.offers, item.date);
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
					{dayItems.map((dayItem, index) => {
						if (dayItem.foodoffer) {
							return (
								<View
									key={`offer-${dayItem.foodoffer.id}`}
									style={{
										width: cardWidth || '100%',
										marginHorizontal: itemGap,
										marginVertical: itemGap,
										alignItems: 'center',
									}}
								>
									<FoodItem
										item={dayItem.foodoffer}
										canteen={selectedCanteen as DatabaseTypes.Canteens}
										handleMenuSheet={openSheet}
										handleImageSheet={openManagementSheet}
										cardWidth={cardWidth}
									/>
								</View>
							);
						}
						if (dayItem.foodofferInfoItem) {
							const infoContent = getInfoItemContent(dayItem.foodofferInfoItem);
							if (!infoContent) return null;
							return (
								<View
									key={`info-${dayItem.foodofferInfoItem.id}`}
									style={{
										width: cardWidth || '100%',
										marginHorizontal: itemGap,
										marginVertical: itemGap,
										alignItems: 'center',
									}}
								>
									<FoodOfferInfoItem
										item={dayItem.foodofferInfoItem}
										content={infoContent.content}
										cardWidth={cardWidth}
										screenWidth={screenWidth}
									/>
								</View>
							);
						}
						return null;
					})}
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
				<CollectibleSpot collectibleKey={CollectibleAt.collectible_at_foodoffers} />
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
			{selectedSheet && (
				<BaseBottomSheet key={selectedSheet} ref={bottomSheetRef} backgroundStyle={{ backgroundColor: theme.sheet.sheetBg }} handleComponent={null} onClose={closeSheet}>
					{SheetComponent && <SheetComponent closeSheet={closeSheet} {...sheetProps} />}
				</BaseBottomSheet>
			)}
		</>
	);
};

export default FoodOffersScrollList;
