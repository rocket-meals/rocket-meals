import LabelHeader from '@/components/LabelHeader/LabelHeader';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, DimensionValue, Easing, ScrollView, Text, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useDispatch, useSelector } from 'react-redux';
import { getImageUrl, showDayPlanPrice, showFormatedPrice } from '@/constants/HelperFunctions';
import { getFoodAttributesTranslation, getTextFromTranslation } from '@/helper/resourceHelper';
import { myContrastColor } from '@/helper/ColorHelper';
import styles from './styles';
import { fetchFoodsByCanteen } from '@/redux/actions/FoodOffers/FoodOffers';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useLanguage } from '@/hooks/useLanguage';
import NetInfo from '@react-native-community/netinfo';
import MarkingIcon from '@/components/MarkingIcon';
import { FoodAttributesHelper } from '@/redux/actions/FoodAttributes/FoodAttributes';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { DatabaseTypes, sortByFoodCategoryOnly, sortByFoodName, sortByFoodOfferCategoryOnly, sortMarkingsByGroup } from 'repo-depkit-common';
import { ColumnPercentages } from './types';
import { RootState } from '@/redux/reducer';
import { CanteenHelper } from '@/redux/actions';
import { BuildingsHelper } from '@/redux/actions/Buildings/Buildings';
import { FoodCategoriesHelper } from '@/redux/actions/FoodCategories/FoodCategories';
import { FoodOffersCategoriesHelper } from '@/redux/actions/FoodOffersCategories/FoodOffersCategories';
import { SET_FOOD_CATEGORIES, SET_FOOD_OFFERS_CATEGORIES } from '@/redux/Types/types';
import { MarkingGroupsHelper } from '@/redux/actions/MarkingGroups/MarkingGroups';
import { PriceGroupKey } from '@/app/(app)/settings/types';

const Index = () => {
	useSetPageTitle('list-day-screen');
	const { canteens_id, refreshDataIntervalInSeconds, nextPageIntervalInSeconds, monitor_additional_canteens_id, foodAttributesData } = useLocalSearchParams();
	const dispatch = useDispatch();
	const { translate } = useLanguage();
	const { theme } = useTheme();
	const rowHeight = 80;
	const { markings, foodCategories: localFoodCategories, foodOfferCategories: localFoodOfferCategories } = useSelector((state: RootState) => state.food);
	const canteenHelper = new CanteenHelper();
	const buildingsHelper = new BuildingsHelper();
	const foodAttributesHelper = new FoodAttributesHelper();
	const foodCategoriesHelper = new FoodCategoriesHelper();
	const foodOffersCategoriesHelper = new FoodOffersCategoriesHelper();
	const [foods, setFoods] = useState([]);
	const [optionalFoods, setOptionalFoods] = useState([]);
	const [foodMarkings, setFoodMarkings] = useState<any>({});
	const [foodCategories, setFoodCategories] = useState<DatabaseTypes.FoodsCategories[]>([]);
	const [foodOfferCategories, setFoodOfferCategories] = useState<DatabaseTypes.FoodoffersCategories[]>([]);
	const [optionalFoodMarkings, setOptionalFoodMarkings] = useState<any>({});
	const [mainFoodCategories, setMainFoodCategories] = useState<any>({});
	const [optionalFoodCategories, setOptionalFoodCategories] = useState<any>({});
	const [selectedCanteen, setSelectedCanteen] = useState<any>(null);
	const { canteens } = useSelector((state: RootState) => state.canteenReducer);
	const { isManagement } = useSelector((state: RootState) => state.authReducer);
	const { primaryColor: projectColor, language, appSettings, selectedTheme: mode } = useSelector((state: RootState) => state.settings);
	const { foodAttributesDict } = useSelector((state: RootState) => state.foodAttributes);
	const progressAnim = useRef(new Animated.Value(0)).current;
	const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const optionalFoodsScrollRef = useRef<ScrollView>(null);
	const [foodScrollIndex, setFoodScrollIndex] = useState(0);
	const [optionalFoodScrollIndex, setOptionalFoodScrollIndex] = useState(0);
	const windowHeight = Dimensions.get('window').height;
	const windowWidth = Dimensions.get('window').width;
	const headerRef = useRef<View>(null);
	const footerRef = useRef<View>(null);
	const [headerHeight, setHeaderHeight] = useState(0);
	const [footerHeight, setFooterHeight] = useState(0);
	const [isConnected, setIsConnected] = useState<boolean | null>(true);
	const [foodAttributesColumn, setFoodAttributesColumn] = useState<any>([]);
	const [foodAttributes, setFoodAttributes] = useState<any>(null);
	const [foodAttributesDataFull, setFoodAttributesDataFull] = useState<any>(null);
	const [optionalFoodAttributes, setOptionalFoodAttributes] = useState<any>(null);

	const foodsScrollRef = useRef<ScrollView>(null);
	const foods_area_color = appSettings?.foods_area_color ? appSettings?.foods_area_color : projectColor;
	const contrastColor = myContrastColor(foods_area_color, theme, mode === 'dark');

	const totalWidth = 1792;
	const columnPercentages: ColumnPercentages = {
		categorie: ((170 / totalWidth) * 100).toFixed(2),
		name: ((400 / totalWidth) * 100).toFixed(2),
		markings: ((250 / totalWidth) * 100).toFixed(2),
		price: ((170 / totalWidth) * 100).toFixed(2),
		attributes: (((totalWidth - (170 + 400 + 350 + 170)) / totalWidth) * 100).toFixed(2),
	};
	const handleHeaderLayout = (event: any) => {
		setHeaderHeight(event.nativeEvent.layout.height);
	};

	const handleFooterLayout = (event: any) => {
		setFooterHeight(event.nativeEvent.layout.height);
	};
	const tableMaxHeight = windowHeight - (headerHeight + footerHeight);

	useEffect(() => {
		const unsubscribe = NetInfo.addEventListener(state => {
			setIsConnected(state?.isConnected);
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

	const getFoodOfferCategories = async () => {
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
		if (localFoodCategories.length > 0) {
			setFoodCategories(localFoodCategories);
		} else {
			getFoodCategories();
		}
	}, [localFoodCategories]);

	useEffect(() => {
		if (localFoodOfferCategories.length > 0) {
			setFoodOfferCategories(localFoodOfferCategories);
		} else {
			getFoodOfferCategories();
		}
	}, [localFoodOfferCategories]);

	useEffect(() => {
		const fetchAliases = async () => {
			if (!foodAttributesData) {
				setFoodAttributesColumn([]);
				setFoodAttributesDataFull([]);
				return;
			}

			try {
				const parsedData = typeof foodAttributesData === 'string' ? JSON.parse(foodAttributesData) : foodAttributesData;

				let attributeEntries: Array<{ id: string; manualSort?: number }> = [];

				if (Array.isArray(parsedData)) {
					// Legacy support: array of ids
					if (parsedData.every(item => typeof item === 'string')) {
						attributeEntries = parsedData.map((id: string) => ({ id }));
					} else {
						// Array of objects with id/manualSort
						attributeEntries = parsedData as Array<{
							id: string;
							manualSort?: number;
						}>;
					}
				} else if (parsedData && typeof parsedData === 'object') {
					attributeEntries = Object.values(parsedData);
				}

				let attributeDataCopy: any[] = [];
				if (foodAttributesDict && Object?.keys(foodAttributesDict)?.length > 0) {
					attributeDataCopy = attributeEntries.map(item => {
						const attr = foodAttributesDict[item.id];
						const title = attr?.translations ? getFoodAttributesTranslation(attr.translations, language) : '';
						return {
							id: item.id,
							alias: title || attr?.alias || '-',
							sort: attr?.sort ?? 0,
							manualSort: item.manualSort,
						};
					});
				} else {
					attributeDataCopy = await Promise.all(
						attributeEntries.map(async item => {
							const attr = (await foodAttributesHelper.fetchFoodAttributeById(item.id)) as DatabaseTypes.FoodsAttributes;
							const title = attr?.translations ? getFoodAttributesTranslation(attr.translations, language) : '';
							return {
								id: item.id,
								alias: title || attr?.alias || '-',
								sort: attr?.sort ?? 0,
								manualSort: item.manualSort,
							};
						})
					);
				}

				const manualSorted = attributeDataCopy.filter(attr => attr.manualSort !== undefined).sort((a, b) => (a.manualSort ?? 0) - (b.manualSort ?? 0));

				const autoSorted = attributeDataCopy.filter(attr => attr.manualSort === undefined).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

				const finalAttributes = [...manualSorted, ...autoSorted];

				setFoodAttributesDataFull(finalAttributes);
				const aliases = finalAttributes.map(attr => attr.alias);
				setFoodAttributesColumn(aliases);
			} catch (error) {
				console.error('Error processing food attributes:', error);
				setFoodAttributesColumn([]);
				setFoodAttributesDataFull([]);
			}
		};

		fetchAliases();
	}, [foodAttributesData, foodAttributesDict, language]);

	const getCanteensWithBuildings = async () => {
		try {
			const buildingsData = (await buildingsHelper.fetchBuildings({})) as DatabaseTypes.Buildings[];
			const buildings = buildingsData || [];

			const buildingsDict = buildings.reduce((acc: Record<string, any>, building: any) => {
				acc[building.id] = building;
				return acc;
			}, {});

			const canteensData = (await canteenHelper.fetchCanteens({})) as DatabaseTypes.Canteens[];

			const filteredCanteens = canteensData.filter(canteen => {
				const status = canteen.status || '';

				// Normal users: only show published
				if (!isManagement) {
					return status === 'published';
				}

				// Management: show all, but only handle published + archived
				return status === 'published' || status === 'archived';
			});

			const sortedCanteens = filteredCanteens.sort((a, b) => {
				const aPublished = a.status === 'published';
				const bPublished = b.status === 'published';

				// Move unpublished (archived) to the end
				if (aPublished !== bPublished) {
					return aPublished ? -1 : 1;
				}

				// If both are same status, sort by sort value
				return (a.sort || 0) - (b.sort || 0);
			});

			const updatedCanteens = sortedCanteens.map(canteen => {
				const building = buildingsDict[canteen?.building as string];
				return {
					...canteen,
					imageAssetId: building?.image,
					thumbHash: building?.image_thumb_hash,
					image_url: building?.image_remote_url || getImageUrl(building?.image),
				};
			});
			return updatedCanteens;
			// dispatch({ type: SET_CANTEENS, payload: updatedCanteens });
		} catch (error) {
			return [];
		}
	};

	const fetchSelectedCanteen = useCallback(async () => {
		if (!canteens_id) return;
		let canteensData: DatabaseTypes.Canteens[] = [];
		if (!canteens || canteens.length === 0) {
			canteensData = await getCanteensWithBuildings();
		} else {
			canteensData = canteens;
		}
		const foundCanteen = canteensData?.find((canteen: any) => canteen.id === canteens_id);

		if (foundCanteen) {
			setSelectedCanteen(foundCanteen);
		} else {
			console.warn('Canteen not found for ID:', canteens_id);
		}
	}, [canteens_id, canteens]);

	useEffect(() => {
		fetchSelectedCanteen();
	}, [canteens_id, canteens]);

	const filterFoodAttributes = (foodOffers: any) => {
		if (!foodOffers || !foodAttributesDataFull) return {};
		try {
			// Create a map for quick lookup of sort order by attribute id
			const attributeSortMap: Record<string, { index: number; alias: string }> = {};
			foodAttributesDataFull?.forEach((attr, index: number) => {
				attributeSortMap[attr.id] = { index, alias: attr.alias };
			});

			// Process each food offer
			const result: Record<string, Array<{ value: any; alias: string }>> = {};

			foodOffers.forEach((offer: any) => {
				if (!offer.id) return;

				// Initialize array with empty values for all possible attributes
				const sortedValues = foodAttributesDataFull.map(attr => ({
					value: null, // or '-' if you prefer
					alias: attr.alias,
					exists: false,
				}));

				// Fill in the actual values where they exist
				if (offer.attribute_values) {
					offer.attribute_values.forEach((attrValue: any) => {
						const attrId = attrValue.food_attribute?.id;
						if (attributeSortMap[attrId]) {
							const position = attributeSortMap[attrId].index;
							sortedValues[position] = {
								value: attrValue, // or extract specific value if needed
								alias: attributeSortMap[attrId].alias,
								exists: true,
							};
						}
					});
				}

				result[offer.id] = sortedValues;
			});

			return result;
		} catch (error) {
			console.error('Error filtering food attributes:', error);
			return {};
		}
	};

	useFocusEffect(
		useCallback(() => {
			if (foods) {
				const filteredAttributes = filterFoodAttributes(foods);
				setFoodAttributes(filteredAttributes);
			}
			return () => {
				// setFoodAttributes(null);
			};
		}, [foods, foodAttributesDataFull])
	);

	useFocusEffect(
		useCallback(() => {
			if (optionalFoods) {
				const filteredAttributes = filterFoodAttributes(optionalFoods);
				setOptionalFoodAttributes(filteredAttributes);
			}
			return () => {
				// setOptionalFoodAttributes(null);
			};
		}, [optionalFoods, foodAttributesDataFull])
	);

	const sortFoodOffers = useCallback(
		(offers: DatabaseTypes.Foodoffers[]) => {
			if (!offers) return [] as any[];
			const copied = [...offers];
			sortByFoodName(copied, language as string);
			sortByFoodOfferCategoryOnly(copied, localFoodOfferCategories);
			sortByFoodCategoryOnly(copied, localFoodCategories);
			return copied;
		},
		[language, localFoodCategories, localFoodOfferCategories]
	);

	const fetchFoods = async () => {
		try {
			const todayDate = new Date().toISOString().split('T')[0];
			const foodData = await fetchFoodsByCanteen(String(canteens_id), todayDate);
			let foodOffers = foodData?.data || [];
			foodOffers = sortFoodOffers(foodOffers);
			setFoods(foodOffers);

			if (foodOffers?.length > 0) {
				startProgressAnimation();
			}
		} catch (error) {
			console.error('Error fetching Food Offers:', error);
		}
	};

	const fetchOptionalFoods = async () => {
		try {
			const todayDate = new Date().toISOString().split('T')[0];
			const foodData = await fetchFoodsByCanteen(String(monitor_additional_canteens_id), todayDate);
			let foodOffers = foodData?.data || [];
			foodOffers = sortFoodOffers(foodOffers);
			setOptionalFoods(foodOffers);
		} catch (error) {
			console.error('Error fetching Food Offers:', error);
		}
	};

	useEffect(() => {
		if (refreshDataIntervalInSeconds) {
			if (refreshIntervalRef.current) {
				clearInterval(refreshIntervalRef.current);
			}

			refreshIntervalRef.current = setInterval(
				() => {
					if (isConnected) {
						fetchFoods();
						if (monitor_additional_canteens_id) {
							fetchOptionalFoods();
						}
					}
				},
				Number(refreshDataIntervalInSeconds) * 1000
			);

			return () => {
				if (refreshIntervalRef.current) {
					clearInterval(refreshIntervalRef.current);
				}
			};
		}
	}, [refreshDataIntervalInSeconds]);

	useEffect(() => {
		if (canteens_id) {
			fetchFoods();
		}
		if (monitor_additional_canteens_id) {
			fetchOptionalFoods();
		}
	}, [canteens_id, monitor_additional_canteens_id]);

	const fetchFoodMarkingLabels = useCallback(
		async (foodList: any, setMarkingsState: any) => {
			if (!foodList && markings.length === 0) return;

			// Fetch marking groups for sorting
			const markingGroupsHelper = new MarkingGroupsHelper();
			const markingGroups = await markingGroupsHelper.fetchMarkingGroups({});

			const newMarkings = {};
			foodList.forEach((food: any) => {
				const markingIds = food?.markings?.map((mark: any) => mark.markings_id) || [];
				let filteredMarkings = markings?.filter((mark: any) => markingIds.includes(mark.id)) || [];

				// Sort the filtered markings using sortMarkingsByGroup
				filteredMarkings = sortMarkingsByGroup(filteredMarkings, markingGroups);

				let dummyMarkings = filteredMarkings.map((item: any) => ({
					image: item?.image_remote_url ? { uri: item.image_remote_url } : { uri: getImageUrl(item.image) },
					bgColor: item?.background_color,
					color: myContrastColor(item?.background_color, theme, mode === 'dark'),
					shortCode: item?.short_code,
					hide_border: item?.hide_border,
					icon: item?.icon,
				}));

				newMarkings[food.id] = dummyMarkings;
			});

			setMarkingsState(newMarkings);
		},
		[markings, theme, mode]
	);

	const fetchCurrentFoodCategory = async (foodList: any, setCategoryState: any, foodCategories: DatabaseTypes.FoodsCategories[]) => {
		if (!foodList) return;

		const newCategories: any = {};

		for (const food of foodList) {
			if (food?.food?.food_category) {
				const category = foodCategories.find((cat: DatabaseTypes.FoodsCategories) => cat.id === food?.food?.food_category);
				if (category) {
					newCategories[food.id] = category;
				}
			}
		}

		setCategoryState(newCategories);
	};

	useEffect(() => {
		if (foods?.length > 0) fetchCurrentFoodCategory(foods, setMainFoodCategories, foodCategories);
		if (optionalFoods?.length > 0) fetchCurrentFoodCategory(optionalFoods, setOptionalFoodCategories, foodCategories);
	}, [foods, optionalFoods, foodCategories]);

	useEffect(() => {
		if (foods?.length > 0) fetchFoodMarkingLabels(foods, setFoodMarkings);
		if (optionalFoods?.length > 0) fetchFoodMarkingLabels(optionalFoods, setOptionalFoodMarkings);
	}, [foods, optionalFoods]);

	useEffect(() => {
		if (foods?.length > 0 && nextPageIntervalInSeconds) {
			const interval = setInterval(
				() => {
					if (!foodsScrollRef.current) return;

					const currentHeight = foods?.length > 0 && optionalFoods?.length > 0 ? tableMaxHeight / 2 - 20 : tableMaxHeight;
					const visibleRows = Math.floor(currentHeight / rowHeight);
					const remainingRows = foods.length - (foodScrollIndex + visibleRows);

					let nextIndex;

					if (remainingRows > 0) {
						nextIndex = foodScrollIndex + 1;
					} else {
						nextIndex = 0;
					}

					setFoodScrollIndex(nextIndex);
					foodsScrollRef.current?.scrollTo({
						y: nextIndex * rowHeight,
						animated: true,
					});

					startProgressAnimation();
				},
				Number(nextPageIntervalInSeconds) * 1000
			);

			return () => clearInterval(interval);
		}
	}, [foods, optionalFoods, foodScrollIndex, nextPageIntervalInSeconds, tableMaxHeight]);

	useEffect(() => {
		if (optionalFoods?.length > 0 && nextPageIntervalInSeconds) {
			const interval = setInterval(
				() => {
					if (!optionalFoodsScrollRef.current) return;

					const currentHeight = foods?.length > 0 && optionalFoods?.length > 0 ? tableMaxHeight / 2 - 20 : tableMaxHeight;
					const visibleRows = Math.floor(currentHeight / rowHeight);
					const remainingRows = optionalFoods.length - (optionalFoodScrollIndex + visibleRows);

					let nextIndex;

					if (remainingRows > 0) {
						nextIndex = optionalFoodScrollIndex + 1;
					} else {
						nextIndex = 0;
					}

					setOptionalFoodScrollIndex(nextIndex);
					optionalFoodsScrollRef.current?.scrollTo({
						y: nextIndex * rowHeight,
						animated: true,
					});

					startProgressAnimation();
				},
				Number(nextPageIntervalInSeconds) * 1000
			);

			return () => clearInterval(interval);
		}
	}, [optionalFoods, foods, optionalFoodScrollIndex, nextPageIntervalInSeconds, tableMaxHeight]);

	const startProgressAnimation = () => {
		progressAnim.setValue(0);
		Animated.timing(progressAnim, {
			toValue: 1,
			duration: Number(nextPageIntervalInSeconds || 10) * 1000,
			easing: Easing.linear,
			useNativeDriver: false,
		}).start();
	};

	let chunkedMarkings = [];
	for (let i = 0; i < markings?.length; i += 7) {
		chunkedMarkings.push(markings?.slice(i, i + 7));
	}

	return (
		<ScrollView style={[styles.outerContainer, { backgroundColor: theme.screen.background }]}>
			<View ref={headerRef} onLayout={handleHeaderLayout} style={{ width: '100%', height: 100, position: 'relative' }}>
				<LabelHeader Label={selectedCanteen?.alias ? selectedCanteen?.alias : ''} isConnected={isConnected} />
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
			<View
				style={{
					height: Dimensions.get('window').height - headerHeight - 10,
					justifyContent: 'space-between',
				}}
			>
				<View style={{ flex: 1 }}>
					<View style={{ ...styles.headerRow, backgroundColor: foods_area_color }}>
						<Text
							style={[
								styles.headerCell,
								{ color: contrastColor },
								{
									width: (columnPercentages.categorie + '%') as DimensionValue,
								},
							]}
						>
							{translate(TranslationKeys.category)}
						</Text>
						<Text style={[styles.headerCell, { color: contrastColor }, { width: (columnPercentages.name + '%') as DimensionValue }]}>{translate(TranslationKeys.foodname)}</Text>
						<Text style={[styles.headerCell, { color: contrastColor }, { width: (columnPercentages.markings + '%') as DimensionValue }]}>{translate(TranslationKeys.markings)}</Text>
						{foodAttributesColumn &&
							foodAttributesColumn.map((column: any) => {
								const attributeColumnWidth = (Number(columnPercentages.attributes) / foodAttributesColumn.length).toFixed(2);
								return (
									<Text style={[styles.headerCell, { color: contrastColor }, { width: (attributeColumnWidth + '%') as DimensionValue }]} key={column}>
										{column}
									</Text>
								);
							})}
						<Text style={[styles.headerCell, { color: contrastColor }, { width: (columnPercentages.price + '%') as DimensionValue }]}>{` ${translate(TranslationKeys.price_group_student)} / ${translate(TranslationKeys.price_group_employee)} / ${translate(TranslationKeys.price_group_guest)}`}</Text>
					</View>
					<View
						style={[
							styles.container,
							{
								backgroundColor: theme.screen.background,
								maxHeight: tableMaxHeight - 50,
							},
							windowWidth < 900 && {
								minHeight: 400,
							},
						]}
					>
						{foods?.length > 0 && (
							<View style={{ ...styles.row, backgroundColor: foods_area_color }}>
								<Text style={{ ...styles.body, color: contrastColor }}>{`${translate(TranslationKeys.foods)}: ${foods.length}/ ${foods?.length}`}</Text>
							</View>
						)}
						<ScrollView
							ref={foodsScrollRef}
							style={[
								{
									maxHeight: foods?.length > 0 && optionalFoods?.length > 0 ? tableMaxHeight / 2 - 20 : tableMaxHeight,
								},
								windowWidth < 900 && { minHeight: 200 },
							]}
							showsVerticalScrollIndicator={false}
						>
							<View style={[styles.table]}>
								{foods &&
									foods?.map((item: any, index) => {
										return (
											<View
												key={index}
												style={[
													styles.dataRow,
													{
														backgroundColor: index % 2 === 0 ? '#d3d3d3' : '#f5f5f5',
													},
												]}
											>
												<Text
													style={[
														styles.cell,
														{
															width: (columnPercentages.categorie + '%') as DimensionValue,
														},
													]}
												>
													{mainFoodCategories[item.id]?.alias || '-'}
												</Text>
												<Text
													style={[
														styles.cell,
														{
															width: (columnPercentages.name + '%') as DimensionValue,
														},
													]}
												>
													{getTextFromTranslation(item?.food?.translations, language)}
												</Text>
												<View
													style={[
														styles.cell,
														{
															width: (columnPercentages.markings + '%') as DimensionValue,
														},
													]}
												>
													{foodMarkings[item.id] &&
														foodMarkings[item.id]?.map((m: any, idx: number) => {
															const marking = {
																icon: m.icon,
																short_code: m.shortCode,
																image_remote_url: m.image?.uri,
																background_color: m.bgColor,
																hide_border: m.hide_border,
															} as any;
															return <MarkingIcon key={idx} marking={marking} size={24} color={m.color} compact />;
														})}
												</View>
												{foodAttributes[item?.id] &&
													foodAttributes[item?.id]?.map((attr: any) => {
														const attributeColumnWidth = (Number(columnPercentages.attributes) / foodAttributes[item?.id].length).toFixed(2);
														if (!attr?.value) {
															return (
																<Text
																	key={`${item.id}`}
																	style={[
																		styles.cell,
																		{
																			width: (attributeColumnWidth + '%') as DimensionValue,
																		},
																	]}
																>
																	-
																</Text>
															);
														}

														const { number_value } = attr.value;
														const { prefix, suffix } = attr?.value?.food_attribute || {};

														if (number_value === undefined || number_value === null) {
															return (
																<Text
																	key={`${item.id}`}
																	style={[
																		styles.cell,
																		{
																			width: (attributeColumnWidth + '%') as DimensionValue,
																		},
																	]}
																>
																	-
																</Text>
															);
														}

														let value = '';
														if (prefix) value += `${prefix} `;
														value += number_value;
														if (suffix) value += ` ${suffix}`;

														return (
															<Text
																key={`${item.id}`}
																style={[
																	styles.cell,
																	{
																		width: (attributeColumnWidth + '%') as DimensionValue,
																	},
																]}
															>
																{value.trim()}
															</Text>
														);
													})}
												<Text
													style={[
														styles.cell,
														{
															width: (columnPercentages.price + '%') as DimensionValue,
														},
													]}
												>
													{`${showFormatedPrice(showDayPlanPrice(item, PriceGroupKey.student))} / ${showFormatedPrice(showDayPlanPrice(item, 'employee'))} / ${showFormatedPrice(showDayPlanPrice(item, 'guest'))}`}
												</Text>
											</View>
										);
									})}
							</View>
						</ScrollView>
						{optionalFoods?.length > 0 && (
							<View style={{ ...styles.row, backgroundColor: foods_area_color }}>
								<Text style={{ ...styles.body, color: contrastColor }}>{`${translate(TranslationKeys.foods)}: ${optionalFoods?.length} / ${optionalFoods?.length}`}</Text>
							</View>
						)}
						<ScrollView
							ref={optionalFoodsScrollRef}
							style={[
								{
									maxHeight: optionalFoods?.length > 0 ? (foods?.length > 0 ? tableMaxHeight / 2 - 20 : tableMaxHeight) : 0,
								},
								windowWidth < 900 && { minHeight: 200 },
							]}
							showsVerticalScrollIndicator={false}
						>
							<View style={[styles.table]}>
								{optionalFoods &&
									optionalFoods?.map((item: any, index) => (
										<View
											key={index}
											style={[
												styles.dataRow,
												{
													backgroundColor: index % 2 === 0 ? '#d3d3d3' : '#f5f5f5',
												},
											]}
										>
											<Text
												style={[
													styles.cell,
													{
														width: (columnPercentages.categorie + '%') as DimensionValue,
													},
												]}
											>
												{optionalFoodCategories[item.id]?.alias || '-'}
											</Text>
											<Text
												style={[
													styles.cell,
													{
														width: (columnPercentages.name + '%') as DimensionValue,
													},
												]}
											>
												{getTextFromTranslation(item?.food?.translations, language)}
											</Text>
											<View
												style={[
													styles.cell,
													{
														width: (columnPercentages.markings + '%') as DimensionValue,
													},
												]}
											>
												{optionalFoodMarkings[item.id] &&
													optionalFoodMarkings[item.id]?.map((mark: any, idx: number) => {
														const marking = {
															icon: mark.icon,
															short_code: mark.shortCode,
															image_remote_url: mark.image?.uri,
															background_color: mark.bgColor,
															hide_border: mark.hide_border,
														} as any;
														return <MarkingIcon key={idx} marking={marking} size={24} color={mark.color} compact />;
													})}
											</View>
											{optionalFoodAttributes[item?.id] &&
												optionalFoodAttributes[item?.id]?.map((attr: any) => {
													const attributeColumnWidth = (Number(columnPercentages.attributes) / optionalFoodAttributes[item?.id].length).toFixed(2);
													if (!attr?.value) {
														return (
															<Text
																key={`${item.id}`}
																style={[
																	styles.cell,
																	{
																		width: (attributeColumnWidth + '%') as DimensionValue,
																	},
																]}
															>
																-
															</Text>
														);
													}

													const { number_value } = attr?.value ?? {};
													const { prefix, suffix } = attr?.value?.food_attribute ?? {};

													if (number_value === undefined || number_value === null) {
														return (
															<Text
																key={`${item.id}`}
																style={[
																	styles.cell,
																	{
																		width: (attributeColumnWidth + '%') as DimensionValue,
																	},
																]}
															>
																-
															</Text>
														);
													}

													let value = '';
													if (prefix) value += `${prefix} `;
													value += number_value;
													if (suffix) value += ` ${suffix}`;

													return (
														<Text
															key={`${item.id}`}
															style={[
																styles.cell,
																{
																	width: (attributeColumnWidth + '%') as DimensionValue,
																},
															]}
														>
															{value.trim()}
														</Text>
													);
												})}

											<Text
												style={[
													styles.cell,
													{
														width: (columnPercentages.price + '%') as DimensionValue,
													},
												]}
											>
												{`${showFormatedPrice(showDayPlanPrice(item, PriceGroupKey.student))} / ${showFormatedPrice(showDayPlanPrice(item, 'employee'))} / ${showFormatedPrice(showDayPlanPrice(item, 'guest'))}`}
											</Text>
										</View>
									))}
							</View>
						</ScrollView>
					</View>
				</View>
				<View
					ref={footerRef}
					onLayout={handleFooterLayout}
					style={{
						...styles.footer,
						borderTopWidth: 2,
						borderTopColor: foods_area_color,
						flexShrink: 0, // verhindert unnötiges Schrumpfen
						flexGrow: 0, // Footer soll nicht wachsen
						flexBasis: 'auto', // Nimmt nur so viel Platz wie der Inhalt braucht
					}}
				>
					<View style={[styles.gridContainer, { backgroundColor: theme.screen.background }]}>
						{chunkedMarkings &&
							chunkedMarkings?.map((chunk, chunkIndex) => (
								<View key={chunkIndex} style={styles.mainContainer}>
									{chunk.map((marking: any, index: any) => {
										const markingImage = marking?.image_remote_url ? { uri: marking?.image_remote_url } : { uri: getImageUrl(marking?.image) };
										const markingText = getTextFromTranslation(marking?.translations, language);
										const MarkingBackgroundColor = marking?.background_color;
										const MarkingColor = myContrastColor(marking?.background_color, theme, mode === 'dark');
										return (
											<View key={index} style={styles.iconText}>
												<MarkingIcon
													marking={
														{
															icon: marking?.icon,
															short_code: marking?.short_code,
															image: marking?.image,
															image_remote_url: marking?.image_remote_url,
															background_color: marking?.background_color,
															hide_border: marking?.hide_border,
														} as any
													}
													size={24}
													color={MarkingColor}
													compact
												/>
												<Text style={{ ...styles.title, color: theme.screen.text }}>{markingText}</Text>
											</View>
										);
									})}
								</View>
							))}
					</View>
				</View>
			</View>
		</ScrollView>
	);
};

export default Index;
