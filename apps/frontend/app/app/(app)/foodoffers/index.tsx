import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Dimensions,
	Image,
	Platform,
	RefreshControl,
	SafeAreaView,
	Text,
	View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { CollectibleAt, CollectionNames, DatabaseTypes, FoodSortOption, sortBySortField } from 'repo-depkit-common';
import styles from './styles';
import {useTheme} from '@/hooks/useTheme';
import {DrawerContentComponentProps, DrawerNavigationProp} from '@react-navigation/drawer';
import {isWeb} from '@/constants/Constants';
import FoodItem from '@/components/FoodItem/FoodItem';
import FoodOfferInfoItem from '@/components/FoodOfferInfoItem/FoodOfferInfoItem';
import {useFocusEffect, useNavigation, useRouter} from 'expo-router';
import {useDispatch, useSelector} from 'react-redux';
import useSelectedCanteen from '@/hooks/useSelectedCanteen';
import useKioskMode from '@/hooks/useKioskMode';
import { fetchFoodOffersByCanteen } from '@/redux/actions/FoodOffers/FoodOffers';
import {
	SET_BUSINESS_HOURS,
	SET_CANTEEN_FEEDBACK_LABELS,
	SET_POPUP_EVENTS,
	SET_SELECTED_CANTEEN_FOOD_OFFERS,
	SET_SELECTED_CANTEEN_FOOD_OFFERS_LOCAL,
	SET_SELECTED_DATE,
	UPDATE_PROFILE,
} from '@/redux/Types/types';
import { Entypo, FontAwesome6, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { RootDrawerParamList } from './types';
import BaseBottomSheet from '@/components/BaseBottomSheet';
import type BottomSheet from '@gorhom/bottom-sheet';
import CanteenSelectionSheet from '@/components/CanteenSelectionSheet/CanteenSelectionSheet';
import HourSheet from '@/components/HoursSheet/HoursSheet';
import CalendarSheet from '@/components/CalendarSheet/CalendarSheet';
import {excerpt} from '@/constants/HelperFunctions';
import {useLanguage} from '@/hooks/useLanguage';
import EatingHabitsSheet from '@/components/EatingHabitsSheet/EatingHabitsSheet';
import {CanteenFeedbackLabelHelper} from '@/redux/actions/CanteenFeedbacksLabel/CanteenFeedbacksLabel';
import CanteenFeedbackLabels from '@/components/CanteenFeedbackLabels/CanteenFeedbackLabels';
import {Tooltip, TooltipContent, TooltipText} from '@gluestack-ui/themed';
import * as Notifications from 'expo-notifications';
import {sortFoodOffers} from '@/helper/foodOfferSortHelper';
import {addDays, format, parse} from 'date-fns';
import {BusinessHoursHelper} from '@/redux/actions/BusinessHours/BusinessHours';
import {getAppElementTranslation} from '@/helper/resourceHelper';
import noFoodOffersFound from '@/assets/animations/noFoodOffersFound.json';
import LottieView from 'lottie-react-native';
import {replaceLottieColors} from '@/helper/animationHelper';
import {myContrastColor} from '@/helper/ColorHelper';
import {TranslationKeys} from '@/locales/keys';

import useSetPageTitle from '@/hooks/useSetPageTitle';
import CustomMarkdown from '@/components/CustomMarkdown/CustomMarkdown';
import CollectibleSpot from '@/components/CollectibleItem/CollectibleSpot';
import {RootState} from '@/redux/reducer';
import MarkingBottomSheet from '@/components/MarkingBottomSheet';
import AIGeneratedHintSheet from '@/components/AIGeneratedHintSheet';
import useFoodOffersDefaultDate from '@/hooks/useFoodOffersDefaultDate';
import useChatUnreadStatus from '@/hooks/useChatUnreadStatus';

import IconButton from '@/components/UI/IconButton';
import Button from '@/components/UI/Button';
import useUtilizationModal from '@/hooks/useUtilizationModal';
import usePopupEventModal from '@/hooks/usePopupEventModal';
import useFoodofferSortingModal from '@/hooks/useFoodofferSortingModal';
import useAppForegroundUpdateCheckModal from '@/hooks/useAppForegroundUpdateCheckModal';
import useMyScrollviewDirectusImageEditModal from '@/hooks/useMyScrollviewDirectusImageEditModal';

export const SHEET_COMPONENTS = {
	canteen: CanteenSelectionSheet,
	hours: HourSheet,
	calendar: CalendarSheet,
	aiGeneratedInfo: AIGeneratedHintSheet,
	eatingHabits: EatingHabitsSheet,
};

interface DayItem {
	foodoffer: DatabaseTypes.Foodoffers | null;
	foodofferInfoItem: DatabaseTypes.FoodoffersInfogetDayLabelItems | null;
}


const Index: React.FC<DrawerContentComponentProps> = ({ navigation }) => {
	const dispatch = useDispatch();
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const allowSheetsRef = useRef(true);
	const router = useRouter();
	const drawerNavigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
	const bottomSheetRef = useRef<BottomSheet>(null);
	const businessHoursHelper = new BusinessHoursHelper();
	const canteenFeedbackLabelHelper = new CanteenFeedbackLabelHelper();
	const [loading, setLoading] = useState(false);
	const [isActive, setIsActive] = useState(false);
        const [refreshing, setRefreshing] = useState(false);
        const [beforeElement, setBeforeElement] = useState<any>(null);
        const [afterElement, setAfterElement] = useState<any>(null);
        const [sheetProps, setSheetProps] = useState<Record<string, any>>({});
	const [feedbackLabelsLoading, setFeedbackLabelsLoading] = useState(true);
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
	const [listWidth, setListWidth] = useState<number | null>(null);
	const [selectedSheet, setSelectedSheet] = useState<keyof typeof SHEET_COMPONENTS | null>(null);

        const {
                sortBy,
                language: languageCode,
                drawerPosition,
                appSettings,
                primaryColor,
                selectedTheme: mode,
                amountColumnsForcard,
                debugMode,
        } = useSelector((state: RootState) => state.settings);
	const { ownFoodFeedbacks, selectedDate, foodCategories, foodOfferCategories, foodOffersInfoItems } = useSelector(
		(state: RootState) => state.food
	);
	const [autoPlay, setAutoPlay] = useState(appSettings?.animations_auto_start);
	const animationRef = useRef<LottieView>(null);
	const [animationJson, setAmimationJson] = useState<any>(null);
	const { profile, user } = useSelector((state: RootState) => state.authReducer);
	const { appElements } = useSelector((state: RootState) => state.appElements);
	const { selectedCanteenFoodOffers, canteenFeedbackLabels } = useSelector((state: RootState) => state.canteenReducer);
        const selectedCanteen = useSelectedCanteen();
        useFoodOffersDefaultDate();
        const kioskMode = useKioskMode();
        const [prefetchedFoodOffers, setPrefetchedFoodOffers] = useState<Record<string, DatabaseTypes.Foodoffers[]>>({});
        const foods_area_color = appSettings?.foods_area_color ? appSettings?.foods_area_color : primaryColor;
        const { hasUnreadChats } = useChatUnreadStatus();
        const { openUtilizationModal } = useUtilizationModal();
        const contrastColor = myContrastColor(foods_area_color, theme, mode === 'dark');
        const { openActiveModal, activePopupEvent } = usePopupEventModal();
        const { openFoodofferSortingModal } = useFoodofferSortingModal();
        const { openDirectusImageEditModal } = useMyScrollviewDirectusImageEditModal();
        useAppForegroundUpdateCheckModal();

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


	const itemGap = useMemo(() => {
		if (screenWidth >= 1600) return 28;
		if (screenWidth >= 1300) return 24;
		if (screenWidth >= 1000) return 20;
		if (screenWidth >= 700) return 16;
		if (screenWidth >= 500) return 12;
		if (screenWidth >= 300) return 10;
		return 8;
	}, [screenWidth]);

	const getDayLabel = (date: string) => {
		const currentDate = new Date();
		const day = new Date(date);
		currentDate.setHours(0, 0, 0, 0);
		day.setHours(0, 0, 0, 0);
		if (currentDate.toDateString() === day.toDateString()) return 'today';
		currentDate.setDate(currentDate.getDate() - 1);
		if (currentDate.toDateString() === day.toDateString()) return 'yesterday';
		currentDate.setDate(currentDate.getDate() + 2);
		if (currentDate.toDateString() === day.toDateString()) return 'tomorrow';
		return format(day, 'dd.MM.yyyy');
	};

        const dayItems = useMemo(() => {
                const offers = selectedCanteenFoodOffers || [];
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
        }, [selectedCanteenFoodOffers, foodOffersInfoItems, selectedCanteen]);

        const getCacheKey = (canteenId: string, date: string) => {
                return `${canteenId}_${format(new Date(date), 'dd.MM.yyyy')}`;
        };

        const getCachedOffers = (canteenId: string, date: string) => {
                return prefetchedFoodOffers[getCacheKey(canteenId, date)];
        };

        const cachedFoodOfferDates = useMemo(() => {
                const canteenId = selectedCanteen?.id;
                if (!canteenId) return [];

                const dates = Object.keys(prefetchedFoodOffers)
                        .filter(key => key.startsWith(`${canteenId}_`))
                        .map(key => key.replace(`${canteenId}_`, ''))
                        .map(date => parse(date, 'dd.MM.yyyy', new Date()))
                        .filter(date => !Number.isNaN(date.getTime()))
                        .sort((a, b) => a.getTime() - b.getTime())
                        .map(date => format(date, 'yyyy-MM-dd'));
                return dates;
        }, [prefetchedFoodOffers, selectedCanteen]);

        const cachedFoodOfferDateLabels = useMemo(
                () => cachedFoodOfferDates.map(date => `${getDayLabel(date)} (${date})`),
                [cachedFoodOfferDates]
        );

	useSetPageTitle(selectedCanteen?.alias || TranslationKeys.food_offers);

	useFocusEffect(
		useCallback(() => {
			setAmimationJson(replaceLottieColors(noFoodOffersFound, foods_area_color));
			return () => setAmimationJson(null);
		}, [foods_area_color])
	);

	useFocusEffect(
		useCallback(() => {
			setAutoPlay(appSettings?.animations_auto_start);
			return () => {
				setAutoPlay(false);
				setAmimationJson(null);
			};
		}, [appSettings?.animations_auto_start])
	);

	useEffect(() => {
		if (animationJson && autoPlay && animationRef.current) {
			animationRef.current.play();
		}
	}, [animationJson, autoPlay]);

	const renderLottie = useMemo(() => {
		if (!animationJson) return null;
		return <LottieView ref={animationRef} source={animationJson} resizeMode="contain" style={{ width: '100%', height: '100%' }} autoPlay={autoPlay || false} loop={false} />;
	}, [animationJson, autoPlay]);

	const setDefaultPriceGroupForAnonymousUser = () => {
		dispatch({
			type: UPDATE_PROFILE,
			payload: { ...profile, price_group: 'student' },
		});
	};
	useEffect(() => {
		if (!user.id) setDefaultPriceGroupForAnonymousUser();
	}, [user]);

	useEffect(() => {
		if (!appElements || !appSettings) return;
		const getElement = (id: string) => {
			const element = appElements?.find((el: any) => el.id === id);
			if (!element || !element.translations) return null;
			const { content, popup_button_text, popup_content } = getAppElementTranslation(element.translations, languageCode);
			return { content, popup_button_text, popup_content };
		};
		const before = getElement(String(appSettings.foodoffers_list_before_element));
		const after = getElement(String(appSettings.foodoffers_list_after_element));
		setBeforeElement(before);
		setAfterElement(after);
	}, [appElements, appSettings, languageCode]);

	// useFocusEffect(
	// 	useCallback(() => {
	// 		setIsActive(true);
	// 		return () => setIsActive(false);
	// 	}, [])
	// );

	useFocusEffect(
		useCallback(() => {
			setIsActive(true);
			allowSheetsRef.current = true;
			return () => {
				allowSheetsRef.current = false;
			};
		}, [])
	);

        const openSheet = useCallback((sheet: 'menu' | 'sort' | keyof typeof SHEET_COMPONENTS, props = {}) => {
                if (sheet === 'sort') {
                        openFoodofferSortingModal();
                        return;
                }

                setSelectedSheet(sheet);
                setSheetProps(props);
        }, [openFoodofferSortingModal]);

	useEffect(() => {
		openActiveModal();
	}, [activePopupEvent, openActiveModal]);

	useEffect(() => {
		if (isActive && selectedSheet) {
			setTimeout(() => bottomSheetRef.current?.expand(), 150);
		}
	}, [selectedSheet, isActive]);

	const closeSheet = useCallback(() => {
		bottomSheetRef.current?.snapToIndex(-1);
		bottomSheetRef.current?.close();
		setTimeout(() => {
			setSelectedSheet(null);
			setSheetProps({});
		}, 150);
	}, []);

	const getBusinessHours = async () => {
		try {
			const businessHours = (await businessHoursHelper.fetchBusinessHours({})) as DatabaseTypes.Businesshours[];
			dispatch({ type: SET_BUSINESS_HOURS, payload: businessHours });
		} catch (error) {
			console.error('Error fetching business hours:', error);
		}
	};
	useEffect(() => {
		getBusinessHours();
	}, []);

	const requestPermissions = async () => {
		const { status } = await Notifications.getPermissionsAsync();
		if (status !== 'granted') {
			await Notifications.requestPermissionsAsync();
		}
	};
	useEffect(() => {
		if (Platform.OS !== 'web') requestPermissions();
	}, []);

	const handleDateChange = (direction: 'prev' | 'next') => {
		const currentDate = new Date(selectedDate);
		if (direction === 'prev') currentDate.setDate(currentDate.getDate() - 1);
		else currentDate.setDate(currentDate.getDate() + 1);

		dispatch({
			type: SET_SELECTED_DATE,
			payload: currentDate.toISOString().split('T')[0],
		});
	};



	const updateSort = (id: FoodSortOption, foodOffers: DatabaseTypes.Foodoffers[]) => {
		const sortedOffers = sortFoodOffers(id, foodOffers, {
			languageCode,
			ownFoodFeedbacks,
			profile,
			foodCategories,
			foodOfferCategories,
		});
		dispatch({ type: SET_SELECTED_CANTEEN_FOOD_OFFERS, payload: sortedOffers });
	};

	useEffect(() => {
		const handleResize = () => setScreenWidth(Dimensions.get('window').width);
		const subscription = Dimensions.addEventListener('change', handleResize);
		return () => subscription?.remove();
	}, []);

	const getPriceGroup = (price_group: string) => {
		if (price_group) {
			return `price_group_${price_group?.toLocaleLowerCase()}`;
		}
		return '';
	};

	const fetchFoods = async (forceFetch = false) => {
		try {
			setLoading(true);
                        const canteenId = selectedCanteen?.id as string;
                        if (!canteenId || !selectedDate) {
                                setLoading(false);
                                return;
                        }

                        let foodOffers = getCachedOffers(canteenId, selectedDate);
                        if (!foodOffers || forceFetch) {
                                const foodData = await fetchFoodOffersByCanteen(canteenId, selectedDate);
                                foodOffers = foodData?.data || [];
                        }

                        setPrefetchedFoodOffers(prev => ({ ...prev, [getCacheKey(canteenId, selectedDate)]: foodOffers }));

			for (let i = 1; i <= 2; i++) {
                                const date = addDays(new Date(selectedDate), i).toISOString().split('T')[0];
                                const cacheKey = getCacheKey(canteenId, date);
                                if (!prefetchedFoodOffers[cacheKey]) {
                                        fetchFoodOffersByCanteen(canteenId, date)
                                                .then(res => {
                                                        const offers = res?.data || [];
                                                        setPrefetchedFoodOffers(p => ({ ...p, [cacheKey]: offers }));
                                                        try {
                                                                offers.slice(0, 6).forEach((o: any) => {
                                                                        const img = o?.food?.image_remote_url || o?.food?.image;
									if (img) Image.prefetch(img).catch(() => { });
								});
							} catch (e) { }
						})
						.catch(e => console.error('Error prefetching Food Offers:', e));
				}
			}

			updateSort(sortBy as FoodSortOption, foodOffers);
			dispatch({ type: SET_SELECTED_CANTEEN_FOOD_OFFERS_LOCAL, payload: foodOffers });
			setLoading(false);
		} catch (error) {
			setLoading(false);
			console.error('Error fetching Food Offers:', error);
		}
	};

        const openManagementSheet = useCallback(
		(food: DatabaseTypes.Foods) => {
			if (!food?.id) return;
			openDirectusImageEditModal({
				itemId: food.id,
				field: 'image',
				collection: CollectionNames.FOODS,
				onUpdated: fetchFoods,
			});
		},
		[fetchFoods, openDirectusImageEditModal]
	);

	const fetchCanteenLabels = async () => {
		try {
			setFeedbackLabelsLoading(true);
			const canteenFeedbackLabels = (await canteenFeedbackLabelHelper.fetchCanteenFeedbackLabels()) as DatabaseTypes.CanteensFeedbacksLabels[];
			dispatch({ type: SET_CANTEEN_FEEDBACK_LABELS, payload: canteenFeedbackLabels });
		} catch (error) {
			console.error('Error fetching Canteen Feedback Labels:', error);
		} finally {
			setFeedbackLabelsLoading(false);
		}
	};

	useEffect(() => {
		fetchFoods();
	}, [selectedCanteen, selectedDate]);

	useEffect(() => {
		fetchCanteenLabels();
	}, []);

	const onRefresh = useCallback(() => {
		setRefreshing(true);
		Promise.all([fetchFoods(true), fetchCanteenLabels()]).finally(() => setRefreshing(false));
	}, [selectedCanteen, selectedDate]);

	const memoizedCanteenFeedbackLabels = useMemo(
		() =>
			canteenFeedbackLabels?.map((label: DatabaseTypes.CanteensFeedbacksLabels, index: number) => (
				<CanteenFeedbackLabels key={label?.id || `feedback-label-${index}`} label={label} date={selectedDate} />
			)),
		[canteenFeedbackLabels, selectedDate]
	);
	const canteenFeedbackLabelsExist = canteenFeedbackLabels?.length > 0;

        const nextAvailableDate = useMemo(() => {
                const canteenId = selectedCanteen?.id as string;
                for (let i = 1; i <= 2; i++) {
                        const date = addDays(new Date(selectedDate), i).toISOString().split('T')[0];
                        const offers = getCachedOffers(canteenId, date);
                        if (offers && offers.length > 0) return date;
                }
                return null;
        }, [prefetchedFoodOffers, selectedCanteen, selectedDate]);

	const getWeekdayKey = (date: string) => {
		const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
		return days[new Date(date).getDay()];
	};

	const SheetComponent = selectedSheet && selectedSheet !== 'menu' ? SHEET_COMPONENTS[selectedSheet] : null;

	const getInfoItemContent = useCallback(
		(item: DatabaseTypes.FoodoffersInfoItems) => {
			const elementId = typeof item.name === 'string' ? item.name : item.name?.id;
			const element = appElements?.find((el: any) => el.id === elementId);
			if (!element || !element.translations) return { content: '' };
			return getAppElementTranslation(element.translations, languageCode);
		},
		[appElements, languageCode]
	);
	const renderDayItem = useCallback(
		({ item, index }: { item: DayItem; index: number }) => {
			return (
				<View
					style={{
						width: cardWidth || '100%',
						marginHorizontal: 10,
						marginVertical: 10,
						alignItems: 'center'
					}}
				>
					{item.foodoffer ? (
						<FoodItem
							canteen={selectedCanteen}
							item={item.foodoffer}
							key={item.foodoffer.id || `food-item-${index}`}
							handleMenuSheet={openSheet}
							handleImageSheet={openManagementSheet}
							handleEatingHabitsSheet={openSheet}
							cardWidth={cardWidth}
						/>
					) : item.foodofferInfoItem ? (
						<FoodOfferInfoItem
							key={item.foodofferInfoItem.id || `info-item-${index}`}
							item={item.foodofferInfoItem}
							content={
								(getInfoItemContent(item.foodofferInfoItem) || {}).content || ''
							}
							cardWidth={cardWidth}
						/>
					) : null}
				</View>
			);
		},
		[
			openManagementSheet,
			openSheet,
			selectedCanteen,
			getInfoItemContent,
			itemGap,
			cardWidth
		]
	);

	const keyExtractor = useCallback((item: DayItem, index: number) => {
		if (item.foodoffer && item.foodoffer.id) return `f-${item.foodoffer.id}`;
		if (item.foodofferInfoItem && item.foodofferInfoItem.id) return `i-${item.foodofferInfoItem.id}`;
		return `di-${index}`;
	}, []);

        const ListFooterComponent = useMemo(() => {
                return (
                        <>
                                {afterElement && <View style={styles.elementContainer}>{afterElement && <CustomMarkdown content={afterElement?.content || ''} backgroundColor={foods_area_color} imageWidth={440} imageHeight={293} />}</View>}
                                {!feedbackLabelsLoading && canteenFeedbackLabelsExist > 0 && (
					<View style={styles.feebackContainer}>
						<View>
							<Text style={{ ...styles.foodLabels, color: theme.screen.text }}>{translate(TranslationKeys.feedback_labels)}</Text>
                                                </View>
                                                {memoizedCanteenFeedbackLabels}
                                        </View>
                                )}
                                {debugMode && (
                                        <View
                                                style={[
                                                        styles.debugInfoContainer,
                                                        { borderColor: theme.screen.icon, backgroundColor: theme.screen.background },
                                                ]}
                                        >
                                                <Text style={{ ...styles.debugTitle, color: theme.screen.text }}>
                                                        {translate(TranslationKeys.cached_foodoffers_days)}
                                                </Text>
                                                <Text style={{ ...styles.debugText, color: theme.screen.text }}>
                                                        {cachedFoodOfferDateLabels.length
                                                                ? cachedFoodOfferDateLabels.join(', ')
                                                                : translate(TranslationKeys.cached_foodoffers_days_empty)}
                                                </Text>
                                        </View>
                                )}
                                <CollectibleSpot collectibleKey={CollectibleAt.collectible_at_foodoffers} />
                                <View style={{ height: 40 }} />
                        </>
                );
        }, [
                afterElement,
                feedbackLabelsLoading,
                canteenFeedbackLabelsExist,
                memoizedCanteenFeedbackLabels,
                foods_area_color,
                theme.screen.text,
                translate,
                debugMode,
                theme.screen.icon,
                cachedFoodOfferDateLabels,
        ]);

	const ListEmptyComponent = useMemo(() => {
		if (loading) {
			return (
				<View style={{ width: '100%', height: 400, justifyContent: 'center' }}>
					<ActivityIndicator size={'large'} color={theme.screen.icon} />
				</View>
			);
		}
		return (
			<View style={styles.noFoodContainer}>
				<Text style={{ ...styles.noFoodOffer, color: theme.screen.text }}>{translate(TranslationKeys.no_foodoffers_found_for_selection)}</Text>
				<View style={styles.animationContainer}>{renderLottie}</View>
				{nextAvailableDate && (
					<Button
						onPress={() => dispatch({ type: SET_SELECTED_DATE, payload: nextAvailableDate })}
						style={[styles.jumpButton, { backgroundColor: foods_area_color }]}
					>
						<Text style={[styles.jumpButtonText, { color: contrastColor }]}>{`${translate(TranslationKeys.show_offers_on)} ${translate(TranslationKeys[getWeekdayKey(nextAvailableDate)])}`}</Text>
					</Button>
				)}
			</View>
		);
	}, [loading, theme.screen.icon, theme.screen.text, renderLottie, nextAvailableDate, foods_area_color, contrastColor, translate, getWeekdayKey]);

	return (
		<>
			<SafeAreaView style={{ flex: 1, backgroundColor: theme.screen.background }}>
				<View style={{ flex: 1 }}>
					<View
						style={{
							...styles.header,
							backgroundColor: theme.header.background,
							paddingHorizontal: 10,
						}}
					>
						<View style={[styles.row, { flexDirection: drawerPosition === 'right' ? 'row-reverse' : 'row' }]}>
							<View style={[styles.col1, { flexDirection: drawerPosition === 'right' ? 'row-reverse' : 'row' }]}>
								<Tooltip
									placement="top"
									trigger={triggerProps => (
										<IconButton {...triggerProps} onPress={() => drawerNavigation.toggleDrawer()} style={{ padding: isWeb ? (screenWidth < 500 ? 5 : 10) : 5 }}>
											<Ionicons name="menu" size={24} color={theme.header.text} />
											{hasUnreadChats ? (
												<View
													style={[
														styles.notificationDot,
														{
															backgroundColor: theme.accent,
															borderColor: theme.header.background,
														},
													]}
												/>
											) : null}
										</IconButton>
									)}
								>
									<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
										<TooltipText fontSize="$sm" color={theme.tooltip.text}>
											{`${translate(TranslationKeys.open_drawer)}`}
										</TooltipText>
									</TooltipContent>
								</Tooltip>

								<Button onPress={() => openSheet('canteen')} style={{ padding: isWeb ? (screenWidth < 500 ? 5 : 10) : 5 }}>
									<Text style={{ ...styles.heading, color: theme.header.text }}>{excerpt(String(selectedCanteen?.alias), screenWidth > 800 ? 30 : 10) || 'Food Offers'}</Text>
								</Button>
							</View>

							<View style={{ ...styles.col2, gap: isWeb ? (screenWidth < 500 ? 6 : 10) : 5, flexDirection: drawerPosition === 'right' ? 'row-reverse' : 'row' }}>
								<Tooltip
									placement="top"
									trigger={triggerProps => (
										<IconButton {...triggerProps} onPress={() => openSheet('sort')} style={{ padding: isWeb ? (screenWidth < 500 ? 5 : 10) : 5 }}>
											<MaterialIcons name="sort" size={24} color={theme.header.text} />
										</IconButton>
									)}
								>
									<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
										<TooltipText fontSize="$sm" color={theme.tooltip.text}>
											{`${translate(TranslationKeys.sort)}: ${translate(TranslationKeys.foods)}`}
										</TooltipText>
									</TooltipContent>
								</Tooltip>

								<Tooltip
									placement="top"
									trigger={triggerProps => (
										<IconButton {...triggerProps} onPress={() => router.navigate('/price-group')} style={{ padding: isWeb ? (screenWidth < 500 ? 5 : 10) : 5 }}>
											<FontAwesome6 name="euro-sign" size={24} color={theme.header.text} />
										</IconButton>
									)}
								>
									<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
										<TooltipText fontSize="$sm" color={theme.tooltip.text}>
											{`${translate(TranslationKeys.edit)}: ${translate(TranslationKeys.price_group)} ${translate(getPriceGroup(profile?.price_group))}`}
										</TooltipText>
									</TooltipContent>
								</Tooltip>

								<Tooltip
									placement="top"
									trigger={triggerProps => (
										<IconButton {...triggerProps} onPress={() => router.navigate('/eating-habits')} style={{ padding: isWeb ? (screenWidth < 500 ? 5 : 10) : 5 }}>
											<Ionicons name="bag-add" size={24} color={theme.header.text} />
										</IconButton>
									)}
								>
									<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
										<TooltipText fontSize="$sm" color={theme.tooltip.text}>
											{` ${translate(TranslationKeys.eating_habits)}: ${translate(TranslationKeys.edit)}`}
										</TooltipText>
									</TooltipContent>
								</Tooltip>

								<Tooltip
									placement="top"
									trigger={triggerProps => (
										<IconButton {...triggerProps} onPress={() => openSheet('canteen')} style={{ padding: isWeb ? (screenWidth < 500 ? 5 : 10) : 5 }}>
											<MaterialIcons name="restaurant-menu" size={24} color={theme.header.text} />
										</IconButton>
									)}
								>
									<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
										<TooltipText fontSize="$sm" color={theme.tooltip.text}>
											{` ${translate(TranslationKeys.canteen)}: ${translate(TranslationKeys.select)}`}
										</TooltipText>
									</TooltipContent>
								</Tooltip>
							</View>
						</View>

						<View style={styles.row}>
							<View style={{ ...styles.col2, gap: isWeb ? (screenWidth < 500 ? 15 : 10) : 10 }}>
								<Tooltip
									placement="top"
									trigger={triggerProps => (
										<IconButton {...triggerProps} onPress={() => handleDateChange('prev')} style={{ padding: isWeb ? (screenWidth < 500 ? 2 : 5) : 2 }}>
											<Entypo name="chevron-left" size={24} color={theme.header.text} />
										</IconButton>
									)}
								>
									<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
										<TooltipText fontSize="$sm" color={theme.tooltip.text}>
											{` ${translate(TranslationKeys.day)}: ${translate(TranslationKeys.previous)}`}
										</TooltipText>
									</TooltipContent>
								</Tooltip>

								<Tooltip
									placement="top"
									trigger={triggerProps => (
										<IconButton {...triggerProps} onPress={() => openSheet('calendar')} style={{ padding: isWeb ? (screenWidth < 500 ? 2 : 5) : 2 }}>
											<MaterialIcons name="calendar-month" size={24} color={theme.header.text} />
										</IconButton>
									)}
								>
									<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
										<TooltipText fontSize="$sm" color={theme.tooltip.text}>
											{` ${translate(TranslationKeys.edit)}: ${translate(TranslationKeys.date)}: ${selectedDate}`}
										</TooltipText>
									</TooltipContent>
								</Tooltip>

								<Tooltip
									placement="top"
									trigger={triggerProps => (
										<IconButton {...triggerProps} onPress={() => handleDateChange('next')} style={{ padding: isWeb ? (screenWidth < 500 ? 2 : 5) : 2 }}>
											<Entypo name="chevron-right" size={24} color={theme.header.text} />
										</IconButton>
									)}
								>
									<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
										<TooltipText fontSize="$sm" color={theme.tooltip.text}>
											{` ${translate(TranslationKeys.day)}: ${translate(TranslationKeys.proceed)}`}
										</TooltipText>
									</TooltipContent>
								</Tooltip>

								<Text style={{ ...styles.heading, color: theme.header.text }}>{selectedDate ? translate(getDayLabel(selectedDate)) : ''}</Text>
							</View>

							<View style={{ ...styles.col2, gap: 10 }}>
								{appSettings?.utilization_display_enabled && (
									<Tooltip
										placement="top"
                                                                                trigger={triggerProps => (
                                                                                        <IconButton
                                                                                                {...triggerProps}
                                                                                                onPress={() => openUtilizationModal(selectedDate, selectedCanteen)}
                                                                                                style={{ padding: isWeb ? (screenWidth < 500 ? 2 : 5) : 2 }}
                                                                                        >
                                                                                                <FontAwesome6 name="people-group" size={24} color={theme.header.text} />
                                                                                        </IconButton>
                                                                                )}
									>
										<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
											<TooltipText fontSize="$sm" color={theme.tooltip.text}>
												{` ${translate(TranslationKeys.forecast)}: ${translate(TranslationKeys.utilization)}`}
											</TooltipText>
										</TooltipContent>
									</Tooltip>
								)}

								<Tooltip
									placement="top"
									trigger={triggerProps => (
										<IconButton {...triggerProps} onPress={() => openSheet('hours')} style={{ padding: isWeb ? (screenWidth < 500 ? 2 : 5) : 2 }}>
											<MaterialCommunityIcons name="clock-time-eight" size={24} color={theme.header.text} />
										</IconButton>
									)}
								>
									<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
										<TooltipText fontSize="$sm" color={theme.tooltip.text}>
											{` ${translate(TranslationKeys.businesshours)}`}
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
								data={dayItems}
								renderItem={renderDayItem}
								keyExtractor={keyExtractor}
								numColumns={numColumns}
								contentContainerStyle={{
									marginTop: 20,
								}}
								refreshControl={
									<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
								}
								ListFooterComponent={ListFooterComponent}
								ListEmptyComponent={ListEmptyComponent}
								showsVerticalScrollIndicator={false}
							/>
						</View>
					</View>
				</View>

				{allowSheetsRef.current &&
					!kioskMode &&
					(selectedSheet === 'menu' ? (
						<MarkingBottomSheet ref={bottomSheetRef} onClose={closeSheet} />
					) : (
						<BaseBottomSheet
                                                        key={selectedSheet || 'sheet'}
                                                        ref={bottomSheetRef}
                                                        backgroundStyle={{ ...styles.sheetBackground, backgroundColor: theme.sheet.sheetBg }}
                                                        enablePanDownToClose
                                                        enableContentPanningGesture
                                                        enableHandlePanningGesture
                                                        enableDynamicSizing
                                                        onChange={index => {
                                                                if (index === -1) closeSheet();
                                                        }}
                                                        onClose={closeSheet}
							handleComponent={null}
						>
							{SheetComponent && (
								selectedSheet === 'calendar' ? (
									<SheetComponent closeSheet={closeSheet} {...sheetProps} updateGlobal={true} />
								) : (
									<SheetComponent closeSheet={closeSheet} {...sheetProps} />
								)
							)}
						</BaseBottomSheet>
					))}

				{allowSheetsRef.current && currentPopupEvent && (
					<BaseBottomSheet ref={eventSheetRef} index={-1} backgroundStyle={{ ...styles.sheetBackground, backgroundColor: theme.sheet.sheetBg }} enablePanDownToClose={false} handleComponent={null} onClose={closeEventSheetForSession}>
						<PopupEventSheet closeSheet={closeEventSheet} eventData={currentPopupEvent} />
					</BaseBottomSheet>
				)}
			</SafeAreaView>
		</>
	);
};

export default Index;
