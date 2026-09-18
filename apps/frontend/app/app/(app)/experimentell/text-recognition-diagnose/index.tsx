import React, { useCallback, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { useAppSelector } from '@/redux/hooks';
import { myContrastColor } from '@/helper/ColorHelper';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { TranslationKeys } from '@/locales/keys';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { buildTextRecognitionPageHtml } from '@/helper/TextRecognitionShared';
import { unpackEngine } from '@/hooks/useTextRecognition';
import styles from '../styles';

/**
 * Walks the native text recognition chain one step at a time.
 *
 * The chain dies on some devices and nobody here owns one. A WebView that
 * crashes in its native layer takes the app with it and leaves no message
 * behind, so no amount of `try`/`catch` will say which step it was. What does
 * say it: running each step on its own, on purpose, and seeing how far the app
 * gets before it goes down. Whatever the last step shown was, that is the one
 * that broke.
 *
 * Nothing here starts by itself.
 */

type StageKey = 'unpack' | 'plainWebView' | 'enginePage';

interface StageState {
	status: 'idle' | 'running' | 'ok' | 'failed';
	detail?: string;
}

const INITIAL_STATE: Record<StageKey, StageState> = {
	unpack: { status: 'idle' },
	plainWebView: { status: 'idle' },
	enginePage: { status: 'idle' },
};

/** A WebView with no engine in it, to tell a broken WebView from a broken engine. */
const PLAIN_PAGE_HTML = `<!DOCTYPE html>
<html>
	<head><meta charset="utf-8" /></head>
	<body>
		<script>
			if (window.ReactNativeWebView) {
				window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready', engineLoaded: false }));
			}
		</script>
	</body>
</html>
`;

const TextRecognitionDiagnoseScreen = () => {
	useSetPageTitle(TranslationKeys.text_recognition_diagnose);
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { primaryColor, selectedTheme } = useAppSelector((state) => state.settings);
	const contrastColor = myContrastColor(primaryColor, theme, selectedTheme === 'dark');

	const [stages, setStages] = useState<Record<StageKey, StageState>>(INITIAL_STATE);
	const [engineDirectory, setEngineDirectory] = useState<string | null>(null);
	const [mountedWebView, setMountedWebView] = useState<'none' | 'plain' | 'engine'>('none');
	const answered = useRef(false);

	const setStage = useCallback((key: StageKey, state: StageState) => {
		setStages((current) => ({ ...current, [key]: state }));
	}, []);

	const describe = (error: unknown): string => (error instanceof Error ? error.message : String(error));

	const runUnpack = useCallback(async () => {
		setStage('unpack', { status: 'running' });
		try {
			const directory = await unpackEngine();
			setEngineDirectory(directory);
			setStage('unpack', { status: 'ok', detail: directory });
		} catch (error) {
			setStage('unpack', { status: 'failed', detail: describe(error) });
		}
	}, [setStage]);

	/** Mounts one of the two pages and waits for it to report back. */
	const mountWebView = useCallback(
		(which: 'plain' | 'engine') => {
			const key: StageKey = which === 'plain' ? 'plainWebView' : 'enginePage';
			answered.current = false;
			setStage(key, { status: 'running' });
			setMountedWebView(which);
		},
		[setStage],
	);

	const handleMessage = useCallback(
		(event: WebViewMessageEvent) => {
			if (answered.current) {
				return;
			}
			answered.current = true;
			const key: StageKey = mountedWebView === 'plain' ? 'plainWebView' : 'enginePage';
			setStage(key, { status: 'ok', detail: event.nativeEvent.data.slice(0, 200) });
		},
		[mountedWebView, setStage],
	);

	const handleFailure = useCallback(
		(detail: string) => {
			if (answered.current) {
				return;
			}
			answered.current = true;
			const key: StageKey = mountedWebView === 'plain' ? 'plainWebView' : 'enginePage';
			setStage(key, { status: 'failed', detail });
		},
		[mountedWebView, setStage],
	);

	const stageList: { key: StageKey; label: string; hint: string; onRun: () => void; disabled?: boolean }[] = [
		{
			key: 'unpack',
			label: translate(TranslationKeys.text_recognition_diagnose_unpack),
			hint: translate(TranslationKeys.text_recognition_diagnose_unpack_hint),
			onRun: () => void runUnpack(),
		},
		{
			key: 'plainWebView',
			label: translate(TranslationKeys.text_recognition_diagnose_plain_webview),
			hint: translate(TranslationKeys.text_recognition_diagnose_plain_webview_hint),
			onRun: () => mountWebView('plain'),
		},
		{
			key: 'enginePage',
			label: translate(TranslationKeys.text_recognition_diagnose_engine_page),
			hint: translate(TranslationKeys.text_recognition_diagnose_engine_page_hint),
			onRun: () => mountWebView('engine'),
			disabled: engineDirectory === null,
		},
	];

	const statusIcon = (status: StageState['status']) => {
		if (status === 'ok') {
			return <MaterialCommunityIcons name="check-circle-outline" size={24} color="#4CAF50" />;
		}
		if (status === 'failed') {
			return <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#F44336" />;
		}
		if (status === 'running') {
			return <MaterialCommunityIcons name="progress-clock" size={24} color={theme.screen.icon} />;
		}
		return <MaterialCommunityIcons name="circle-outline" size={24} color={theme.screen.icon} />;
	};

	return (
		<ScrollView style={{ ...styles.container, backgroundColor: theme.screen.background }} contentContainerStyle={{ ...styles.contentContainer, backgroundColor: theme.screen.background }}>
			<View style={styles.content}>
				<Text style={{ ...styles.heading, color: theme.screen.text }}>{translate(TranslationKeys.text_recognition_diagnose)}</Text>
				<Text style={{ ...styles.body, color: theme.screen.text }}>{translate(TranslationKeys.text_recognition_diagnose_description)}</Text>
				<Text style={{ ...styles.body, color: theme.screen.text }}>{`${Platform.OS} · ${Platform.Version}`}</Text>

				{stageList.map((stage) => {
					const state = stages[stage.key];
					return (
						<View key={stage.key} style={{ ...localStyles.stage, borderColor: theme.screen.iconBg }}>
							<View style={localStyles.stageHeader}>
								{statusIcon(state.status)}
								<Text style={{ ...styles.body, color: theme.screen.text, flex: 1 }}>{stage.label}</Text>
							</View>
							<Text style={{ ...localStyles.hint, color: theme.screen.text }}>{stage.hint}</Text>
							{state.detail !== undefined && (
								<Text selectable style={{ ...localStyles.detail, color: theme.screen.text }}>
									{state.detail}
								</Text>
							)}
							<TouchableOpacity style={[localStyles.button, { backgroundColor: stage.disabled ? theme.screen.iconBg : primaryColor }]} onPress={stage.onRun} disabled={stage.disabled} accessibilityRole="button" accessibilityLabel={stage.label}>
								<Text style={{ ...localStyles.buttonText, color: stage.disabled ? theme.screen.text : contrastColor }}>{translate(TranslationKeys.text_recognition_diagnose_run)}</Text>
							</TouchableOpacity>
						</View>
					);
				})}

				{/* Mounted only while a stage asks for it, and never on its own. */}
				{mountedWebView !== 'none' && (
					<ErrorBoundary onError={(error) => handleFailure(describe(error))}>
						<View style={localStyles.webViewContainer} pointerEvents="none">
							<WebView
								source={mountedWebView === 'plain' ? { html: PLAIN_PAGE_HTML } : { uri: `${engineDirectory}/index.html`, baseUrl: undefined }}
								originWhitelist={['*']}
								allowFileAccess
								allowFileAccessFromFileURLs
								allowUniversalAccessFromFileURLs
								allowingReadAccessToURL={engineDirectory ?? undefined}
								javaScriptEnabled
								domStorageEnabled
								onMessage={handleMessage}
								onError={(event) => handleFailure(event.nativeEvent.description)}
								onHttpError={(event) => handleFailure(`HTTP ${event.nativeEvent.statusCode}`)}
								onRenderProcessGone={() => handleFailure('render process gone')}
								onContentProcessDidTerminate={() => handleFailure('content process terminated')}
							/>
						</View>
					</ErrorBoundary>
				)}
			</View>
		</ScrollView>
	);
};

const localStyles = StyleSheet.create({
	stage: {
		width: '100%',
		borderWidth: 1,
		borderRadius: 10,
		padding: 12,
		marginTop: 12,
		gap: 8,
	},
	stageHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	hint: {
		fontSize: 13,
		fontFamily: 'Poppins_400Regular',
		opacity: 0.8,
	},
	detail: {
		fontSize: 12,
		fontFamily: 'Poppins_400Regular',
		opacity: 0.7,
	},
	button: {
		alignSelf: 'flex-start',
		borderRadius: 8,
		paddingHorizontal: 14,
		height: 36,
		justifyContent: 'center',
	},
	buttonText: {
		fontSize: 14,
		fontFamily: 'Poppins_400Regular',
	},
	// One pixel, invisible: the page has no UI, it only has to run.
	webViewContainer: {
		width: 1,
		height: 1,
		opacity: 0,
	},
});

export default TextRecognitionDiagnoseScreen;
