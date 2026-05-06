import { useMemo } from 'react';
import * as Localization from 'expo-localization';
import { DateHelper as CommonDateHelper } from 'repo-depkit-common';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';

export const useSmartReadableDateMethod = () => {
	const { translate, language } = useLanguage();
	const dateLocale = language || Localization.getLocales()?.[0]?.languageTag || 'en';

	const relativeDaysDiffTranslations = useMemo(
		() => ({
			[-1]: translate(TranslationKeys.yesterday),
			[0]: translate(TranslationKeys.today),
			[1]: translate(TranslationKeys.tomorrow),
		}),
		[translate]
	);

	return (date: Date) => CommonDateHelper.getSmartReadableDate(date, dateLocale, relativeDaysDiffTranslations);
};
