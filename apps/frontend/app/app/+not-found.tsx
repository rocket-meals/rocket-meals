import React from 'react';
import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { TranslationKeys } from '@/locales/keys';

export default function NotFoundScreen() {
	useSetPageTitle(TranslationKeys.page_not_found);
	const { translate } = useLanguage();
	const { theme } = useTheme();
	return (
		<>
			<Stack.Screen options={{ title: translate(TranslationKeys.page_not_found) }} />
			<View style={[styles.container, { backgroundColor: theme.screen.background }]}>
				<Text role="heading" aria-level={1} style={[styles.heading, { color: theme.screen.text }]}>
					{translate(TranslationKeys.page_not_found_description)}
				</Text>
				<Link href="/(app)" style={styles.link}>
					<Text style={{ color: theme.screen.text, textDecorationLine: 'underline' }}>{translate(TranslationKeys.go_to_home_screen)}</Text>
				</Link>
			</View>
		</>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 20,
	},
	heading: {
		fontSize: 20,
		fontWeight: 'bold',
	},
	link: {
		marginTop: 15,
		paddingVertical: 15,
	},
});
