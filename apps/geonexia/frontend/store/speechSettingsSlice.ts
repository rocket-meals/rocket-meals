import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AnnouncementToggles } from '../helpers/AnnouncementToggles';

// ─── State type ───────────────────────────────────────────────────────────────

/** Speech rate preset for TTS announcements. */
export type SpeechRate = 'slow' | 'normal' | 'fast';

export type SpeechSettingsState = {
	/** Master toggle for speech announcements */
	enabled: boolean;
	/** Volume level 0.0 – 1.0 */
	volume: number;
	/** Duck background music during TTS announcements (iOS) */
	duckMusicDuringTTS: boolean;
	/** Speech rate preset */
	speechRate: SpeechRate;

	// ─── Pace target helper ────────────────────────────────────────────────────
	/** Master toggle: help maintaining target pace */
	paceTargetEnabled: boolean;
	/** Target pace – minutes per km */
	paceTargetMinutes: number;
	paceTargetSeconds: number;
	/** Announce a hint when running faster than target pace */
	paceHintFasterEnabled: boolean;
	paceHintFasterMinutes: number;
	paceHintFasterSeconds: number;
	/** Announce a hint when running slower than target pace */
	paceHintSlowerEnabled: boolean;
	paceHintSlowerMinutes: number;
	paceHintSlowerSeconds: number;

	/** Time interval for periodic announcements – minutes component. 0 min + 0 sec = disabled. */
	intervalTimeMinutes: number;
	/** Time interval for periodic announcements – seconds component. */
	intervalTimeSeconds: number;
	/** Play a tone at the specified distance interval */
	toneAtDistance: boolean;
	/** Vibrate at the specified distance interval */
	vibrationAtDistance: boolean;

	/** Announce when the app moves to the background during a recording */
	announceAppInBackground: boolean;
} & AnnouncementToggles;

export const SPEECH_SETTINGS_DEFAULTS: SpeechSettingsState = {
	enabled: true,
	volume: 0.8,
	duckMusicDuringTTS: true,
	speechRate: 'normal',
	paceTargetEnabled: false,
	paceTargetMinutes: 5,
	paceTargetSeconds: 30,
	paceHintFasterEnabled: false,
	paceHintFasterMinutes: 0,
	paceHintFasterSeconds: 30,
	paceHintSlowerEnabled: false,
	paceHintSlowerMinutes: 0,
	paceHintSlowerSeconds: 30,
	intervalTimeMinutes: 5,
	intervalTimeSeconds: 0,
	toneAtDistance: false,
	vibrationAtDistance: false,
	announceDistance: true,
	announcePace: true,
	announceDuration: false,
	announceSpeed: false,
	announceCalories: false,
	announceHeartRate: false,
	announcePaceAvg: false,
	announceSpeedAvg: false,
	announceAppInBackground: true,
};

const initialState: SpeechSettingsState = { ...SPEECH_SETTINGS_DEFAULTS };

// ─── Slice ────────────────────────────────────────────────────────────────────

const speechSettingsSlice = createSlice({
	name: 'speechSettings',
	initialState,
	reducers: {
		/** Update one or more speech settings fields at once. */
		updateSpeechSettings(state, action: PayloadAction<Partial<SpeechSettingsState>>) {
			return { ...state, ...action.payload };
		},

		/** Load the full persisted speech settings from disk. Called once at startup. */
		loadSpeechSettings(_state, action: PayloadAction<SpeechSettingsState>) {
			return action.payload;
		},
	},
});

export const { updateSpeechSettings, loadSpeechSettings } = speechSettingsSlice.actions;
export default speechSettingsSlice.reducer;
