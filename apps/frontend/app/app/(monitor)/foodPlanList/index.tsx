import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, ScrollView, Text, View } from 'react-native';
import AppTextInput from '@/components/AppTextInput';
import { useTheme } from '@/hooks/useTheme';
import { router, useFocusEffect } from 'expo-router';
import { useDispatch } from 'react-redux';
import styles from './styles';
import BaseBottomSheet from '@/components/BaseBottomSheet';
import type BottomSheet from '@gorhom/bottom-sheet';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { AntDesign, Entypo, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '@/hooks/useLanguage';
import { SET_FOOD_ATTRIBUTES_DICT, SET_FOOD_PLAN } from '@/redux/Types/types';
import CustomCollapsible from '@/components/CustomCollapsible/CustomCollapsible';
import { isWeb } from '@/constants/Constants';
import { getFoodAttributesTranslation } from '@/helper/resourceHelper';
import { myContrastColor } from '@/helper/ColorHelper';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { DatabaseTypes, StringHelper } from 'repo-depkit-common';
import { FoodAttributesHelper } from '@/redux/actions/FoodAttributes/FoodAttributes';
import { useAppSelector } from '@/redux/hooks';
import { useMyScrollviewModalSelectFoodPlanCanteen } from '@/hooks/useMyScrollviewModalSelectFoodPlanCanteen';
import AppButton from '@/components/AppButton';
import useIsLtrLanguage from '@/hooks/useIsLtrLanguage';

type FoodAttribute = {
	id: string;
	sort: number;
	manualSort?: number;
	selected: boolean;
	alias?: string;
};

const Index = () => {
	useSetPageTitle(TranslationKeys.food_plan_list);
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const dispatch = useDispatch();
	const foodAttributesHelper = new FoodAttributesHelper();
	const { foodAttributesDict: initialFoodAttributes } = useAppSelector((state) => state.foodAttributes);
	const [foodAttributes, setFoodAttributes] = useState<FoodAttribute[]>();
	const { primaryColor: projectColor, language, appSettings, selectedTheme: mode } = useAppSelector((state) => state.settings);
	const isLtrLanguage = useIsLtrLanguage();
	const isArabic = !isLtrLanguage;
	const { foodPlan } = useAppSelector((state) => state.management);
	const [isActive, setIsActive] = useState(false);
	const [value, setValue] = useState('');
	const intervalSheetRef = useRef<BottomSheet>(null);
	const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);
	const foods_area_color = appSettings?.foods_area_color ? appSettings?.foods_area_color : projectColor;
	const { openSelectFoodPlanCanteenModal } = useMyScrollviewModalSelectFoodPlanCanteen();

	const contrastColor = myContrastColor(foods_area_color, theme, mode === 'dark');
	const [selectedInterval, setSelectedInterval] = useState({
		key: '',
		label: '',
	});

	const getAllFoodAttributes = async () => {
		try {
			const result = (await foodAttributesHelper.fetchAllFoodAttributes()) as DatabaseTypes.FoodsAttributes[];
			if (result) {
				const attributesDict = result.reduce(
					(acc, attr) => {
						if (attr.id) {
							acc[attr.id] = attr;
						}
						return acc;
					},
					{} as Record<string, DatabaseTypes.FoodsAttributes>
				);
				console.log('✅ foodAttributes as Dictionary (O(1) Access):', attributesDict);
				dispatch({ type: SET_FOOD_ATTRIBUTES_DICT, payload: attributesDict });
			}
		} catch (error) {
			console.error('Error fetching Food attribute', error);
		}
	};

	useEffect(() => {
		if (Object.keys(initialFoodAttributes).length > 0) {
			setFoodAttributes(
				Object.values(initialFoodAttributes).map((attr: any, index: number) => {
					const title = attr?.translations ? getFoodAttributesTranslation(attr?.translations, language) : '';
					return {
						id: attr?.id,
						alias: title ? title : attr?.alias,
						sort: attr.sort || index + 1,
						manualSort: undefined,
						selected: attr.status === 'published' ? true : false,
					};
				})
			);
		} else {
			getAllFoodAttributes();
		}
	}, [initialFoodAttributes]);

	const handleSortChange = (id: string, newValue: string) => {
		const parsed = Number.parseInt(newValue, 10);
		if (!newValue || parsed === 0) {
			setFoodAttributes((prev: any) => prev.map((attr: any) => (attr.id === id ? { ...attr, manualSort: undefined } : attr)));
			return;
		}
		const numericValue = Math.max(1, Math.min(99, parsed));
		setFoodAttributes((prev: any) => prev.map((attr: any) => (attr.id === id ? { ...attr, manualSort: numericValue } : attr)));
	};

	const toggleAttributeSelection = (id: string) => {
		setFoodAttributes((prev: any) => prev.map((attr: any) => (attr.id === id ? { ...attr, selected: !attr.selected } : attr)));
	};

	const openCanteenModal = (option: 'canteen' | 'additional') => {
		openSelectFoodPlanCanteenModal(option);
	};

	const openIntervalSheet = (intervalKey: string, intervalLabel: string) => {
		setSelectedInterval({ key: intervalKey, label: intervalLabel });

		// Set the value based on the selected interval
		if (intervalKey === 'foodInterval') {
			setValue(foodPlan?.nextFoodInterval ? String(foodPlan.nextFoodInterval) : '');
		} else if (intervalKey === 'refreshFoodInterval') {
			setValue(foodPlan?.refreshInterval ? String(foodPlan.refreshInterval) : '');
		}

		intervalSheetRef?.current?.expand();
	};

	const closeIntervalSheet = () => {
		intervalSheetRef?.current?.close();
	};

	useFocusEffect(
		useCallback(() => {
			setIsActive(true);
			return () => {
				setIsActive(false);
			};
		}, [])
	);

	useEffect(() => {
		const onChange = ({ window }: { window: any }) => {
			setWindowWidth(window.width);
		};

		const subscription = Dimensions.addEventListener('change', onChange);
		return () => {
			subscription.remove();
		};
	}, []);

	return (
		<>
			<ScrollView
				style={{
					...styles.container,
					backgroundColor: theme.screen.background,
				}}
				contentContainerStyle={{
					...styles.contentContainer,
					backgroundColor: theme.screen.background,
				}}
			>
                                 <AppButton
                                         variant="ghost"
                                         usePlainText
                                         onPress={() => openCanteenModal('canteen')}
                                         style={{
                                                 ...styles.list,
                                                 backgroundColor: theme.screen.iconBg,
                                                 paddingHorizontal: windowWidth > 600 ? 20 : 10,
                                                 marginVertical: 0,
                                                 flexDirection: isArabic ? 'row-reverse' : 'row',
                                         }}
                                 >
                                         <View style={[styles.col1, isArabic ? { flexDirection: 'row-reverse' } : undefined]}>
                                                 <Ionicons name="restaurant-sharp" size={24} color={theme.screen.icon} />
                                                 <Text
                                                         style={{
                                                                 ...styles.label,
                                                                 color: theme.screen.text,
                                                                 textAlign: isArabic ? 'right' : 'left',
                                                                 writingDirection: isArabic ? 'rtl' : 'ltr',
                                                         }}
                                                 >
                                                         {translate(TranslationKeys.canteen)}
                                                 </Text>
                                         </View>
                                         <View style={[styles.col2, isArabic ? { flexDirection: 'row-reverse' } : undefined]}>
                                                 <Text
                                                         style={{
                                                                 ...styles.label,
                                                                 color: theme.screen.text,
                                                                 textAlign: isArabic ? 'right' : 'left',
                                                                 writingDirection: isArabic ? 'rtl' : 'ltr',
                                                         }}
                                                 >
                                                         {foodPlan?.selectedCanteen?.alias}
                                                 </Text>
                                                 <MaterialCommunityIcons name="pencil" size={22} color={theme.screen.icon} />
                                         </View>
                                 </AppButton>

                                 <AppButton
                                         variant="ghost"
                                         usePlainText
                                         onPress={() => openCanteenModal('additional')}
                                         style={{
                                                 ...styles.list,
                                                 backgroundColor: theme.screen.iconBg,
                                                 paddingHorizontal: windowWidth > 600 ? 20 : 10,
                                                 marginVertical: 0,
                                                 flexDirection: isArabic ? 'row-reverse' : 'row',
                                         }}
                                 >
                                         <View style={[styles.col1, isArabic ? { flexDirection: 'row-reverse' } : undefined]}>
                                                 <Ionicons name="restaurant-sharp" size={24} color={theme.screen.icon} />
                                                 <Text
                                                         style={{
                                                                 ...styles.label,
                                                                 color: theme.screen.text,
                                                                 textAlign: isArabic ? 'right' : 'left',
                                                                 writingDirection: isArabic ? 'rtl' : 'ltr',
                                                         }}
                                                 >
                                                         {translate(TranslationKeys.optional_additional_canteen)}
                                                 </Text>
                                         </View>
                                         <View style={[styles.col2, isArabic ? { flexDirection: 'row-reverse' } : undefined]}>
                                                 <Text
                                                         style={{
                                                                 ...styles.label,
                                                                 color: theme.screen.text,
                                                                 textAlign: isArabic ? 'right' : 'left',
                                                                 writingDirection: isArabic ? 'rtl' : 'ltr',
                                                         }}
                                                 >
                                                         {foodPlan?.additionalSelectedCanteen?.alias}
                                                 </Text>
                                                 <MaterialCommunityIcons name="pencil" size={22} color={theme.screen.icon} />
                                         </View>
                                 </AppButton>

                                 <AppButton
                                         variant="ghost"
                                         usePlainText
                                         onPress={() => openIntervalSheet('foodInterval', translate(TranslationKeys.next_food_interval))}
                                         style={{
                                                 ...styles.list,
                                                 backgroundColor: theme.screen.iconBg,
                                                 paddingHorizontal: windowWidth > 600 ? 20 : 10,
                                                 marginVertical: 0,
                                                 flexDirection: isArabic ? 'row-reverse' : 'row',
                                         }}
                                 >
                                         <View style={[styles.col1, isArabic ? { justifyContent: 'flex-end' } : undefined]}>
                                                 <Text
                                                         style={{
                                                                 ...styles.label,
                                                                 color: theme.screen.text,
                                                                 textAlign: isArabic ? 'right' : 'left',
                                                                 writingDirection: isArabic ? 'rtl' : 'ltr',
                                                         }}
                                                 >
                                                         {translate(TranslationKeys.next_food_interval)}
                                                 </Text>
                                         </View>
                                         <View style={[styles.col2, isArabic ? { flexDirection: 'row-reverse' } : undefined]}>
                                                 <Text style={{ ...styles.label, color: theme.screen.text }}>{foodPlan?.nextFoodInterval}</Text>
                                                 <MaterialCommunityIcons name="pencil" size={22} color={theme.screen.icon} />
                                         </View>
                                 </AppButton>

                                 <AppButton
                                         variant="ghost"
                                         usePlainText
                                         onPress={() => openIntervalSheet('refreshFoodInterval', translate(TranslationKeys.refresh_food_offers_interval))}
                                         style={{
                                                 ...styles.list,
                                                 backgroundColor: theme.screen.iconBg,
                                                 paddingHorizontal: windowWidth > 600 ? 20 : 10,
                                                 marginVertical: 0,
                                                 flexDirection: isArabic ? 'row-reverse' : 'row',
                                         }}
                                 >
                                         <View style={[styles.col1, isArabic ? { justifyContent: 'flex-end' } : undefined]}>
                                                 <Text
                                                         style={{
                                                                 ...styles.label,
                                                                 color: theme.screen.text,
                                                                 textAlign: isArabic ? 'right' : 'left',
                                                                 writingDirection: isArabic ? 'rtl' : 'ltr',
                                                         }}
                                                 >
                                                         {translate(TranslationKeys.refresh_data_interval_seconds)}
                                                 </Text>
                                         </View>
                                         <View style={[styles.col2, isArabic ? { flexDirection: 'row-reverse' } : undefined]}>
                                                 <Text style={{ ...styles.label, color: theme.screen.text }}>{foodPlan?.refreshInterval}</Text>
                                                 <MaterialCommunityIcons name="pencil" size={22} color={theme.screen.icon} />
                                         </View>
                                 </AppButton>

				<View style={{ width: '100%' }}>
					<CustomCollapsible headerText={translate(TranslationKeys.food_attributes)} customColor={theme.screen.iconBg}>
						<ScrollView style={styles.attributeListContainer} contentContainerStyle={styles.attributeListContent}>
							{foodAttributes &&
								foodAttributes?.map((attribute: any) => {
									return (
										<View style={styles.attributeContainer} key={attribute?.id}>
											<AppTextInput
												containerStyle={{ width: 50 }}
												value={attribute?.manualSort !== undefined ? String(attribute?.manualSort) : ''}
												onChangeText={text => handleSortChange(attribute.id, text)}
												keyboardType="numeric"
												maxLength={2}
												inputStyle={styles.sortField}
												borderColor={theme.screen.iconBg}
											/>
											<AppButton
												variant="ghost"
												usePlainText
												text={attribute?.alias}
												onPress={() => toggleAttributeSelection(attribute.id)}
												style={{
													...styles.row,
													paddingHorizontal: isWeb ? 20 : 10,
													backgroundColor: attribute?.selected ? foods_area_color : theme.screen.iconBg,
													marginVertical: 0,
												}}
												textStyle={{
													...styles.text,
													color: attribute?.selected ? contrastColor : theme.header.text,
													textAlign: isArabic ? 'right' : 'left',
													writingDirection: isArabic ? 'rtl' : 'ltr',
												}}
												iconLeft={
													isArabic ? (
														<MaterialCommunityIcons
															name={attribute?.selected ? 'checkbox-marked' : 'checkbox-blank'}
															size={24}
															color={attribute?.selected ? contrastColor : '#ffffff'}
														/>
													) : undefined
												}
												iconRight={
													!isArabic ? (
														<MaterialCommunityIcons
															name={attribute?.selected ? 'checkbox-marked' : 'checkbox-blank'}
															size={24}
															color={attribute?.selected ? contrastColor : '#ffffff'}
															style={styles.radioButton}
														/>
													) : undefined
												}
											/>
										</View>
									);
								})}
						</ScrollView>
					</CustomCollapsible>
				</View>

				<AppButton
					variant="ghost"
					usePlainText
					text={translate(TranslationKeys.day_screen)}
					onPress={() => {
						if (foodPlan?.selectedCanteen?.alias) {
							const selectedAttributes = foodAttributes
								?.filter(attr => attr.selected)
								?.reduce(
									(acc, attr) => {
										acc[attr.id] = { id: attr.id } as {
											id: string;
											manualSort?: number;
										};
										if (attr.manualSort !== undefined) {
											acc[attr.id].manualSort = attr.manualSort;
										}
										return acc;
									},
									{} as Record<string, { id: string; manualSort?: number }>
								);
							router.push({
								pathname: '/list-day-screen',
								params: {
									canteens_id: foodPlan?.selectedCanteen?.id,
									nextPageIntervalInSeconds: foodPlan?.nextFoodInterval,
									refreshDataIntervalInSeconds: foodPlan?.refreshInterval,
									monitor_additional_canteens_id: foodPlan?.additionalSelectedCanteen?.id ? foodPlan?.additionalSelectedCanteen?.id : '',
									foodAttributesData: selectedAttributes ? JSON.stringify(selectedAttributes) : '',
								},
							});
						}
					}}
					disabled={!foodPlan?.selectedCanteen?.alias}
					style={{
						...styles.button,
						backgroundColor: theme.screen.iconBg,
						paddingHorizontal: windowWidth > 600 ? 20 : 10,
						opacity: foodPlan?.selectedCanteen?.alias ? 1 : 0.5,
						marginVertical: 0,
						flexDirection: isArabic ? 'row-reverse' : 'row',
					}}
					textStyle={{
						...styles.label,
						color: theme.screen.text,
						flex: isArabic ? 1 : undefined,
						textAlign: isArabic ? 'right' : 'left',
						writingDirection: isArabic ? 'rtl' : 'ltr',
					}}
					iconLeft={undefined}
					iconRight={
						isArabic ? <Entypo name="chevron-small-left" size={22} color={theme.screen.icon} /> : <Entypo name="chevron-small-right" size={22} color={theme.screen.icon} />
					}
				/>
			</ScrollView>

			{isActive && (
				<BaseBottomSheet
					ref={intervalSheetRef}
					index={-1}
					backgroundStyle={{
						...styles.sheetBackground,
						backgroundColor: theme.sheet.sheetBg,
					}}
					enablePanDownToClose
					handleComponent={null}
					onClose={closeIntervalSheet}
				>
					<BottomSheetView
						style={{
							...styles.sheetView,
							backgroundColor: theme.sheet.sheetBg,
						}}
					>
						<View style={styles.modalHeader}>
							<View />
							<Text
								style={{
									...styles.modalHeading,
									color: theme.modal.text,
									fontSize: 28,
									width: '70%',
									position: 'absolute',
									left: '15%',
									marginTop: 20,
								}}
							>
								{selectedInterval?.label}
							</Text>

                                                         <AppButton
                                                                 onPress={closeIntervalSheet}
                                                                 style={{
                                                                         ...styles.closeButton,
                                                                         backgroundColor: theme.modal.closeBg,
                                                                         height: 40,
                                                                         width: 40,
                                                                         borderRadius: 20,
                                                                         paddingHorizontal: 0,
                                                                         marginVertical: 0,
                                                                 }}
                                                                 iconLeft={<AntDesign name="close" size={26} color={theme.modal.closeIcon} />}
                                                         />
						</View>
						<View style={[styles.modalContent, { paddingHorizontal: windowWidth < 600 ? 5 : 30 }]}>
                                                         <AppTextInput
                                                                 inputStyle={{
                                                                         ...styles.input,
                                                                         backgroundColor: '#fff',
                                                                         color: 'black',
                                                                         height: 60,
                                                                         textAlignVertical: 'top',
                                                                 }}
                                                                 borderColor="#000"
                                                                 value={value}
                                                                 onChangeText={text => {
                                                                         const numericValue = StringHelper.replaceAllWithOptions({ str: text, find: '[^0-9]', replace: '' });
                                                                         setValue(numericValue);
                                                                 }}
                                                                 keyboardType="number-pad"
                                                                 isBottomSheet
                                                         />

							<View
								style={[
									styles.buttonContainer,
									{
										width: windowWidth < 500 ? '70%' : windowWidth < 800 ? '50%' : '30%',
									},
								]}
							>
								<AppButton
									variant="ghost"
									usePlainText
									text={translate(TranslationKeys.cancel)}
									onPress={() => {
										closeIntervalSheet();
										setValue('');
									}}
									style={{
										...styles.cancelButton,
										borderColor: foods_area_color,
										marginVertical: 0,
									}}
									textStyle={[styles.buttonText, { color: theme.screen.text }]}
								/>
								<AppButton
									variant="ghost"
									usePlainText
									text={translate(TranslationKeys.save)}
									onPress={() => {
										if (selectedInterval.key === 'foodInterval') {
											dispatch({
												type: SET_FOOD_PLAN,
												payload: { nextFoodInterval: value },
											});
										} else {
											dispatch({
												type: SET_FOOD_PLAN,
												payload: { refreshInterval: value },
											});
										}
										closeIntervalSheet();
									}}
									style={{
										...styles.saveButton,
										backgroundColor: foods_area_color,
										marginVertical: 0,
									}}
									textStyle={[styles.buttonText, { color: theme.screen.text }]}
								/>
							</View>
						</View>
					</BottomSheetView>
				</BaseBottomSheet>
			)}
		</>
	);
};

export default Index;
