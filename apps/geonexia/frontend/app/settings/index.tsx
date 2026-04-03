import React, { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather, MaterialIcons } from '@expo/vector-icons';
import {
	SettingsList,
	SettingsListBoolean,
	SettingsListGroupTitle,
	SettingsListSelectOption,
	useMyScrollViewModal,
	useTheme,
} from 'repo-depkit-common-ui';
import Constants from 'expo-constants';
import { useDispatch, useSelector } from 'react-redux';

import { deleteAllActivities } from '../../helpers/ActivityStorage';
import { loadPersistedState, setDebugMode, setDevMode, loadWalkedEdgesState } from '../../store/hexTileSlice';
import { setThemeMode } from '../../store/themeSlice';
import type { ThemeMode } from '../../store/themeSlice';
import { setGpsIntervalMode } from '../../store/gpsIntervalSlice';
import type { GpsIntervalMode } from '../../store/gpsIntervalSlice';
import { setTTSEnabled } from '../../store/ttsSlice';
import SpeechSettingsContent from '../../components/SpeechSettingsModal';
import { AppDispatch, RootState, store } from '../../store/store';
import { updateDisplaySettings } from '../../store/displaySettingsSlice';
import {
	saveDebugModeFlag,
	saveDevModeFlag,
	saveHexTileState,
	saveDevHexTileState,
	loadHexTileState,
	loadDevHexTileState,
	saveWalkedEdges,
	saveDevWalkedEdges,
	loadWalkedEdges,
	loadDevWalkedEdges,
} from '../../helpers/HexTileStorage';
import { getCompanyLogoLocalSaved } from '../../config';
import { useTranslation } from '../../hooks/useTranslation';
import { GeonexiaTranslationKeys } from '../../locales/keys';

const PRIMARY_COLOR = '#2563eb';
const NOTIFICATION_COLOR = '#16a34a';
const NEUTRAL_COLOR = '#6b7280';
const DANGER_COLOR = '#dc2626';
const GPS_COLOR = '#7c3aed';
const TTS_COLOR = '#0369a1';
const DEBUG_COLOR = '#0f766e';
const DEV_COLOR = '#f59e0b';
const MAP_COLOR = '#0891b2';

const OPACITY_STEP = 0.05;
const OPACITY_MIN = 0.05;
const OPACITY_MAX = 1.0;

// ─── Reset Confirm Content ────────────────────────────────────────────────────

function ResetConfirmContent({
	onConfirm,
	onCancel,
	theme,
	translate,
}: {
	onConfirm: () => void;
	onCancel: () => void;
	theme: ReturnType<typeof useTheme>['theme'];
	translate: (key: GeonexiaTranslationKeys) => string;
}) {
	return (
		<View style={styles.resetConfirmContainer}>
			<Text style={[styles.resetConfirmText, { color: theme.screen.text }]}>
				{translate(GeonexiaTranslationKeys.settings_reset_confirm_message)}
			</Text>
			<TouchableOpacity
				style={[styles.resetConfirmButton, { backgroundColor: DANGER_COLOR }]}
				onPress={onConfirm}
				activeOpacity={0.8}
			>
				<MaterialIcons name="delete-forever" size={18} color="#ffffff" />
				<Text style={styles.resetConfirmButtonText}>{translate(GeonexiaTranslationKeys.settings_reset_all_data_confirm)}</Text>
			</TouchableOpacity>
			<TouchableOpacity style={styles.resetCancelButton} onPress={onCancel} activeOpacity={0.8}>
				<Text style={[styles.resetCancelButtonText, { color: theme.screen.text }]}>{translate(GeonexiaTranslationKeys.cancel)}</Text>
			</TouchableOpacity>
		</View>
	);
}

// ─── Settings Screen ──────────────────────────────────────────────────────────

export default function SettingsScreen() {
	const [notifications, setNotifications] = useState(true);
	const [showDeveloper, setShowDeveloper] = useState(false);
	const { theme } = useTheme();
	const { translate } = useTranslation();
	const dispatch = useDispatch<AppDispatch>();
	const selectedTheme = useSelector((state: RootState) => state.theme.selectedMode);
	const selectedGpsInterval = useSelector((state: RootState) => state.gpsInterval.selectedMode);
	const isTTSEnabled = useSelector((state: RootState) => state.tts.ttsEnabled);
	const speechEnabled = useSelector((state: RootState) => state.speechSettings.enabled);
	const isDebugMode = useSelector((state: RootState) => state.hexTiles.isDebugMode);
	const isDevMode = useSelector((state: RootState) => state.hexTiles.isDevMode);
	const hexTileOpacity = useSelector((state: RootState) => state.displaySettings.hexTileOpacity);
	const objectOpacity = useSelector((state: RootState) => state.displaySettings.objectOpacity);
	const { show: showModal, close: closeModal } = useMyScrollViewModal();
	const { show: showResetModal, close: closeResetModal } = useMyScrollViewModal();
	const { show: showGpsModal, close: closeGpsModal } = useMyScrollViewModal();
	const { show: showSpeechModal } = useMyScrollViewModal();

	const appVersion = Constants.expoConfig?.version ?? '1.0.0';

	const themeOptions: { id: ThemeMode; label: string; icon: React.ReactNode }[] = [
		{ id: 'light', label: translate(GeonexiaTranslationKeys.theme_light), icon: <MaterialCommunityIcons name="white-balance-sunny" size={22} color="#ffffff" /> },
		{ id: 'dark', label: translate(GeonexiaTranslationKeys.theme_dark), icon: <MaterialCommunityIcons name="moon-waning-crescent" size={22} color="#ffffff" /> },
		{ id: 'systematic', label: translate(GeonexiaTranslationKeys.theme_system), icon: <MaterialCommunityIcons name="theme-light-dark" size={22} color="#ffffff" /> },
	];

	const gpsIntervalOptions: { id: GpsIntervalMode; label: string; icon: React.ReactNode }[] = [
		{ id: 'default', label: translate(GeonexiaTranslationKeys.gps_interval_default), icon: <MaterialCommunityIcons name="crosshairs-gps" size={22} color="#ffffff" /> },
		{ id: 'energy_saving', label: translate(GeonexiaTranslationKeys.gps_interval_energy_saving), icon: <MaterialCommunityIcons name="battery-heart-outline" size={22} color="#ffffff" /> },
		{ id: 'high_precision', label: translate(GeonexiaTranslationKeys.gps_interval_high_precision), icon: <MaterialCommunityIcons name="radar" size={22} color="#ffffff" /> },
	];

	function gpsIntervalModeLabel(mode: GpsIntervalMode): string {
		switch (mode) {
			case 'default': return translate(GeonexiaTranslationKeys.gps_interval_default);
			case 'energy_saving': return translate(GeonexiaTranslationKeys.gps_interval_energy_saving);
			case 'high_precision': return translate(GeonexiaTranslationKeys.gps_interval_high_precision);
		}
	}

	function themeModeLabel(mode: ThemeMode): string {
		switch (mode) {
			case 'light': return translate(GeonexiaTranslationKeys.theme_light);
			case 'dark': return translate(GeonexiaTranslationKeys.theme_dark);
			case 'systematic': return translate(GeonexiaTranslationKeys.theme_system);
		}
	}

	const handleOpenThemeSelection = useCallback(() => {
		showModal({
			title: translate(GeonexiaTranslationKeys.settings_theme_modal_title),
			children: (
				<SettingsListSelectOption
					options={themeOptions}
					selectedOption={selectedTheme}
					onSelect={(option) => {
						dispatch(setThemeMode(option.id));
						closeModal();
					}}
					iconBgColor={PRIMARY_COLOR}
				/>
			),
		});
	}, [showModal, closeModal, dispatch, selectedTheme, translate, themeOptions]);

	const handleOpenGpsIntervalSelection = useCallback(() => {
		showGpsModal({
			title: translate(GeonexiaTranslationKeys.settings_gps_modal_title),
			children: (
				<SettingsListSelectOption
					options={gpsIntervalOptions}
					selectedOption={selectedGpsInterval}
					onSelect={(option) => {
						dispatch(setGpsIntervalMode(option.id));
						closeGpsModal();
					}}
					iconBgColor={PRIMARY_COLOR}
				/>
			),
		});
	}, [showGpsModal, closeGpsModal, dispatch, selectedGpsInterval, translate, gpsIntervalOptions]);

	const handleResetAllData = useCallback(() => {
		showResetModal({
			title: translate(GeonexiaTranslationKeys.settings_reset_modal_title),
			children: (
				<ResetConfirmContent
					onConfirm={() => {
						deleteAllActivities();
						dispatch(loadPersistedState({}));
						dispatch(loadWalkedEdgesState([]));
						saveWalkedEdges([]);
						closeResetModal();
					}}
					onCancel={closeResetModal}
					theme={theme}
					translate={translate}
				/>
			),
		});
	}, [showResetModal, closeResetModal, dispatch, theme, translate]);

	const handleToggleDebugMode = useCallback(() => {
		const next = !isDebugMode;
		dispatch(setDebugMode(next));
		saveDebugModeFlag(next);
	}, [dispatch, isDebugMode]);

	const handleToggleTTS = useCallback(() => {
		dispatch(setTTSEnabled(!isTTSEnabled));
	}, [dispatch, isTTSEnabled]);

	const handleOpenSpeechSettings = useCallback(() => {
		showSpeechModal({
			title: translate(GeonexiaTranslationKeys.settings_speech_modal_title),
			children: <SpeechSettingsContent />,
		});
	}, [showSpeechModal, translate]);

	const handleToggleDevMode = useCallback(async () => {
		const { records: currentRecords, isDevMode: currentIsDevMode, walkedEdges: currentEdges } = store.getState().hexTiles;
		if (currentIsDevMode) {
			saveDevHexTileState(currentRecords);
			saveDevWalkedEdges(currentEdges);
			const [prodRecords, prodEdges] = await Promise.all([loadHexTileState(), loadWalkedEdges()]);
			saveDevModeFlag(false);
			dispatch(setDevMode({ isDevMode: false, records: prodRecords, walkedEdges: prodEdges }));
		} else {
			saveHexTileState(currentRecords);
			saveWalkedEdges(currentEdges);
			const [devRecords, devEdges] = await Promise.all([loadDevHexTileState(), loadDevWalkedEdges()]);
			saveDevModeFlag(true);
			dispatch(setDevMode({ isDevMode: true, records: devRecords, walkedEdges: devEdges }));
		}
	}, [dispatch]);

	const handleHexTileOpacityDown = useCallback(() => {
		const next = Math.max(OPACITY_MIN, Math.round((hexTileOpacity - OPACITY_STEP) * 100) / 100);
		dispatch(updateDisplaySettings({ hexTileOpacity: next }));
	}, [dispatch, hexTileOpacity]);

	const handleHexTileOpacityUp = useCallback(() => {
		const next = Math.min(OPACITY_MAX, Math.round((hexTileOpacity + OPACITY_STEP) * 100) / 100);
		dispatch(updateDisplaySettings({ hexTileOpacity: next }));
	}, [dispatch, hexTileOpacity]);

	const handleObjectOpacityDown = useCallback(() => {
		const next = Math.max(OPACITY_MIN, Math.round((objectOpacity - OPACITY_STEP) * 100) / 100);
		dispatch(updateDisplaySettings({ objectOpacity: next }));
	}, [dispatch, objectOpacity]);

	const handleObjectOpacityUp = useCallback(() => {
		const next = Math.min(OPACITY_MAX, Math.round((objectOpacity + OPACITY_STEP) * 100) / 100);
		dispatch(updateDisplaySettings({ objectOpacity: next }));
	}, [dispatch, objectOpacity]);

	return (
		<View style={[styles.container, { backgroundColor: theme.screen.background }]}>
			<ScrollView contentContainerStyle={styles.listContent}>
				<SettingsListGroupTitle title={translate(GeonexiaTranslationKeys.settings_group_appearance)} />
			<SettingsList
				iconBgColor={PRIMARY_COLOR}
				leftIcon={
					<MaterialCommunityIcons name="theme-light-dark" size={22} color="#ffffff" />
				}
				label={translate(GeonexiaTranslationKeys.settings_theme)}
				value={themeModeLabel(selectedTheme)}
				rightIcon={<Ionicons name="chevron-forward" size={20} color="#9ca3af" />}
				handleFunction={handleOpenThemeSelection}
				groupPosition="single"
			/>

			<SettingsListGroupTitle title={translate(GeonexiaTranslationKeys.settings_group_gps)} />
			<SettingsList
				iconBgColor={PRIMARY_COLOR}
				leftIcon={<MaterialCommunityIcons name="crosshairs-gps" size={22} color="#ffffff" />}
				label={translate(GeonexiaTranslationKeys.settings_gps_frequency)}
				value={gpsIntervalModeLabel(selectedGpsInterval)}
				rightIcon={<Ionicons name="chevron-forward" size={20} color="#9ca3af" />}
				handleFunction={handleOpenGpsIntervalSelection}
				groupPosition="single"
			/>

			<SettingsListGroupTitle title={translate(GeonexiaTranslationKeys.settings_group_audio)} />
			<SettingsList
				iconBgColor={PRIMARY_COLOR}
				leftIcon={<MaterialCommunityIcons name="account-voice" size={22} color="#ffffff" />}
				label={translate(GeonexiaTranslationKeys.settings_speech_announcements)}
				value={speechEnabled ? translate(GeonexiaTranslationKeys.enabled) : translate(GeonexiaTranslationKeys.disabled)}
				rightIcon={<Ionicons name="chevron-forward" size={20} color="#9ca3af" />}
				handleFunction={handleOpenSpeechSettings}
				groupPosition="single"
			/>

				<SettingsListGroupTitle title={translate(GeonexiaTranslationKeys.settings_group_notifications)} />
				<SettingsListBoolean
					iconBgColor={PRIMARY_COLOR}
					leftIcon={<Ionicons name="notifications-outline" size={22} color="#ffffff" />}
					label={translate(GeonexiaTranslationKeys.settings_push_notifications)}
					isEnabled={notifications}
					onToggle={() => setNotifications((prev) => !prev)}
					valueActive={translate(GeonexiaTranslationKeys.enabled)}
					valueInactive={translate(GeonexiaTranslationKeys.disabled)}
					groupPosition="single"
				/>

				<SettingsListGroupTitle title={translate(GeonexiaTranslationKeys.settings_group_map_display)} />
				<SettingsList
					iconBgColor={MAP_COLOR}
					leftIcon={<MaterialCommunityIcons name="hexagon-outline" size={22} color="#ffffff" />}
					label={translate(GeonexiaTranslationKeys.settings_hex_tile_opacity)}
					value={`${Math.round(hexTileOpacity * 100)}%`}
					rightElement={
						<View style={styles.stepper}>
							<TouchableOpacity style={styles.stepBtn} onPress={handleHexTileOpacityDown} activeOpacity={0.7}>
								<Ionicons name="remove" size={18} color={MAP_COLOR} />
							</TouchableOpacity>
							<TouchableOpacity style={styles.stepBtn} onPress={handleHexTileOpacityUp} activeOpacity={0.7}>
								<Ionicons name="add" size={18} color={MAP_COLOR} />
							</TouchableOpacity>
						</View>
					}
					groupPosition="top"
				/>
				<SettingsList
					iconBgColor={MAP_COLOR}
					leftIcon={<MaterialCommunityIcons name="image-outline" size={22} color="#ffffff" />}
					label={translate(GeonexiaTranslationKeys.settings_object_opacity)}
					value={`${Math.round(objectOpacity * 100)}%`}
					rightElement={
						<View style={styles.stepper}>
							<TouchableOpacity style={styles.stepBtn} onPress={handleObjectOpacityDown} activeOpacity={0.7}>
								<Ionicons name="remove" size={18} color={MAP_COLOR} />
							</TouchableOpacity>
							<TouchableOpacity style={styles.stepBtn} onPress={handleObjectOpacityUp} activeOpacity={0.7}>
								<Ionicons name="add" size={18} color={MAP_COLOR} />
							</TouchableOpacity>
						</View>
					}
					groupPosition="bottom"
				/>

				<SettingsListGroupTitle title={translate(GeonexiaTranslationKeys.settings_group_data_management)} />
				<SettingsList
					iconBgColor={DANGER_COLOR}
					leftIcon={<MaterialIcons name="delete-forever" size={22} color="#ffffff" />}
					label={translate(GeonexiaTranslationKeys.settings_reset_all_data)}
					rightIcon={<Ionicons name="chevron-forward" size={20} color="#9ca3af" />}
					handleFunction={handleResetAllData}
					groupPosition="single"
				/>

				<SettingsListGroupTitle title={translate(GeonexiaTranslationKeys.settings_group_about)} />
				<SettingsList
					iconBgColor={PRIMARY_COLOR}
					leftIcon={<Feather name="info" size={22} color="#ffffff" />}
					label={translate(GeonexiaTranslationKeys.settings_app_version)}
					value={appVersion}
					groupPosition="top"
				/>
				<SettingsList
					iconBgColor={PRIMARY_COLOR}
					leftIcon={<Feather name="code" size={22} color="#ffffff" />}
					label={translate(GeonexiaTranslationKeys.settings_open_source)}
					value={translate(GeonexiaTranslationKeys.settings_view_licenses)}
					rightIcon={<Ionicons name="chevron-forward" size={20} color="#9ca3af" />}
					handleFunction={() => {}}
					groupPosition="bottom"
				/>

				{/* ── Company Logo ─────────────────────────────────────── */}
				<TouchableOpacity
					style={styles.companyLogoContainer}
					onPress={() => setShowDeveloper((prev) => !prev)}
					activeOpacity={0.7}
				>
					<Image
						source={getCompanyLogoLocalSaved()}
						style={styles.companyLogo}
						resizeMode="contain"
					/>
				</TouchableOpacity>

				{/* ── Developer (hidden by default, revealed by logo tap) ── */}
				{showDeveloper && (
					<>
						<SettingsListGroupTitle title={translate(GeonexiaTranslationKeys.settings_group_developer)} />
						<SettingsListBoolean
							iconBgColor={DEBUG_COLOR}
							leftIcon={<MaterialIcons name="bug-report" size={22} color="#ffffff" />}
							label={translate(GeonexiaTranslationKeys.settings_debug_mode)}
							isEnabled={isDebugMode}
							onToggle={handleToggleDebugMode}
							valueActive={translate(GeonexiaTranslationKeys.enabled)}
							valueInactive={translate(GeonexiaTranslationKeys.disabled)}
							groupPosition="top"
						/>
						<SettingsListBoolean
							iconBgColor={DEV_COLOR}
							leftIcon={<Ionicons name="flask-outline" size={22} color="#ffffff" />}
							label={translate(GeonexiaTranslationKeys.settings_dev_mode)}
							isEnabled={isDevMode}
							onToggle={handleToggleDevMode}
							valueActive={translate(GeonexiaTranslationKeys.dev_tiles_active)}
							valueInactive={translate(GeonexiaTranslationKeys.production_tiles)}
							groupPosition="bottom"
						/>
					</>
				)}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f3f4f6',
	},
	listContent: {
		paddingVertical: 16,
	},
	resetConfirmContainer: {
		paddingTop: 8,
		gap: 4,
	},
	resetConfirmText: {
		fontSize: 15,
		lineHeight: 22,
		marginBottom: 8,
	},
	resetConfirmButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
		borderRadius: 10,
		gap: 8,
	},
	resetConfirmButtonText: {
		color: '#ffffff',
		fontSize: 15,
		fontWeight: '600',
	},
	resetCancelButton: {
		alignItems: 'center',
		paddingVertical: 12,
		borderRadius: 10,
	},
	resetCancelButtonText: {
		fontSize: 15,
		fontWeight: '500',
	},
	companyLogoContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 24,
		marginTop: 8,
	},
	companyLogo: {
		width: 120,
		height: 120,
		opacity: 0.6,
	},
	stepper: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	stepBtn: {
		padding: 6,
	},
});
