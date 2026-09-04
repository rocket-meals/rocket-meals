import { Animated, Dimensions, Easing, Image, ScrollView, Text, View } from 'react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { useDispatch } from 'react-redux';
import { fetchFoodsByCanteen } from '@/redux/actions/FoodOffers/FoodOffers';
import { getImageUrl, showDayPlanPrice } from '@/constants/HelperFunctions';
import { getFoodOfferName, getTextFromTranslation } from '@/helper/resourceHelper';
import { useLanguage } from '@/hooks/useLanguage';
import { useLocalSearchParams } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import MarkingIcon from '@/components/MarkingIcon';
import CompanyImage from '@/components/CompanyImage';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { FoodCategoriesHelper } from '@/redux/actions/FoodCategories/FoodCategories';
import { DatabaseTypes, StringHelper } from 'repo-depkit-common';
import { SET_FOOD_CATEGORIES, SET_FOOD_OFFERS_CATEGORIES } from '@/redux/Types/types';
import { FoodOffersCategoriesHelper } from '@/redux/actions/FoodOffersCategories/FoodOffersCategories';
import { PriceGroupKey } from '@/app/(app)/settings/types';
import { getAppIconInsideExpoLocalSaved } from '@/config';
import { useAppSelector } from '@/redux/hooks';

export const bigScreenDefaultValues = {
	showMarkingsOnCard: true,
};

const resolveBooleanParam = (param: string | string[] | undefined, fallback: boolean) => {
	if (Array.isArray(param)) {
		return param[0] === 'true';
	}
	if (typeof param === 'string') {
		return param === 'true';
	}
	return fallback;
};

const resolveCardMarkingSize = (screenWidth: number): number => {
	if (screenWidth > 1200) {
		return 100;
	}
	if (screenWidth > 900) {
		return 80;
	}
	return 60;
};

const filterFoodsByParams = (data: any[], params: any) => {
	let filteredData = data;

	// First filter by foodCategoryIds if exists
	if (params?.foodCategoryIds) {
		filteredData = filteredData.filter((food: any) => food?.foodoffer_category === params.foodCategoryIds);
	}

	// Then filter by foodOfferCategoryIds if exists (using previous filtered results)
	if (params?.foodOfferCategoryIds) {
		const offerFiltered = filteredData.filter((food: any) => food?.food?.food_category === params.foodOfferCategoryIds);
		// Only overwrite if we have results from both filters
		filteredData = offerFiltered.length > 0 ? offerFiltered : [];
	}

	return filteredData;
};

const shouldClearStaleFoods = (referenceTime: number, thirtyMinutesMs: number): boolean => {
	return Date.now() - referenceTime >= thirtyMinutesMs;
};

const resolveTargetCategoryId = (filterId: any, fallbackId: any) => {
	return filterId || fallbackId;
};

const resolveCurrentCategoryFromList = (categoriesList: any[], targetId: any) => {
	const currentCategory = categoriesList?.filter((category: any) => category?.id === targetId);
	return currentCategory[0];
};

const resolveFoodImageSource = (currentFood: any, defaultImage: any) => {
	const remoteUrl = currentFood?.food?.image_remote_url || getImageUrl(currentFood?.food?.image);
	return remoteUrl ? { uri: remoteUrl } : { uri: defaultImage };
};

// Clears the auto-refresh interval ref if one is running. Extracted since this
// was duplicated between the "restart interval" and cleanup paths.
const clearRefreshInterval = (refreshIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>): void => {
	if (refreshIntervalRef.current) {
		clearInterval(refreshIntervalRef.current);
	}
};

// Finds the canteen matching `canteensId` in `canteens`, or null if not applicable/found.
const resolveSelectedCanteen = (canteensId: any, canteens: any[] | undefined): any => {
	if (!canteensId || !canteens || canteens.length === 0) return null;
	const foundCanteen = canteens.find((canteen: any) => canteen.id === canteensId);
	if (!foundCanteen) {
		console.warn('Canteen not found for ID:', canteensId);
		return null;
	}
	return foundCanteen;
};

// Resolves the logo style for the current window width.
const computeLogoStyle = (width: number) => {
	const logoHeightForWideScreen = width > 600 ? 75 : 70;
	return {
		width: width < 600 ? 150 : 300,
		height: width < 600 ? 70 : logoHeightForWideScreen,
		marginRight: width > 600 ? 20 : 10,
	};
};

// Resolves the markings shown on the current food's card.
const resolveMarkingsForFood = (currentFood: any, markings: DatabaseTypes.Markings[] | undefined): DatabaseTypes.Markings[] => {
	if (!currentFood?.markings || !markings) return [];
	const markingIds = currentFood.markings.map((mark: any) => mark.markings_id);
	return markings.filter((mark: any) => markingIds?.includes(mark.id));
};

// Resolves the display label for a (food or food-offer) category: its translation
// if any exist, otherwise its alias. Shared by both category labels in the header.
const resolveCategoryLabel = (category: any, language: string): string => {
	if (category?.translations?.length > 0) {
		return getTextFromTranslation(category.translations, language);
	}
	return category?.alias || '';
};

// Fetches food categories and stores the result, if any, via `dispatch`.
const fetchAndSetFoodCategories = async (foodCategoriesHelper: FoodCategoriesHelper, dispatch: (action: any) => void): Promise<void> => {
	try {
		const result = (await foodCategoriesHelper.fetchFoodCategories({})) as DatabaseTypes.FoodsCategories[];
		if (result) {
			dispatch({ type: SET_FOOD_CATEGORIES, payload: result });
		}
	} catch (error) {
		console.error('Error fetching food categories:', error);
	}
};

// Fetches food-offer categories and stores the result, if any, via `dispatch`.
const fetchAndSetFoodOffersCategories = async (foodOffersCategoriesHelper: FoodOffersCategoriesHelper, dispatch: (action: any) => void): Promise<void> => {
	try {
		const result = (await foodOffersCategoriesHelper.fetchFoodOffersCategories({})) as DatabaseTypes.FoodoffersCategories[];
		if (result) {
			dispatch({ type: SET_FOOD_OFFERS_CATEGORIES, payload: result });
		}
	} catch (error) {
		console.error('Error fetching food offers categories:', error);
	}
};

// Resolves and sets the current food category, given the filter params and current food.
const fetchAndSetCurrentFoodCategory = (
	params: any,
	currentFood: any,
	foodOfferCategories: any[],
	setCurrentFoodCategory: (value: any) => void
): void => {
	try {
		const targetId = resolveTargetCategoryId(params?.foodCategoryIds, currentFood?.foodoffer_category);
		setCurrentFoodCategory(resolveCurrentCategoryFromList(foodOfferCategories, targetId));
	} catch (error) {
		console.error('Error fetching food categories:', error);
	}
};

// Resolves and sets the current food-offer category, given the filter params and current food.
const fetchAndSetCurrentFoodOfferCategory = (
	params: any,
	currentFood: any,
	foodCategories: any[],
	setCurrentFoodOfferCategory: (value: any) => void
): void => {
	try {
		const targetId = resolveTargetCategoryId(params?.foodOfferCategoryIds, currentFood?.food?.food_category);
		setCurrentFoodOfferCategory(resolveCurrentCategoryFromList(foodCategories, targetId));
	} catch (error) {
		console.error('Error fetching food categories:', error);
	}
};

type RunFoodsRefreshOptions = {
	params: any;
	language?: string;
	setFoods: (value: any[]) => void;
	setCurrentFood: (value: any) => void;
	setCurrentFoodIndex: (value: number) => void;
	startProgressAnimation: () => void;
	lastNonEmptyFoodsFetchTimeRef: React.MutableRefObject<number | null>;
	mountTimeRef: React.MutableRefObject<number>;
	thirtyMinutesMs: number;
};

// Runs the periodic (or initial) food-offers refresh for the selected canteen.
const runFoodsRefresh = async ({
	params,
	language,
	setFoods,
	setCurrentFood,
	setCurrentFoodIndex,
	startProgressAnimation,
	lastNonEmptyFoodsFetchTimeRef,
	mountTimeRef,
	thirtyMinutesMs,
}: RunFoodsRefreshOptions): Promise<void> => {
	try {
		const todayDate = new Date().toISOString().split('T')[0];
		const foodData = await fetchFoodsByCanteen(String(params?.canteens_id), todayDate, language);

		const filteredData = filterFoodsByParams(foodData?.data || [], params);

		if (filteredData?.length > 0) {
			setFoods(filteredData);
			lastNonEmptyFoodsFetchTimeRef.current = Date.now();
			setCurrentFood(filteredData[0]);
			setCurrentFoodIndex(0);
			startProgressAnimation();
		} else {
			const referenceTime = lastNonEmptyFoodsFetchTimeRef.current ?? mountTimeRef.current;
			if (shouldClearStaleFoods(referenceTime, thirtyMinutesMs)) {
				setFoods([]);
			}
		}
	} catch (error) {
		console.error('Error fetching Food Offers:', error);
	}
};

const Index = () => {
	useSetPageTitle(TranslationKeys.big_screen);
	const dispatch = useDispatch();
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const params = useLocalSearchParams();
	const foodCategoriesHelper = new FoodCategoriesHelper();
	const foodOffersCategoriesHelper = new FoodOffersCategoriesHelper();
	const { width, height } = Dimensions.get('window');
	const imageSize = width / 2;
	const [currentTime, setCurrentTime] = useState('');
	const { markings, foodCategories, foodOfferCategories } = useAppSelector((state) => state.food);
	const [logoStyle, setLogoStyle] = useState(styles.logo);
	const { language, primaryColor: projectColor, appSettings, serverInfo } = useAppSelector((state) => state.settings);
	const [foods, setFoods] = useState([]);
	const [currentFoodIndex, setCurrentFoodIndex] = useState(0);
	const [currentFood, setCurrentFood] = useState<any>(null);
	const [currentMarking, setCurrentMarking] = useState<DatabaseTypes.Markings[]>([]);
	const [currentFoodCategory, setCurrentFoodCategory] = useState<any>(null);
	const [currentFoodOfferCategory, setCurrentFoodOfferCategory] = useState<any>(null);
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
	const [isConnected, setIsConnected] = useState(true);
	const progressAnim = useRef(new Animated.Value(0)).current;
	const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const mountTimeRef = useRef(Date.now());
	const lastNonEmptyFoodsFetchTimeRef = useRef<number | null>(null);
	const { canteens } = useAppSelector((state) => state.canteenReducer);
	const [selectedCanteen, setSelectedCanteen] = useState<any>(null);
	const foods_area_color = appSettings?.foods_area_color ? appSettings?.foods_area_color : projectColor;

	const defaultImage = getImageUrl(String(appSettings.foods_placeholder_image)) || appSettings.foods_placeholder_image_remote_url || getImageUrl(serverInfo?.info?.project?.project_logo);

	const showMarkingsOnCard = useMemo(
		() => resolveBooleanParam(params?.showMarkingsOnCard, bigScreenDefaultValues.showMarkingsOnCard),
		[params?.showMarkingsOnCard]
	);

	const cardMarkingSize = useMemo(() => resolveCardMarkingSize(screenWidth), [screenWidth]);
	const cardMarkings = useMemo(
		() => currentMarking.filter(mark => mark?.show_on_card),
		[currentMarking]
	);

	useEffect(() => {
		const unsubscribe = NetInfo.addEventListener(state => {
			setIsConnected(state?.isConnected ?? false);
		});

		return () => unsubscribe();
	}, []);

	useEffect(() => {
		if (foodCategories.length === 0) {
			fetchAndSetFoodCategories(foodCategoriesHelper, dispatch);
		}
		if (foodOfferCategories.length === 0) {
			fetchAndSetFoodOffersCategories(foodOffersCategoriesHelper, dispatch);
		}
	}, [foodCategories, foodOfferCategories]);

	const fetchSelectedCanteen = useCallback(() => {
		const foundCanteen = resolveSelectedCanteen(params?.canteens_id, canteens);
		if (foundCanteen) {
			setSelectedCanteen(foundCanteen);
		}
	}, [params?.canteens_id, canteens]);

	useEffect(() => {
		fetchSelectedCanteen();
	}, [params?.canteens_id, canteens]);

	const THIRTY_MINUTES_MS = 30 * 60 * 1000;

	const fetchFoods = () =>
		runFoodsRefresh({
			params,
			language,
			setFoods,
			setCurrentFood,
			setCurrentFoodIndex,
			startProgressAnimation,
			lastNonEmptyFoodsFetchTimeRef,
			mountTimeRef,
			thirtyMinutesMs: THIRTY_MINUTES_MS,
		});

	useEffect(() => {
		if (params?.refreshFoodOffersIntervalInSeconds) {
			clearRefreshInterval(refreshIntervalRef);

			refreshIntervalRef.current = setInterval(
				() => {
					if (isConnected) {
						fetchFoods();
					} else {
						console.log('Offline: Skipping API call');
					}
				},
				Number(params.refreshFoodOffersIntervalInSeconds) * 1000
			);

			return () => clearRefreshInterval(refreshIntervalRef);
		}
	}, [params?.refreshFoodOffersIntervalInSeconds]);

	useEffect(() => {
		if (params?.canteens_id) {
			fetchFoods();
		}
	}, [params?.foodCategoryIds, params?.canteens_id]);

	useEffect(() => {
		if (foods.length > 0 && params?.nextFoodIntervalInSeconds) {
			const interval = setInterval(
				() => {
					setCurrentFoodIndex(prevIndex => {
						const nextIndex = (prevIndex + 1) % foods.length;
						setCurrentFood(foods[nextIndex]);
						startProgressAnimation();
						return nextIndex;
					});
				},
				Number(params.nextFoodIntervalInSeconds) * 1000
			);

			return () => clearInterval(interval);
		}
	}, [foods, params.nextFoodIntervalInSeconds]);

	const updateLogoStyle = useCallback(() => {
		setLogoStyle(computeLogoStyle(width));
	}, [width]);

	useEffect(() => {
		updateLogoStyle();
		const subscription = Dimensions.addEventListener('change', updateLogoStyle);

		return () => {
			subscription.remove();
		};
	}, [updateLogoStyle]);

	useEffect(() => {
		const interval = setInterval(() => {
			const now = new Date();
			const formattedTime = `${StringHelper.replaceAllLiteralWithOptions({ str: now.toLocaleDateString('en-GB'), find: '/', replace: '.' })} - ${now.toLocaleTimeString('en-US', {
				hour12: false,
			})}`;
			setCurrentTime(formattedTime);
		}, 1000);

		return () => clearInterval(interval);
	}, []);

	const fetchMarkingLabels = useCallback(() => {
		setCurrentMarking(resolveMarkingsForFood(currentFood, markings));
	}, [currentFood, markings]);

	useEffect(() => {
		if (currentFood) {
			fetchAndSetCurrentFoodCategory(params, currentFood, foodOfferCategories, setCurrentFoodCategory);
			fetchAndSetCurrentFoodOfferCategory(params, currentFood, foodCategories, setCurrentFoodOfferCategory);
			fetchMarkingLabels();
		}
	}, [currentFoodIndex, currentFood]);

	useEffect(() => {
		const handleResize = () => {
			setScreenWidth(Dimensions.get('window').width);
		};

		const subscription = Dimensions.addEventListener('change', handleResize);

		return () => subscription?.remove();
	}, []);

	const startProgressAnimation = () => {
		progressAnim.setValue(0);
		Animated.timing(progressAnim, {
			toValue: 1,
			duration: Number(params?.nextFoodIntervalInSeconds || 10) * 1000,
			easing: Easing.linear,
			useNativeDriver: false,
		}).start();
	};

	const imageSource = resolveFoodImageSource(currentFood, defaultImage);

	const renderFoodImage = (containerStyle: { width: number; height: number; backgroundColor?: string }) => (
		<View style={[styles.imageWrapper, containerStyle]}>
			<Image source={imageSource} style={styles.image} resizeMode="cover" />
			{showMarkingsOnCard && cardMarkings.length > 0 && (
				<View style={styles.cardMarkingsContainer}>
					{cardMarkings.map(marking => (
						<MarkingIcon key={marking.id} marking={marking} size={cardMarkingSize} compact />
					))}
				</View>
			)}
		</View>
	);

	const hasFoods = (foods?.length ?? 0) > 0;
	const orientationFlexDirection = width > height ? 'row' : 'column';
	const contentFlexDirection = hasFoods ? orientationFlexDirection : 'column';

	// Precomputed once per render instead of repeating `screenWidth > 600 ? X : Y`
	// at each of the (many) text elements below.
	const isWideScreen = screenWidth > 600;
	const canteenLabelFontSize = isWideScreen ? 22 : 16;
	const smallTextFontSize = isWideScreen ? 14 : 12;
	const subHeadingFontSize = isWideScreen ? 24 : 16;
	const foodTitleFontSize = isWideScreen ? 24 : 18;
	const priceFontSize = isWideScreen ? 44 : 18;

	return (
		<ScrollView
			style={{
				...styles.container,
				backgroundColor: theme.screen.background,
			}}
			contentContainerStyle={{
				flexDirection: contentFlexDirection,
			}}
		>
			<View style={[hasFoods && { flex: 1 }]}>
				<View
					style={{
						...styles.headerContainer,
					}}
				>
					<View style={styles.headerCol1}>
						<View style={styles.logoContainer}>
							<CompanyImage appSettings={appSettings} style={logoStyle} />
						</View>
						<View style={styles.labelText}>
							<View style={styles.row}>
								<Text
									style={{
										...styles.label,
										color: theme.screen.text,
										fontSize: canteenLabelFontSize,
									}}
								>
									{selectedCanteen?.alias}
								</Text>
								{!isConnected && (
									<View style={styles.offlineChip}>
										<Text
											style={{
												...styles.timestamp,
												color: '#ffffff',
												fontSize: smallTextFontSize,
											}}
										>
											{'Offline'}
										</Text>
									</View>
								)}
							</View>

							<View style={styles.row}>
								<Text
									style={{
										...styles.timestamp,
										color: theme.screen.text,
										fontSize: smallTextFontSize,
									}}
								>
									{currentTime}
								</Text>
								<Text
									style={{
										...styles.headerFoodLabel,
										color: theme.screen.text,
										fontSize: smallTextFontSize,
									}}
								>
									{hasFoods ? `${currentFoodIndex + 1} / ${foods?.length} ${translate(TranslationKeys.foods)}` : ''}
								</Text>
							</View>
						</View>
					</View>

					<Animated.View
						style={{
							position: 'absolute',
							bottom: 0,
							left: 0,
							height: 4,
							backgroundColor: foods_area_color,
							width: progressAnim.interpolate({
								inputRange: [0, 1],
								outputRange: ['0%', '100%'],
							}),
						}}
					/>
				</View>
				{hasFoods && (
					<>
						{height > width && (
							<View style={{ ...styles.col2 }}>
								{renderFoodImage({ width: width, height: width })}
							</View>
						)}
						<View
							style={{
								...styles.contentWrapper,
								marginTop: height < width ? 0 : 20,
							}}
						>
							<View style={styles.foodAliasContainer}>
								{params?.showFoodCategoryName === 'true' && (
									<Text
										style={{
											...styles.subHeading,
											color: theme.screen.text,
											fontSize: subHeadingFontSize,
										}}
									>
										{resolveCategoryLabel(currentFoodCategory, language)}
									</Text>
								)}
								{params?.showFoodofferCategoryName === 'true' && (
									<Text
										style={{
											...styles.subHeading,
											color: theme.screen.text,
											fontSize: subHeadingFontSize,
										}}
									>
										{resolveCategoryLabel(currentFoodOfferCategory, language)}
									</Text>
								)}

								<Text
									style={{
										...styles.heading,
										color: theme.screen.text,
										textAlign: 'right',
										fontSize: foodTitleFontSize,
									}}
								>
									{getFoodOfferName(currentFood, language)}
								</Text>
							</View>
							<View style={styles.foodDetailsContainer}>
								<Text
									style={{
										...styles.subHeading,
										color: theme.screen.text,
										fontSize: subHeadingFontSize,
									}}
								>
									{`${translate(TranslationKeys.price_group_student)}:`}
								</Text>
								<Text
									style={{
										...styles.heading,
										color: theme.screen.text,
										fontSize: priceFontSize,
									}}
								>
									{showDayPlanPrice(currentFood, PriceGroupKey.student)}
								</Text>
								<Text
									style={{
										...styles.body,
										color: theme.screen.text,
										fontSize: subHeadingFontSize,
									}}
								>
									{`${translate(TranslationKeys.price_group_employee)}: `}
									{showDayPlanPrice(currentFood, PriceGroupKey.employee)}
								</Text>
								<Text
									style={{
										...styles.body,
										color: theme.screen.text,
										fontSize: subHeadingFontSize,
									}}
								>
									{`${translate(TranslationKeys.price_group_guest)}: `}
									{showDayPlanPrice(currentFood, PriceGroupKey.guest)}
								</Text>
								<Text
									style={{
										...styles.body,
										color: theme.screen.text,
										fontSize: subHeadingFontSize,
									}}
								>
									{`${translate(TranslationKeys.markings)}:`}
								</Text>
								<View style={styles.labelsContainer}>
									{currentMarking?.map((item: DatabaseTypes.Markings) => (
											<MarkingIcon key={item.id} marking={item} size={30} />
										))}
								</View>
							</View>
						</View>
					</>
				)}
			</View>
			{hasFoods && (
				<>
					{height < width && (
						<View style={{ ...styles.col2 }}>
							{renderFoodImage({
								width: imageSize,
								height: width > height ? height - 2 : imageSize,
								backgroundColor: theme.screen.iconBg,
							})}
						</View>
					)}
				</>
			)}
			{!hasFoods && (
				<View style={styles.emptyContainer}>
					<View style={{ flex: 1 }}>
						<Image source={getAppIconInsideExpoLocalSaved()} resizeMode="cover" />
					</View>
				</View>
			)}
		</ScrollView>
	);
};

export default Index;
