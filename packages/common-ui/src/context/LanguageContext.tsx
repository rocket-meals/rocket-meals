import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { getLocales } from 'expo-localization';

/** Returns the best-matching language code from the device locale. Falls back to 'en'. */
function detectLanguage(): string {
	try {
		const locales = getLocales();
		for (const locale of locales) {
			const lang = locale.languageCode ?? '';
			if (lang) return lang;
		}
	} catch {
		// Fallback when locale detection fails
	}
	return 'en';
}

interface LanguageContextType {
	/** The currently active language code (e.g. 'de', 'en', 'fr'). */
	language: string;
	/** Override the active language. Called by bridge components to sync external language state. */
	setLanguage: (lang: string) => void;
}

const LanguageContext = createContext<LanguageContextType>({
	language: 'en',
	setLanguage: () => {},
});

export interface LanguageProviderProps {
	children: ReactNode;
	/**
	 * The active language code to use. When provided this value controls the
	 * context language (controlled mode). When omitted the device locale is
	 * auto-detected via `expo-localization`.
	 */
	language?: string;
}

/**
 * Provides a shared language context to all common-ui components.
 *
 * Place this near the root of your component tree. Each app can either:
 * - Pass `language` explicitly (controlled) to reflect runtime language switches.
 * - Omit `language` to automatically detect the device locale.
 *
 * Use a bridge component (e.g. `LanguageBridge`) inside your state-management
 * provider to keep the context in sync with a Redux / other store.
 */
export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children, language: propLanguage }) => {
	const [language, setLanguage] = useState<string>(() => propLanguage ?? detectLanguage());

	// When the controlled prop changes (e.g. user switches language in settings),
	// propagate the new value into the context state.
	useEffect(() => {
		if (propLanguage !== undefined) {
			setLanguage(propLanguage);
		}
	}, [propLanguage]);

	return (
		<LanguageContext.Provider value={{ language, setLanguage }}>
			{children}
		</LanguageContext.Provider>
	);
};

/**
 * Returns the active language from the nearest `LanguageProvider`.
 * Defaults to `{ language: 'en', setLanguage: () => {} }` when used outside a provider.
 */
export const useLanguageContext = (): LanguageContextType => {
	return useContext(LanguageContext);
};
