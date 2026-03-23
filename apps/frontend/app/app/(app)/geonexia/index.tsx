import React from 'react';
import { StyleSheet, View } from 'react-native';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { TranslationKeys } from '@/locales/keys';
import GeonexiaWebView from '@/components/GeonexiaWebView';

export default function GeonexiaScreen() {
	useSetPageTitle(TranslationKeys.geonexia_lauf_oberland);

	return (
		<View style={styles.container}>
			<GeonexiaWebView />
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
});
