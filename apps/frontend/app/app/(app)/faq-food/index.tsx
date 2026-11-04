import { Text, View } from 'react-native';
import React from 'react';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { TranslationKeys } from '@/locales/keys';

const Index = () => {
	useSetPageTitle(TranslationKeys.faq_food);
	const { translate } = useLanguage();
	const { theme } = useTheme();
	return (
		<View>
			<Text style={{ color: theme.screen.text }}>{translate(TranslationKeys.faq_food)}</Text>
		</View>
	);
};

export default Index;
