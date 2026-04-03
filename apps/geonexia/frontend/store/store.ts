import { configureStore } from '@reduxjs/toolkit';
import hexTileReducer from './hexTileSlice';
import sportTypeReducer from './sportTypeSlice';
import themeReducer from './themeSlice';
import billboardConfigReducer from './billboardConfigSlice';
import gpsIntervalReducer from './gpsIntervalSlice';
import ttsReducer from './ttsSlice';
import speechSettingsReducer from './speechSettingsSlice';
import displaySettingsReducer from './displaySettingsSlice';
import languageReducer from './languageSlice';
import { HexTileRecord, saveHexTileState, saveDevHexTileState, saveWalkedEdges, saveDevWalkedEdges } from '../helpers/HexTileStorage';
import { saveSportType } from '../helpers/SportTypeStorage';
import { saveThemeMode } from '../helpers/ThemeStorage';
import { BillboardConfigState, saveBillboardConfig } from '../helpers/BillboardConfigStorage';
import { saveGpsIntervalMode } from '../helpers/GpsIntervalStorage';
import { saveTTSEnabled } from '../helpers/TTSStorage';
import { saveSpeechSettings } from '../helpers/SpeechSettingsStorage';
import { saveDisplaySettings } from '../helpers/DisplaySettingsStorage';
import { saveLanguage } from '../helpers/LanguageStorage';
import { setCurrentLanguage } from '../hooks/useTranslation';
import type { SpeechSettingsState } from './speechSettingsSlice';
import type { DisplaySettingsState } from './displaySettingsSlice';
import type { SportType } from './sportTypeSlice';
import type { ThemeMode } from './themeSlice';
import type { GpsIntervalMode } from './gpsIntervalSlice';
import type { SupportedLanguage } from '../helpers/LanguageStorage';

// ─── Store ────────────────────────────────────────────────────────────────────

export const store = configureStore({
	reducer: {
		hexTiles: hexTileReducer,
		sportType: sportTypeReducer,
		theme: themeReducer,
		billboardConfig: billboardConfigReducer,
		gpsInterval: gpsIntervalReducer,
		tts: ttsReducer,
		speechSettings: speechSettingsReducer,
		displaySettings: displaySettingsReducer,
		language: languageReducer,
	},
});

// Auto-persist hex tile state to disk whenever it changes (debounced to avoid
// excessive I/O during rapid consecutive GPS updates).
let _saveTimer: ReturnType<typeof setTimeout> | null = null;
let _lastSavedRecords: Record<string, HexTileRecord> | null = null;
let _walkedEdgesTimer: ReturnType<typeof setTimeout> | null = null;
let _lastSavedWalkedEdges: string[] | null = null;

// Auto-persist sport type to disk whenever the selected type changes.
let _lastSavedSportType: SportType | null = null;

// Auto-persist theme mode to disk whenever the selected mode changes.
let _lastSavedThemeMode: ThemeMode | null = null;

// Auto-persist billboard config to disk whenever anchor overrides change.
let _bbConfigTimer: ReturnType<typeof setTimeout> | null = null;
let _lastSavedBbConfig: BillboardConfigState | null = null;

// Auto-persist GPS interval mode to disk whenever it changes.
let _lastSavedGpsIntervalMode: GpsIntervalMode | null = null;

// Auto-persist TTS enabled flag to disk whenever it changes.
let _lastSavedTTSEnabled: boolean | null = null;

// Auto-persist speech settings to disk whenever they change.
let _speechSettingsTimer: ReturnType<typeof setTimeout> | null = null;
let _lastSavedSpeechSettings: SpeechSettingsState | null = null;

// Auto-persist display settings to disk whenever they change.
let _displaySettingsTimer: ReturnType<typeof setTimeout> | null = null;
let _lastSavedDisplaySettings: DisplaySettingsState | null = null;

// Auto-persist language to disk whenever it changes.
let _lastSavedLanguage: SupportedLanguage | null = null;

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

	const { selectedMode: gpsMode } = state.gpsInterval;
	if (gpsMode !== _lastSavedGpsIntervalMode) {
		_lastSavedGpsIntervalMode = gpsMode;
		saveGpsIntervalMode(gpsMode);
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

	const { selectedLanguage } = state.language;
	if (selectedLanguage !== _lastSavedLanguage) {
		_lastSavedLanguage = selectedLanguage;
		saveLanguage(selectedLanguage);
		setCurrentLanguage(selectedLanguage);
	}
});

// ─── Type helpers ─────────────────────────────────────────────────────────────

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
