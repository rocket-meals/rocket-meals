import React, { createContext, ReactNode, useContext, useState } from 'react';

// expo-localization is an optional peer dependency – import it safely so that
// apps which don't install it still work fine (they just won't get device-locale
// auto-detection in uncontrolled mode).
let _getLocales: (() => Array<{ languageCode?: string | null }>) | undefined;
try {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	_getLocales = (require('expo-localization') as { getLocales: () => Array<{ languageCode?: string | null }> }).getLocales;
} catch {
	// expo-localization not installed – uncontrolled mode falls back to 'de'.
}

export type LanguageContextType = {
	language: string;
	setLanguage: (lang: string) => void;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

type LanguageProviderProps = {
	/**
	 * Controlled language value.  When provided together with
	 * `onLanguageChange`, the provider operates in **controlled mode** and
	 * delegates language storage entirely to the caller (e.g. Redux in
	 * apps/frontend or a Redux slice in apps/geonexia).
	 */
	language?: string;
	/**
	 * Called whenever a consumer requests a language change via
	 * `setLanguage`.  Only relevant in controlled mode.
	 */
	onLanguageChange?: (lang: string) => void;
	children: ReactNode;
};

function detectDeviceLanguage(): string {
	try {
		if (_getLocales) {
			const locales = _getLocales();
			for (const locale of locales) {
				const lang = locale.languageCode ?? '';
				if (lang) return lang;
			}
		}
	} catch {
		// Locale detection unavailable – use default.
	}
	return 'de';
}

/**
 * Provides the current UI language to all descendant components.
 *
 * **Controlled mode** (both `language` and `onLanguageChange` supplied):
 * The language value is owned by the parent.  `setLanguage` from
 * `useLanguageContext()` calls `onLanguageChange` so the parent can persist
 * the change in Redux / AsyncStorage / etc.
 *
 * **Uncontrolled mode** (neither prop supplied):
 * The provider manages its own state, initialised from the device locale via
 * `expo-localization` if available, falling back to `'de'`.
 */
export const LanguageProvider = ({
	language: controlledLanguage,
	onLanguageChange,
	children,
}: LanguageProviderProps) => {
	const isControlled = controlledLanguage !== undefined && onLanguageChange !== undefined;

	const [internalLanguage, setInternalLanguage] = useState<string>(() =>
		isControlled ? (controlledLanguage as string) : detectDeviceLanguage()
	);

	const language = isControlled ? (controlledLanguage as string) : internalLanguage;

	const setLanguage = (lang: string) => {
		if (isControlled) {
			onLanguageChange!(lang);
		} else {
			setInternalLanguage(lang);
		}
	};

	return (
		<LanguageContext.Provider value={{ language, setLanguage }}>
			{children}
		</LanguageContext.Provider>
	);
};

/**
 * Returns the current language context value, or `undefined` when called
 * outside a {@link LanguageProvider}.  Most callers should handle the
 * `undefined` case by falling back to a sensible default (e.g. `'de'`).
 */
export const useLanguageContext = (): LanguageContextType | undefined => {
	return useContext(LanguageContext);
};
