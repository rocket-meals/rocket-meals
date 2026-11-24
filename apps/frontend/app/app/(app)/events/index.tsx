import React, { useCallback, useState } from 'react';
import { DatabaseTypes, isNewsVisibleAtTime } from 'repo-depkit-common';
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
import useNow from '@/hooks/useNow';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';

const EventsScreen = () => {
	useSetPageTitle(TranslationKeys.events);
	const { theme } = useTheme();
	const { translate, language } = useLanguage();
	const dispatch = useDispatch();
    const kioskMode = useKioskMode();
    const { popupEvents } = useAppSelector((state) => state.food);
    const { primaryColor } = useAppSelector((state) => state.settings);
	// Ended news (date_end) stay in the stored events until the next fetch, they are not listed anymore.
	const now = useNow();
	const visibleEvents = (popupEvents ?? []).filter((event: any) => isNewsVisibleAtTime(event, now));
	const [selectedEvent, setSelectedEvent] = useState<Partial<DatabaseTypes.News> | null>(null); // NOSONAR: selectedEvent is currently unused; remove this comment once it is used
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
		<SafeAreaView style={{ flex: 1, backgroundColor: theme.screen.background }}>
			<ScrollView contentContainerStyle={styles.container}>
				<SettingsList iconBgColor={primaryColor} leftIcon={<MaterialIcons name="refresh" size={24} color={theme.screen.icon} />} label={translate(TranslationKeys.reset_seen_popup_events)} rightIcon={<Octicons name="chevron-right" size={24} color={theme.screen.icon} />} handleFunction={resetSeenEvents} groupPosition={'single'} />
				{!kioskMode && visibleEvents.map((event: any) => <SettingsList iconBgColor={primaryColor} key={event.id} leftIcon={<MaterialIcons name="event" size={24} color={theme.screen.icon} />} label={event.translations ? getTitleFromTranslation(event.translations, language) : event.alias} rightIcon={<Octicons name="chevron-right" size={24} color={theme.screen.icon} />} handleFunction={() => openSheet(event)} groupPosition={'single'} />)}
			</ScrollView>
		</SafeAreaView>
	);
};

export default EventsScreen;
