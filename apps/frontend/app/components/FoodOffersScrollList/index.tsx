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
import { useFocusEffect } from 'expo-router';

import { SHEET_COMPONENTS } from '@/app/(app)/foodoffers';
import useMyScrollviewDirectusImageEditModal from '@/hooks/useMyScrollviewDirectusImageEditModal';
import { useAppSelector } from '@/redux/hooks';
import { useDispatch } from 'react-redux';
import { CanteenFeedbackLabelHelper } from '@/redux/actions/CanteenFeedbacksLabel/CanteenFeedbacksLabel';
import { SET_CANTEEN_FEEDBACK_LABELS } from '@/redux/Types/types';
import { useMyContrastColor } from '@/helper/ColorHelper';
import { useSmartReadableDateMethod } from '@/helper/DateHelper';
import CustomMarkdown from '@/components/CustomMarkdown/CustomMarkdown';
import { getAppElementTranslation } from '@/helper/resourceHelper';
import CollectibleSpot from '@/components/CollectibleItem/CollectibleSpot';
import FoodOfferInfoItem from '@/components/FoodOfferInfoItem/FoodOfferInfoItem';
import CardDimensionHelper from '@/helper/CardDimensionHelper';
import { CanteenVisitsDateRow } from '@/components/CanteenVisitsDateRow';

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
const canteenFeedbackLabelHelper = new CanteenFeedbackLabelHelper();

const FoodOffersScrollList: React.FC<FoodOffersScrollListProps> = ({ canteenId, startDate }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const dispatch = useDispatch();
	const { canteenFeedbackLabels, canteens } = useAppSelector((state) => state.canteenReducer);
	const { sortBy, language, amountColumnsForcard, appSettings, primaryColor, selectedTheme: mode } = useAppSelector((state) => state.settings);
	const { ownFoodFeedbacks, foodCategories, foodOfferCategories, foodOffersInfoItems } = useAppSelector((state) => state.food);
	const { profile, user, isDevMode } = useAppSelector((state) => state.authReducer);
	const { appElements } = useAppSelector((state) => state.appElements);
	
	const selectedCanteen = canteens?.find(c => c.id === canteenId) as DatabaseTypes.Canteens | undefined;
	const flatListRef = useRef<FlatList<DayData>>(null);
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

	useEffect(() => {
		const fetchLabels = async () => {
			try {
				const labels = (await canteenFeedbackLabelHelper.fetchCanteenFeedbackLabels()) as DatabaseTypes.CanteensFeedbacksLabels[];
				dispatch({ type: SET_CANTEEN_FEEDBACK_LABELS, payload: labels });
			} catch (e) {
				console.error('Error fetching canteen feedback labels', e);
			}
		};
		fetchLabels();
	}, [dispatch]);

	const cacheKey = useMemo(
		() => `${canteenId}_${startDate}`,
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
			if (!element) {
				if (item.alias) {
					return { content: item.alias, popup_button_text: null, popup_content: null };
				}
				return null;
			}
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
	const numColumns = useMemo(() => {
		return CardDimensionHelper.getGridNumColumns(listWidth || 0, amountColumnsForcard);
	}, [amountColumnsForcard, listWidth]);

	const itemGap = useMemo(() => {
		return CardDimensionHelper.getItemGap(screenWidth);
	}, [screenWidth]);

	const cardWidth = useMemo(() => {
		if (!listWidth || !numColumns) return undefined;
		return CardDimensionHelper.getGridCardWidth(listWidth, numColumns, itemGap);
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
			// Only update the cache if data has already been loaded for the current cacheKey.
			// This prevents the sort effect from writing the previous canteen's data into the
			// new canteen's cache key when the canteen changes (which would corrupt the cache
			// before the fetch for the new canteen completes).
			if (updated.length > 0 && daysCache[cacheKey] !== undefined) {
				updateCache(updated);
			}
			return updated;
		});
	}, [sortOffers, updateCache, cacheKey]);

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
			const baseDate = parseDateOnly(startDate);
			const toLoad = [0, 1, 2];
			const loaded: DayData[] = [];
			for (const offset of toLoad) {
				const d = format(addDays(baseDate, offset), 'yyyy-MM-dd');
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

	// Re-run init whenever this screen gains focus (e.g. navigating back from wiki).
	// This ensures that the correct canteen's data is always displayed after navigation.
	useFocusEffect(
		useCallback(() => {
			init();
		}, [init])
	);

	// Scroll to top when the selected date changes so that cached dates (e.g. today)
	// behave the same as freshly loaded dates which reset scroll via the loading indicator.
	useEffect(() => {
		flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
	}, [startDate]);

	useEffect(() => {
		const handleResize = () => setScreenWidth(Dimensions.get('window').width);
		const subscription = Dimensions.addEventListener('change', handleResize);
		return () => subscription?.remove();
	}, []);

	const loadNext = async () => {
		if (!days.length) return;
		const lastDate = days[days.length - 1].date;
		const nextDate = format(addDays(parseDateOnly(lastDate), 1), 'yyyy-MM-dd');
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
			return <CanteenFeedbackLabels key={`fl-${idx}`} label={label} date={item.date} groupPosition={groupPosition} isAccountRequired={!user?.id} />;
		});
		const dayItems = buildDayItems(item.offers, item.date);
		const hasInfoItems = dayItems.some(dayItem => dayItem.foodofferInfoItem);

		return (
			<View style={styles.dayContainer}>
				<View style={styles.dateHeaderRow}>
					<Text style={[styles.dateHeader, { color: theme.screen.text }]}>{smartReadableDate(parseDateOnly(item.date))}</Text>
					{item.offers.length > 0 && <CanteenVisitsDateRow canteenId={canteenId} date={item.date} />}
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
				{feedbacks && feedbacks.length > 0 && (
					<View style={styles.feebackContainer}>
						<Text style={[styles.feedbackLabelsTitle, { color: theme.screen.text }]}>
							{translate(TranslationKeys.feedback_labels)}
						</Text>
						{feedbacks}
					</View>
				)}
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
				ref={flatListRef}
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
