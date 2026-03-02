import { Dimensions, Text, TextInput, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import { ManagementFoodCategorySheetProps } from './types';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { SET_DAY_PLAN } from '@/redux/Types/types';
import { getTextFromTranslation } from '@/helper/resourceHelper';
import { RootState } from '@/redux/reducer';
import { DatabaseTypes } from 'repo-depkit-common';
import SettingsList from '@/components/SettingsList';
import SettingsListBoolean from '@/components/SettingsListBoolean/SettingsListBoolean';

export const ManagementFoodCategoryContent: React.FC<ManagementFoodCategorySheetProps> = ({ closeSheet, selectedFoodCategory }) => {
	const { theme } = useTheme();
	const dispatch = useDispatch();
	const [isCustom, setIsCustom] = useState(false);
	const [list, setList] = useState<DatabaseTypes.FoodsCategories[] | DatabaseTypes.FoodoffersCategories[]>([]);
	const { dayPlan } = useSelector((state: RootState) => state.management);
	const [value, setValue] = useState('');
	const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);
	const { primaryColor, language } = useSelector((state: RootState) => state.settings);
	const { foodCategories, foodOfferCategories } = useSelector((state: RootState) => state.food);

	const currentSelectedId = selectedFoodCategory.key === 'Speiseangebot' ? dayPlan?.mealOfferCategory?.id : dayPlan?.foodCategory?.id;

	useEffect(() => {
		if (selectedFoodCategory.key === 'Speiseangebot') {
			setList(foodOfferCategories);
		} else {
			setList(foodCategories);
		}
	}, [selectedFoodCategory]);

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
					<TextInput
						style={{
							...styles.input,
							color: 'black',
							backgroundColor: '#fff',
							borderWidth: 1,
							height: 60,
							textAlignVertical: 'top',
						}}
						value={value}
						onChangeText={setValue}
					/>

					<View style={[styles.buttonContainer, { width: '30%' }]}>
						<TouchableOpacity
							onPress={() => {
								setIsCustom(false);
								setValue('');
								closeSheet();
							}}
							style={{
								...styles.cancelButton,
								borderColor: primaryColor,
							}}
						>
							<Text style={[styles.buttonText, { color: theme.screen.text }]}>cancel</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={handleSaveCustom}
							style={{
								...styles.saveButton,
								backgroundColor: primaryColor,
							}}
						>
							<Text style={[styles.buttonText, { color: theme.activeText }]}>save</Text>
						</TouchableOpacity>
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
							label="Custom"
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
							label="Fertig"
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
