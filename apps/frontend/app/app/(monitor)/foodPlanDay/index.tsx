import React, { useCallback } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { router } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import styles from './styles';
import { Entypo, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '@/hooks/useLanguage';
import ManagementCanteensSheet from '@/components/ManagementCanteensSheet/ManagementCanteensSheet';
import { SET_DAY_PLAN } from '@/redux/Types/types';
import { ManagementFoodCategoryContent } from '@/components/ManagementFoodCategorySheet/ManagementFoodCategorySheet';
import { CanteenProps } from '@/components/CanteenSelectionSheet/types';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { RootState } from '@/redux/reducer';
import { bigScreenDefaultValues } from '../bigScreen';
import SettingsList from '@/components/SettingsList';
import SettingsListBoolean from '@/components/SettingsListBoolean/SettingsListBoolean';
import SettingsListTextInput from '@/components/SettingsListTextInput';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import type { CheckTextInput } from '@/components/SettingsListTextInput';

const Index = () => {
	useSetPageTitle(TranslationKeys.food_plan_day);
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const dispatch = useDispatch();
	const { primaryColor: projectColor, appSettings } = useSelector((state: RootState) => state.settings);
	const { dayPlan } = useSelector((state: RootState) => state.management);
	const { show: showScrollViewModal, close: closeScrollViewModal } = useMyScrollViewModal();
	const foods_area_color = appSettings?.foods_area_color ? appSettings?.foods_area_color : projectColor;
	const canOpenBigScreen = Boolean(dayPlan?.selectedCanteen?.alias);
	const toggleMenuSwitch = () => {
		dispatch({
			type: SET_DAY_PLAN,
			payload: { isMenuCategory: !dayPlan.isMenuCategory },
		});
	};

	const toggleMenuNameSwitch = () => {
		dispatch({
			type: SET_DAY_PLAN,
			payload: { isMenuCategoryName: !dayPlan.isMenuCategoryName },
		});
	};

	const toggleFullScreenSwitch = () => {
		dispatch({
			type: SET_DAY_PLAN,
			payload: { isFullScreen: !dayPlan.isFullScreen },
		});
	};

	const toggleMarkingsOnCardSwitch = () => {
		const currentValue = dayPlan?.showMarkingsOnCard ?? bigScreenDefaultValues.showMarkingsOnCard;
		dispatch({
			type: SET_DAY_PLAN,
			payload: { showMarkingsOnCard: !currentValue },
		});
	};

	const handleSelectCanteen = (canteen: CanteenProps) => {
		dispatch({
			type: SET_DAY_PLAN,
			payload: { selectedCanteen: canteen },
		});
		closeScrollViewModal();
	};

	const openCanteenModal = useCallback(() => {
		showScrollViewModal({
			title: translate(TranslationKeys.canteen),
			onClose: closeScrollViewModal,
			children: <ManagementCanteensSheet closeSheet={closeScrollViewModal} handleSelectCanteen={handleSelectCanteen} />,
		});
	}, [closeScrollViewModal, handleSelectCanteen, showScrollViewModal, translate]);

	const openFoodCategoryModal = useCallback(
		(key: string, label: string) => {
			showScrollViewModal({
				onClose: closeScrollViewModal,
				children: <ManagementFoodCategoryContent closeSheet={closeScrollViewModal} selectedFoodCategory={{ key, label }} />,
			});
		},
		[closeScrollViewModal, showScrollViewModal]
	);

	const numericCheckTextInput = useCallback<CheckTextInput>(value => {
		const normalizedValue = value.replace(/[^0-9]/g, '');
		return {
			isValid: true,
			value: normalizedValue,
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
				<View style={styles.settingContainer}>
					<SettingsList
						iconBgColor={foods_area_color}
						leftIcon={<Ionicons name="restaurant-sharp" size={24} color={theme.screen.icon} />}
						label={translate(TranslationKeys.canteen)}
						value={dayPlan?.selectedCanteen?.alias || ''}
						rightIcon={<MaterialCommunityIcons name="pencil" size={22} color={theme.screen.icon} />}
						handleFunction={openCanteenModal}
						groupPosition="top"
					/>
					<SettingsList
						iconBgColor={foods_area_color}
						leftIcon={<MaterialCommunityIcons name="food-variant" size={24} color={theme.screen.icon} />}
						label="Speiseangebot Kategorie (optional)"
						value={dayPlan?.mealOfferCategory?.alias || ''}
						rightIcon={<MaterialCommunityIcons name="pencil" size={22} color={theme.screen.icon} />}
						handleFunction={() => openFoodCategoryModal('Speiseangebot', 'Speiseangebot Kategorie Wählen')}
						groupPosition="middle"
					/>
					<SettingsListBoolean
						iconBgColor={foods_area_color}
						leftIcon={<MaterialCommunityIcons name="tag-text-outline" size={24} color={theme.screen.icon} />}
						label="Zeige Speiseangebot Kateogrie Name"
						isEnabled={dayPlan.isMenuCategory}
						onToggle={toggleMenuSwitch}
						groupPosition="middle"
					/>
					<SettingsListBoolean
						iconBgColor={foods_area_color}
						leftIcon={<MaterialCommunityIcons name="image-filter-center-focus-strong" size={24} color={theme.screen.icon} />}
						label="Markings auf Bild anzeigen"
						isEnabled={dayPlan?.showMarkingsOnCard ?? bigScreenDefaultValues.showMarkingsOnCard}
						onToggle={toggleMarkingsOnCardSwitch}
						groupPosition="middle"
					/>
					<SettingsListTextInput
						iconBgColor={foods_area_color}
						leftIcon={<MaterialCommunityIcons name="timer-outline" size={24} color={theme.screen.icon} />}
						label="Next Food Interval"
						value={dayPlan?.nextFoodInterval != null ? String(dayPlan.nextFoodInterval) : ''}
						modalTitle="Next Food Interval"
						placeholder="0"
						keyboardType="number-pad"
						checkTextInput={numericCheckTextInput}
						onSave={value => {
							dispatch({
								type: SET_DAY_PLAN,
								payload: { nextFoodInterval: value },
							});
						}}
						groupPosition="middle"
					/>
					<SettingsListTextInput
						iconBgColor={foods_area_color}
						leftIcon={<MaterialCommunityIcons name="refresh" size={24} color={theme.screen.icon} />}
						label="Refresh Food Offers Interval"
						value={dayPlan?.refreshInterval != null ? String(dayPlan.refreshInterval) : ''}
						modalTitle="Refresh Food Offers Interval"
						placeholder="0"
						keyboardType="number-pad"
						checkTextInput={numericCheckTextInput}
						onSave={value => {
							dispatch({
								type: SET_DAY_PLAN,
								payload: { refreshInterval: value },
							});
						}}
						groupPosition="middle"
					/>
					<SettingsListBoolean
						iconBgColor={foods_area_color}
						leftIcon={<MaterialCommunityIcons name="fullscreen" size={24} color={theme.screen.icon} />}
						label="Full Screen"
						isEnabled={dayPlan.isFullScreen}
						onToggle={toggleFullScreenSwitch}
						groupPosition="middle"
					/>
					<SettingsList
						iconBgColor={foods_area_color}
						leftIcon={<MaterialCommunityIcons name="food" size={24} color={theme.screen.icon} />}
						label="Speise Kategorie (optional)"
						value={dayPlan?.foodCategory?.alias || ''}
						rightIcon={<MaterialCommunityIcons name="pencil" size={22} color={theme.screen.icon} />}
						handleFunction={() => openFoodCategoryModal('Speise', 'Speise Kategorie Wählen')}
						groupPosition="middle"
					/>
					<SettingsListBoolean
						iconBgColor={foods_area_color}
						leftIcon={<MaterialCommunityIcons name="tag-text" size={24} color={theme.screen.icon} />}
						label="Zeige Speiseangebot Kateogrie Name"
						isEnabled={dayPlan.isMenuCategoryName}
						onToggle={toggleMenuNameSwitch}
						groupPosition="bottom"
					/>
				</View>
				<View style={styles.settingsListGroup}>
					<SettingsList
						iconBgColor={foods_area_color}
						leftIcon={<MaterialCommunityIcons name="monitor" size={24} color={theme.screen.icon} />}
						label="BigScreen"
						rightIcon={<Entypo name="chevron-small-right" size={22} color={theme.screen.icon} />}
						handleFunction={
							canOpenBigScreen
								? () => {
										router.push({
											pathname: '/bigScreen',
											params: {
												canteens_id: dayPlan?.selectedCanteen?.id || '',
												foodCategoryIds: dayPlan?.mealOfferCategory?.id || '',
												showFoodCategoryName: dayPlan?.isMenuCategory || false,
												foodOfferCategoryIds: dayPlan?.foodCategory?.id || '',
												showFoodofferCategoryName: dayPlan?.isMenuCategoryName || false,
												nextFoodIntervalInSeconds: dayPlan?.nextFoodInterval || 0,
												refreshFoodOffersIntervalInSeconds: dayPlan?.refreshInterval || 0,
												fullscreen: dayPlan?.isFullScreen || false,
												showMarkingsOnCard: dayPlan?.showMarkingsOnCard ?? bigScreenDefaultValues.showMarkingsOnCard,
											},
										});
									}
								: undefined
						}
						groupPosition="single"
					/>
				</View>
			</ScrollView>
		</>
	);
};

export default Index;
