import { getLocales } from 'expo-localization';
import { useCallback } from 'react';
import { useLanguageContext } from 'repo-depkit-common-ui';
import translations from '../locales/translations.json';
import type { GeonexiaTranslationKeys } from '../locales/keys';
import type { SupportedLanguage } from '../helpers/LanguageStorage';

/** Returns the best-matching supported language based on the device locale. */
function detectLanguage(): SupportedLanguage {
	try {
		const locales = getLocales();
		for (const locale of locales) {
			const lang = locale.languageCode ?? '';
			if (lang === 'de') return 'de';
			if (lang === 'en') return 'en';
		}
	} catch {
		// Fallback to German when locale detection fails
	}
	return 'de';
}

/**
 * Module-level mutable language variable used by the non-hook helper functions
 * (`translateLayerId`, `translateClass`, `translateSubclass`).  Updated by the
 * store subscriber in `store.ts` whenever the Redux language changes.
 */
let currentLanguage: SupportedLanguage = detectLanguage();

/**
 * Update the module-level language used by the pure translation helpers.
 * Called by the store subscriber in `store/store.ts` on every language change.
 */
export function setCurrentLanguage(lang: string): void {
	currentLanguage = lang === 'en' ? 'en' : 'de';
}

/**
 * Returns a `translate` function that resolves a {@link GeonexiaTranslationKeys}
 * key to the localised string for the current UI language.
 *
 * The language is read reactively from {@link useLanguageContext} when a
 * {@link LanguageProvider} is present in the tree, which enables runtime
 * language switching.  When no provider is found, the hook falls back to the
 * module-level `currentLanguage` variable (initialised from the device locale).
 */
export function useTranslation() {
	const ctx = useLanguageContext();
	const rawLanguage = ctx?.language ?? currentLanguage;
	const language: SupportedLanguage = rawLanguage === 'en' ? 'en' : 'de';

	const translate = useCallback(
		(key: GeonexiaTranslationKeys): string => {
			const entry = (translations as Record<string, Record<string, string>>)[key];
			if (!entry) return key;
			return entry[language] ?? entry['de'] ?? key;
		},
		[language]
	);

	return { translate, language };
}

/**
 * Translate a map-feature layer ID (e.g. `"landcover"`) to a human-readable
 * label using the current language.  Returns the raw `layerId` when no
 * translation is found.
 */
export function translateLayerId(layerId: string): string {
	const key = `layer_${layerId}` as GeonexiaTranslationKeys;
	const entry = (translations as Record<string, Record<string, string>>)[key];
	if (!entry) return layerId;
	return entry[currentLanguage] ?? entry['de'] ?? layerId;
}

/**
 * Translate a map-feature class value (e.g. `"cemetery"`) to a human-readable
 * label using the current language.  Returns the raw class string when no
 * translation is found.
 */
export function translateClass(cls: string): string {
	const key = `class_${cls}` as GeonexiaTranslationKeys;
	const entry = (translations as Record<string, Record<string, string>>)[key];
	if (!entry) return cls;
	return entry[currentLanguage] ?? entry['de'] ?? cls;
}

/**
 * Translate a map-feature subclass value (e.g. `"meadow"`) to a human-readable
 * label using the current language.  Returns the raw subclass string when no
 * translation is found.
 */
export function translateSubclass(subclass: string): string {
	const key = `subclass_${subclass}` as GeonexiaTranslationKeys;
	const entry = (translations as Record<string, Record<string, string>>)[key];
	if (!entry) return subclass;
	return entry[currentLanguage] ?? entry['de'] ?? subclass;
}
