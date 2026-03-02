import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import styles from './styles';
import { RateAppSettingsItem } from '@/components/RateAppSettingsItem/RateAppSettingsItem';

const RateApp = () => {
	useSetPageTitle(TranslationKeys.rate_app);
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const [debugLogs, setDebugLogs] = useState<string[]>([]);

	const addLog = (msg: string) => setDebugLogs(logs => [...logs, msg]);

	return (
		<ScrollView
			style={{ ...styles.container, backgroundColor: theme.screen.background }}
			contentContainerStyle={{
				...styles.contentContainer,
				backgroundColor: theme.screen.background,
			}}
		>
			<View style={{ ...styles.content }}>
				<Text style={{ ...styles.heading, color: theme.screen.text }}>{translate(TranslationKeys.rate_app)}</Text>
				<RateAppSettingsItem onLog={addLog} />
				{debugLogs.length > 0 && (
					<View style={styles.debugLogContainer}>
						<ScrollView>
							{debugLogs.map((l, i) => (
								<Text key={i} style={styles.debugLogText}>
									{l}
								</Text>
							))}
						</ScrollView>
					</View>
				)}
			</View>
		</ScrollView>
	);
};

export default RateApp;
