import { useMemo } from 'react';
import { useAppSelector } from '@/redux/hooks';

/**
 * Checks if a language code corresponds to a Left-to-Right language.
 * Currently, only Arabic ('ar') is treated as Right-to-Left.
 */
export const isLtrLanguageCode = (code: string) => {
	return code !== 'ar';
};

/**
 * Hook to determine if the current app language is Left-to-Right (LTR).
 */
export const useIsLtrLanguage = () => {
	const { language } = useAppSelector((state) => state.settings);
	return useMemo(() => isLtrLanguageCode(language), [language]);
};
