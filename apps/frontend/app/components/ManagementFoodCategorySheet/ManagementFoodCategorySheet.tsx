import { Dimensions, Text, View } from 'react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { ManagementFoodCategorySheetProps } from './types';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/redux/hooks';
import { SET_DAY_PLAN } from '@/redux/Types/types';
import { getTextFromTranslation } from '@/helper/resourceHelper';

import { DatabaseTypes } from 'repo-depkit-common';
import SettingsList from '@/components/SettingsList';
import SettingsListBoolean from '@/components/SettingsListBoolean/SettingsListBoolean';
import { TranslationKeys } from '@/locales/keys';
import { useLanguage } from '@/hooks/useLanguage';
import AppButton from '@/components/AppButton';
import AppTextInput from '@/components/AppTextInput';

export const ManagementFoodCategoryContent: React.FC<ManagementFoodCategorySheetProps> = ({ closeSheet, selectedFoodCategory }) => {
	const { theme } = useTheme();
	const dispatch = useDispatch();
	const { translate } = useLanguage();
	const [isCustom, setIsCustom] = useState(false);
	const [list, setList] = useState<DatabaseTypes.FoodsCategories[] | DatabaseTypes.FoodoffersCategories[]>([]);
	const { dayPlan } = useAppSelector(state => state.management);
	const [value, setValue] = useState('');
	const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);
	const { primaryColor, language } = useAppSelector(state => state.settings);
	const { foodCategoriesDict, foodOfferCategoriesDict } = useAppSelector(state => state.food);
	const foodCategories = useMemo(() => Object.values(foodCategoriesDict || {}), [foodCategoriesDict]);
	const foodOfferCategories = useMemo(() => Object.values(foodOfferCategoriesDict || {}), [foodOfferCategoriesDict]);

	const currentSelectedId = selectedFoodCategory.key === 'Speiseangebot' ? dayPlan?.mealOfferCategory?.id : dayPlan?.foodCategory?.id;

	useEffect(() => {
		if (selectedFoodCategory.key === 'Speiseangebot') {
			setList(foodOfferCategories);
		} else {
			setList(foodCategories);
		}
	}, [selectedFoodCategory, foodCategories, foodOfferCategories]);

	const handleSelect = (item: any) => {
		const alias = item?.translations?.length > 0 ? getTextFromTranslation(item?.translations, language) : item?.alias || '';

		const payloadKey = selectedFoodCategory.key === 'Speiseangebot' ? 'mealOfferCategory' : 'foodCategory';

		// Toggle selection directly in Redux
		if (item?.id === currentSelectedId) {
			dispatch({
				type: SET_DAY_PLAN,
				payload: { [payloadKey]: { id: '', alias: '' } },
			});
		} else {
			dispatch({
				type: SET_DAY_PLAN,
				payload: { [payloadKey]: { id: item.id, alias: alias } },
			});
		}
	};

	const handleSaveCustom = () => {
		if (selectedFoodCategory.key === 'Speiseangebot') {
			dispatch({
				type: SET_DAY_PLAN,
				payload: { mealOfferCategory: { id: '', alias: value } },
			});
		} else {
			dispatch({
				type: SET_DAY_PLAN,
				payload: { foodCategory: { id: '', alias: value } },
			});
		}
		setIsCustom(false);
		setValue('');
		closeSheet();
	};

	const totalItems = list.length + 1;
	const getGroupPosition = (index: number) => {
		if (totalItems === 1) return 'single';
		if (index === 0) return 'top';
		if (index === totalItems - 1) return 'bottom';
		return 'middle';
	};

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
		<View
			style={{
				...styles.sheetView,
				backgroundColor: theme.sheet.sheetBg,
				paddingBottom: 20,
			}}
		>
			<View style={styles.modalHeader}>
				<View />
				<Text
					style={{
						...styles.modalHeading,
						color: theme.modal.text,
						fontSize: windowWidth < 500 ? 24 : 28,
					}}
				>
					{selectedFoodCategory.label}
				</Text>
			</View>
			{isCustom ? (
				<View style={styles.modalContent}>
					<AppTextInput
						style={{
							...styles.input,
							color: 'black',
							backgroundColor: '#fff',
							height: 60,
						}}
						inputStyle={{
							backgroundColor: 'transparent',
							textAlignVertical: 'top',
							height: 60,
						}}
						borderWidth={1}
						borderColor={theme.screen.icon}
						value={value}
						onChangeText={setValue}
					/>

					<View style={[styles.buttonContainer, { width: '70%' }]}>
						<AppButton
							variant="ghost"
							usePlainText
							text={translate(TranslationKeys.cancel)}
							onPress={() => {
								setIsCustom(false);
								setValue('');
								closeSheet();
							}}
							style={{
								...styles.cancelButton,
								borderColor: primaryColor,
								marginVertical: 0,
							}}
							textStyle={[styles.buttonText, { color: theme.screen.text }]}
						/>
						<AppButton
							variant="ghost"
							usePlainText
							text={translate(TranslationKeys.save)}
							onPress={handleSaveCustom}
							style={{
								...styles.saveButton,
								backgroundColor: primaryColor,
								marginVertical: 0,
							}}
							textStyle={[styles.buttonText, { color: theme.activeText }]}
						/>
					</View>
				</View>
			) : (
				<>
					<View style={{ gap: 0 }}>
						{list.map((item: any, index: number) => {
							const isSelected = currentSelectedId === item?.id;
							const label = item?.translations?.length > 0 ? getTextFromTranslation(item?.translations, language) : item?.alias;
							return (
								<SettingsListBoolean
									key={item?.id}
									label={label}
									noIconIndent
									isEnabled={isSelected}
									onToggle={() => handleSelect(item)}
									valueActive=""
									valueInactive=""
									groupPosition={getGroupPosition(index)}
								/>
							);
						})}
						<SettingsListBoolean
							label={translate(TranslationKeys.custom)}
							noIconIndent
							isEnabled={isCustom}
							onToggle={() => setIsCustom(true)}
							valueActive=""
							valueInactive=""
							groupPosition={getGroupPosition(totalItems - 1)}
						/>
					</View>
					<View style={{ gap: 0, marginTop: 20 }}>
						<SettingsList
							label={translate(TranslationKeys.done)}
							noIconIndent
							rightIcon={<MaterialCommunityIcons name="check" size={22} color={theme.screen.icon} />}
							handleFunction={closeSheet}
							groupPosition="single"
						/>
					</View>
				</>
			)}
		</View>
	);
};

const ManagementFoodCategorySheet: React.FC<ManagementFoodCategorySheetProps> = props => <ManagementFoodCategoryContent {...props} />;

export default ManagementFoodCategorySheet;
