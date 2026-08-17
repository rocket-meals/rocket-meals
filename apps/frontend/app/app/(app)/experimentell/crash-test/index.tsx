import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import styles from '../styles';

/**
 * Playground for the error boundaries exported from `app/_layout.tsx` and
 * `app/(app)/_layout.tsx`.
 *
 * The point of this screen is the *difference* between the four buttons. React
 * error boundaries only catch errors thrown while React itself is working:
 * during render, in lifecycle methods and in effects. Errors from an event
 * handler or a rejected promise happen outside that window - no boundary sees
 * them, they go straight to the global handler. Without crash reporting they
 * are invisible in production, which is exactly why the boundary alone is not
 * the whole story.
 */

const CRASH_MESSAGE = 'Rocket Meals crash test';

/** Throws while React renders it -> caught by the nearest error boundary. */
const ThrowDuringRender = (): React.ReactElement => {
	throw new Error(`${CRASH_MESSAGE}: render`);
};

/** Throws from an effect -> React treats this like a render error and it is caught too. */
const ThrowInEffect = (): React.ReactElement | null => {
	useEffect(() => {
		throw new Error(`${CRASH_MESSAGE}: useEffect`);
	}, []);
	return null;
};

type CrashKind = 'render' | 'effect';

const CrashTestScreen = () => {
	useSetPageTitle(TranslationKeys.crash_test);
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const [crash, setCrash] = useState<CrashKind | null>(null);

	// Rendered as a sibling so the buttons above stay mounted until the
	// boundary takes over - makes it obvious that the whole subtree is replaced.
	const crashElement = (() => {
		if (crash === 'render') return <ThrowDuringRender />;
		if (crash === 'effect') return <ThrowInEffect />;
		return null;
	})();

	const triggers: {
		key: string;
		label: string;
		icon: keyof typeof MaterialCommunityIcons.glyphMap;
		caught: boolean;
		onPress: () => void;
	}[] = [
		{
			key: 'render',
			label: translate(TranslationKeys.crash_test_render_error),
			icon: 'application-brackets-outline',
			caught: true,
			onPress: () => setCrash('render'),
		},
		{
			key: 'effect',
			label: translate(TranslationKeys.crash_test_effect_error),
			icon: 'sync-alert',
			caught: true,
			onPress: () => setCrash('effect'),
		},
		{
			key: 'event',
			label: translate(TranslationKeys.crash_test_event_error),
			icon: 'gesture-tap',
			caught: false,
			onPress: () => {
				throw new Error(`${CRASH_MESSAGE}: event handler`);
			},
		},
		{
			key: 'promise',
			label: translate(TranslationKeys.crash_test_promise_error),
			icon: 'clock-alert-outline',
			caught: false,
			onPress: () => {
				// Deliberately unhandled: this is the case a boundary cannot see.
				void Promise.reject(new Error(`${CRASH_MESSAGE}: promise rejection`));
			},
		},
	];

	return (
		<ScrollView
			style={{ ...styles.container, backgroundColor: theme.screen.background }}
			contentContainerStyle={{ ...styles.contentContainer, backgroundColor: theme.screen.background }}
		>
			<View style={styles.content}>
				<Text style={{ ...styles.heading, color: theme.screen.text }}>
					{translate(TranslationKeys.crash_test)}
				</Text>

				<View style={styles.section}>
					<Text style={{ ...styles.body, color: theme.screen.text }}>
						{translate(TranslationKeys.crash_test_description)}
					</Text>
				</View>

				<View style={styles.section}>
					{triggers.map(trigger => (
						<TouchableOpacity
							key={trigger.key}
							style={{ ...styles.listItem, backgroundColor: theme.screen.iconBg }}
							onPress={trigger.onPress}
							accessibilityRole="button"
							accessibilityLabel={trigger.label}
						>
							<View style={{ ...styles.col, ...localStyles.triggerLabel }}>
								<MaterialCommunityIcons name={trigger.icon} size={24} color={theme.screen.icon} />
								<Text style={{ ...styles.body, color: theme.screen.text }}>{trigger.label}</Text>
							</View>
							<Text style={{ ...styles.logEntry, ...localStyles.triggerStatus, color: theme.screen.placeholder }}>
								{trigger.caught
									? translate(TranslationKeys.crash_test_caught)
									: translate(TranslationKeys.crash_test_not_caught)}
							</Text>
						</TouchableOpacity>
					))}
				</View>

				<View style={{ ...styles.logsContainer, backgroundColor: theme.screen.iconBg }}>
					<Text style={{ ...styles.logEntry, color: theme.screen.text }}>
						{translate(TranslationKeys.crash_test_not_caught_hint)}
					</Text>
				</View>

				{crashElement}
			</View>
		</ScrollView>
	);
};

// The shared experimentell styles cap `col` at 70% width, which crowds the
// two-line trigger labels against the caught/not-caught status on narrow
// screens - let the label take the remaining space and keep the status intact.
const localStyles = StyleSheet.create({
	triggerLabel: {
		flex: 1,
		maxWidth: undefined,
	},
	triggerStatus: {
		marginLeft: 12,
		textAlign: 'right',
		flexShrink: 0,
	},
});

export default CrashTestScreen;
