import React from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

export const GEONEXIA_LAUF_OBERLAND_URL = 'https://geonexia.baumgartner-software.de';

export default function GeonexiaWebView() {
	return (
		<View style={styles.container}>
			<WebView
				source={{ uri: GEONEXIA_LAUF_OBERLAND_URL }}
				style={styles.webView}
				javaScriptEnabled={true}
				domStorageEnabled={true}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	webView: {
		flex: 1,
	},
});
