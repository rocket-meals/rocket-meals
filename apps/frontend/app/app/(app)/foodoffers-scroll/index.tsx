import { Dimensions, Platform, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DatabaseTypes, DateHelper, FoodSortOption } from 'repo-depkit-common';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { DrawerContentComponentProps, DrawerNavigationProp } from '@react-navigation/drawer';
import { isWeb } from '@/constants/Constants';
import FoodOffersScrollList from '@/components/FoodOffersScrollList';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import useSelectedCanteen from '@/hooks/useSelectedCanteen';
import useKioskMode from '@/hooks/useKioskMode';
import { fetchFoodOffersByCanteen } from '@/redux/actions/FoodOffers/FoodOffers';
import { SET_BUSINESS_HOURS, SET_POPUP_EVENTS, SET_SELECTED_CANTEEN_FOOD_OFFERS, SET_SELECTED_CANTEEN_FOOD_OFFERS_LOCAL, SET_SELECTED_DATE, UPDATE_PROFILE } from '@/redux/Types/types';
import { Entypo, FontAwesome6, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { RootDrawerParamList } from './types';
import BaseBottomSheet from '@/components/BaseBottomSheet';
import type BottomSheet from '@gorhom/bottom-sheet';
import CanteenSelectionSheet from '@/components/CanteenSelectionSheet/CanteenSelectionSheet';
import HourSheet from '@/components/HoursSheet/HoursSheet';
import CalendarSheet from '@/components/CalendarSheet/CalendarSheet';
import { excerpt } from '@/constants/HelperFunctions';
import { useLanguage } from '@/hooks/useLanguage';
import EatingHabitsSheet from '@/components/EatingHabitsSheet/EatingHabitsSheet';
import { Tooltip, TooltipContent, TooltipText } from '@gluestack-ui/themed';
import * as Notifications from 'expo-notifications';
import { sortFoodOffers } from '@/helper/foodOfferSortHelper';
import { useSmartReadableDateMethod } from '@/helper/DateHelper';
import { addDays, format } from 'date-fns';
import { BusinessHoursHelper } from '@/redux/actions/BusinessHours/BusinessHours';
import noFoodOffersFound from '@/assets/animations/noFoodOffersFound.json';
import LottieView from 'lottie-react-native';
import { replaceLottieColors } from '@/helper/animationHelper';
import { myContrastColor } from '@/helper/ColorHelper';
import { TranslationKeys } from '@/locales/keys';

import useSetPageTitle from '@/hooks/useSetPageTitle';
import { RootState } from '@/redux/reducer';
import MarkingBottomSheet from '@/components/MarkingBottomSheet';
import AIGeneratedHintSheet from '@/components/AIGeneratedHintSheet';
import usePopupEventModal from '@/hooks/usePopupEventModal';
import { PriceGroupKey } from '@/app/(app)/settings/types';
import useUtilizationModal from '@/hooks/useUtilizationModal';
import useFoodofferSortingModal from '@/hooks/useFoodofferSortingModal';

export const SHEET_COMPONENTS = {
	canteen: CanteenSelectionSheet,
	hours: HourSheet,
	calendar: CalendarSheet,
	aiGeneratedInfo: AIGeneratedHintSheet,
	eatingHabits: EatingHabitsSheet,
};

const Index: React.FC<DrawerContentComponentProps> = ({ navigation }) => {
	const dispatch = useDispatch();
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const router = useRouter();
	const drawerNavigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
	const bottomSheetRef = useRef<BottomSheet>(null);
	const businessHoursHelper = new BusinessHoursHelper();
	const [loading, setLoading] = useState(false);
	const [isActive, setIsActive] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [sheetProps, setSheetProps] = useState<Record<string, any>>({});
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
	const [selectedSheet, setSelectedSheet] = useState<'menu' | keyof typeof SHEET_COMPONENTS | null>(null);

	const { sortBy, language: languageCode, drawerPosition, appSettings, primaryColor, selectedTheme: mode } = useSelector((state: RootState) => state.settings);
	const { ownFoodFeedbacks, selectedDate, foodCategories, foodOfferCategories } = useSelector((state: RootState) => state.food);
	const [autoPlay, setAutoPlay] = useState(appSettings?.animations_auto_start);
	const animationRef = useRef<LottieView>(null);
	const [animationJson, setAmimationJson] = useState<any>(null);
	const { profile, user } = useSelector((state: RootState) => state.authReducer);
        const selectedCanteen = useSelectedCanteen();
        const kioskMode = useKioskMode();
        const [prefetchedFoodOffers, setPrefetchedFoodOffers] = useState<Record<string, DatabaseTypes.Foodoffers[]>>({});
        const foods_area_color = appSettings?.foods_area_color ? appSettings?.foods_area_color : primaryColor;
        const contrastColor = myContrastColor(foods_area_color, theme, mode === 'dark');
	const { openUtilizationModal } = useUtilizationModal();
	const { openActiveModal, activePopupEvent } = usePopupEventModal();
	const { openFoodofferSortingModal } = useFoodofferSortingModal();
	const smartReadableDate = useSmartReadableDateMethod();

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
		if (profile?.price_group) {
			return;
		}
		dispatch({
			type: UPDATE_PROFILE,
			payload: { ...(profile as any), price_group: PriceGroupKey.student },
		});
	};

	useEffect(() => {
		if (!user?.id) {
			setDefaultPriceGroupForAnonymousUser();
		}
	}, [user]);

	useFocusEffect(
		useCallback(() => {
			setIsActive(true);
			return () => {
				setIsActive(false);
			};
		}, [])
	);

	const openSheet = useCallback(
		(sheet: 'menu' | 'sort' | keyof typeof SHEET_COMPONENTS, props = {}) => {
			if (sheet === 'sort') {
				openFoodofferSortingModal();
				return;
			}

                        setSelectedSheet(sheet);
                        setSheetProps(props);
		},
		[openFoodofferSortingModal]
	);


	useEffect(() => {
		openActiveModal();
	}, [activePopupEvent, openActiveModal]);

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
		const currentDate = parseDateOnly(selectedDate);
		if (direction === 'prev') {
			currentDate.setDate(currentDate.getDate() - 1);
		} else {
			currentDate.setDate(currentDate.getDate() + 1);
		}
		dispatch({
			type: SET_SELECTED_DATE,
			payload: DateHelper.getDirectusDateOnlyString(currentDate),
		});
	};

	const parseDateOnly = (date: string) => {
		const [year, month, day] = date.split('-').map(Number);
		if (!year || !month || !day) {
			return new Date(date);
		}
		return new Date(year, month - 1, day);
	};

	const getDayLabel = (date: string) => {
		return smartReadableDate(parseDateOnly(date));
	};

	const updateSort = (id: FoodSortOption, foodOffers: DatabaseTypes.Foodoffers[]) => {
		const sortedOffers = sortFoodOffers(id, foodOffers, {
			languageCode,
			ownFoodFeedbacks,
			profile: profile as any,
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

	const getPriceGroup = (price_group?: string | null) => {
		if (price_group) {
			return `price_group_${price_group.toLocaleLowerCase()}`;
		}
		return '';
	};

        const getCacheKey = (canteenId: string, date: string) => {
                return `${canteenId}_${format(parseDateOnly(date), 'dd.MM.yyyy')}`;
        };

        const getCachedOffers = (canteenId: string, date: string) => {
                return prefetchedFoodOffers[getCacheKey(canteenId, date)];
        };

        const fetchFoods = async () => {
                try {
                        setLoading(true);
                        const canteenId = selectedCanteen?.id as string;
                        let foodOffers = getCachedOffers(canteenId, selectedDate);

                        if (!foodOffers) {
                                const foodData = await fetchFoodOffersByCanteen(canteenId, selectedDate);
                                foodOffers = foodData?.data || [];
                        }

                        setPrefetchedFoodOffers(prev => ({
                                ...prev,
                                [getCacheKey(canteenId, selectedDate)]: foodOffers,
                        }));

			// Prefetch next two days
			for (let i = 1; i <= 2; i++) {
                                const date = DateHelper.getDirectusDateOnlyString(addDays(parseDateOnly(selectedDate), i));
                                const cacheKey = getCacheKey(canteenId, date);
                                if (!prefetchedFoodOffers[cacheKey]) {
                                        fetchFoodOffersByCanteen(canteenId, date)
                                                .then(res => {
                                                        const offers = res?.data || [];
                                                        setPrefetchedFoodOffers(p => ({
                                                                ...p,
                                                                [cacheKey]: offers,
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

	useEffect(() => {
		fetchFoods();
	}, [selectedCanteen, selectedDate]);

	const onRefresh = useCallback(() => {
		setRefreshing(true);
		fetchFoods();
		setRefreshing(false);
	}, []);

        const nextAvailableDate = useMemo(() => {
                const canteenId = selectedCanteen?.id as string;
                for (let i = 1; i <= 2; i++) {
                        const date = DateHelper.getDirectusDateOnlyString(addDays(parseDateOnly(selectedDate), i));
                        const offers = getCachedOffers(canteenId, date);
                        if (offers && offers.length > 0) {
                                return date;
                        }
                }
                return null;
        }, [prefetchedFoodOffers, selectedCanteen, selectedDate]);

	const getWeekdayKey = (date: string) => {
		const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
		return days[parseDateOnly(date).getDay()];
	};

	const SheetComponent = selectedSheet && selectedSheet !== 'menu' ? SHEET_COMPONENTS[selectedSheet as keyof typeof SHEET_COMPONENTS] : null;

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
											onPress={() => openSheet('calendar', { updateGlobal: true })}
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

								<Text style={{ ...styles.heading, color: theme.header.text }}>{selectedDate ? getDayLabel(selectedDate) : ''}</Text>
							</View>
							<View style={{ ...styles.col2, gap: 10 }}>
								{/* ForeCast */}
								{appSettings?.utilization_display_enabled && (
									<Tooltip
										placement="top"
										trigger={triggerProps => (
											<TouchableOpacity
												{...triggerProps}
                                                                                                onPress={() => openUtilizationModal(selectedDate, selectedCanteen)}
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
					<View
						style={{
							...styles.container,
							backgroundColor: theme.screen.background,
						}}
					>
						{selectedCanteen && <FoodOffersScrollList canteenId={selectedCanteen.id} startDate={selectedDate} />}
					</View>
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
                                                        enablePanDownToClose
                                                        enableContentPanningGesture
                                                        enableHandlePanningGesture
                                                        enableDynamicSizing
                                                        onChange={index => {
                                                                if (index === -1) {
                                                                        closeSheet();
                                                                }
                                                        }}
							onClose={closeSheet}
							handleComponent={null}
						>
							{SheetComponent && React.createElement(SheetComponent as any, { closeSheet: closeSheet, ...sheetProps })}
						</BaseBottomSheet>
					))}

			</SafeAreaView>
		</>
	);
};

export default Index;
