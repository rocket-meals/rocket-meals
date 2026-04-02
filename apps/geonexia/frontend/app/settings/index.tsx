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
import { loadHexTileFeatureCache } from '../../helpers/HexTileFeatureStorage';

const PRIMARY_COLOR = '#2563eb';
const NOTIFICATION_COLOR = '#16a34a';
const NEUTRAL_COLOR = '#6b7280';
const DANGER_COLOR = '#dc2626';
const GPS_COLOR = '#7c3aed';
const TTS_COLOR = '#0369a1';
const DEBUG_COLOR = '#0f766e';
const DEV_COLOR = '#f59e0b';

const THEME_OPTIONS: { id: ThemeMode; label: string; icon: React.ReactNode }[] = [
	{ id: 'light', label: 'Light', icon: <MaterialCommunityIcons name="white-balance-sunny" size={22} color="#ffffff" /> },
	{ id: 'dark', label: 'Dark', icon: <MaterialCommunityIcons name="moon-waning-crescent" size={22} color="#ffffff" /> },
	{ id: 'systematic', label: 'System', icon: <MaterialCommunityIcons name="theme-light-dark" size={22} color="#ffffff" /> },
];

const GPS_INTERVAL_OPTIONS: { id: GpsIntervalMode; label: string; icon: React.ReactNode }[] = [
	{ id: 'default', label: 'Standard (1s)', icon: <MaterialCommunityIcons name="crosshairs-gps" size={22} color="#ffffff" /> },
	{ id: 'energy_saving', label: 'Energie sparen (4s)', icon: <MaterialCommunityIcons name="battery-heart-outline" size={22} color="#ffffff" /> },
	{ id: 'high_precision', label: 'Hohe Präzision (0.5s)', icon: <MaterialCommunityIcons name="radar" size={22} color="#ffffff" /> },
];

function gpsIntervalModeLabel(mode: GpsIntervalMode): string {
	switch (mode) {
		case 'default': return 'Standard (1s)';
		case 'energy_saving': return 'Energie sparen (4s)';
		case 'high_precision': return 'Hohe Präzision (0.5s)';
	}
}

function themeModeLabel(mode: ThemeMode): string {
	switch (mode) {
		case 'light': return 'Light';
		case 'dark': return 'Dark';
		case 'systematic': return 'System';
	}
}

// ─── Reset Confirm Content ────────────────────────────────────────────────────

function ResetConfirmContent({
	onConfirm,
	onCancel,
	theme,
}: {
	onConfirm: () => void;
	onCancel: () => void;
	theme: ReturnType<typeof useTheme>['theme'];
}) {
	return (
		<View style={styles.resetConfirmContainer}>
			<Text style={[styles.resetConfirmText, { color: theme.screen.text }]}>
				All activities and hex tile progress will be permanently deleted. This action cannot be undone.
			</Text>
			<TouchableOpacity
				style={[styles.resetConfirmButton, { backgroundColor: DANGER_COLOR }]}
				onPress={onConfirm}
				activeOpacity={0.8}
			>
				<MaterialIcons name="delete-forever" size={18} color="#ffffff" />
				<Text style={styles.resetConfirmButtonText}>Reset All Data</Text>
			</TouchableOpacity>
			<TouchableOpacity style={styles.resetCancelButton} onPress={onCancel} activeOpacity={0.8}>
				<Text style={[styles.resetCancelButtonText, { color: theme.screen.text }]}>Cancel</Text>
			</TouchableOpacity>
		</View>
	);
}

// ─── Settings Screen ──────────────────────────────────────────────────────────

export default function SettingsScreen() {
	const [notifications, setNotifications] = useState(true);
	const [showDeveloper, setShowDeveloper] = useState(false);
	const { theme } = useTheme();
	const dispatch = useDispatch<AppDispatch>();
	const selectedTheme = useSelector((state: RootState) => state.theme.selectedMode);
	const selectedGpsInterval = useSelector((state: RootState) => state.gpsInterval.selectedMode);
	const isTTSEnabled = useSelector((state: RootState) => state.tts.ttsEnabled);
	const speechEnabled = useSelector((state: RootState) => state.speechSettings.enabled);
	const isDebugMode = useSelector((state: RootState) => state.hexTiles.isDebugMode);
	const isDevMode = useSelector((state: RootState) => state.hexTiles.isDevMode);
	const hexTileRecords = useSelector((state: RootState) => state.hexTiles.records);
	const walkedEdges = useSelector((state: RootState) => state.hexTiles.walkedEdges);
	const { show: showModal, close: closeModal } = useMyScrollViewModal();
	const { show: showResetModal, close: closeResetModal } = useMyScrollViewModal();
	const { show: showGpsModal, close: closeGpsModal } = useMyScrollViewModal();
	const { show: showSpeechModal } = useMyScrollViewModal();
	const { show: showWorldStoreModal } = useMyScrollViewModal();
	const { show: showFeatureCacheModal } = useMyScrollViewModal();

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

	const handleOpenGpsIntervalSelection = useCallback(() => {
		showGpsModal({
			title: '📡 GPS Frequency',
			children: (
				<SettingsListSelectOption
					options={GPS_INTERVAL_OPTIONS}
					selectedOption={selectedGpsInterval}
					onSelect={(option) => {
						dispatch(setGpsIntervalMode(option.id));
						closeGpsModal();
					}}
					iconBgColor={PRIMARY_COLOR}
				/>
			),
		});
	}, [showGpsModal, closeGpsModal, dispatch, selectedGpsInterval]);

	const handleResetAllData = useCallback(() => {
		showResetModal({
			title: '⚠️ Reset All Data',
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
				/>
			),
		});
	}, [showResetModal, closeResetModal, dispatch, theme]);

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
			title: '🔊 Sprachansagen',
			children: <SpeechSettingsContent />,
		});
	}, [showSpeechModal]);

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

	const handleShowWorldStore = useCallback(() => {
		const worldStoreData = {
			totalTiles: Object.keys(hexTileRecords).length,
			walkedEdges: walkedEdges.length,
			records: hexTileRecords,
		};
		showWorldStoreModal({
			title: '🌍 World Store',
			children: (
				<View style={{ paddingBottom: 24, paddingHorizontal: 12 }}>
					<Text style={{ color: theme.screen.text, fontSize: 11, fontFamily: 'monospace' }} selectable>
						{JSON.stringify(worldStoreData, null, 2)}
					</Text>
				</View>
			),
		});
	}, [showWorldStoreModal, hexTileRecords, walkedEdges, theme]);

	const handleShowFeatureCache = useCallback(async () => {
		const cache = await loadHexTileFeatureCache();
		const cacheInfo = {
			totalEntries: Object.keys(cache).length,
			cache,
		};
		showFeatureCacheModal({
			title: '🗺️ Hex Tile Feature Cache',
			children: (
				<View style={{ paddingBottom: 24, paddingHorizontal: 12 }}>
					<Text style={{ color: theme.screen.text, fontSize: 11, fontFamily: 'monospace' }} selectable>
						{JSON.stringify(cacheInfo, null, 2)}
					</Text>
				</View>
			),
		});
	}, [showFeatureCacheModal, theme]);

	return (
		<View style={[styles.container, { backgroundColor: theme.screen.background }]}>
			<ScrollView contentContainerStyle={styles.listContent}>
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

			<SettingsListGroupTitle title="GPS" />
			<SettingsList
				iconBgColor={PRIMARY_COLOR}
				leftIcon={<MaterialCommunityIcons name="crosshairs-gps" size={22} color="#ffffff" />}
				label="GPS Frequency"
				value={gpsIntervalModeLabel(selectedGpsInterval)}
				rightIcon={<Ionicons name="chevron-forward" size={20} color="#9ca3af" />}
				handleFunction={handleOpenGpsIntervalSelection}
				groupPosition="single"
			/>

			<SettingsListGroupTitle title="Audio" />
			<SettingsList
				iconBgColor={PRIMARY_COLOR}
				leftIcon={<MaterialCommunityIcons name="account-voice" size={22} color="#ffffff" />}
				label="Sprachansagen"
				value={speechEnabled ? 'Aktiviert' : 'Deaktiviert'}
				rightIcon={<Ionicons name="chevron-forward" size={20} color="#9ca3af" />}
				handleFunction={handleOpenSpeechSettings}
				groupPosition="single"
			/>

				<SettingsListGroupTitle title="Notifications" />
				<SettingsListBoolean
					iconBgColor={PRIMARY_COLOR}
					leftIcon={<Ionicons name="notifications-outline" size={22} color="#ffffff" />}
					label="Push Notifications"
					isEnabled={notifications}
					onToggle={() => setNotifications((prev) => !prev)}
					valueActive="Enabled"
					valueInactive="Disabled"
					groupPosition="single"
				/>

				<SettingsListGroupTitle title="Daten Verwaltung" />
				<SettingsList
					iconBgColor={DANGER_COLOR}
					leftIcon={<MaterialIcons name="delete-forever" size={22} color="#ffffff" />}
					label="Alle Daten zurücksetzen"
					rightIcon={<Ionicons name="chevron-forward" size={20} color="#9ca3af" />}
					handleFunction={handleResetAllData}
					groupPosition="single"
				/>

				<SettingsListGroupTitle title="About" />
				<SettingsList
					iconBgColor={PRIMARY_COLOR}
					leftIcon={<Feather name="info" size={22} color="#ffffff" />}
					label="App Version"
					value={appVersion}
					groupPosition="top"
				/>
				<SettingsList
					iconBgColor={PRIMARY_COLOR}
					leftIcon={<Feather name="code" size={22} color="#ffffff" />}
					label="Open Source"
					value="View licenses"
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
						source={require('../../assets/company.png')}
						style={styles.companyLogo}
						resizeMode="contain"
					/>
				</TouchableOpacity>

				{/* ── Developer (hidden by default, revealed by logo tap) ── */}
				{showDeveloper && (
					<>
						<SettingsListGroupTitle title="Developer" />
						<SettingsListBoolean
							iconBgColor={DEBUG_COLOR}
							leftIcon={<MaterialIcons name="bug-report" size={22} color="#ffffff" />}
							label="Debug Mode"
							isEnabled={isDebugMode}
							onToggle={handleToggleDebugMode}
							valueActive="Enabled"
							valueInactive="Disabled"
							groupPosition="top"
						/>
						<SettingsListBoolean
							iconBgColor={DEV_COLOR}
							leftIcon={<Ionicons name="flask-outline" size={22} color="#ffffff" />}
							label="Dev Mode"
							isEnabled={isDevMode}
							onToggle={handleToggleDevMode}
							valueActive="Dev tiles active"
							valueInactive="Production tiles"
							groupPosition="middle"
						/>
						<SettingsList
							iconBgColor={DEBUG_COLOR}
							leftIcon={<MaterialIcons name="hexagon" size={22} color="#ffffff" />}
							label="World Store (Hex Tiles)"
							value={Object.keys(hexTileRecords).length + ' tiles'}
							rightIcon={<Ionicons name="chevron-forward" size={20} color="#9ca3af" />}
							handleFunction={handleShowWorldStore}
							groupPosition="middle"
						/>
						<SettingsList
							iconBgColor={DEBUG_COLOR}
							leftIcon={<MaterialIcons name="map" size={22} color="#ffffff" />}
							label="Hex Tile Feature Cache"
							rightIcon={<Ionicons name="chevron-forward" size={20} color="#9ca3af" />}
							handleFunction={handleShowFeatureCache}
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
});
