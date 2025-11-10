import {
	ActivityIndicator,
	Dimensions,
	Platform,
	RefreshControl,
	SafeAreaView,
	ScrollView,
	Text,
	TouchableOpacity,
	View
} from 'react-native';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {DatabaseTypes, FoodSortOption, sortBySortField} from 'repo-depkit-common';
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
import {fetchFoodOffersByCanteen} from '@/redux/actions/FoodOffers/FoodOffers';
import {
	SET_BUSINESS_HOURS,
	SET_CANTEEN_FEEDBACK_LABELS,
	SET_POPUP_EVENTS,
	SET_SELECTED_CANTEEN_FOOD_OFFERS,
	SET_SELECTED_CANTEEN_FOOD_OFFERS_LOCAL,
	SET_SELECTED_DATE,
	UPDATE_PROFILE
} from '@/redux/Types/types';
import {Entypo, FontAwesome6, Ionicons, MaterialCommunityIcons, MaterialIcons} from '@expo/vector-icons';
import {RootDrawerParamList} from './types';
import BaseBottomSheet from '@/components/BaseBottomSheet';
import type BottomSheet from '@gorhom/bottom-sheet';
import CanteenSelectionSheet from '@/components/CanteenSelectionSheet/CanteenSelectionSheet';
import SortSheet from '@/components/SortSheet/SortSheet';
import HourSheet from '@/components/HoursSheet/HoursSheet';
import CalendarSheet from '@/components/CalendarSheet/CalendarSheet';
import {excerpt} from '@/constants/HelperFunctions';
import {useLanguage} from '@/hooks/useLanguage';
import ForecastSheet from '@/components/ForecastSheet/ForecastSheet';
import ImageManagementSheet from '@/components/ImageManagementSheet/ImageManagementSheet';
import EatingHabitsSheet from '@/components/EatingHabitsSheet/EatingHabitsSheet';
import {CanteenFeedbackLabelHelper} from '@/redux/actions/CanteenFeedbacksLabel/CanteenFeedbacksLabel';
import CanteenFeedbackLabels from '@/components/CanteenFeedbackLabels/CanteenFeedbackLabels';
import {Tooltip, TooltipContent, TooltipText} from '@gluestack-ui/themed';
import * as Notifications from 'expo-notifications';
import {sortFoodOffers} from '@/helper/foodOfferSortHelper';
import {addDays, format} from 'date-fns';
import {BusinessHoursHelper} from '@/redux/actions/BusinessHours/BusinessHours';
import PopupEventSheet from '@/components/PopupEventSheet/PopupEventSheet';
import {PopupEventHelper} from '@/helper/PopupEventHelper';
import {getAppElementTranslation} from '@/helper/resourceHelper';
import noFoodOffersFound from '@/assets/animations/noFoodOffersFound.json';
import LottieView from 'lottie-react-native';
import {replaceLottieColors} from '@/helper/animationHelper';
import {myContrastColor} from '@/helper/ColorHelper';
import {TranslationKeys} from '@/locales/keys';

import useSetPageTitle from '@/hooks/useSetPageTitle';
import CustomMarkdown from '@/components/CustomMarkdown/CustomMarkdown';
import {RootState} from '@/redux/reducer';
import MarkingBottomSheet from '@/components/MarkingBottomSheet';
import AIGeneratedHintSheet from '@/components/AIGeneratedHintSheet';
import useFoodOffersDefaultDate from '@/hooks/useFoodOffersDefaultDate';

export const SHEET_COMPONENTS = {
        canteen: CanteenSelectionSheet,
        sort: SortSheet,
        hours: HourSheet,
        calendar: CalendarSheet,
        forecast: ForecastSheet,
        imageManagement: ImageManagementSheet,
        aiGeneratedInfo: AIGeneratedHintSheet,
        eatingHabits: EatingHabitsSheet,
};

interface DayItem {
	foodoffer: DatabaseTypes.Foodoffers | null;
	foodofferInfoItem: DatabaseTypes.FoodoffersInfoItems | null;
}

const Index: React.FC<DrawerContentComponentProps> = ({ navigation }) => {
	const dispatch = useDispatch();
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const router = useRouter();
	const drawerNavigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
	const bottomSheetRef = useRef<BottomSheet>(null);
	const eventSheetRef = useRef<BottomSheet>(null);
	const businessHoursHelper = new BusinessHoursHelper();
	const canteenFeedbackLabelHelper = new CanteenFeedbackLabelHelper();
	const [loading, setLoading] = useState(false);
	const [isActive, setIsActive] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [beforeElement, setBeforeElement] = useState<any>(null);
	const [afterElement, setAfterElement] = useState<any>(null);
	const [selectedFoodId, setSelectedFoodId] = useState('');
	const [sheetProps, setSheetProps] = useState<Record<string, any>>({});
	const [feedbackLabelsLoading, setFeedbackLabelsLoading] = useState(true);
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
	const [selectedSheet, setSelectedSheet] = useState<keyof typeof SHEET_COMPONENTS | null>(null);
	const [sessionDismissed, setSessionDismissed] = useState<Set<string>>(PopupEventHelper.getAll());
	const [currentPopupEvent, setCurrentPopupEvent] = useState<any | null>(null);

	const { sortBy, language: languageCode, drawerPosition, appSettings, primaryColor, selectedTheme: mode } = useSelector((state: RootState) => state.settings);
	const { ownFoodFeedbacks, popupEvents, selectedDate, foodCategories, foodOfferCategories, foodOffersInfoItems } = useSelector((state: RootState) => state.food);
	const [autoPlay, setAutoPlay] = useState(appSettings?.animations_auto_start);
	const animationRef = useRef<LottieView>(null);
	const [animationJson, setAmimationJson] = useState<any>(null);
	const { profile, user } = useSelector((state: RootState) => state.authReducer);
	const { appElements } = useSelector((state: RootState) => state.appElements);
	const { selectedCanteenFoodOffers, canteenFeedbackLabels } = useSelector((state: RootState) => state.canteenReducer);
	const selectedCanteen = useSelectedCanteen();
	useFoodOffersDefaultDate();
	const kioskMode = useKioskMode();
	const [prefetchedFoodOffers, setPrefetchedFoodOffers] = useState<Record<string, Record<string, DatabaseTypes.Foodoffers[]>>>({});
	const foods_area_color = appSettings?.foods_area_color ? appSettings?.foods_area_color : primaryColor;
	const contrastColor = myContrastColor(foods_area_color, theme, mode === 'dark');

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

		const start = startInfos.map(i => ({
			foodoffer: null,
			foodofferInfoItem: i,
		}));
		const main = offers.map(o => ({ foodoffer: o, foodofferInfoItem: null }));
		const end = endInfos.map(i => ({ foodoffer: null, foodofferInfoItem: i }));

		return [...start, ...main, ...end] as DayItem[];
	}, [selectedCanteenFoodOffers, foodOffersInfoItems, selectedCanteen]);

	// Set Page Title
	useSetPageTitle(selectedCanteen?.alias || TranslationKeys.food_offers);

	useFocusEffect(
		useCallback(() => {
			setAmimationJson(replaceLottieColors(noFoodOffersFound, foods_area_color));
			return () => {
				setAmimationJson(null);
			};
		}, [])
	);

	useFocusEffect(
		useCallback(() => {
			setAutoPlay(appSettings?.animations_auto_start); // Enable when entering

			return () => {
				setAutoPlay(false); // Reset when leaving
				setAmimationJson(null);
			};
		}, [appSettings?.animations_auto_start])
	);

	useEffect(() => {
		if (animationJson && autoPlay && animationRef.current) {
			animationRef?.current?.play(); // Reset animation to ensure it starts fresh
		}
	}, [animationJson, autoPlay]);

	const renderLottie = useMemo(() => {
		if (animationJson) {
			return <LottieView ref={animationRef} source={animationJson} resizeMode="contain" style={{ width: '100%', height: '100%' }} autoPlay={autoPlay || false} loop={false} />;
		}
	}, [autoPlay, animationJson]);

	const setDefaultPriceGroupForAnonymousUser = () => {
		dispatch({
			type: UPDATE_PROFILE,
			payload: { ...profile, price_group: 'student' },
		});
	};

	useEffect(() => {
		if (!user.id) {
			setDefaultPriceGroupForAnonymousUser();
		}
	}, [user]);

	useEffect(() => {
		if (!appElements || !appSettings) return;

		const getElement = (id: string) => {
			const element = appElements?.find((el: any) => el.id === id);
			if (!element || !element.translations) return null;
			const { content, popup_button_text, popup_content } = getAppElementTranslation(element.translations, languageCode);

			return {
				content,
				popup_button_text,
				popup_content,
			};
		};

		const before = getElement(String(appSettings.foodoffers_list_before_element));
		const after = getElement(String(appSettings.foodoffers_list_after_element));

		setBeforeElement(before);
		setAfterElement(after);
	}, [appElements, appSettings]);

	const getInfoItemContent = useCallback(
		(item: DatabaseTypes.FoodoffersInfoItems) => {
			const elementId = typeof item.name === 'string' ? item.name : item.name?.id;
			const element = appElements?.find((el: any) => el.id === elementId);
			if (!element || !element.translations) return { content: '' };
			return getAppElementTranslation(element.translations, languageCode);
		},
		[appElements, languageCode]
	);

	useFocusEffect(
		useCallback(() => {
			setIsActive(true);
			return () => {
				setIsActive(false);
			};
		}, [])
	);

	useEffect(() => {
		if (kioskMode) {
			return;
		}
		const nextEvent = popupEvents?.find((e: any) => !e.isOpen && !PopupEventHelper.isDismissed(e.id));
		if (nextEvent) {
			setCurrentPopupEvent(nextEvent);
			setTimeout(() => {
				openEventSheet();
			}, 300);
		} else {
			setCurrentPopupEvent(null);
		}
	}, [popupEvents, kioskMode, sessionDismissed]);

	const openSheet = useCallback((sheet: 'menu' | keyof typeof SHEET_COMPONENTS, props = {}) => {
		setSelectedSheet(sheet);
		setSheetProps(props);
	}, []);

	const openManagementSheet = (id: string) => {
		if (id) {
			openSheet('imageManagement', {
				selectedFoodId: id,
				fileName: 'foods',
				closeSheet: closeSheet,
				handleFetch: fetchFoods,
			});
		}
	};

	const openEventSheet = () => {
		if (kioskMode) return;
		eventSheetRef?.current?.expand();
	};

	const closeEventSheet = () => {
		eventSheetRef?.current?.close();
		setTimeout(() => {
			if (!currentPopupEvent) return;
			const updatedEvents = popupEvents.map((e: any) => (e.id === currentPopupEvent.id ? { ...e, isOpen: true } : e));
			dispatch({ type: SET_POPUP_EVENTS, payload: updatedEvents });
			setCurrentPopupEvent(null);
		}, 500);
	};

	const closeEventSheetForSession = () => {
		eventSheetRef?.current?.close();
		PopupEventHelper.dismiss(currentPopupEvent?.id);
		setSessionDismissed(PopupEventHelper.getAll());
		setCurrentPopupEvent(null);
	};

	useEffect(() => {
		if (isActive && selectedSheet) {
			setTimeout(() => {
				bottomSheetRef.current?.expand();
			}, 150);
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
		if (Platform.OS !== 'web') {
			requestPermissions();
		}
	}, []);

	const handleDateChange = (direction: 'prev' | 'next') => {
		const currentDate = new Date(selectedDate);
		if (direction === 'prev') {
			currentDate.setDate(currentDate.getDate() - 1);
		} else {
			currentDate.setDate(currentDate.getDate() + 1);
		}
		dispatch({
			type: SET_SELECTED_DATE,
			payload: currentDate.toISOString().split('T')[0],
		});
	};

	const getDayLabel = (date: string) => {
		const currentDate = new Date();
		const day = new Date(date);

		// Set both dates to midnight to avoid time differences affecting comparison
		currentDate.setHours(0, 0, 0, 0);
		day.setHours(0, 0, 0, 0);

		if (currentDate.toDateString() === day.toDateString()) {
			return 'today';
		}

		// Check for yesterday
		currentDate.setDate(currentDate.getDate() - 1);
		if (currentDate.toDateString() === day.toDateString()) {
			return 'yesterday';
		}

		// Check for tomorrow
		currentDate.setDate(currentDate.getDate() + 2);
		if (currentDate.toDateString() === day.toDateString()) {
			return 'tomorrow';
		}

		return format(day, 'dd.MM.yyyy'); // Return the date if it's not Today, Yesterday, or Tomorrow
	};

	const updateSort = (id: FoodSortOption, foodOffers: DatabaseTypes.Foodoffers[]) => {
		const sortedOffers = sortFoodOffers(id, foodOffers, {
			languageCode,
			ownFoodFeedbacks,
			profile,
			foodCategories,
			foodOfferCategories,
		});

		dispatch({
			type: SET_SELECTED_CANTEEN_FOOD_OFFERS,
			payload: sortedOffers,
		});
	};

	useEffect(() => {
		const handleResize = () => {
			setScreenWidth(Dimensions.get('window').width);
		};

		const subscription = Dimensions.addEventListener('change', handleResize);

		return () => subscription?.remove();
	}, []);

	const getPriceGroup = (price_group: string) => {
		if (price_group) {
			return `price_group_${price_group?.toLocaleLowerCase()}`;
		}
		return '';
	};

	const fetchFoods = async () => {
		try {
			setLoading(true);
			const canteenId = selectedCanteen?.id as string;
			let foodOffers = prefetchedFoodOffers[canteenId]?.[selectedDate];

			if (!foodOffers) {
				const foodData = await fetchFoodOffersByCanteen(canteenId, selectedDate);
				foodOffers = foodData?.data || [];
			}

			setPrefetchedFoodOffers(prev => ({
				...prev,
				[canteenId]: {
					...(prev[canteenId] || {}),
					[selectedDate]: foodOffers,
				},
			}));

			// Prefetch next two days
			for (let i = 1; i <= 2; i++) {
				const date = addDays(new Date(selectedDate), i).toISOString().split('T')[0];
				if (!prefetchedFoodOffers[canteenId]?.[date]) {
					fetchFoodOffersByCanteen(canteenId, date)
						.then(res => {
							const offers = res?.data || [];
							setPrefetchedFoodOffers(p => ({
								...p,
								[canteenId]: {
									...(p[canteenId] || {}),
									[date]: offers,
								},
							}));
						})
						.catch(e => console.error('Error prefetching Food Offers:', e));
				}
			}

			updateSort(sortBy as FoodSortOption, foodOffers);

			dispatch({
				type: SET_SELECTED_CANTEEN_FOOD_OFFERS_LOCAL,
				payload: foodOffers,
			});
			setLoading(false);
		} catch (error) {
			setLoading(false);
			console.error('Error fetching Food Offers:', error);
		}
	};

	const fetchCanteenLabels = async () => {
		try {
			setFeedbackLabelsLoading(true);
			// Fetch Canteen Feedback Labels
			const canteenFeedbackLabels = (await canteenFeedbackLabelHelper.fetchCanteenFeedbackLabels()) as DatabaseTypes.CanteensFeedbacksLabels[];
			dispatch({
				type: SET_CANTEEN_FEEDBACK_LABELS,
				payload: canteenFeedbackLabels,
			});
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
		fetchFoods();
		fetchCanteenLabels();
		setRefreshing(false);
	}, []);

	const memoizedCanteenFeedbackLabels = useMemo(() => canteenFeedbackLabels?.map((label: DatabaseTypes.CanteensFeedbacksLabels, index: number) => <CanteenFeedbackLabels key={label?.id || `feedback-label-${index}`} label={label} date={selectedDate} />), [canteenFeedbackLabels, selectedDate]);
	const canteenFeedbackLabelsExist = canteenFeedbackLabels?.length > 0;

	const nextAvailableDate = useMemo(() => {
		const canteenId = selectedCanteen?.id as string;
		for (let i = 1; i <= 2; i++) {
			const date = addDays(new Date(selectedDate), i).toISOString().split('T')[0];
			const offers = prefetchedFoodOffers[canteenId]?.[date];
			if (offers && offers.length > 0) {
				return date;
			}
		}
		return null;
	}, [prefetchedFoodOffers, selectedCanteen, selectedDate]);

	const getWeekdayKey = (date: string) => {
		const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
		return days[new Date(date).getDay()];
	};

	const SheetComponent = selectedSheet && selectedSheet !== 'menu' ? SHEET_COMPONENTS[selectedSheet] : null;

	return (
		<>
			<SafeAreaView style={{ flex: 1, backgroundColor: theme.screen.iconBg }}>
				<View style={{ flex: 1 }}>
					<View
						style={{
							...styles.header,
							backgroundColor: theme.header.background,
							paddingHorizontal: 10,
						}}
					>
						<View
							style={[
								styles.row,
								{
									flexDirection: drawerPosition === 'right' ? 'row-reverse' : 'row',
								},
							]}
						>
							<View
								style={[
									styles.col1,
									{
										flexDirection: drawerPosition === 'right' ? 'row-reverse' : 'row',
									},
								]}
							>
								{/* Menu */}
								<Tooltip
									placement="top"
									trigger={triggerProps => (
										<TouchableOpacity
											{...triggerProps}
											onPress={() => drawerNavigation.toggleDrawer()}
											style={{
												padding: isWeb ? (screenWidth < 500 ? 5 : 10) : 5,
											}}
										>
											<Ionicons name="menu" size={24} color={theme.header.text} />
										</TouchableOpacity>
									)}
								>
									<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
										<TooltipText fontSize="$sm" color={theme.tooltip.text}>
											{`${translate(TranslationKeys.open_drawer)}`}
										</TooltipText>
									</TooltipContent>
								</Tooltip>

								{/* Canteen Heading */}
								<TouchableOpacity onPress={() => openSheet('canteen')} activeOpacity={0.7}>
									<Text style={{ ...styles.heading, color: theme.header.text }}>{excerpt(String(selectedCanteen?.alias), screenWidth > 800 ? 30 : 10) || 'Food Offers'}</Text>
								</TouchableOpacity>
							</View>
							<View
								style={{
									...styles.col2,
									gap: isWeb ? (screenWidth < 500 ? 6 : 10) : 5,
									flexDirection: drawerPosition === 'right' ? 'row-reverse' : 'row',
								}}
							>
								{/* Sorting */}
								<Tooltip
									placement="top"
									trigger={triggerProps => (
										<TouchableOpacity
											{...triggerProps}
											onPress={() => openSheet('sort')}
											style={{
												padding: isWeb ? (screenWidth < 500 ? 5 : 10) : 5,
											}}
										>
											<MaterialIcons name="sort" size={24} color={theme.header.text} />
										</TouchableOpacity>
									)}
								>
									<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
										<TooltipText fontSize="$sm" color={theme.tooltip.text}>
											{`${translate(TranslationKeys.sort)}: ${translate(TranslationKeys.foods)}`}
										</TooltipText>
									</TooltipContent>
								</Tooltip>

								{/* Price Group */}
								<Tooltip
									placement="top"
									trigger={triggerProps => (
										<TouchableOpacity
											{...triggerProps}
											onPress={() => {
												router.navigate('/price-group');
											}}
											style={{
												padding: isWeb ? (screenWidth < 500 ? 5 : 10) : 5,
											}}
										>
											<FontAwesome6 name="euro-sign" size={24} color={theme.header.text} />
										</TouchableOpacity>
									)}
								>
									<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
										<TooltipText fontSize="$sm" color={theme.tooltip.text}>
											{`${translate(TranslationKeys.edit)}: ${translate(TranslationKeys.price_group)} ${translate(getPriceGroup(profile?.price_group))}`}
										</TooltipText>
									</TooltipContent>
								</Tooltip>

								{/* Eating Habits */}

								<Tooltip
									placement="top"
									trigger={triggerProps => (
										<TouchableOpacity
											{...triggerProps}
											onPress={() => {
												router.navigate('/eating-habits');
											}}
											style={{
												padding: isWeb ? (screenWidth < 500 ? 5 : 10) : 5,
											}}
										>
											<Ionicons name="bag-add" size={24} color={theme.header.text} />
										</TouchableOpacity>
									)}
								>
									<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
										<TooltipText fontSize="$sm" color={theme.tooltip.text}>
											{` ${translate(TranslationKeys.eating_habits)}: ${translate(TranslationKeys.edit)}`}
										</TooltipText>
									</TooltipContent>
								</Tooltip>

								{/* Change Canteen */}
								<Tooltip
									placement="top"
									trigger={triggerProps => (
										<TouchableOpacity
											{...triggerProps}
											onPress={() => openSheet('canteen')}
											style={{
												padding: isWeb ? (screenWidth < 500 ? 5 : 10) : 5,
											}}
										>
											<MaterialIcons name="restaurant-menu" size={24} color={theme.header.text} />
										</TouchableOpacity>
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
							{/* Calendar */}
							<View
								style={{
									...styles.col2,
									gap: isWeb ? (screenWidth < 500 ? 15 : 10) : 10,
								}}
							>
								<Tooltip
									placement="top"
									trigger={triggerProps => (
										<TouchableOpacity
											{...triggerProps}
											onPress={() => handleDateChange('prev')}
											style={{
												padding: isWeb ? (screenWidth < 500 ? 2 : 5) : 2,
											}}
										>
											<Entypo name="chevron-left" size={24} color={theme.header.text} />
										</TouchableOpacity>
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
										<TouchableOpacity
											{...triggerProps}
											onPress={() => openSheet('calendar')}
											style={{
												padding: isWeb ? (screenWidth < 500 ? 2 : 5) : 2,
											}}
										>
											<MaterialIcons name="calendar-month" size={24} color={theme.header.text} />
										</TouchableOpacity>
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
										<TouchableOpacity
											{...triggerProps}
											onPress={() => handleDateChange('next')}
											style={{
												padding: isWeb ? (screenWidth < 500 ? 2 : 5) : 2,
											}}
										>
											<Entypo name="chevron-right" size={24} color={theme.header.text} />
										</TouchableOpacity>
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
								{/* ForeCast */}
								{appSettings?.utilization_display_enabled && (
									<Tooltip
										placement="top"
										trigger={triggerProps => (
											<TouchableOpacity
												{...triggerProps}
												onPress={() => openSheet('forecast', { forDate: selectedDate })}
												style={{
													padding: isWeb ? (screenWidth < 500 ? 2 : 5) : 2,
												}}
											>
												<FontAwesome6 name="people-group" size={24} color={theme.header.text} />
											</TouchableOpacity>
										)}
									>
										<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
											<TooltipText fontSize="$sm" color={theme.tooltip.text}>
												{` ${translate(TranslationKeys.forecast)}: ${translate(TranslationKeys.utilization)}`}
											</TooltipText>
										</TooltipContent>
									</Tooltip>
								)}
								{/* Opening Hours */}

								<Tooltip
									placement="top"
									trigger={triggerProps => (
										<TouchableOpacity
											{...triggerProps}
											onPress={() => openSheet('hours')}
											style={{
												padding: isWeb ? (screenWidth < 500 ? 2 : 5) : 2,
											}}
										>
											<MaterialCommunityIcons name="clock-time-eight" size={24} color={theme.header.text} />
										</TouchableOpacity>
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
					<ScrollView
						style={{
							...styles.container,
							backgroundColor: theme.screen.background,
						}}
						contentContainerStyle={{
							...styles.contentContainer,
							paddingHorizontal: isWeb ? (screenWidth < 500 ? 5 : 20) : 5,
						}}
						refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
					>
						<View style={styles.elementContainer}>{beforeElement && <CustomMarkdown content={beforeElement?.content || ''} backgroundColor={foods_area_color} imageWidth={440} imageHeight={293} />}</View>
						<View
							style={{
								...styles.foodContainer,
								gap: 10,
								justifyContent: 'center',
							}}
						>
							{loading ? (
								<View
									style={{
										width: '100%',
										height: 400,
										justifyContent: 'center',
									}}
								>
									<ActivityIndicator size={'large'} color={theme.screen.icon} />
								</View>
							) : dayItems && dayItems.length > 0 ? (
								dayItems.map((dayItem: DayItem, index: number) => (dayItem.foodoffer ? <FoodItem canteen={selectedCanteen} item={dayItem.foodoffer} key={dayItem.foodoffer.id || `food-item-${index}`} handleMenuSheet={openSheet} handleImageSheet={openManagementSheet} handleEatingHabitsSheet={openSheet} setSelectedFoodId={setSelectedFoodId} /> : dayItem.foodofferInfoItem ? <FoodOfferInfoItem key={dayItem.foodofferInfoItem.id || `info-item-${index}`} item={dayItem.foodofferInfoItem} content={getInfoItemContent(dayItem.foodofferInfoItem).content || ''} /> : null))
							) : (
								<View style={styles.noFoodContainer}>
									<Text style={{ ...styles.noFoodOffer, color: theme.screen.text }}>{translate(TranslationKeys.no_foodoffers_found_for_selection)}</Text>
									<View style={styles.animationContainer}>{renderLottie}</View>
									{nextAvailableDate && (
										<TouchableOpacity
											onPress={() =>
												dispatch({
													type: SET_SELECTED_DATE,
													payload: nextAvailableDate,
												})
											}
											style={[styles.jumpButton, { backgroundColor: foods_area_color }]}
										>
											<Text style={[styles.jumpButtonText, { color: contrastColor }]}>{`${translate(TranslationKeys.show_offers_on)} ${translate(TranslationKeys[getWeekdayKey(nextAvailableDate)])}`}</Text>
										</TouchableOpacity>
									)}
								</View>
							)}
						</View>
						<View style={styles.elementContainer}>{afterElement && <CustomMarkdown content={afterElement?.content || ''} backgroundColor={foods_area_color} imageWidth={440} imageHeight={293} />}</View>
						{!feedbackLabelsLoading && canteenFeedbackLabelsExist > 0 && (
							<View style={styles.feebackContainer}>
								<View>
									<Text
										style={{
											...styles.foodLabels,
											color: theme.screen.text,
										}}
									>
										{translate(TranslationKeys.feedback_labels)}
									</Text>
								</View>
								{memoizedCanteenFeedbackLabels}
							</View>
						)}
					</ScrollView>
				</View>
				{isActive &&
					!kioskMode &&
					(selectedSheet === 'menu' ? (
						<MarkingBottomSheet ref={bottomSheetRef} onClose={closeSheet} />
					) : (
						<BaseBottomSheet
							key={selectedSheet}
							ref={bottomSheetRef}
							backgroundStyle={{
								...styles.sheetBackground,
								backgroundColor: theme.sheet.sheetBg,
							}}
							enablePanDownToClose={selectedSheet === 'forecast' ? false : true}
							enableContentPanningGesture={selectedSheet === 'forecast' ? false : true}
							enableHandlePanningGesture={selectedSheet === 'forecast' ? false : true}
							enableDynamicSizing={selectedSheet === 'forecast' ? false : true}
							onChange={index => {
								if (index === -1) {
									closeSheet();
								}
							}}
							onClose={closeSheet}
							handleComponent={null}
						>
							{SheetComponent && <SheetComponent closeSheet={closeSheet} {...sheetProps} />}
						</BaseBottomSheet>
					))}

				{isActive && currentPopupEvent && (
					<BaseBottomSheet
						ref={eventSheetRef}
						index={-1}
						backgroundStyle={{
							...styles.sheetBackground,
							backgroundColor: theme.sheet.sheetBg,
						}}
						enablePanDownToClose={false}
						handleComponent={null}
						onClose={closeEventSheetForSession}
					>
						<PopupEventSheet closeSheet={closeEventSheet} eventData={currentPopupEvent} />
					</BaseBottomSheet>
				)}
			</SafeAreaView>
		</>
	);
};

export default Index;
