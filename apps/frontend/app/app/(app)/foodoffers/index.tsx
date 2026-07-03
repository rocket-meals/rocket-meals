import React, { useCallback, useEffect } from 'react';
import { SafeAreaView, View } from 'react-native';
import { DatabaseTypes } from 'repo-depkit-common';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useDispatch, shallowEqual } from 'react-redux';
import { useAppSelector } from '@/redux/hooks';
import useSelectedCanteen from '@/hooks/useSelectedCanteen';
import useKioskMode from '@/hooks/useKioskMode';
import {
	SET_BUSINESS_HOURS,
	UPDATE_PROFILE,
} from '@/redux/Types/types';
import HourSheet from '@/components/HoursSheet/HoursSheet';
import CalendarSheet from '@/components/CalendarSheet/CalendarSheet';
import { useLanguage } from '@/hooks/useLanguage';
import EatingHabitsSheet from '@/components/EatingHabitsSheet/EatingHabitsSheet';
import { BusinessHoursHelper } from '@/redux/actions/BusinessHours/BusinessHours';
import { TranslationKeys } from '@/locales/keys';

import useSetPageTitle from '@/hooks/useSetPageTitle';
import AIGeneratedHintSheet from '@/components/AIGeneratedHintSheet';
import useChatUnreadStatus from '@/hooks/useChatUnreadStatus';

import usePopupEventModal from '@/hooks/usePopupEventModal';
import useUtilizationModal from '@/hooks/useUtilizationModal';
import useFoodofferSortingModal from '@/hooks/useFoodofferSortingModal';
import FoodOffersScrollList from '@/components/FoodOffersScrollList';
import useAppForegroundUpdateCheckModal from '@/hooks/useAppForegroundUpdateCheckModal';
import useMyScrollviewModalChangeMyCanteenSelection from '@/hooks/useMyScrollviewModalChangeMyCanteenSelection';
import useMyScrollviewModalBusinessHours from '@/hooks/useMyScrollviewModalBusinessHours';
import useMyScrollviewModalDatePicker from '@/hooks/useMyScrollviewModalDatePicker';

import FoodOffersHeader from './components/FoodOffersHeader';
import { useNotifications } from './hooks';
import useFoodOffersDefaultDate from '@/hooks/useFoodOffersDefaultDate';
import useMyScrollviewDirectusImageEditModal from '@/hooks/useMyScrollviewDirectusImageEditModal';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import useCheckAppRateAsking from '@/hooks/useCheckAppRateAsking';
import { useFocusEffect } from 'expo-router';

export const SHEET_COMPONENTS = {
	hours: HourSheet,
	calendar: CalendarSheet,
	aiGeneratedInfo: AIGeneratedHintSheet,
	eatingHabits: EatingHabitsSheet,
};

const Index: React.FC<DrawerContentComponentProps> = () => {
	const dispatch = useDispatch();
	const { theme } = useTheme();
	const { translate } = useLanguage();

	const appSettings = useAppSelector((state) => state.settings.appSettings, shallowEqual);
	const drawerPosition = useAppSelector((state) => state.settings.drawerPosition);

	const selectedDate = useAppSelector((state) => state.food.selectedDate);

	const profile = useAppSelector((state) => state.authReducer.profile, shallowEqual);
	const user = useAppSelector((state) => state.authReducer.user, shallowEqual);
	const businessHours = useAppSelector((state) => state.canteenReducer.businessHours, shallowEqual);

	const selectedCanteen = useSelectedCanteen();
	useFoodOffersDefaultDate();
	const kioskMode = useKioskMode();
	const { hasUnreadChats } = useChatUnreadStatus();
	const { openUtilizationModal } = useUtilizationModal();
	const { openActiveModal, activePopupEvent } = usePopupEventModal();
	const { openFoodofferSortingModal } = useFoodofferSortingModal();
	useAppForegroundUpdateCheckModal();
	useNotifications();

	const { show: showScrollViewModal, close: closeScrollViewModal } = useMyScrollViewModal();
	const { checkAndShowAppRating } = useCheckAppRateAsking();

	// Attempt to show rating prompt when the foodoffer screen gains focus
	useFocusEffect(
		useCallback(() => {
			checkAndShowAppRating();
		}, [checkAndShowAppRating])
	);

	const { openChangeMyCanteenSelectionModal } = useMyScrollviewModalChangeMyCanteenSelection();
	const { openBusinessHoursModal } = useMyScrollviewModalBusinessHours();
	const { openDatePickerModal } = useMyScrollviewModalDatePicker();

	const openSheet = useCallback((sheet: string, props = {}) => {
		if (sheet === 'canteen') {
			openChangeMyCanteenSelectionModal();
			return;
		}
		if (sheet === 'hours') {
			openBusinessHoursModal();
			return;
		}
		if (sheet === 'calendar') {
			openDatePickerModal({ updateGlobal: true });
			return;
		}
		if (sheet === 'sort') {
			openFoodofferSortingModal();
			return;
		}
		const SheetComp = SHEET_COMPONENTS[sheet as keyof typeof SHEET_COMPONENTS];
		if (SheetComp) {
			showScrollViewModal({
				children: <SheetComp closeSheet={closeScrollViewModal} {...props} />,
			});
		}
	}, [openChangeMyCanteenSelectionModal, openBusinessHoursModal, openDatePickerModal, openFoodofferSortingModal, showScrollViewModal, closeScrollViewModal]);

	useSetPageTitle(selectedCanteen?.alias || TranslationKeys.food_offers);

	useEffect(() => {
		openActiveModal();
	}, [activePopupEvent, openActiveModal]);

	const setDefaultPriceGroupForAnonymousUser = () => {
		if (profile?.price_group) return;
		dispatch({
			type: UPDATE_PROFILE,
			payload: { ...profile, price_group: 'student' },
		});
	};

	useEffect(() => {
		if (!user?.id) setDefaultPriceGroupForAnonymousUser();
	}, [user]);

	const getBusinessHours = useCallback(async () => {
		if (businessHours && businessHours.length > 0) return;
		const businessHoursHelper = new BusinessHoursHelper();
		try {
			const businessHoursData = (await businessHoursHelper.fetchBusinessHours({})) as DatabaseTypes.Businesshours[];
			dispatch({ type: SET_BUSINESS_HOURS, payload: businessHoursData });
		} catch (error) {
			console.error('Error fetching business hours:', error);
		}
	}, [dispatch, businessHours]);

	useEffect(() => {
		getBusinessHours();
	}, [getBusinessHours]);

	return (
		<SafeAreaView style={[styles.safeArea, { backgroundColor: theme.screen.background }]}>
			<FoodOffersHeader
				drawerPosition={drawerPosition as 'left' | 'right'}
				hasUnreadChats={hasUnreadChats}
				selectedCanteen={selectedCanteen}
				selectedDate={selectedDate}
				profile={profile}
				appSettings={appSettings}
				openSheet={openSheet}
				openUtilizationModal={openUtilizationModal}
			/>
			<View style={styles.contentWrapper}>
				{selectedCanteen && (
					<FoodOffersScrollList
						canteenId={selectedCanteen.id}
						startDate={selectedDate}
					/>
				)}
			</View>

		</SafeAreaView>
	);
};

export default Index;
