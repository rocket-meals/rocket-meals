import React from 'react';
import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';

export default function NotFoundScreen() {
	const { translate } = useLanguage();
	return (
		<>
			<Stack.Screen options={{ title: translate(TranslationKeys.oops) }} />
			<View style={styles.container}>
				<Text>{translate(TranslationKeys.screen_not_found)}</Text>
				<Link href="/(app)" style={styles.link}>
					<Text>{translate(TranslationKeys.go_to_home_screen)}</Text>
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
	link: {
		marginTop: 15,
		paddingVertical: 15,
	},
});
