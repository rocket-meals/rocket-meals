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

// Generic ref shapes used by the persistence helpers below. Keeping the
// mutable timer/last-saved-value pair together lets each helper receive it
// as an explicit parameter instead of closing over module-local `let`s.
type DebounceRef<T> = { timer: ReturnType<typeof setTimeout> | null; lastSaved: T | null };
type ImmediateRef<T> = { lastSaved: T | null };

// Persists `value` immediately (no debounce) the first time it differs from
// the last-saved value.
function persistImmediate<T>(value: T, ref: ImmediateRef<T>, save: (value: T) => void): void {
	if (value !== ref.lastSaved) {
		ref.lastSaved = value;
		save(value);
	}
}

// Persists `value` after a debounce delay, resetting the pending timer on
// every change so only the trailing value within the delay window is saved.
function persistDebounced<T>(value: T, ref: DebounceRef<T>, save: (value: T) => void, delay = 500): void {
	if (value !== ref.lastSaved) {
		ref.lastSaved = value;
		if (ref.timer) clearTimeout(ref.timer);
		ref.timer = setTimeout(() => {
			save(value);
			ref.timer = null;
		}, delay);
	}
}

// Persists hex tile records, choosing the dev/non-dev storage target based on
// the freshest isDevMode value at the time the debounce fires (not at the
// time the change was detected).
function persistHexTileRecords(records: Record<string, HexTileRecord>, ref: DebounceRef<Record<string, HexTileRecord>>): void {
	if (records !== ref.lastSaved) {
		ref.lastSaved = records;
		if (ref.timer) clearTimeout(ref.timer);
		ref.timer = setTimeout(() => {
			const currentIsDevMode = store.getState().hexTiles.isDevMode;
			if (currentIsDevMode) {
				saveDevHexTileState(records);
			} else {
				saveHexTileState(records);
			}
			ref.timer = null;
		}, 500);
	}
}

// Persists walked edges, re-reading both isDevMode and the current edges from
// the store when the debounce fires so the freshest values are saved.
function persistWalkedEdges(walkedEdges: string[], ref: DebounceRef<string[]>): void {
	if (walkedEdges !== ref.lastSaved) {
		ref.lastSaved = walkedEdges;
		if (ref.timer) clearTimeout(ref.timer);
		ref.timer = setTimeout(() => {
			const currentIsDevMode = store.getState().hexTiles.isDevMode;
			const currentEdges = store.getState().hexTiles.walkedEdges;
			if (currentIsDevMode) {
				saveDevWalkedEdges(currentEdges);
			} else {
				saveWalkedEdges(currentEdges);
			}
			ref.timer = null;
		}, 500);
	}
}

// Same as persistWalkedEdges but for the red-line walked edges variant.
function persistWalkedEdgesRedLine(walkedEdgesRedLine: string[], ref: DebounceRef<string[]>): void {
	if (walkedEdgesRedLine !== ref.lastSaved) {
		ref.lastSaved = walkedEdgesRedLine;
		if (ref.timer) clearTimeout(ref.timer);
		ref.timer = setTimeout(() => {
			const currentIsDevMode = store.getState().hexTiles.isDevMode;
			const currentEdgesRedLine = store.getState().hexTiles.walkedEdgesRedLine;
			if (currentIsDevMode) {
				saveDevWalkedEdgesRedLine(currentEdgesRedLine);
			} else {
				saveWalkedEdgesRedLine(currentEdgesRedLine);
			}
			ref.timer = null;
		}, 500);
	}
}

const hexTileRecordsRef: DebounceRef<Record<string, HexTileRecord>> = { timer: null, lastSaved: null };
const walkedEdgesRef: DebounceRef<string[]> = { timer: null, lastSaved: null };
const walkedEdgesRedLineRef: DebounceRef<string[]> = { timer: null, lastSaved: null };

// Auto-persist sport type to disk whenever the selected type changes.
const sportTypeRef: ImmediateRef<SportType> = { lastSaved: null };

// Auto-persist theme mode to disk whenever the selected mode changes.
const themeModeRef: ImmediateRef<ThemeMode> = { lastSaved: null };

// Auto-persist billboard config to disk whenever anchor overrides change.
const billboardConfigRef: DebounceRef<BillboardConfigState> = { timer: null, lastSaved: null };

// Auto-persist hex texture config to disk whenever anchor overrides change.
const hexTextureConfigRef: DebounceRef<HexTextureConfigState> = { timer: null, lastSaved: null };

// Auto-persist GPS interval seconds to disk whenever it changes.
const gpsIntervalRef: ImmediateRef<number> = { lastSaved: null };

// Auto-persist TTS enabled flag to disk whenever it changes.
const ttsEnabledRef: ImmediateRef<boolean> = { lastSaved: null };

// Auto-persist speech settings to disk whenever they change.
const speechSettingsRef: DebounceRef<SpeechSettingsState> = { timer: null, lastSaved: null };

// Auto-persist display settings to disk whenever they change.
const displaySettingsRef: DebounceRef<DisplaySettingsState> = { timer: null, lastSaved: null };

// Auto-persist replay settings to disk whenever they change.
const replaySettingsRef: DebounceRef<ReplaySettingsState> = { timer: null, lastSaved: null };

// Auto-persist player information to disk whenever it changes.
const playerInformationRef: ImmediateRef<PlayerInformation> = { lastSaved: null };

store.subscribe(() => {
	const state = store.getState();

	persistHexTileRecords(state.hexTiles.records, hexTileRecordsRef);
	persistWalkedEdges(state.hexTiles.walkedEdges, walkedEdgesRef);
	persistWalkedEdgesRedLine(state.hexTiles.walkedEdgesRedLine, walkedEdgesRedLineRef);

	persistImmediate(state.sportType.selectedType, sportTypeRef, saveSportType);
	persistImmediate(state.theme.selectedMode, themeModeRef, saveThemeMode);

	persistDebounced(state.billboardConfig.spriteAnchors, billboardConfigRef, saveBillboardConfig);
	persistDebounced(state.hexTextureConfig.spriteAnchors, hexTextureConfigRef, saveHexTextureConfig);

	persistImmediate(state.gpsInterval.intervalSeconds, gpsIntervalRef, saveGpsIntervalSeconds);
	persistImmediate(state.tts.ttsEnabled, ttsEnabledRef, saveTTSEnabled);

	persistDebounced(state.speechSettings, speechSettingsRef, saveSpeechSettings);
	persistDebounced(state.displaySettings, displaySettingsRef, saveDisplaySettings);

	persistImmediate(state.playerInformation, playerInformationRef, (playerInformation) => {
		savePlayerInformation({ homeHexTile: playerInformation.homeHexTile });
	});

	persistDebounced(state.replaySettings, replaySettingsRef, saveReplaySettings);
});

// ─── Type helpers ─────────────────────────────────────────────────────────────

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
