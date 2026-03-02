import { useEffect, useMemo, useState } from 'react';
import { configureStore } from '@/redux/store';
import translations from '@/locales/translations.json';
import { CHANGE_LANGUAGE } from '@/redux/Types/types';

const changeLanguage = (language: 'en' | 'de' | 'fr' | 'ar' | 'es' | 'ru' | 'tr' | 'zh') => ({
	type: CHANGE_LANGUAGE,
	payload: language,
});

export const useLanguage = () => {
	// console.log(configureStore.getState().settings.language, "lang");

	const [language, setLanguage] = useState(configureStore.getState().settings.language);

	const setLanguageMode = (language: 'en' | 'de' | 'fr' | 'ar' | 'es' | 'ru' | 'tr' | 'zh') => {
		configureStore.dispatch(changeLanguage(language));
	};

	const translate = useMemo(() => {
		return (key: string) => translations[key]?.[language] || key;
	}, [language]);

	useEffect(() => {
		const unsubscribe = configureStore.subscribe(() => {
			setLanguage(configureStore.getState().settings.language);
		});

		return () => unsubscribe();
	}, []);

	return { language, setLanguageMode, translate };
};
