import { configureStore } from '@reduxjs/toolkit';
import hexTileReducer from './hexTileSlice';
import sportTypeReducer from './sportTypeSlice';
import themeReducer from './themeSlice';
import billboardConfigReducer from './billboardConfigSlice';
import hexTextureConfigReducer from './hexTextureConfigSlice';
import gpsIntervalReducer from './gpsIntervalSlice';
import ttsReducer from './ttsSlice';
import speechSettingsReducer from './speechSettingsSlice';
import displaySettingsReducer from './displaySettingsSlice';
import playerInformationReducer from './playerInformationSlice';
import mapSearchReducer from './mapSearchSlice';
import replaySettingsReducer from './replaySettingsSlice';
import { HexTileRecord, saveHexTileState, saveDevHexTileState, saveWalkedEdges, saveDevWalkedEdges, saveWalkedEdgesRedLine, saveDevWalkedEdgesRedLine } from '../helpers/HexTileStorage';
import { saveSportType } from '../helpers/SportTypeStorage';
import { saveThemeMode } from '../helpers/ThemeStorage';
import { BillboardConfigState, saveBillboardConfig } from '../helpers/BillboardConfigStorage';
import { HexTextureConfigState, saveHexTextureConfig } from '../helpers/HexTextureConfigStorage';
import { saveGpsIntervalSeconds } from '../helpers/GpsIntervalStorage';
import { saveTTSEnabled } from '../helpers/TTSStorage';
import { saveSpeechSettings } from '../helpers/SpeechSettingsStorage';
import { saveDisplaySettings } from '../helpers/DisplaySettingsStorage';
import { saveReplaySettings } from '../helpers/ReplaySettingsStorage';
import { PlayerInformation, savePlayerInformation } from '../helpers/PlayerInformationStorage';
import type { SpeechSettingsState } from './speechSettingsSlice';
import type { DisplaySettingsState } from './displaySettingsSlice';
import type { ReplaySettingsState } from './replaySettingsSlice';
import type { SportType } from './sportTypeSlice';
import type { ThemeMode } from './themeSlice';

// ─── Store ────────────────────────────────────────────────────────────────────

export const store = configureStore({
	reducer: {
		hexTiles: hexTileReducer,
		sportType: sportTypeReducer,
		theme: themeReducer,
		billboardConfig: billboardConfigReducer,
		hexTextureConfig: hexTextureConfigReducer,
		gpsInterval: gpsIntervalReducer,
		tts: ttsReducer,
		speechSettings: speechSettingsReducer,
		displaySettings: displaySettingsReducer,
		playerInformation: playerInformationReducer,
		mapSearch: mapSearchReducer,
		replaySettings: replaySettingsReducer,
	},
});

// Auto-persist hex tile state to disk whenever it changes (debounced to avoid
// excessive I/O during rapid consecutive GPS updates).
let _saveTimer: ReturnType<typeof setTimeout> | null = null;
let _lastSavedRecords: Record<string, HexTileRecord> | null = null;
let _walkedEdgesTimer: ReturnType<typeof setTimeout> | null = null;
let _lastSavedWalkedEdges: string[] | null = null;
let _walkedEdgesRedLineTimer: ReturnType<typeof setTimeout> | null = null;
let _lastSavedWalkedEdgesRedLine: string[] | null = null;

// Auto-persist sport type to disk whenever the selected type changes.
let _lastSavedSportType: SportType | null = null;

// Auto-persist theme mode to disk whenever the selected mode changes.
let _lastSavedThemeMode: ThemeMode | null = null;

// Auto-persist billboard config to disk whenever anchor overrides change.
let _bbConfigTimer: ReturnType<typeof setTimeout> | null = null;
let _lastSavedBbConfig: BillboardConfigState | null = null;

// Auto-persist hex texture config to disk whenever anchor overrides change.
let _hexTextureConfigTimer: ReturnType<typeof setTimeout> | null = null;
let _lastSavedHexTextureConfig: HexTextureConfigState | null = null;

// Auto-persist GPS interval seconds to disk whenever it changes.
let _lastSavedGpsIntervalSeconds: number | null = null;

// Auto-persist TTS enabled flag to disk whenever it changes.
let _lastSavedTTSEnabled: boolean | null = null;

// Auto-persist speech settings to disk whenever they change.
let _speechSettingsTimer: ReturnType<typeof setTimeout> | null = null;
let _lastSavedSpeechSettings: SpeechSettingsState | null = null;

// Auto-persist display settings to disk whenever they change.
let _displaySettingsTimer: ReturnType<typeof setTimeout> | null = null;
let _lastSavedDisplaySettings: DisplaySettingsState | null = null;

// Auto-persist replay settings to disk whenever they change.
let _replaySettingsTimer: ReturnType<typeof setTimeout> | null = null;
let _lastSavedReplaySettings: ReplaySettingsState | null = null;

// Auto-persist player information to disk whenever it changes.
let _lastSavedPlayerInformation: PlayerInformation | null = null;

store.subscribe(() => {
	const state = store.getState();

	const { records, isDevMode } = state.hexTiles;
	if (records !== _lastSavedRecords) {
		_lastSavedRecords = records;
		if (_saveTimer) clearTimeout(_saveTimer);
		_saveTimer = setTimeout(() => {
			const currentIsDevMode = store.getState().hexTiles.isDevMode;
			if (currentIsDevMode) {
				saveDevHexTileState(records);
			} else {
				saveHexTileState(records);
			}
			_saveTimer = null;
		}, 500);
	}

	const { walkedEdges } = state.hexTiles;
	if (walkedEdges !== _lastSavedWalkedEdges) {
		_lastSavedWalkedEdges = walkedEdges;
		if (_walkedEdgesTimer) clearTimeout(_walkedEdgesTimer);
		_walkedEdgesTimer = setTimeout(() => {
			const currentIsDevMode = store.getState().hexTiles.isDevMode;
			const currentEdges = store.getState().hexTiles.walkedEdges;
			if (currentIsDevMode) {
				saveDevWalkedEdges(currentEdges);
			} else {
				saveWalkedEdges(currentEdges);
			}
			_walkedEdgesTimer = null;
		}, 500);
	}

	const { walkedEdgesRedLine: currentWalkedEdgesRedLine } = state.hexTiles;
	if (currentWalkedEdgesRedLine !== _lastSavedWalkedEdgesRedLine) {
		_lastSavedWalkedEdgesRedLine = currentWalkedEdgesRedLine;
		if (_walkedEdgesRedLineTimer) clearTimeout(_walkedEdgesRedLineTimer);
		_walkedEdgesRedLineTimer = setTimeout(() => {
			const currentIsDevMode = store.getState().hexTiles.isDevMode;
			const currentEdgesRedLine = store.getState().hexTiles.walkedEdgesRedLine;
			if (currentIsDevMode) {
				saveDevWalkedEdgesRedLine(currentEdgesRedLine);
			} else {
				saveWalkedEdgesRedLine(currentEdgesRedLine);
			}
			_walkedEdgesRedLineTimer = null;
		}, 500);
	}

	const { selectedType } = state.sportType;
	if (selectedType !== _lastSavedSportType) {
		_lastSavedSportType = selectedType;
		saveSportType(selectedType);
	}

	const { selectedMode } = state.theme;
	if (selectedMode !== _lastSavedThemeMode) {
		_lastSavedThemeMode = selectedMode;
		saveThemeMode(selectedMode);
	}

	const { spriteAnchors } = state.billboardConfig;
	if (spriteAnchors !== _lastSavedBbConfig) {
		_lastSavedBbConfig = spriteAnchors;
		if (_bbConfigTimer) clearTimeout(_bbConfigTimer);
		_bbConfigTimer = setTimeout(() => {
			saveBillboardConfig(spriteAnchors);
			_bbConfigTimer = null;
		}, 500);
	}

	const { spriteAnchors: textureAnchors } = state.hexTextureConfig;
	if (textureAnchors !== _lastSavedHexTextureConfig) {
		_lastSavedHexTextureConfig = textureAnchors;
		if (_hexTextureConfigTimer) clearTimeout(_hexTextureConfigTimer);
		_hexTextureConfigTimer = setTimeout(() => {
			saveHexTextureConfig(textureAnchors);
			_hexTextureConfigTimer = null;
		}, 500);
	}

	const { intervalSeconds: gpsSeconds } = state.gpsInterval;
	if (gpsSeconds !== _lastSavedGpsIntervalSeconds) {
		_lastSavedGpsIntervalSeconds = gpsSeconds;
		saveGpsIntervalSeconds(gpsSeconds);
	}

	const { ttsEnabled } = state.tts;
	if (ttsEnabled !== _lastSavedTTSEnabled) {
		_lastSavedTTSEnabled = ttsEnabled;
		saveTTSEnabled(ttsEnabled);
	}

	const speechSettings = state.speechSettings;
	if (speechSettings !== _lastSavedSpeechSettings) {
		_lastSavedSpeechSettings = speechSettings;
		if (_speechSettingsTimer) clearTimeout(_speechSettingsTimer);
		_speechSettingsTimer = setTimeout(() => {
			saveSpeechSettings(speechSettings);
			_speechSettingsTimer = null;
		}, 500);
	}

	const displaySettings = state.displaySettings;
	if (displaySettings !== _lastSavedDisplaySettings) {
		_lastSavedDisplaySettings = displaySettings;
		if (_displaySettingsTimer) clearTimeout(_displaySettingsTimer);
		_displaySettingsTimer = setTimeout(() => {
			saveDisplaySettings(displaySettings);
			_displaySettingsTimer = null;
		}, 500);
	}

	const { homeHexTile } = state.playerInformation;
	if (state.playerInformation !== _lastSavedPlayerInformation) {
		_lastSavedPlayerInformation = state.playerInformation;
		savePlayerInformation({ homeHexTile });
	}

	const replaySettings = state.replaySettings;
	if (replaySettings !== _lastSavedReplaySettings) {
		_lastSavedReplaySettings = replaySettings;
		if (_replaySettingsTimer) clearTimeout(_replaySettingsTimer);
		_replaySettingsTimer = setTimeout(() => {
			saveReplaySettings(replaySettings);
			_replaySettingsTimer = null;
		}, 500);
	}
});

// ─── Type helpers ─────────────────────────────────────────────────────────────

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
