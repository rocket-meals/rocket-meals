import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

const LAUF_OBERLAND_URL = 'https://lauf-oberland.de';

export default function LaufOberlandScreen() {
	if (Platform.OS === 'web') {
		return (
			<View style={styles.container}>
				<iframe
					src={LAUF_OBERLAND_URL}
					style={{ width: '100%', height: '100%', border: 'none' } as React.CSSProperties}
					title="Lauf Oberland"
				/>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<WebView
				source={{ uri: LAUF_OBERLAND_URL }}
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
