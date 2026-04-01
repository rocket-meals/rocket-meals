import { Animated, Dimensions, Easing, Image, ScrollView, Text, View } from 'react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { useDispatch } from 'react-redux';
import { fetchFoodsByCanteen } from '@/redux/actions/FoodOffers/FoodOffers';
import { getImageUrl, showDayPlanPrice, showFormatedPrice } from '@/constants/HelperFunctions';
import { getTextFromTranslation } from '@/helper/resourceHelper';
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
	const { canteens } = useAppSelector((state) => state.canteenReducer);
	const [selectedCanteen, setSelectedCanteen] = useState<any>(null);
	const foods_area_color = appSettings?.foods_area_color ? appSettings?.foods_area_color : projectColor;

	const defaultImage = getImageUrl(String(appSettings.foods_placeholder_image)) || appSettings.foods_placeholder_image_remote_url || getImageUrl(serverInfo?.info?.project?.project_logo);

	const resolveBooleanParam = (param: string | string[] | undefined, fallback: boolean) => {
		if (Array.isArray(param)) {
			return param[0] === 'true';
		}
		if (typeof param === 'string') {
			return param === 'true';
		}
		return fallback;
	};

	const showMarkingsOnCard = useMemo(
		() => resolveBooleanParam(params?.showMarkingsOnCard, bigScreenDefaultValues.showMarkingsOnCard),
		[params?.showMarkingsOnCard]
	);

	const cardMarkingSize = useMemo(() => (screenWidth > 1200 ? 100 : screenWidth > 900 ? 80 : 60), [screenWidth]);
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

	const getFoodCategories = async () => {
		try {
			const result = (await foodCategoriesHelper.fetchFoodCategories({})) as DatabaseTypes.FoodsCategories[];
			if (result) {
				dispatch({ type: SET_FOOD_CATEGORIES, payload: result });
			}
		} catch (error) {
			console.error('Error fetching food categories:', error);
		}
	};

	const getFoodOffersCategories = async () => {
		try {
			const result = (await foodOffersCategoriesHelper.fetchFoodOffersCategories({})) as DatabaseTypes.FoodoffersCategories[];
			if (result) {
				dispatch({ type: SET_FOOD_OFFERS_CATEGORIES, payload: result });
			}
		} catch (error) {
			console.error('Error fetching food offers categories:', error);
		}
	};

	useEffect(() => {
		if (foodCategories.length === 0) {
			getFoodCategories();
		}
		if (foodOfferCategories.length === 0) {
			getFoodOffersCategories();
		}
	}, [foodCategories, foodOfferCategories]);

	const fetchSelectedCanteen = useCallback(() => {
		if (!params?.canteens_id || !canteens || canteens.length === 0) return;

		const foundCanteen = canteens?.find((canteen: any) => canteen.id === params?.canteens_id);

		if (foundCanteen) {
			setSelectedCanteen(foundCanteen);
		} else {
			console.warn('Canteen not found for ID:', params?.canteens_id);
		}
	}, [params?.canteens_id, canteens]);

	useEffect(() => {
		fetchSelectedCanteen();
	}, [params?.canteens_id, canteens]);

	const fetchFoods = async () => {
		try {
			const todayDate = new Date().toISOString().split('T')[0];
			const foodData = await fetchFoodsByCanteen(String(params?.canteens_id), todayDate);

			let filteredData = foodData?.data || [];

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

			// Only replace the current food list when new data is non-empty, so the screen
			// keeps showing the last known offers during temporary gaps (e.g. sync windows).
			if (filteredData.length > 0) {
				setFoods(filteredData);
				setCurrentFood(filteredData[0]);
				setCurrentFoodIndex(0);
				startProgressAnimation();
			}
		} catch (error) {
			console.error('Error fetching Food Offers:', error);
		}
	};

	useEffect(() => {
		if (params?.refreshFoodOffersIntervalInSeconds) {
			if (refreshIntervalRef.current) {
				clearInterval(refreshIntervalRef.current);
			}

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

			return () => {
				if (refreshIntervalRef.current) {
					clearInterval(refreshIntervalRef.current);
				}
			};
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
		setLogoStyle({
			width: width < 600 ? 150 : 300,
			height: width < 600 ? 70 : width > 600 ? 75 : 70,
			marginRight: width > 600 ? 20 : 10,
		});
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

	const fetchCurrentFoodCategory = async () => {
		try {
			if (params?.foodCategoryIds) {
				const currentCategory = foodOfferCategories?.filter((category: any) => category?.id === params?.foodCategoryIds);
				setCurrentFoodCategory(currentCategory[0]);
			} else {
				const currentCategory = foodOfferCategories?.filter((category: any) => category?.id === currentFood?.foodoffer_category);
				setCurrentFoodCategory(currentCategory[0]);
			}
		} catch (error) {
			console.error('Error fetching food categories:', error);
		}
	};

	const fetchCurrentFoodOfferCategory = async () => {
		try {
			if (params?.foodOfferCategoryIds) {
				const currentCategory = foodCategories?.filter((category: any) => category?.id === params?.foodOfferCategoryIds);
				setCurrentFoodOfferCategory(currentCategory[0]);
			} else {
				const currentCategory = foodCategories?.filter((category: any) => category?.id === currentFood?.food?.food_category);
				setCurrentFoodOfferCategory(currentCategory[0]);
			}
		} catch (error) {
			console.error('Error fetching food categories:', error);
		}
	};

	const fetchMarkingLabels = useCallback(() => {
		if (!currentFood?.markings || !markings) {
			setCurrentMarking([]);
			return;
		}

		const markingIds = currentFood?.markings?.map((mark: any) => mark.markings_id);

		const filteredMarkings = markings?.filter((mark: any) => markingIds?.includes(mark.id)) || [];
		setCurrentMarking(filteredMarkings);
	}, [currentFood, markings]);

	useEffect(() => {
		if (currentFood) {
			fetchCurrentFoodCategory();
			fetchCurrentFoodOfferCategory();
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

	const imageSource =
		currentFood?.food?.image_remote_url || getImageUrl(currentFood?.food?.image)
			? {
					uri: currentFood?.food?.image_remote_url || getImageUrl(currentFood?.food?.image),
				}
			: { uri: defaultImage };

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

	return (
		<View style={styles.screenWrapper}>
		<ScrollView
			style={{
				...styles.container,
				backgroundColor: theme.screen.background,
			}}
			contentContainerStyle={{
				flexDirection: foods && foods?.length < 1 ? 'column' : width > height ? 'row' : 'column',
			}}
		>
			<View style={[foods && foods?.length > 0 && { flex: 1 }]}>
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
										fontSize: screenWidth > 600 ? 22 : 16,
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
												fontSize: screenWidth > 600 ? 14 : 12,
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
										fontSize: screenWidth > 600 ? 14 : 12,
									}}
								>
									{currentTime}
								</Text>
								<Text
									style={{
										...styles.headerFoodLabel,
										color: theme.screen.text,
										fontSize: screenWidth > 600 ? 14 : 12,
									}}
								>
									{foods?.length > 0 ? `${currentFoodIndex + 1} / ${foods?.length} ${translate(TranslationKeys.foods)}` : ''}
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
				{foods && foods?.length > 0 && (
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
											fontSize: screenWidth > 600 ? 24 : 16,
										}}
									>
										{currentFoodCategory && currentFoodCategory?.translations?.length > 0 ? getTextFromTranslation(currentFoodCategory?.translations, language) : currentFoodCategory?.alias || ''}
									</Text>
								)}
								{params?.showFoodofferCategoryName === 'true' && (
									<Text
										style={{
											...styles.subHeading,
											color: theme.screen.text,
											fontSize: screenWidth > 600 ? 24 : 16,
										}}
									>
										{currentFoodOfferCategory && currentFoodOfferCategory?.translations?.length > 0 ? getTextFromTranslation(currentFoodOfferCategory?.translations, language) : currentFoodOfferCategory?.alias || ''}
									</Text>
								)}

								<Text
									style={{
										...styles.heading,
										color: theme.screen.text,
										textAlign: 'right',
										fontSize: screenWidth > 600 ? 24 : 18,
									}}
								>
									{getTextFromTranslation(currentFood?.food?.translations, language)}
								</Text>
							</View>
							<View style={styles.foodDetailsContainer}>
								<Text
									style={{
										...styles.subHeading,
										color: theme.screen.text,
										fontSize: screenWidth > 600 ? 24 : 16,
									}}
								>
									{`${translate(TranslationKeys.price_group_student)}:`}
								</Text>
								<Text
									style={{
										...styles.heading,
										color: theme.screen.text,
										fontSize: screenWidth > 600 ? 44 : 18,
									}}
								>
									{showFormatedPrice(showDayPlanPrice(currentFood, PriceGroupKey.student))}
								</Text>
								<Text
									style={{
										...styles.body,
										color: theme.screen.text,
										fontSize: screenWidth > 600 ? 24 : 16,
									}}
								>
									{`${translate(TranslationKeys.price_group_employee)}: `}
									{showFormatedPrice(showDayPlanPrice(currentFood, PriceGroupKey.employee))}
								</Text>
								<Text
									style={{
										...styles.body,
										color: theme.screen.text,
										fontSize: screenWidth > 600 ? 24 : 16,
									}}
								>
									{`${translate(TranslationKeys.price_group_guest)}: `}
									{showFormatedPrice(showDayPlanPrice(currentFood, PriceGroupKey.guest))}
								</Text>
								<Text
									style={{
										...styles.body,
										color: theme.screen.text,
										fontSize: screenWidth > 600 ? 24 : 16,
									}}
								>
									{`${translate(TranslationKeys.markings)}:`}
								</Text>
								<View style={styles.labelsContainer}>
									{currentMarking &&
										currentMarking?.map((item: DatabaseTypes.Markings) => (
											<MarkingIcon key={item.id} marking={item} size={30} />
										))}
								</View>
							</View>
						</View>
					</>
				)}
			</View>
			{foods && foods?.length > 0 && (
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
			{foods && foods?.length < 1 && (
				<View style={styles.emptyContainer}>
					<View style={{ flex: 1 }}>
						<Image source={getAppIconInsideExpoLocalSaved()} resizeMode="cover" />
					</View>
				</View>
			)}
		</ScrollView>
		{!isConnected && (
			<View style={styles.noConnectionOverlay}>
				<Text style={styles.noConnectionText}>
					{translate(TranslationKeys.no_connection)}
				</Text>
			</View>
		)}
		</View>
	);
};

export default Index;
