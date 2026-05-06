import { useMemo } from 'react';
import { useIsLtrLanguage } from './useIsLtrLanguage';

/**
 * Hook to determine the text alignment based on the current language (LTR/RTL).
 */
export const useLanguageTextAlign = () => {
	const isLtrLanguage = useIsLtrLanguage();
	return useMemo(() => (isLtrLanguage ? 'left' : 'right'), [isLtrLanguage]);
};
