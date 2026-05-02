import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { CommonSystemActionHelper } from '@/helper/SystemActionHelper';
import type { MyMapHandle, MyMapProps } from './MyMapHelper';
import { StringHelper } from 'repo-depkit-common';

function escapeHtml(text: string): string {
	let result = StringHelper.replaceAllLiteralWithOptions({ str: text, find: '&', replace: '&amp;' });
	result = StringHelper.replaceAllLiteralWithOptions({ str: result, find: '<', replace: '&lt;' });
	result = StringHelper.replaceAllLiteralWithOptions({ str: result, find: '>', replace: '&gt;' });
	result = StringHelper.replaceAllLiteralWithOptions({ str: result, find: '"', replace: '&quot;' });
	result = StringHelper.replaceAllLiteralWithOptions({ str: result, find: "'", replace: '&#39;' });
	return result;
}

const MyMap = forwardRef<MyMapHandle, MyMapProps>(({ initialCenter, initialPitch, loadingText, onMessage }, ref) => {
	const webViewRef = useRef<WebView>(null);
	const [html, setHtml] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;
		const loadHtml = async () => {
			const htmlAsset = Asset.fromModule(require('@/assets/maplibre/index.html'));
			await htmlAsset.downloadAsync();
			let htmlContent = await FileSystem.readAsStringAsync(htmlAsset.localUri!);
			// Patch the initMap call to start at the provided center position and optional pitch.
			// This avoids an initial flash at the default Germany position while tiles load.
			// NOTE: depends on the HTML containing exactly 'initMap(null, null);' – update
			// this pattern if the HTML asset signature changes.
			const pitch = initialPitch !== undefined ? `, ${initialPitch}` : '';
			htmlContent = htmlContent.replace(
				'initMap(null, null);',
				`initMap([${initialCenter.lng}, ${initialCenter.lat}], null${pitch});`,
			);
			if (loadingText) {
				htmlContent = htmlContent.replace(
					'<span id="loading-text">Loading vector map…</span>',
					`<span id="loading-text">${escapeHtml(loadingText)}</span>`,
				);
			}
			if (isMounted) {
				setHtml(htmlContent);
			}
		};
		loadHtml();
		return () => {
			isMounted = false;
		};
		// initialCenter and initialPitch are intentionally excluded: the HTML is loaded only
		// once on mount. Subsequent position/style updates are sent via sendToMap() messages.
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const sendToMap = useCallback((data: object) => {
		const json = JSON.stringify(data);
		webViewRef.current?.injectJavaScript(
			`window.dispatchEvent(new MessageEvent('message',{data:${json}}));true;`,
		);
	}, []);

	useImperativeHandle(ref, () => ({ sendToMap }), [sendToMap]);

	const handleMessage = useCallback(
		(event: WebViewMessageEvent) => {
			try {
				const data = JSON.parse(event.nativeEvent.data);
				onMessage(data);
			} catch {
				// ignore malformed messages
			}
		},
		[onMessage],
	);

	const handleShouldStartLoadWithRequest = useCallback((request: ShouldStartLoadRequest): boolean => {
		const url = request.url;
		if (!url || url === 'about:blank' || url === 'about:srcdoc') {
			return true;
		}
		CommonSystemActionHelper.openExternalURL(url).catch(() => {});
		return false;
	}, []);

	if (!html) {
		return <View style={styles.container} />;
	}

	return (
		<View style={styles.container}>
			<WebView
				ref={webViewRef}
				style={styles.webView}
				source={{ html }}
				javaScriptEnabled={true}
				domStorageEnabled={true}
				originWhitelist={['*']}
				onMessage={handleMessage}
				onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
			/>
		</View>
	);
});

export default MyMap;
export type { MyMapHandle, MyMapProps };

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	webView: {
		flex: 1,
	},
});
