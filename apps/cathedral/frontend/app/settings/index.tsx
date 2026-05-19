import React, { useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import {
	SettingsList,
	SettingsListGroupTitle,
	SettingsListSelectOption,
	useMyScrollViewModal,
	useTheme,
} from 'repo-depkit-common-ui';
import Constants from 'expo-constants';
import { useDispatch, useSelector } from 'react-redux';
import { setThemeMode } from '../../store/themeSlice';
import type { ThemeMode } from '../../store/themeSlice';
import type { AppDispatch, RootState } from '../../store/store';

const PRIMARY_COLOR = '#7c3aed';

const THEME_OPTIONS: { id: ThemeMode; label: string; icon: React.ReactNode }[] = [
	{ id: 'light', label: 'Light', icon: <MaterialCommunityIcons name="white-balance-sunny" size={22} color="#ffffff" /> },
	{ id: 'dark', label: 'Dark', icon: <MaterialCommunityIcons name="moon-waning-crescent" size={22} color="#ffffff" /> },
	{ id: 'systematic', label: 'System', icon: <MaterialCommunityIcons name="theme-light-dark" size={22} color="#ffffff" /> },
];

function themeModeLabel(mode: ThemeMode): string {
	switch (mode) {
		case 'light': return 'Light';
		case 'dark': return 'Dark';
		case 'systematic': return 'System';
	}
}

export default function SettingsScreen() {
	const { theme } = useTheme();
	const insets = useSafeAreaInsets();
	const dispatch = useDispatch<AppDispatch>();
	const selectedTheme = useSelector((state: RootState) => state.theme.selectedMode);
	const { show: showModal, close: closeModal } = useMyScrollViewModal();

	const appVersion = Constants.expoConfig?.version ?? '1.0.0';

	const handleOpenThemeSelection = useCallback(() => {
		showModal({
			title: '🎨 Theme',
			children: (
				<SettingsListSelectOption
					options={THEME_OPTIONS}
					selectedOption={selectedTheme}
					onSelect={(option) => {
						dispatch(setThemeMode(option.id));
						closeModal();
					}}
					iconBgColor={PRIMARY_COLOR}
				/>
			),
		});
	}, [showModal, closeModal, dispatch, selectedTheme]);

	return (
		<View style={[styles.container, { backgroundColor: theme.screen.background }]}>
			<ScrollView contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 32, paddingLeft: insets.left, paddingRight: insets.right }]}>
				<SettingsListGroupTitle title="Appearance" />
				<SettingsList
					iconBgColor={PRIMARY_COLOR}
					leftIcon={
						<MaterialCommunityIcons name="theme-light-dark" size={22} color="#ffffff" />
					}
					label="Theme"
					value={themeModeLabel(selectedTheme)}
					rightIcon={<Ionicons name="chevron-forward" size={20} color="#9ca3af" />}
					handleFunction={handleOpenThemeSelection}
					groupPosition="single"
				/>

				<SettingsListGroupTitle title="About" />
				<SettingsList
					iconBgColor="#6b7280"
					leftIcon={
						<Ionicons name="information-circle-outline" size={22} color="#ffffff" />
					}
					label="Version"
					value={appVersion}
					groupPosition="single"
				/>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	listContent: {
	},
});
