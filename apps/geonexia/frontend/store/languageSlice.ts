import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getLocales } from 'expo-localization';
import type { SupportedLanguage } from '../helpers/LanguageStorage';

// ─── State type ───────────────────────────────────────────────────────────────

export type LanguageSliceState = {
	selectedLanguage: SupportedLanguage;
};

function detectDeviceLanguage(): SupportedLanguage {
	try {
		const locales = getLocales();
		for (const locale of locales) {
			const lang = locale.languageCode ?? '';
			if (lang === 'de') return 'de';
			if (lang === 'en') return 'en';
		}
	} catch {
		// Fallback to German when locale detection fails.
	}
	return 'de';
}

const initialState: LanguageSliceState = {
	selectedLanguage: detectDeviceLanguage(),
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const languageSlice = createSlice({
	name: 'language',
	initialState,
	reducers: {
		/**
		 * Set the active language.  Persisted to disk by the store subscriber.
		 */
		setLanguage(state, action: PayloadAction<SupportedLanguage>) {
			state.selectedLanguage = action.payload;
		},

		/**
		 * Load the persisted language from disk.  Called once at app startup.
		 * Falls back to the device-detected default if `null` is passed.
		 */
		loadLanguage(state, action: PayloadAction<SupportedLanguage | null>) {
			if (action.payload !== null) {
				state.selectedLanguage = action.payload;
			}
		},
	},
});

export const { setLanguage, loadLanguage } = languageSlice.actions;
export default languageSlice.reducer;
