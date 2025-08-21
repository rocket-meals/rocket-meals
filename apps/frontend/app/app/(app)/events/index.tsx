import React, { useCallback, useRef, useState } from 'react';
import { SafeAreaView, ScrollView } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import SettingsList from '@/components/SettingsList';
import { MaterialIcons, Octicons } from '@expo/vector-icons';
import BaseBottomSheet from '@/components/BaseBottomSheet';
import PopupEventSheet from '@/components/PopupEventSheet/PopupEventSheet';
import type BottomSheet from '@gorhom/bottom-sheet';
import { useDispatch, useSelector } from 'react-redux';
import { SET_POPUP_EVENTS } from '@/redux/Types/types';
import { useFocusEffect } from 'expo-router';
import { useLanguage } from '@/hooks/useLanguage';
import { getTitleFromTranslation } from '@/helper/resourceHelper';
import styles from './styles';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { RootState } from '@/redux/reducer';
import useKioskMode from '@/hooks/useKioskMode';

const EventsScreen = () => {
	useSetPageTitle(TranslationKeys.events);
	const { theme } = useTheme();
	const { translate, language } = useLanguage();
	const dispatch = useDispatch();
	const kioskMode = useKioskMode();
	const { popupEvents } = useSelector((state: RootState) => state.food);
	const { primaryColor } = useSelector((state: RootState) => state.settings);
	const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
	const bottomSheetRef = useRef<BottomSheet>(null);
	const [isActive, setIsActive] = useState(false);

	const openSheet = useCallback((event: any) => {
		setSelectedEvent(event);
		bottomSheetRef.current?.expand();
	}, []);

	const closeSheet = useCallback(() => {
		bottomSheetRef.current?.close();
		setSelectedEvent(null);
	}, []);

	const resetSeenEvents = () => {
		const resetEvents = popupEvents.map((e: any, idx: number) => ({
			...e,
			isOpen: false,
			isCurrent: idx === 0,
		}));
		dispatch({ type: SET_POPUP_EVENTS, payload: resetEvents });
	};

	useFocusEffect(
		useCallback(() => {
			setIsActive(true);
			return () => setIsActive(false);
		}, [])
	);

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: theme.screen.background }}>
			<ScrollView contentContainerStyle={styles.container}>
				<SettingsList
					iconBgColor={primaryColor}
					leftIcon={
						<MaterialIcons name="refresh" size={24} color={theme.screen.icon} />
					}
					label={translate(TranslationKeys.reset_seen_popup_events)}
					rightIcon={
						<Octicons name="chevron-right" size={24} color={theme.screen.icon} />
					}
					handleFunction={resetSeenEvents}
					groupPosition={'single'}
				/>
				{!kioskMode &&
					popupEvents.map((event: any) => (
						<SettingsList
							iconBgColor={primaryColor}
							key={event.id}
							leftIcon={
								<MaterialIcons name="event" size={24} color={theme.screen.icon} />
							}
							label={
								event.translations
									? getTitleFromTranslation(event.translations, language)
									: event.alias
							}
							rightIcon={
								<Octicons name="chevron-right" size={24} color={theme.screen.icon} />
							}
							handleFunction={() => openSheet(event)}
							groupPosition={'single'}
						/>
					))}
			</ScrollView>
			{isActive && !kioskMode && (
				<BaseBottomSheet
					ref={bottomSheetRef}
					index={-1}
					backgroundStyle={{
						...styles.sheetBackground,
						backgroundColor: theme.sheet.sheetBg,
					}}
					enablePanDownToClose
					handleComponent={null}
					onClose={closeSheet}
				>
					<PopupEventSheet closeSheet={closeSheet} eventData={selectedEvent || {}} />
				</BaseBottomSheet>
			)}
		</SafeAreaView>
	);
};

export default EventsScreen;
