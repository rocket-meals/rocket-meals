import React, { useEffect, useReducer, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

import { IDLE_RELEASE_MS, textRecognitionBridge } from '@/helper/textRecognitionPage/bridge';
import { PreparedPageFile, preparePageFile } from '@/helper/textRecognitionPage/preparePageFile';

/**
 * The WebView the text recognition engine runs in on a device.
 *
 * Mounted once at the root of the app and invisible throughout: a single pixel
 * that takes no touches. It renders nothing at all until the first frame is
 * handed to the bridge, then puts the page up, and takes it down again once
 * nothing has been read for a while. Everything it does is on behalf of
 * `textRecognitionBridge`; see there for the protocol.
 *
 * The web build has its own `index.web.tsx` that renders nothing: the browser
 * runs the engine directly, and `react-native-webview` has nothing to offer it.
 */

/** How often the host checks whether the WebView has been idle long enough to go. */
const IDLE_CHECK_INTERVAL_MS = 15_000;

const describeError = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export const TextRecognitionWebViewHost = () => {
	const [, rerender] = useReducer((count: number) => count + 1, 0);
	const [pageFile, setPageFile] = useState<PreparedPageFile | null>(null);
	const webViewRef = useRef<WebView<{}>>(null);

	useEffect(() => textRecognitionBridge.subscribe(rerender), []);

	const isWanted = textRecognitionBridge.isWanted;

	// The page file: composed on first use, then reused for as long as the app
	// runs. Only ever prepared while a frame is actually waiting.
	useEffect(() => {
		if (!isWanted || pageFile !== null) {
			return;
		}
		let isCancelled = false;
		preparePageFile()
			.then((prepared) => {
				if (!isCancelled) {
					setPageFile(prepared);
				}
			})
			.catch((error: unknown) => {
				if (!isCancelled) {
					textRecognitionBridge.reportStartFailure(`the text recognition page could not be prepared: ${describeError(error)}`);
				}
			});
		return () => {
			isCancelled = true;
		};
	}, [isWanted, pageFile]);

	// Give the WebView back after a quiet spell.
	useEffect(() => {
		if (!isWanted) {
			return;
		}
		const interval = setInterval(() => {
			if (textRecognitionBridge.isIdleFor(IDLE_RELEASE_MS)) {
				textRecognitionBridge.release();
			}
		}, IDLE_CHECK_INTERVAL_MS);
		return () => clearInterval(interval);
	}, [isWanted]);

	const isMounted = isWanted && pageFile !== null;

	// The bridge sends scripts through this handle. Attached for as long as the
	// WebView is on screen; detaching settles whatever is still waiting.
	useEffect(() => {
		if (!isMounted) {
			return;
		}
		textRecognitionBridge.attach({
			injectJavaScript: (script) => {
				webViewRef.current?.injectJavaScript(script);
			},
		});
		return () => textRecognitionBridge.detach();
	}, [isMounted]);

	if (!isMounted || pageFile === null) {
		return null;
	}

	return (
		<View style={styles.hidden} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
			<WebView<{}>
				ref={webViewRef}
				source={{ uri: pageFile.uri }}
				// The page is a local file with everything inlined; these let a
				// `file://` document load at all, on Android and on iOS respectively.
				originWhitelist={['*']}
				allowFileAccess
				allowingReadAccessToURL={pageFile.directoryUri}
				javaScriptEnabled
				domStorageEnabled={false}
				cacheEnabled={false}
				// A 28 MB document is nothing for a WebView; a WebView that is
				// re-created for every scan would be. Keep it exactly as it is.
				setSupportMultipleWindows={false}
				onMessage={(event: WebViewMessageEvent) => textRecognitionBridge.onPageMessage(event.nativeEvent.data)}
				onError={(event) => textRecognitionBridge.reportStartFailure(`the text recognition page could not be loaded: ${event.nativeEvent.description}`)}
				onRenderProcessGone={() => textRecognitionBridge.reportStartFailure('the text recognition page was terminated by the system')}
				onContentProcessDidTerminate={() => textRecognitionBridge.reportStartFailure('the text recognition page was terminated by the system')}
				style={styles.webView}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	hidden: {
		position: 'absolute',
		top: 0,
		left: 0,
		width: 1,
		height: 1,
		opacity: 0,
		overflow: 'hidden',
		pointerEvents: 'none',
	},
	webView: {
		width: 1,
		height: 1,
		backgroundColor: 'transparent',
	},
});

export default TextRecognitionWebViewHost;
