import React from 'react';
import { StyleSheet, View } from 'react-native';

export const GEONEXIA_LAUF_OBERLAND_URL = 'https://geonexia.baumgartner-software.de';

const iframeStyle: React.CSSProperties = { width: '100%', height: '100%', border: 'none' };

export default function GeonexiaWebView() {
	return (
		<View style={styles.container}>
			<iframe
				src={GEONEXIA_LAUF_OBERLAND_URL}
				style={iframeStyle}
				title="Geonexia Lauf Oberland"
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
});
