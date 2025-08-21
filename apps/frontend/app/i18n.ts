import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import translations from './locales/translations.json';

// Preprocess translations to create a structure compatible with i18next
const formattedTranslations: any = {};
Object.keys(translations).forEach(key => {
	Object.entries(translations[key]).forEach(([lang, value]) => {
		if (!formattedTranslations[lang]) {
			formattedTranslations[lang] = {};
		}
		formattedTranslations[lang][key] = value;
	});
});

// Language detector
const languageDetector = {
	type: 'languageDetector',
	async: true,
	detect: (callback: any) => {
		AsyncStorage.getItem('user-language', (err, language) => {
			if (language) {
				callback(language);
			} else {
				callback(Localization.locale); // Use device language
			}
		});
	},
	init: () => {},
	cacheUserLanguage: (language: string) => {
		AsyncStorage.setItem('user-language', language);
	},
};

i18n
	.use(languageDetector)
	.use(initReactI18next)
	.init({
		resources: formattedTranslations,
		interpolation: {
			escapeValue: false, // React already escapes by default
		},
	});

export default i18n;
