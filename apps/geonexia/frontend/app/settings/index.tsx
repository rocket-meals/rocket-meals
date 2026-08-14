import React, { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather, MaterialIcons } from '@expo/vector-icons';
import {
	LicenseInformation,
	getLicensesFromExtra,
	SettingsList,
	SettingsListBoolean,
	SettingsListGroupTitle,
	SettingsListNumberInput,
	SettingsListSelectOption,
	SettingsListMyMapThemeSelection,
	SettingsListSqliteStorage,
	useMyScrollViewModal,
	useTheme,
} from 'repo-depkit-common-ui';
import Constants from 'expo-constants';
import { useDispatch, useSelector } from 'react-redux';

import { deleteAllActivities, getEffectiveEnclosedHexTiles, loadActivities, saveActivity, SavedActivity } from '../../helpers/ActivityStorage';
import { loadRoutes } from '../../helpers/RouteStorage';
import { isAvailable as isH3Available } from '../../helpers/H3Helper';
import {
	computeActivityData,
	findEnclosedCellsFromHexTiles,
	buildFullRouteTileIds,
	H3_RESOLUTION_FALLBACK,
	rebuildMapFromActivities,
	applyRouteBenches,
	hasForestFeature,
	BILLBOARD_PINE_TREE_LARGE,
	BILLBOARD_PINE_TREE_SMALL,
	getSmallTreeAnchorForHexId,
} from '../../helpers/ActivityMapRebuildHelper';
import { loadHexTileFeatureCache, mergeHexTileFeatureCache, HexTileFeatureCache } from '../../helpers/HexTileFeatureStorage';
import { loadPersistedState, setDebugMode, setDevMode, loadWalkedEdgesState, loadWalkedEdgesRedLineState, setBillboardAtAnchor } from '../../store/hexTileSlice';
import { queryTileFeaturesForHexCell } from '../../helpers/TileFeatureHelper';
import { setThemeMode } from '../../store/themeSlice';
import type { ThemeMode } from '../../store/themeSlice';
import { setGpsIntervalSeconds } from '../../store/gpsIntervalSlice';
import SpeechSettingsContent from '../../components/SpeechSettingsModal';
import AdvancedSettingsContent from '../../components/AdvancedSettingsContent';
import type { RouteSmoothingLevel } from '../../helpers/RouteSmootherHelper';
import { AppDispatch, RootState, store } from '../../store/store';
import { updateDisplaySettings } from '../../store/displaySettingsSlice';
import {
	BillboardAnchorPosition,
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
	saveWalkedEdgesRedLine,
	saveDevWalkedEdgesRedLine,
	loadWalkedEdgesRedLine,
	loadDevWalkedEdgesRedLine,
} from '../../helpers/HexTileStorage';
import { getCompanyLogoLocalSaved, getVersionInternalForAppsettingsScreen } from '../../config';
import { loadTTSLog, clearTTSLog, type TTSLogEntry } from '../../helpers/TTSLogStorage';
import useGeonexiaAlert from '../../hooks/useGeonexiaAlert';

const PRIMARY_COLOR = '#2563eb';
const NOTIFICATION_COLOR = '#16a34a';
const NEUTRAL_COLOR = '#6b7280';
const DANGER_COLOR = '#dc2626';
const GPS_COLOR = '#7c3aed';
const TTS_COLOR = '#0369a1';
const DEBUG_COLOR = '#0f766e';
const DEV_COLOR = '#f59e0b';
const MAP_COLOR = '#0891b2';
const REBUILD_COLOR = '#7c3aed';

const OPACITY_STEP = 0.05;
const OPACITY_MIN = 0.0;
const OPACITY_MAX = 1.0;

const LINE_WIDTH_STEP = 0.25;
const LINE_WIDTH_MIN = 0.0;
const LINE_WIDTH_MAX = 3.0;

const THEME_OPTIONS: { id: ThemeMode; label: string; icon: React.ReactNode }[] = [
	{ id: 'light', label: 'Light', icon: <MaterialCommunityIcons name="white-balance-sunny" size={22} color="#ffffff" /> },
	{ id: 'dark', label: 'Dark', icon: <MaterialCommunityIcons name="moon-waning-crescent" size={22} color="#ffffff" /> },
	{ id: 'systematic', label: 'System', icon: <MaterialCommunityIcons name="theme-light-dark" size={22} color="#ffffff" /> },
];

const GPS_PRESET_SECONDS = new Set([1, 5, 15]);

const GPS_PRESET_OPTIONS: { id: number; label: string; icon: React.ReactNode }[] = [
	{ id: 1, label: '1s', icon: <MaterialCommunityIcons name="crosshairs-gps" size={22} color="#ffffff" /> },
	{ id: 5, label: '5s', icon: <MaterialCommunityIcons name="timer-outline" size={22} color="#ffffff" /> },
	{ id: 15, label: '15s', icon: <MaterialCommunityIcons name="battery-heart-outline" size={22} color="#ffffff" /> },
];

function gpsIntervalLabel(seconds: number): string {
	if (GPS_PRESET_SECONDS.has(seconds)) return `${seconds}s`;
	return `Custom (${seconds}s)`;
}

function routeSmoothingLabel(level: RouteSmoothingLevel): string {
	switch (level) {
		case 'off': return 'Standard';
		case 'light': return 'Glättung: Leicht';
		case 'strong': return 'Glättung: Stark';
	}
}

function themeModeLabel(mode: ThemeMode): string {
	switch (mode) {
		case 'light': return 'Light';
		case 'dark': return 'Dark';
		case 'systematic': return 'System';
	}
}

// ─── GPS Interval Content ─────────────────────────────────────────────────────

function GpsIntervalContent({
	selectedSeconds,
	onSelect,
}: Readonly<{
	selectedSeconds: number;
	onSelect: (seconds: number) => void;
}>) {
	const isPreset = GPS_PRESET_SECONDS.has(selectedSeconds);

	return (
		<>
			<SettingsListSelectOption
				options={GPS_PRESET_OPTIONS}
				selectedOption={isPreset ? selectedSeconds : -1}
				onSelect={(opt) => onSelect(opt.id)}
				iconBgColor={GPS_COLOR}
			/>
			<SettingsListNumberInput
				leftIcon={<MaterialCommunityIcons name="pencil-outline" size={22} color="#ffffff" />}
				iconBgColor={GPS_COLOR}
				label="Custom"
				value={!isPreset ? `${selectedSeconds}s` : undefined}
				groupPosition="single"
				modalTitle="📡 Custom GPS Frequenz"
				placeholder="z.B. 5 oder 2,5"
				saveLabel="Bestätigen"
				initialValue={isPreset ? 1 : selectedSeconds}
				min={0.1}
				allowDecimal
				suffix="s"
				primaryColor={GPS_COLOR}
				onSave={onSelect}
			/>
		</>
	);
}

// ─── Reset Confirm Content ────────────────────────────────────────────────────

function ResetConfirmContent({
	onConfirm,
	onCancel,
	theme,
}: Readonly<{
	onConfirm: () => void;
	onCancel: () => void;
	theme: ReturnType<typeof useTheme>['theme'];
}>) {
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

// ─── TTS Log Content ──────────────────────────────────────────────────────────

function TTSLogContent({
	theme,
	onClear,
}: Readonly<{
	theme: ReturnType<typeof useTheme>['theme'];
	onClear: () => void;
}>) {
	const [entries, setEntries] = useState<TTSLogEntry[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadTTSLog().then((log) => {
			setEntries(log.slice().reverse()); // newest first
			setLoading(false);
		});
	}, []);

	const handleClear = useCallback(() => {
		clearTTSLog();
		setEntries([]);
		onClear();
	}, [onClear]);

	if (loading) {
		return <Text style={{ color: theme.screen.text, padding: 16 }}>Loading…</Text>;
	}

	return (
		<View style={styles.ttsLogContainer}>
			<TouchableOpacity
				style={[styles.resetConfirmButton, { backgroundColor: DANGER_COLOR }]}
				onPress={handleClear}
				activeOpacity={0.8}
			>
				<MaterialIcons name="delete-sweep" size={18} color="#ffffff" />
				<Text style={styles.resetConfirmButtonText}>Clear Log ({entries.length})</Text>
			</TouchableOpacity>

			{entries.length === 0 ? (
				<Text style={[styles.ttsLogEmpty, { color: theme.screen.text }]}>
					No TTS log entries yet.
				</Text>
			) : (
				entries.map((entry, idx) => {
					const date = new Date(entry.timestamp);
					const timeStr = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
					return (
						<View
							key={`${entry.timestamp}-${idx}`}
							style={[
								styles.ttsLogEntry,
								{ borderColor: entry.success ? '#16a34a40' : '#dc262640' },
							]}
						>
							<View style={styles.ttsLogHeader}>
								<Text style={[styles.ttsLogSource, { color: entry.success ? '#16a34a' : DANGER_COLOR }]}>
									{entry.success ? '✓' : '✗'} {entry.source}
								</Text>
								<Text style={[styles.ttsLogTime, { color: theme.screen.text }]}>{timeStr}</Text>
							</View>
							<Text style={[styles.ttsLogText, { color: theme.screen.text }]} numberOfLines={3}>
								{entry.text}
							</Text>
							{entry.error ? (
								<Text style={[styles.ttsLogError, { color: DANGER_COLOR }]} numberOfLines={2}>
									Error: {entry.error}
								</Text>
							) : null}
						</View>
					);
				})
			)}
		</View>
	);
}

// Fire-and-forget: fetch features for enclosed tiles that are not yet in the
// feature cache, then apply forest trees.
async function applyForestBillboardsForUncachedTiles(records: Record<string, any>, hexTileFeatureCache: HexTileFeatureCache, dispatch: AppDispatch) {
	try {
		const tilesWithoutCache = Object.entries(records)
			.filter(([hexId, rec]) =>
				rec.enclosedCount > 0 &&
				!rec.walkedOn &&
				!hexTileFeatureCache[hexId],
			)
			.map(([hexId]) => hexId);
		if (tilesWithoutCache.length === 0) return;
		const newEntries: HexTileFeatureCache = {};
		for (const hexId of tilesWithoutCache) {
			try {
				const features = await queryTileFeaturesForHexCell(hexId);
				newEntries[hexId] = features;
				if (hasForestFeature(features)) {
					dispatch(setBillboardAtAnchor({
						h3Index: hexId,
						anchorColor: BillboardAnchorPosition.CENTER,
						billboard: BILLBOARD_PINE_TREE_LARGE,
					}));
					// Also place the small tree at a MIDDLE ring position,
					// matching the full checkAndApplyForest behaviour.
					dispatch(setBillboardAtAnchor({
						h3Index: hexId,
						anchorColor: getSmallTreeAnchorForHexId(hexId),
						billboard: BILLBOARD_PINE_TREE_SMALL,
					}));
				}
			} catch {
				// ignore per-cell errors
			}
		}
		await mergeHexTileFeatureCache(newEntries);
	} catch (err) {
		console.warn('[Rebuild] Feature cache update failed:', err);
	}
}

/**
 * Migrate a single saved activity so it has up-to-date `computed` enclosed-tile
 * data, deriving it from the recorded route when missing, and persist the
 * activity if anything changed. Mutates `activity` in place (matching the
 * existing migration behaviour) and saves it via `saveActivity`.
 */
async function migrateActivityEnclosedTiles(activity: SavedActivity): Promise<void> {
	let updated = false;
	let enclosedTiles: string[] =
		activity.computed?.enclosedHexTiles ??
		getEffectiveEnclosedHexTiles(activity);
	if (enclosedTiles.length === 0 && activity.hexTilesOrdered?.length) {
		const h3Res = activity.h3Resolution ?? H3_RESOLUTION_FALLBACK;
		enclosedTiles = findEnclosedCellsFromHexTiles(
			buildFullRouteTileIds(activity.hexTilesOrdered, activity.routePoints, h3Res),
			h3Res,
		);
	}
	if (!activity.computed) {
		activity.computed = computeActivityData(activity, enclosedTiles);
		activity.enclosedTileCount ??= enclosedTiles.length;
		updated = true;
	} else if (
		!Array.isArray(activity.computed.enclosedHexTiles) ||
		(activity.computed.enclosedHexTiles.length === 0 && enclosedTiles.length > 0)
	) {
		activity.computed = { ...activity.computed, enclosedHexTiles: enclosedTiles };
		activity.enclosedTileCount ??= enclosedTiles.length;
		updated = true;
	}
	if (updated) {
		try {
			await saveActivity(activity);
		} catch (err) {
			console.warn('[Rebuild] Failed to save migrated activity:', activity.id, err);
		}
	}
}

// ─── Settings Screen ──────────────────────────────────────────────────────────

export default function SettingsScreen() {
	const [notifications, setNotifications] = useState(true);
	const [showDeveloper, setShowDeveloper] = useState(false);
	const { theme } = useTheme();
	const dispatch = useDispatch<AppDispatch>();
	const selectedTheme = useSelector((state: RootState) => state.theme.selectedMode);
	const selectedGpsInterval = useSelector((state: RootState) => state.gpsInterval.intervalSeconds);
	const speechEnabled = useSelector((state: RootState) => state.speechSettings.enabled);
	const isDebugMode = useSelector((state: RootState) => state.hexTiles.isDebugMode);
	const isDevMode = useSelector((state: RootState) => state.hexTiles.isDevMode);
	const hexTextureOpacity = useSelector((state: RootState) => state.displaySettings.hexTextureOpacity);
	const hexTextureAdaptionOpacity = useSelector((state: RootState) => state.displaySettings.hexTextureAdaptionOpacity);
	const hexObjectOpacity = useSelector((state: RootState) => state.displaySettings.hexObjectOpacity);
	const selectedMapTheme = useSelector((state: RootState) => state.displaySettings.mapTheme);
	const hexLineOpacity = useSelector((state: RootState) => state.displaySettings.hexLineOpacity);
	const hexLineWidth = useSelector((state: RootState) => state.displaySettings.hexLineWidth);
	const routeSmoothingLevel = useSelector((state: RootState) => state.displaySettings.routeSmoothingLevel);
	const { show: showModal, close: closeModal } = useMyScrollViewModal();
	const { show: showResetModal, close: closeResetModal } = useMyScrollViewModal();
	const { show: showGpsModal, close: closeGpsModal } = useMyScrollViewModal();
	const { show: showSpeechModal } = useMyScrollViewModal();
	const { show: showTTSLogModal, close: closeTTSLogModal } = useMyScrollViewModal();
	const { show: showAdvancedModal } = useMyScrollViewModal();
	const { show: showLicensesModal } = useMyScrollViewModal();
	const { showAlert } = useGeonexiaAlert();

	// Version straight from the JS bundle (config.ts), NOT from
	// Constants.expoConfig: the latter reflects the natively embedded manifest,
	// so OTA updates (which only bump the patch version) would never show up
	// and users could not verify they are running the latest update.
	const appVersion = getVersionInternalForAppsettingsScreen();
	const licenses = getLicensesFromExtra(Constants.expoConfig?.extra);

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
			title: '📡 GPS Frequenz',
			children: (
				<GpsIntervalContent
					selectedSeconds={selectedGpsInterval}
					onSelect={(seconds) => {
						dispatch(setGpsIntervalSeconds(seconds));
						closeGpsModal();
					}}
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
						dispatch(loadWalkedEdgesRedLineState([]));
						saveWalkedEdges([]);
						saveWalkedEdgesRedLine([]);
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

	const handleOpenSpeechSettings = useCallback(() => {
		showSpeechModal({
			title: '🔊 Sprachansagen',
			children: <SpeechSettingsContent />,
		});
	}, [showSpeechModal]);

	const handleOpenTTSLog = useCallback(() => {
		showTTSLogModal({
			title: '📋 TTS Log',
			children: <TTSLogContent theme={theme} onClear={closeTTSLogModal} />,
		});
	}, [showTTSLogModal, closeTTSLogModal, theme]);

	const handleOpenLicenses = useCallback(() => {
		showLicensesModal({
			title: '📦 Open Source Licenses',
			children: <LicenseInformation packages={licenses} linkColor={PRIMARY_COLOR} />,
		});
	}, [showLicensesModal]);

	const handleOpenAdvancedSettings = useCallback(() => {
		showAdvancedModal({
			title: '⚙️ Erweiterte Einstellungen',
			children: <AdvancedSettingsContent />,
		});
	}, [showAdvancedModal]);

	const handleToggleDevMode = useCallback(async () => {
		const { records: currentRecords, isDevMode: currentIsDevMode, walkedEdges: currentEdges, walkedEdgesRedLine: currentEdgesRedLine } = store.getState().hexTiles;
		if (currentIsDevMode) {
			saveDevHexTileState(currentRecords);
			saveDevWalkedEdges(currentEdges);
			saveDevWalkedEdgesRedLine(currentEdgesRedLine);
			const [prodRecords, prodEdges, prodEdgesRedLine] = await Promise.all([loadHexTileState(), loadWalkedEdges(), loadWalkedEdgesRedLine()]);
			saveDevModeFlag(false);
			dispatch(setDevMode({ isDevMode: false, records: prodRecords, walkedEdges: prodEdges, walkedEdgesRedLine: prodEdgesRedLine }));
		} else {
			saveHexTileState(currentRecords);
			saveWalkedEdges(currentEdges);
			saveWalkedEdgesRedLine(currentEdgesRedLine);
			const [devRecords, devEdges, devEdgesRedLine] = await Promise.all([loadDevHexTileState(), loadDevWalkedEdges(), loadDevWalkedEdgesRedLine()]);
			saveDevModeFlag(true);
			dispatch(setDevMode({ isDevMode: true, records: devRecords, walkedEdges: devEdges, walkedEdgesRedLine: devEdgesRedLine }));
		}
	}, [dispatch]);

	const handleHexTextureOpacityDown = useCallback(() => {
		const next = Math.max(OPACITY_MIN, Math.round((hexTextureOpacity - OPACITY_STEP) * 100) / 100);
		dispatch(updateDisplaySettings({ hexTextureOpacity: next }));
	}, [dispatch, hexTextureOpacity]);

	const handleHexTextureOpacityUp = useCallback(() => {
		const next = Math.min(OPACITY_MAX, Math.round((hexTextureOpacity + OPACITY_STEP) * 100) / 100);
		dispatch(updateDisplaySettings({ hexTextureOpacity: next }));
	}, [dispatch, hexTextureOpacity]);

	const handleHexTextureAdaptionOpacityDown = useCallback(() => {
		const next = Math.max(OPACITY_MIN, Math.round((hexTextureAdaptionOpacity - OPACITY_STEP) * 100) / 100);
		dispatch(updateDisplaySettings({ hexTextureAdaptionOpacity: next }));
	}, [dispatch, hexTextureAdaptionOpacity]);

	const handleHexTextureAdaptionOpacityUp = useCallback(() => {
		const next = Math.min(OPACITY_MAX, Math.round((hexTextureAdaptionOpacity + OPACITY_STEP) * 100) / 100);
		dispatch(updateDisplaySettings({ hexTextureAdaptionOpacity: next }));
	}, [dispatch, hexTextureAdaptionOpacity]);

	const handleHexObjectOpacityDown = useCallback(() => {
		const next = Math.max(OPACITY_MIN, Math.round((hexObjectOpacity - OPACITY_STEP) * 100) / 100);
		dispatch(updateDisplaySettings({ hexObjectOpacity: next }));
	}, [dispatch, hexObjectOpacity]);

	const handleHexObjectOpacityUp = useCallback(() => {
		const next = Math.min(OPACITY_MAX, Math.round((hexObjectOpacity + OPACITY_STEP) * 100) / 100);
		dispatch(updateDisplaySettings({ hexObjectOpacity: next }));
	}, [dispatch, hexObjectOpacity]);

	const handleHexLineOpacityDown = useCallback(() => {
		const next = Math.max(OPACITY_MIN, Math.round((hexLineOpacity - OPACITY_STEP) * 100) / 100);
		dispatch(updateDisplaySettings({ hexLineOpacity: next }));
	}, [dispatch, hexLineOpacity]);

	const handleHexLineOpacityUp = useCallback(() => {
		const next = Math.min(OPACITY_MAX, Math.round((hexLineOpacity + OPACITY_STEP) * 100) / 100);
		dispatch(updateDisplaySettings({ hexLineOpacity: next }));
	}, [dispatch, hexLineOpacity]);

	const handleHexLineWidthDown = useCallback(() => {
		const next = Math.max(LINE_WIDTH_MIN, Math.round((hexLineWidth - LINE_WIDTH_STEP) * 100) / 100);
		dispatch(updateDisplaySettings({ hexLineWidth: next }));
	}, [dispatch, hexLineWidth]);

	const handleHexLineWidthUp = useCallback(() => {
		const next = Math.min(LINE_WIDTH_MAX, Math.round((hexLineWidth + LINE_WIDTH_STEP) * 100) / 100);
		dispatch(updateDisplaySettings({ hexLineWidth: next }));
	}, [dispatch, hexLineWidth]);

	const handleRecalculateAllComputedValues = useCallback(() => {
		showAlert(
			'Berechnete Werte neu berechnen',
			'Die berechneten Werte aller Aktivitäten werden neu berechnet. Fortfahren?',
			[
				{ text: 'Abbrechen', style: 'cancel' },
				{
					text: 'Neu berechnen',
					onPress: async () => {
						if (!isH3Available()) {
							showAlert('Nicht verfügbar', 'H3 Bibliothek ist auf diesem Gerät nicht verfügbar.');
							return;
						}
						const allActivities = await loadActivities();
						if (allActivities.length === 0) {
							showAlert('Keine Aktivitäten', 'Es sind keine Aktivitäten vorhanden.');
							return;
						}
						let updatedCount = 0;
						for (const activity of allActivities) {
							let enclosedTiles: string[] =
								activity.computed?.enclosedHexTiles ??
								getEffectiveEnclosedHexTiles(activity);
							if (enclosedTiles.length === 0 && activity.hexTilesOrdered?.length) {
								const h3Res = activity.h3Resolution ?? H3_RESOLUTION_FALLBACK;
								enclosedTiles = findEnclosedCellsFromHexTiles(
									buildFullRouteTileIds(activity.hexTilesOrdered, activity.routePoints, h3Res),
									h3Res,
								);
							}
							const newComputed = computeActivityData(activity, enclosedTiles);
							try {
								await saveActivity({ ...activity, computed: newComputed });
								updatedCount++;
							} catch (err) {
								console.warn('[Recalculate] Failed to save activity:', activity.id, err);
							}
						}
						showAlert('Fertig', `${updatedCount} ${updatedCount === 1 ? 'Aktivität' : 'Aktivitäten'} neu berechnet.`);
					},
				},
			],
		);
	}, []);

	const handleRebuildWorld = useCallback(() => {
		showAlert(
			'Welt neu aufbauen',
			'Die Karte wird aus allen gespeicherten Aktivitäten neu berechnet. Alle Karten-Anpassungen (einschließlich manuell gesetzter Felder) werden zurückgesetzt. Fortfahren?',
			[
				{ text: 'Abbrechen', style: 'cancel' },
				{
					text: 'Neu aufbauen',
					style: 'destructive',
					onPress: async () => {
						if (!isH3Available()) {
							showAlert('Nicht verfügbar', 'H3 Bibliothek ist auf diesem Gerät nicht verfügbar.');
							return;
						}
						const allActivities = await loadActivities();
						if (allActivities.length === 0) {
							showAlert('Keine Aktivitäten', 'Es sind keine Aktivitäten vorhanden.');
							return;
						}

						for (const activity of allActivities) {
							await migrateActivityEnclosedTiles(activity);
						}

						const sorted = [...allActivities].sort((a, b) => a.startedAt - b.startedAt);
						const hexTileFeatureCache = await loadHexTileFeatureCache();
						const homeHexTile = store.getState().playerInformation.homeHexTile;
						const { records, walkedEdges, walkedEdgesRedLine } = rebuildMapFromActivities(sorted, hexTileFeatureCache, homeHexTile);
						const routes = await loadRoutes();
						applyRouteBenches(records, sorted, routes);
						dispatch(loadPersistedState(records));
						dispatch(loadWalkedEdgesState(walkedEdges));
						dispatch(loadWalkedEdgesRedLineState(walkedEdgesRedLine));

						void applyForestBillboardsForUncachedTiles(records, hexTileFeatureCache, dispatch);

						const count = allActivities.length;
						showAlert('Welt neu aufgebaut', `Karte aus ${count} ${count === 1 ? 'Aktivität' : 'Aktivitäten'} neu aufgebaut.`);
					},
				},
			],
		);
	}, [dispatch]);

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
				iconBgColor={GPS_COLOR}
				leftIcon={<MaterialCommunityIcons name="crosshairs-gps" size={22} color="#ffffff" />}
				label="GPS Frequenz"
				value={gpsIntervalLabel(selectedGpsInterval)}
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
				groupPosition="top"
			/>
			<SettingsList
				iconBgColor={TTS_COLOR}
				leftIcon={<MaterialIcons name="article" size={22} color="#ffffff" />}
				label="TTS Log"
				value="View speech logs"
				rightIcon={<Ionicons name="chevron-forward" size={20} color="#9ca3af" />}
				handleFunction={handleOpenTTSLog}
				groupPosition="bottom"
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

				<SettingsListGroupTitle title="Karten-Darstellung" />
				<SettingsList
					iconBgColor={MAP_COLOR}
					leftIcon={<MaterialCommunityIcons name="image-filter-hdr" size={22} color="#ffffff" />}
					label="Hex Texture Deckkraft"
					value={`${Math.round(hexTextureOpacity * 100)}%`}
					rightElement={
						<View style={styles.stepper}>
							<TouchableOpacity style={styles.stepBtn} onPress={handleHexTextureOpacityDown} activeOpacity={0.7}>
								<Ionicons name="remove" size={18} color={MAP_COLOR} />
							</TouchableOpacity>
							<TouchableOpacity style={styles.stepBtn} onPress={handleHexTextureOpacityUp} activeOpacity={0.7}>
								<Ionicons name="add" size={18} color={MAP_COLOR} />
							</TouchableOpacity>
						</View>
					}
					groupPosition="top"
				/>
				<SettingsList
					iconBgColor={MAP_COLOR}
					leftIcon={<MaterialCommunityIcons name="image-multiple-outline" size={22} color="#ffffff" />}
					label="Hex Texture Adaption Deckkraft"
					value={`${Math.round(hexTextureAdaptionOpacity * 100)}%`}
					rightElement={
						<View style={styles.stepper}>
							<TouchableOpacity style={styles.stepBtn} onPress={handleHexTextureAdaptionOpacityDown} activeOpacity={0.7}>
								<Ionicons name="remove" size={18} color={MAP_COLOR} />
							</TouchableOpacity>
							<TouchableOpacity style={styles.stepBtn} onPress={handleHexTextureAdaptionOpacityUp} activeOpacity={0.7}>
								<Ionicons name="add" size={18} color={MAP_COLOR} />
							</TouchableOpacity>
						</View>
					}
					groupPosition="middle"
				/>
				<SettingsList
					iconBgColor={MAP_COLOR}
					leftIcon={<MaterialCommunityIcons name="cube-outline" size={22} color="#ffffff" />}
					label="Hex Object Deckkraft"
					value={`${Math.round(hexObjectOpacity * 100)}%`}
					rightElement={
						<View style={styles.stepper}>
							<TouchableOpacity style={styles.stepBtn} onPress={handleHexObjectOpacityDown} activeOpacity={0.7}>
								<Ionicons name="remove" size={18} color={MAP_COLOR} />
							</TouchableOpacity>
							<TouchableOpacity style={styles.stepBtn} onPress={handleHexObjectOpacityUp} activeOpacity={0.7}>
								<Ionicons name="add" size={18} color={MAP_COLOR} />
							</TouchableOpacity>
						</View>
					}
					groupPosition="middle"
				/>
				<SettingsList
					iconBgColor={MAP_COLOR}
					leftIcon={<MaterialCommunityIcons name="hexagon-slice-1" size={22} color="#ffffff" />}
					label="Hex-Linien Deckkraft"
					value={`${Math.round(hexLineOpacity * 100)}%`}
					rightElement={
						<View style={styles.stepper}>
							<TouchableOpacity style={styles.stepBtn} onPress={handleHexLineOpacityDown} activeOpacity={0.7}>
								<Ionicons name="remove" size={18} color={MAP_COLOR} />
							</TouchableOpacity>
							<TouchableOpacity style={styles.stepBtn} onPress={handleHexLineOpacityUp} activeOpacity={0.7}>
								<Ionicons name="add" size={18} color={MAP_COLOR} />
							</TouchableOpacity>
						</View>
					}
					groupPosition="middle"
				/>
				<SettingsList
					iconBgColor={MAP_COLOR}
					leftIcon={<MaterialCommunityIcons name="hexagon-slice-3" size={22} color="#ffffff" />}
					label="Hex-Linien Stärke"
					value={`${hexLineWidth.toFixed(2)}x`}
					rightElement={
						<View style={styles.stepper}>
							<TouchableOpacity style={styles.stepBtn} onPress={handleHexLineWidthDown} activeOpacity={0.7}>
								<Ionicons name="remove" size={18} color={MAP_COLOR} />
							</TouchableOpacity>
							<TouchableOpacity style={styles.stepBtn} onPress={handleHexLineWidthUp} activeOpacity={0.7}>
								<Ionicons name="add" size={18} color={MAP_COLOR} />
							</TouchableOpacity>
						</View>
					}
					groupPosition="bottom"
				/>

				<SettingsListGroupTitle title="Karten Theme" />
				<SettingsListMyMapThemeSelection
					selectedMapStyleKey={selectedMapTheme}
					onMapStyleKeyChange={(key) => dispatch(updateDisplaySettings({ mapTheme: key }))}
					accentColor={MAP_COLOR}
					iconBgColor={MAP_COLOR}
					leftIcon={<MaterialCommunityIcons name="map-outline" size={22} color="#ffffff" />}
					label="Karten Material"
					modalTitle="🗺️ Karten Material"
					groupPosition="single"
				/>

				<SettingsListGroupTitle title="Erweiterte Einstellungen" />
				<SettingsList
					iconBgColor={MAP_COLOR}
					leftIcon={<MaterialIcons name="tune" size={22} color="#ffffff" />}
					label="Erweiterte Einstellungen"
					value={routeSmoothingLabel(routeSmoothingLevel)}
					rightIcon={<Ionicons name="chevron-forward" size={20} color="#9ca3af" />}
					handleFunction={handleOpenAdvancedSettings}
					groupPosition="single"
				/>

				<SettingsListGroupTitle title="Daten Verwaltung" />
				<SettingsList
					iconBgColor={REBUILD_COLOR}
					leftIcon={<MaterialIcons name="calculate" size={22} color="#ffffff" />}
					label="Berechnete Werte neu berechnen"
					rightIcon={<Ionicons name="chevron-forward" size={20} color="#9ca3af" />}
					handleFunction={handleRecalculateAllComputedValues}
					groupPosition="top"
				/>
				<SettingsList
					iconBgColor={REBUILD_COLOR}
					leftIcon={<MaterialIcons name="refresh" size={22} color="#ffffff" />}
					label="Welt neu aufbauen"
					rightIcon={<Ionicons name="chevron-forward" size={20} color="#9ca3af" />}
					handleFunction={handleRebuildWorld}
					groupPosition="middle"
				/>
				<SettingsList
					iconBgColor={DANGER_COLOR}
					leftIcon={<MaterialIcons name="delete-forever" size={22} color="#ffffff" />}
					label="Alle Daten zurücksetzen"
					rightIcon={<Ionicons name="chevron-forward" size={20} color="#9ca3af" />}
					handleFunction={handleResetAllData}
					groupPosition="bottom"
				/>

				<SettingsListGroupTitle title="Speicher" />
				<SettingsListSqliteStorage
					iconBgColor={NEUTRAL_COLOR}
					iconColor="#ffffff"
					textColor={theme.screen.text}
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
					value={`${licenses.length} licenses`}
					rightIcon={<Ionicons name="chevron-forward" size={20} color="#9ca3af" />}
					handleFunction={handleOpenLicenses}
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
	confirmButtonText: {
		color: '#ffffff',
		fontSize: 15,
		fontWeight: '600',
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
	ttsLogContainer: {
		paddingTop: 8,
		gap: 8,
	},
	ttsLogEmpty: {
		fontSize: 14,
		textAlign: 'center',
		paddingVertical: 24,
		opacity: 0.5,
	},
	ttsLogEntry: {
		borderWidth: 1,
		borderRadius: 8,
		padding: 10,
		gap: 4,
	},
	ttsLogHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	ttsLogSource: {
		fontSize: 13,
		fontWeight: '600',
	},
	ttsLogTime: {
		fontSize: 11,
		opacity: 0.6,
	},
	ttsLogText: {
		fontSize: 13,
		lineHeight: 18,
	},
	ttsLogError: {
		fontSize: 12,
		fontStyle: 'italic',
	},
});
