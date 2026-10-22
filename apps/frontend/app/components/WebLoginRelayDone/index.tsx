import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';

/**
 * Shown in the web login popup after it passed the code on to the app window (see webLoginRelay).
 * The popup tries to close itself, if the browser does not allow it, this asks to close it.
 */
const WebLoginRelayDone = () => {
	const { theme } = useTheme();
	const { translate } = useLanguage();

	useEffect(() => {
		try {
			window.close();
		} catch {
			// The message below stays.
		}
	}, []);

	return (
		<View style={[styles.container, { backgroundColor: theme.screen.background }]}>
			<MaterialCommunityIcons name="check-circle-outline" size={64} color={theme.screen.icon} />
			<Text style={[styles.text, { color: theme.screen.text }]}>{translate(TranslationKeys.sign_in_completed_close_window)}</Text>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 24,
		gap: 16,
	},
	text: {
		fontSize: 18,
		textAlign: 'center',
	},
});

export default WebLoginRelayDone;
