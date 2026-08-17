import React, { useCallback, useMemo, useState } from 'react';
import { Appearance as RNAppearance, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Updates from 'expo-updates';
import { router } from 'expo-router';

import { darkTheme, lightTheme } from '@/styles/themes';
import { configureStore } from '@/redux/store';
import translations from '@/locales/translations.json';
import { TranslationKeys } from '@/locales/keys';
import { getVersionInternalForAppsettingsScreen } from '@/config';

/**
 * Fallback screen rendered by the `ErrorBoundary` exports in `app/_layout.tsx`
 * and `app/(app)/_layout.tsx`.
 *
 * Deliberately does NOT use the app's hooks (`useTheme`, `useLanguage`): those
 * subscribe to the redux store and re-render on every dispatch, and this
 * component has to survive exactly the situations where the surrounding tree is
 * already broken. Theme and language are read once, defensively, from the store
 * singleton - if even that fails we fall back to the light theme and English.
 */

type Appearance = {
	theme: typeof lightTheme;
	language: string;
};

function readAppearance(): Appearance {
	try {
		const settings = configureStore.getState().settings;
		const selected = settings?.selectedTheme;
		const isDark = selected === 'systematic' ? RNAppearance.getColorScheme() === 'dark' : selected === 'dark';
		return {
			theme: isDark ? darkTheme : lightTheme,
			language: settings?.language || 'en',
		};
	} catch {
		return { theme: lightTheme, language: 'en' };
	}
}

function translateSafe(key: TranslationKeys, language: string): string {
	const entry = (translations as Record<string, Record<string, string> | undefined>)[key];
	return entry?.[language] || entry?.en || key;
}

/**
 * Everything a bug report needs to pin down *which* bundle broke: the OTA update
 * id identifies the exact published update, `isEmbeddedLaunch` tells us whether
 * the crash also exists in the store binary.
 */
function collectDiagnostics(error: Error): string {
	const lines = [
		`message: ${error?.message ?? 'unknown'}`,
		`version: ${getVersionInternalForAppsettingsScreen()}`,
		`platform: ${Platform.OS}`,
	];
	try {
		lines.push(
			`updateId: ${Updates.updateId ?? 'none'}`,
			`channel: ${Updates.channel ?? 'none'}`,
			`runtimeVersion: ${Updates.runtimeVersion ?? 'none'}`,
			`embeddedLaunch: ${String(Updates.isEmbeddedLaunch)}`
		);
	} catch {
		lines.push('updateId: unavailable');
	}
	if (error?.stack) {
		lines.push('', error.stack);
	}
	return lines.join('\n');
}

async function reloadApp(): Promise<void> {
	if (Platform.OS === 'web') {
		if (typeof window !== 'undefined') {
			window.location.reload();
		}
		return;
	}
	await Updates.reloadAsync();
}

export type AppErrorBoundaryProps = {
	error: Error;
	/** Provided by expo-router's `Try`: clears the error state and re-renders the route. */
	retry: () => Promise<void>;
	/**
	 * `root` is the last resort - the whole app including its providers is gone,
	 * so only reloading can help. `screen` still has the app shell alive around
	 * it and can additionally offer a way back to the start screen.
	 */
	variant: 'root' | 'screen';
};

const AppErrorBoundary: React.FC<AppErrorBoundaryProps> = ({ error, retry, variant }) => {
	const { theme, language } = useMemo(readAppearance, []);
	const [copied, setCopied] = useState(false);
	const [busy, setBusy] = useState(false);

	const t = useCallback((key: TranslationKeys) => translateSafe(key, language), [language]);

	const handleRetry = useCallback(async () => {
		setBusy(true);
		try {
			await retry();
		} finally {
			setBusy(false);
		}
	}, [retry]);

	const handleReload = useCallback(async () => {
		setBusy(true);
		try {
			await reloadApp();
		} catch {
			// reloadAsync can reject on a dev client without an update loaded;
			// leaving the fallback on screen is the correct outcome here.
			setBusy(false);
		}
	}, []);

	const handleHome = useCallback(async () => {
		await retry();
		router.replace('/foodoffers');
	}, [retry]);

	const handleCopy = useCallback(async () => {
		await Clipboard.setStringAsync(collectDiagnostics(error));
		setCopied(true);
	}, [error]);

	const actions: { key: string; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; onPress: () => void; primary?: boolean }[] = [
		{
			key: 'retry',
			label: t(TranslationKeys.error_boundary_retry),
			icon: 'refresh',
			onPress: handleRetry,
			primary: true,
		},
	];

	if (variant === 'screen') {
		actions.push({
			key: 'home',
			label: t(TranslationKeys.error_boundary_back_to_start),
			icon: 'home-outline',
			onPress: handleHome,
		});
	}

	actions.push(
		{
			key: 'reload',
			label: t(TranslationKeys.error_boundary_reload_app),
			icon: 'restart',
			onPress: handleReload,
		},
		{
			key: 'copy',
			label: copied
				? t(TranslationKeys.error_boundary_details_copied)
				: t(TranslationKeys.error_boundary_copy_details),
			icon: copied ? 'check' : 'clipboard-outline',
			onPress: handleCopy,
		}
	);

	return (
		<ScrollView
			style={[styles.container, { backgroundColor: theme.screen.background }]}
			contentContainerStyle={styles.contentContainer}
		>
			<View style={styles.content}>
				<MaterialCommunityIcons name="alert-circle-outline" size={56} color={theme.screen.icon} />

				<Text style={[styles.heading, { color: theme.screen.text }]}>
					{t(TranslationKeys.error_boundary_title)}
				</Text>

				<Text style={[styles.body, { color: theme.screen.text }]}>
					{t(TranslationKeys.error_boundary_description)}
				</Text>

				<View style={[styles.messageBox, { backgroundColor: theme.screen.iconBg }]}>
					<Text style={[styles.message, { color: theme.screen.text }]} selectable>
						{error?.message || t(TranslationKeys.error_boundary_unknown_error)}
					</Text>
				</View>

				<View style={styles.actions}>
					{actions.map(action => (
						<TouchableOpacity
							key={action.key}
							style={[
								styles.action,
								{
									backgroundColor: action.primary ? theme.button.background : theme.screen.iconBg,
								},
							]}
							onPress={action.onPress}
							disabled={busy}
							accessibilityRole="button"
							accessibilityLabel={action.label}
							accessibilityState={{ disabled: busy }}
						>
							<MaterialCommunityIcons
								name={action.icon}
								size={20}
								color={action.primary ? theme.button.text : theme.screen.icon}
							/>
							<Text
								style={[
									styles.actionLabel,
									{ color: action.primary ? theme.button.text : theme.screen.text },
								]}
							>
								{action.label}
							</Text>
						</TouchableOpacity>
					))}
				</View>

				<Text style={[styles.version, { color: theme.screen.placeholder }]}>{getVersionInternalForAppsettingsScreen()}</Text>
			</View>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	contentContainer: {
		flexGrow: 1,
		justifyContent: 'center',
	},
	content: {
		width: '100%',
		maxWidth: 480,
		alignSelf: 'center',
		padding: 24,
		alignItems: 'center',
		gap: 14,
	},
	heading: {
		fontSize: 22,
		fontFamily: 'Poppins_700Bold',
		textAlign: 'center',
	},
	body: {
		fontSize: 15,
		fontFamily: 'Poppins_400Regular',
		textAlign: 'center',
		opacity: 0.8,
	},
	messageBox: {
		width: '100%',
		borderRadius: 10,
		padding: 12,
	},
	message: {
		fontSize: 13,
		fontFamily: 'Poppins_400Regular',
	},
	actions: {
		width: '100%',
		gap: 10,
		marginTop: 6,
	},
	action: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		borderRadius: 10,
		paddingVertical: 12,
		paddingHorizontal: 16,
	},
	actionLabel: {
		fontSize: 15,
		fontFamily: 'Poppins_600SemiBold',
	},
	version: {
		fontSize: 12,
		fontFamily: 'Poppins_400Regular',
		marginTop: 4,
	},
});

export default AppErrorBoundary;
