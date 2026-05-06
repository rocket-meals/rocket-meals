import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { TranslationKeys } from '@/locales/keys';

const Index = () => {
	useSetPageTitle(TranslationKeys.faq_living);
	const { theme } = useTheme();
	const { translate } = useLanguage();

	return (
		<View style={[styles.container, { backgroundColor: theme.screen.background }]}>
			<Text style={{ color: theme.screen.text }}>{translate(TranslationKeys.faq_living)}</Text>
		</View>
	);
};

export default Index;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 20,
		justifyContent: 'center',
		alignItems: 'center',
	},
});
