import React from 'react';
import { ActivityIndicator, ActivityIndicatorProps } from 'react-native';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';

/**
 * ActivityIndicator with an accessible name. On web the spinner is a role="progressbar",
 * which needs a name for screen readers (axe aria-progressbar-name, WCAG 4.1.2).
 * A caller can still pass its own accessibilityLabel.
 */
const LoadingIndicator = (props: ActivityIndicatorProps) => {
	const { translate } = useLanguage();
	return <ActivityIndicator accessibilityLabel={translate(TranslationKeys.loading)} {...props} />;
};

export default LoadingIndicator;
