import React, { useCallback, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useAppSelector } from '@/redux/hooks';
import SettingsList from '@/components/SettingsList';
import { MaterialIcons, Octicons } from '@expo/vector-icons';
import PopupEventSheet from '@/components/PopupEventSheet/PopupEventSheet';
import { useDispatch } from 'react-redux';
import { SET_POPUP_EVENTS } from '@/redux/Types/types';
import { useFocusEffect } from 'expo-router';
import { useLanguage } from '@/hooks/useLanguage';
import { getTitleFromTranslation } from '@/helper/resourceHelper';
import styles from './styles';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import useKioskMode from '@/hooks/useKioskMode';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import useIsLtrLanguage from '@/hooks/useIsLtrLanguage';
import AppScreen from '@/components/AppScreen';

const EventsScreen = () => {
	useSetPageTitle(TranslationKeys.events);
	const { theme } = useTheme();
	const isLtrLanguage = useIsLtrLanguage();
	const { translate, language } = useLanguage();
	const dispatch = useDispatch();
	const kioskMode = useKioskMode();
	const { popupEventsDict } = useAppSelector((state) => state.food);
	const popupEvents = useMemo(() => Object.values(popupEventsDict || {}), [popupEventsDict]);
	const { primaryColor } = useAppSelector((state) => state.settings);
	const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
	const { show: showScrollViewModal, close: closeScrollViewModal } = useMyScrollViewModal();
	const handleClose = useCallback(() => {
		setSelectedEvent(null);
		closeScrollViewModal();
	}, [closeScrollViewModal]);

	const openSheet = useCallback((event: any) => {
		setSelectedEvent(event);
		showScrollViewModal(
			{
				onClose: () => setSelectedEvent(null),
				children: <PopupEventSheet closeSheet={handleClose} eventData={event} />,
			},
			{}
		);
	}, [handleClose, showScrollViewModal]);

	const resetSeenEvents = () => {
		const resetEvents = popupEvents.map((e: any, idx: number) => ({
			...e,
			isOpen: false,
			isCurrent: idx === 0,
		}));
		dispatch({ type: SET_POPUP_EVENTS, payload: resetEvents });
	};

	useFocusEffect(
		useCallback(() => () => setSelectedEvent(null), [])
	);

	return (
		<AppScreen>
			<SettingsList iconBgColor={primaryColor} leftIcon={<MaterialIcons name="refresh" size={24} color={theme.screen.icon} />} label={translate(TranslationKeys.reset_seen_popup_events)} rightIcon={<Octicons name={isLtrLanguage ? 'chevron-right' : 'chevron-left'} size={24} color={theme.screen.icon} />} handleFunction={resetSeenEvents} groupPosition={'single'} />
			{!kioskMode && popupEvents.map((event: any) => <SettingsList iconBgColor={primaryColor} key={event.id} leftIcon={<MaterialIcons name="event" size={24} color={theme.screen.icon} />} label={event.translations ? getTitleFromTranslation(event.translations, language) : event.alias} rightIcon={<Octicons name={isLtrLanguage ? 'chevron-right' : 'chevron-left'} size={24} color={theme.screen.icon} />} handleFunction={() => openSheet(event)} groupPosition={'single'} />)}
		</AppScreen>
	);
};

export default EventsScreen;
