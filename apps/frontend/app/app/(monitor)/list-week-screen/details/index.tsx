import { ActivityIndicator, Dimensions, Image, Platform, ScrollView, Text, View } from 'react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '@/hooks/useTheme';
import ListWeekHeader from '@/components/ListWeekHeader/ListWeekHeader';
import styles from './styles';
import { FoodCategoriesHelper } from '@/redux/actions/FoodCategories/FoodCategories';
import { fetchFoodsByCanteen } from '@/redux/actions/FoodOffers/FoodOffers';
import { getTextFromTranslation } from '@/helper/resourceHelper';
import { getImageUrl, showDayPlanPrice, showFormatedPrice } from '@/constants/HelperFunctions';
import { myContrastColor } from '@/helper/ColorHelper';
import { useLocalSearchParams } from 'expo-router';
import moment from 'moment';
import { useLanguage } from '@/hooks/useLanguage';
import { iconLibraries } from '@/components/Drawer/CustomDrawerContent';
import { DatabaseTypes, sortMarkingsByGroup } from 'repo-depkit-common';
import { MarkingGroupsHelper } from '@/redux/actions/MarkingGroups/MarkingGroups';
import { MarkingHelper } from '@/redux/actions/Markings/Markings';
import { UPDATE_MARKINGS } from '@/redux/Types/types';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { RootState } from '@/redux/reducer';
import { PriceGroupKey } from '@/app/(app)/settings/types';

const fontSize = 10;

const Index = () => {
	const printRef = useRef<HTMLElement | null>(null);
	const { translate } = useLanguage();
	const { theme, setThemeMode } = useTheme();
	const dispatch = useDispatch();
	const { canteens_id, date_iso: dateParam, canteen_alias, week, show_markings } = useLocalSearchParams();
	const markingHelper = new MarkingHelper();
	const markingGroupsHelper = new MarkingGroupsHelper();
	const foodCategoriesHelper = new FoodCategoriesHelper();
	const [foods, setFoods] = useState<any>({});
	const [categories, setCategories] = useState<Record<string, { alias: string; sort: number }>>({});
	const [foodMarkings, setFoodMarkings] = useState<any>({});
	const { markings } = useSelector((state: RootState) => state.food);
	const [loading, setLoading] = useState(true);
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

	useSetPageTitle(canteen_alias + ` - ${translate(TranslationKeys.week)} ${week}`);
	const isMobile = screenWidth < 800;
	const { primaryColor: projectColor, language, appSettings, selectedTheme: mode } = useSelector((state: RootState) => state.settings);
	const foods_area_color = appSettings?.foods_area_color ? appSettings?.foods_area_color : projectColor;

	const contrastColor = myContrastColor(foods_area_color, theme, mode === 'dark');
	const weekDayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
	const date_iso = dateParam || moment().format('YYYY-MM-DD');
	const startDate = moment(date_iso);
	const weekDays = Array.from({ length: 7 }, (_, i) => startDate.clone().add(i, 'days').format('YYYY-MM-DD'));

	const fetchFoods = async () => {
		try {
			setLoading(true);
			if (!canteens_id || !date_iso) {
				setLoading(false);
				return;
			}

			const newFoods: Record<string, any[]> = {};

			for (let i = 0; i < weekDays?.length; i++) {
				const dayName = weekDayNames[i];
				const date = weekDays[i];

				const foodData = await fetchFoodsByCanteen(String(canteens_id), date);
				newFoods[dayName] = foodData?.data || [];
			}

			setFoods(newFoods);
			if (newFoods) {
				fetchCurrentFoodCategory(newFoods);
			}
		} catch (error) {
			console.error('Error fetching Food Offers:', error);
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchFoods();
		setThemeMode('light');
	}, [canteens_id, date_iso]);

	const fetchCurrentFoodCategory = async (foodData: Record<string, any[]>) => {
		try {
			if (!foodData) return;

			const newCategories: Record<string, any> = {}; // Store unique categories

			for (const day in foodData) {
				const dayFoods = foodData[day];

				for (const food of dayFoods) {
					if (!food?.food?.food_category) continue; // Skip if category doesn't exist

					const categoryId = food.food.food_category;

					// Fetch category only if it's new (not in newCategories)
					if (!newCategories[categoryId]) {
						const result = (await foodCategoriesHelper.fetchFoodCategoriesById(categoryId)) as DatabaseTypes.FoodsCategories;
						if (result) {
							newCategories[categoryId] = {
								alias: result?.alias,
								sort: result?.sort ?? Infinity,
							};
						}
					}
				}
			}
			setCategories(newCategories);
			setLoading(false);
		} catch (error) {
			console.error('Error fetching food categories:', error);
		}
	};

	const getColumns = useCallback((): {
		key: string;
		title: string;
		isFixed?: boolean;
		flex: number; // <-- Added: Flex property is now part of the column definition
	}[] => {
		const dayFlexDesign = 0.25;
		let flexCategoriesDesign = 5;

		// If no categories are found, just return the day column
		if (!categories || Object.keys(categories).length === 0) {
			return [
				{
					key: 'day',
					title: 'Day',
					isFixed: true,
					flex: dayFlexDesign,
				},
			]; // <-- Added flex for day column
		}

		// --- START: NEW Logic to calculate max food count per category across all days ---
		const maxFoodCounts: Record<string, number> = {}; // Object to store max counts for each category

		// Iterate over each day of the week
		weekDayNames.forEach(dayName => {
			const dayFoods = foods[dayName] || []; // Get foods for the current day
			const dailyCounts: Record<string, number> = {}; // Count foods per category for THIS day

			// Count foods per category for the current day
			dayFoods.forEach(food => {
				const categoryId = food?.food?.food_category;
				// Only count if the category exists in our fetched categories list
				if (categoryId && categories[categoryId]) {
					dailyCounts[categoryId] = (dailyCounts[categoryId] || 0) + 1;
				}
			});

			// Update the overall maximum count for each category found this day
			Object.entries(dailyCounts).forEach(([categoryId, count]) => {
				// Keep the maximum count seen so far for this category
				maxFoodCounts[categoryId] = Math.max(maxFoodCounts[categoryId] || 0, count);
			});
		});
		// --- END: NEW Logic ---

		// Transform categories into an array, sort, and calculate flex for each
		const categoryArray = Object.entries(categories)
			.map(([categoryId, catData]) => {
				// Calculate flex: minimum is 1, otherwise use the max count for this category
				const flex = Math.max(1, maxFoodCounts[categoryId] || 0);
				return {
					key: categoryId,
					title: catData.alias || 'Unknown',
					sort: catData.sort ?? Infinity,
					flex: flex, // <-- Added: Include the calculated flex value
				};
			})
			// Sort categories by their defined sort order
			.sort((a, b) => a.sort - b.sort);

		let flexSumOfCategories = 0;
		categoryArray.forEach(category => {
			flexSumOfCategories += category.flex;
		});

		let dayFlexDynamic = flexSumOfCategories * (dayFlexDesign / flexCategoriesDesign);

		// Return the array of column definitions
		return [
			// Day column with fixed flex
			{
				key: 'day',
				title: 'Day',
				isFixed: true,
				flex: dayFlexDynamic,
			}, // <-- Ensure day column has its fixed flex
			// Category columns with their dynamically calculated flex
			...categoryArray.map(({ key, title, flex }) => ({
				// <-- Destructure flex here
				key,
				title,
				flex, // <-- Include the flex property in the final column object
			})),
		];
	}, [foods, categories, isMobile, weekDayNames]); // <-- Dependencies for useCallback

	const getPriceText = (food: any) => {
		return `${showFormatedPrice(showDayPlanPrice(food, PriceGroupKey.student))} / ${showFormatedPrice(showDayPlanPrice(food, PriceGroupKey.employee))} / ${showFormatedPrice(showDayPlanPrice(food, PriceGroupKey.guest))}`;
	};

	const getMarkings = async () => {
		try {
			const markingResult = (await markingHelper.fetchMarkings({})) as DatabaseTypes.Markings[];
			const markingGroupResult = (await markingGroupsHelper.fetchMarkingGroups({})) as DatabaseTypes.MarkingsGroups[];

			// Use the sortMarkingsByGroup function to sort markings
			const sortedMarkings = sortMarkingsByGroup(markingResult, markingGroupResult);

			dispatch({ type: UPDATE_MARKINGS, payload: sortedMarkings });
		} catch (error) {
			console.error('Error fetching markings:', error);
		}
	};

	const fetchFoodMarkingLabels = useCallback(
		async (foodData: Record<string, any[]>, setMarkingsState: any) => {
			if (!foodData) return;
			if (!markings || Object.keys(markings).length === 0) {
				await getMarkings();
			}

			// Fetch marking groups for sorting
			const markingGroupsHelper = new MarkingGroupsHelper();
			const markingGroups = await markingGroupsHelper.fetchMarkingGroups({});

			const newMarkings: Record<string, any[]> = {};
			// Iterate over each day's foods
			Object.entries(foodData).forEach(([day, dayFoods]) => {
				dayFoods.forEach((food: any) => {
					if (!food?.id) return; // Skip if food has no ID

					// Extract marking IDs properly
					const markingIds = food?.markings?.map((mark: any) => mark.markings_id) || [];

					// Find matching marking objects from `markings` array
					let filteredMarkings = markings?.filter((mark: any) => markingIds.includes(mark.id)) || [];

					// Sort the filtered markings using sortMarkingsByGroup
					filteredMarkings = sortMarkingsByGroup(filteredMarkings, markingGroups);

					const dummyMarkings = filteredMarkings.map((item: any) => ({
						image: item?.image_remote_url ? { uri: item.image_remote_url } : { uri: getImageUrl(item.image) },
						bgColor: item?.background_color,
						color: myContrastColor(item?.background_color, theme, mode === 'dark'),
						shortCode: item?.short_code,
						icon: item?.icon,
					}));

					newMarkings[food.id] = dummyMarkings; // Store by food ID
				});
			});
			setMarkingsState(newMarkings);
		},
		[markings, theme, mode]
	);

	useEffect(() => {
		if (foods && Object.keys(foods).length > 0 && markings) {
			fetchFoodMarkingLabels(foods, setFoodMarkings);
		}
	}, [foods, markings]);

	useEffect(() => {
		const handleResize = () => {
			setScreenWidth(Dimensions.get('window').width);
		};

		const subscription = Dimensions.addEventListener('change', handleResize);

		return () => subscription?.remove();
	}, []);

	const formatDate = (dateStr: string) => {
		const dateObj = new Date(dateStr);
		return `${dateObj.getDate().toString().padStart(2, '0')}.${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
	};

	const handlePrint = () => {
		if (Platform.OS === 'web' && printRef.current) {
			// Clone content so we can manipulate it
			const contentNode = printRef.current.cloneNode(true) as HTMLElement;

			// Add real class="no-break" to data-print-break elements
			contentNode.querySelectorAll('[data-print-break="true"]').forEach(el => {
				el.classList.add('no-break');
			});

			const content = contentNode.outerHTML;

			const stylesheets = Array.from(document.styleSheets)
				.map(styleSheet => {
					try {
						return Array.from(styleSheet.cssRules || [])
							.map(rule => rule.cssText)
							.join('\n');
					} catch (err) {
						return '';
					}
				})
				.join('\n');

			const html = `
      <html>
        <head>
          <style>
            ${stylesheets}
            @media print {
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                background-clip: padding-box !important;
              }

              body {
                background-color: white !important;
              }

              .no-break,
              .food-item,
              .food-text,
              .price-text,
              tr {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }

              thead {
                display: table-header-group !important;
              }
            }
          </style>
        </head>
        <body>
          ${content}
          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

			const newWindow = window.open('', '_blank');
			newWindow?.document.write(html);
			newWindow?.document.close();
		}
	};

	return (
		<View style={{ flex: 1, backgroundColor: theme.screen.iconBg }}>
			<ListWeekHeader handlePrint={handlePrint} />

			<View style={{ flex: 1 }}>
				{loading ? (
					<View
						style={{
							height: 200,
							width: '100%',
							justifyContent: 'center',
							alignItems: 'center',
						}}
					>
						<ActivityIndicator size={30} color={foods_area_color} />
					</View>
				) : Object.entries(categories)?.length < 1 ? (
					<View
						style={{
							height: 200,
							width: '100%',
							justifyContent: 'center',
							alignItems: 'center',
						}}
					>
						<Text style={{ ...styles.noDataFound, color: theme.screen.text }}>Keine Angebote an diesem Tag gefunden.</Text>
					</View>
				) : (
					<ScrollView
						style={{ flex: 1 }}
						contentContainerStyle={[
							styles.container,
							{
								width: '100%',
								backgroundColor: theme.rowBg,
								paddingBottom: 10,
							},
						]}
					>
						<View ref={printRef}>
							<View
								style={{
									flexDirection: 'row',
									justifyContent: 'space-between',
									padding: 2,
								}}
							>
								<View>
									<Text style={[styles.title, { color: theme.header.text }]}>{canteen_alias}</Text>
								</View>
								<View>
									<Text style={[styles.title, { color: theme.header.text }]}>{`${translate(TranslationKeys.week)} ${week}`}</Text>
								</View>
							</View>
							<View style={[styles.headerRow, { backgroundColor: foods_area_color }]}>
								{getColumns()?.map((col, index) => (
									<View
										key={col.key}
										// Apply the calculated flex
										style={[
											styles.cell,
											{ flex: col.flex }, // Use col.flex here
										]}
									>
										<Text style={{ ...styles.headerText, color: contrastColor }}>{col.key === 'day' ? translate(col.key) : col.title}</Text>
									</View>
								))}
							</View>
							{/* Data Rows */}
							{weekDays.map((date, index) => {
								const dayName = weekDayNames[index];
								const shortDayName = dayName?.concat('_S');

								const columns = getColumns();
								const totalFlex = columns.reduce((sum, c) => sum + c.flex, 0);

								// Check if any column for this day has food items
								const hasAnyFood = columns.some(col => {
									if (col.key === 'day') return false;
									return foods[dayName]?.some((food: any) => food?.food?.food_category === col.key) || false;
								});

								return (
									<View
										style={{
											width: '100%',
											// @ts-ignore // pageBreakInside is not supported by react-native but it is supported by browsers
											pageBreakInside: 'avoid', // Avoid the page break
											breakInside: 'avoid', // Avoid the page break
										}}
									>
										<View
											key={index}
											style={{
												...styles.dataRow,
												// @ts-ignore // pageBreakInside is not supported by react-native but it is supported by browsers
												pageBreakInside: 'avoid', // Avoid the page break
											}}
										>
											{hasAnyFood ? (
												columns.map((col, colIndex) => {
													const foodItems = foods[dayName]
														?.filter((food: any) => food.food.food_category === col.key)
														?.map((filteredFood: any) => {
															const foodText = getTextFromTranslation(filteredFood?.food?.translations, language);
															const priceText = getPriceText(filteredFood);

															return (
																<View
																	key={filteredFood.id}
																	style={{
																		flexDirection: 'column',
																		alignItems: 'flex-start',
																		flexWrap: 'wrap',
																	}}
																>
																	<Text
																		style={{
																			...styles.itemText,
																			fontSize: fontSize,
																			color: theme.screen.text,
																		}}
																	>
																		{foodText}
																	</Text>
																	<Text
																		style={{
																			...styles.itemText,
																			fontSize: fontSize,
																			color: theme.screen.text,
																		}}
																	>
																		({priceText})
																	</Text>

																	{show_markings === 'true' && (
																		<View
																			style={{
																				width: '100%',
																				flexDirection: 'row',
																				alignItems: 'center',
																				justifyContent: 'flex-start',
																				flexWrap: 'wrap',
																				padding: 2,
																			}}
																		>
																			{foodMarkings[filteredFood.id] &&
																				foodMarkings[filteredFood.id].map((marking: any, idx: number) => {
																					const iconParts = marking?.icon?.split(':') || [];
																					const [library, name] = iconParts;
																					const Icon = library && iconLibraries[library];
																					return marking?.icon ? (
																						<View
																							key={idx}
																							style={{
																								...styles.iconMarking,
																								backgroundColor: marking?.bgColor,
																								marginRight: 5,
																								borderRadius: 5,
																							}}
																						>
																							<Icon name={name} size={14} color={marking.color} />
																						</View>
																					) : !marking?.image?.uri && marking?.shortCode ? (
																						<View
																							key={idx}
																							style={{
																								...styles.shortCode,
																								backgroundColor: marking?.bgColor,
																								marginRight: 5,
																								padding: 2,
																								borderRadius: 5,
																							}}
																						>
																							<Text
																								style={{
																									color: marking.color,
																									fontSize: fontSize,
																								}}
																							>
																								{marking?.shortCode}
																							</Text>
																						</View>
																					) : marking?.image?.uri ? (
																						<Image
																							key={idx}
																							source={marking.image.uri}
																							style={{
																								backgroundColor: marking?.bgColor,
																								width: 15,
																								height: 15,
																								marginRight: 2,
																								borderRadius: 5,
																							}}
																						/>
																					) : null;
																				})}
																		</View>
																	)}
																</View>
															);
														});

													return (
														<View
															key={col.key}
															style={[
																styles.cell,
																{
																	flex: col.flex,
																	borderRightWidth: 1,
																	borderBottomWidth: 1,
																	borderLeftWidth: colIndex === 0 ? 1 : 0,
																	borderColor: foods_area_color,
																},
															]}
														>
															{col.key === 'day' ? (
																<View style={{ flexDirection: 'column' }}>
																	<Text
																		style={[
																			styles.itemText,
																			{
																				fontSize: fontSize,
																				fontFamily: isMobile ? 'Poppins_400Regular' : 'Poppins_700Bold',
																				textAlign: 'center',
																				color: theme.screen.text,
																			},
																		]}
																	>
																		{translate(shortDayName)}
																	</Text>
																	<Text
																		style={[
																			styles.itemText,
																			{
																				fontSize: fontSize,
																				fontFamily: isMobile ? 'Poppins_400Regular' : 'Poppins_700Bold',
																				textAlign: 'center',
																				color: theme.screen.text,
																			},
																		]}
																	>
																		{formatDate(date)}
																	</Text>
																</View>
															) : (
																<View style={{ flexDirection: 'column' }}>{foodItems?.length > 0 ? foodItems : <Text style={{ color: theme.screen.text }}>-</Text>}</View>
															)}
														</View>
													);
												})
											) : (
												<>
													<View
														style={[
															styles.cell,
															{
																flex: columns[0].flex,
																borderLeftWidth: 1,
																borderRightWidth: 1,
																borderBottomWidth: 1,
																borderColor: foods_area_color,
															},
														]}
													>
														<View style={{ flexDirection: 'column' }}>
															<Text
																style={[
																	styles.itemText,
																	{
																		fontSize: fontSize,
																		fontFamily: isMobile ? 'Poppins_400Regular' : 'Poppins_700Bold',
																		textAlign: 'center',
																		color: theme.screen.text,
																	},
																]}
															>
																{translate(shortDayName)}
															</Text>
															<Text
																style={[
																	styles.itemText,
																	{
																		fontSize: fontSize,
																		fontFamily: isMobile ? 'Poppins_400Regular' : 'Poppins_700Bold',
																		textAlign: 'center',
																		color: theme.screen.text,
																	},
																]}
															>
																{formatDate(date)}
															</Text>
														</View>
													</View>
													<View
														style={[
															styles.cell,
															{
																flex: totalFlex - columns[0].flex,
																borderRightWidth: 1,
																borderBottomWidth: 1,
																borderColor: foods_area_color,
															},
														]}
													>
														<Text
															style={{
																...styles.noOffersText,
																color: theme.screen.text,
															}}
														>
															{translate(TranslationKeys.no_foodoffers_found_for_selection)}
														</Text>
													</View>
												</>
											)}
										</View>
									</View>
								);
							})}
						</View>
					</ScrollView>
				)}
			</View>
		</View>
	);
};

export default Index;
