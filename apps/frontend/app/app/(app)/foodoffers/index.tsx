import React, { useCallback, useEffect, useRef } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { DatabaseTypes } from 'repo-depkit-common';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { DrawerContentComponentProps } from 'expo-router/drawer';
import { useDispatch, shallowEqual } from 'react-redux';
import { useAppSelector } from '@/redux/hooks';
import useSelectedCanteen from '@/hooks/useSelectedCanteen';
import {
	SET_BUSINESS_HOURS,
	SET_SELECTED_CANTEEN,
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
import useFoodofferSortingModal from '@/hooks/useFoodofferSortingModal';
import FoodOffersScrollList from '@/components/FoodOffersScrollList';
import useAppForegroundUpdateCheckModal from '@/hooks/useAppForegroundUpdateCheckModal';
import useMyScrollviewModalChangeMyCanteenSelection from '@/hooks/useMyScrollviewModalChangeMyCanteenSelection';
import useMyScrollviewModalBusinessHours from '@/hooks/useMyScrollviewModalBusinessHours';
import useMyScrollviewModalDatePicker from '@/hooks/useMyScrollviewModalDatePicker';
import { useMyScrollviewModalFoodOffersOptions } from '@/hooks/useMyScrollviewModalFoodOffersOptions';
import { useMyScrollviewModalPriceGroupSettings } from '@/hooks/useMyScrollviewModalPriceGroupSettings';

import FoodOffersHeader from './components/FoodOffersHeader';
import { useNotifications } from './hooks';
import useFoodOffersDefaultDate from '@/hooks/useFoodOffersDefaultDate';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import useAppRatingScore from '@/hooks/useAppRatingScore';
import DebugView from '@/components/DebugView';
import CanteenSelection from '@/components/CanteenSelection/CanteenSelection';

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

	const drawerPosition = useAppSelector((state) => state.settings.drawerPosition);

	const selectedDate = useAppSelector((state) => state.food.selectedDate);

	const profile = useAppSelector((state) => state.authReducer.profile, shallowEqual);
	const user = useAppSelector((state) => state.authReducer.user, shallowEqual);
	const businessHours = useAppSelector((state) => state.canteenReducer.businessHours, shallowEqual);

	const selectedCanteen = useSelectedCanteen();
	useFoodOffersDefaultDate();
	const { hasUnreadChats } = useChatUnreadStatus();
	const { openActiveModal, activePopupEvent } = usePopupEventModal();
	const { openFoodofferSortingModal } = useFoodofferSortingModal();
	useAppForegroundUpdateCheckModal();
	useNotifications();

	const { checkAndRequestRatingOnFocus, appRatingData, setLastFocusTime } = useAppRatingScore();
	const { show: showScrollViewModal, close: closeScrollViewModal, debug: modalDebug } = useMyScrollViewModal();

	// Use a ref so useFocusEffect doesn't re-run when the callback identity changes
	const checkRatingRef = useRef(checkAndRequestRatingOnFocus);
	useEffect(() => {
		checkRatingRef.current = checkAndRequestRatingOnFocus;
	}, [checkAndRequestRatingOnFocus]);

	useFocusEffect(
		useCallback(() => {
			setLastFocusTime(new Date().toLocaleTimeString());
			checkRatingRef.current();
		}, [setLastFocusTime])
	);

	// Also trigger rating check when modal closes
	const prevModalOpenRef = useRef(modalDebug.contentSet);
	useEffect(() => {
		const wasOpen = prevModalOpenRef.current;
		prevModalOpenRef.current = modalDebug.contentSet;
		if (wasOpen && !modalDebug.contentSet) {
			checkRatingRef.current();
		}
	}, [modalDebug.contentSet]);

	const { openChangeMyCanteenSelectionModal } = useMyScrollviewModalChangeMyCanteenSelection();
	const { openBusinessHoursModal } = useMyScrollviewModalBusinessHours();
	const { openDatePickerModal } = useMyScrollviewModalDatePicker();
	const { openPriceGroupSettingsModal } = useMyScrollviewModalPriceGroupSettings();
	const router = useRouter();

	const { openFoodOffersOptionsModal } = useMyScrollviewModalFoodOffersOptions({
		onSort: openFoodofferSortingModal,
		onPriceGroup: openPriceGroupSettingsModal,
		onEatingHabits: () => router.navigate('/eating-habits'),
		onCanteen: openChangeMyCanteenSelectionModal,
		onCalendar: () => openDatePickerModal({ updateGlobal: true }),
		onBusinessHours: openBusinessHoursModal,
		onSettings: () => router.navigate('/settings'),
	});

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
				openSheet={openSheet}
				openOptionsModal={openFoodOffersOptionsModal}
			/>
			<View style={styles.contentWrapper}>
				<DebugView
					title="Foodoffers Debug"
					logs={[
						modalDebug.contentSet ? 'Modal offen' : 'Kein Modal offen',
						'Letzter Focus: ' + (appRatingData?.lastFocusTime || '-'),
					]}
				/>
				{selectedCanteen ? (
					<FoodOffersScrollList
						canteenId={selectedCanteen.id}
						startDate={selectedDate}
					/>
				) : (
					<ScrollView contentContainerStyle={foodoffersStyles.noCanteenContainer}>
						<Text style={[foodoffersStyles.noCanteenTitle, { color: theme.screen.text }]}>
							{translate(TranslationKeys.onboarding_select_canteen)}
						</Text>
						<CanteenSelection
							onSelectCanteen={(canteen: DatabaseTypes.Canteens) => {
								dispatch({ type: SET_SELECTED_CANTEEN, payload: canteen });
							}}
						/>
					</ScrollView>
				)}
			</View>

		</SafeAreaView>
	);
};

const foodoffersStyles = StyleSheet.create({
	noCanteenContainer: {
		flexGrow: 1,
		alignItems: 'center',
		paddingVertical: 20,
	},
	noCanteenTitle: {
		fontSize: 20,
		fontFamily: 'Poppins_700Bold',
		textAlign: 'center',
		paddingHorizontal: 20,
		marginBottom: 12,
	},
});

export default Index;
