import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import * as StoreReview from 'expo-store-review';
import styles from './styles';

const RateApp = () => {
	useSetPageTitle(TranslationKeys.rate_app);
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const [debugLogs, setDebugLogs] = useState<string[]>([]);

	const addLog = (msg: string) => setDebugLogs(logs => [...logs, msg]);

	const handleRate = async () => {
		try {
			addLog('Checking availability');
			const available = await StoreReview.isAvailableAsync();
			addLog(`Available: ${available}`);
			if (available) {
				await StoreReview.requestReview();
				addLog('Review requested');
			}
		} catch (e: any) {
			addLog(`Error: ${e?.message || e}`);
			console.log('Error requesting review', e);
		}
	};

	return (
		<ScrollView
			style={{ ...styles.container, backgroundColor: theme.screen.background }}
			contentContainerStyle={{
				...styles.contentContainer,
				backgroundColor: theme.screen.background,
			}}
		>
			<View style={{ ...styles.content }}>
				<Text style={{ ...styles.heading, color: theme.screen.text }}>
					{translate(TranslationKeys.rate_app)}
				</Text>
				<TouchableOpacity
					style={{ ...styles.listItem, backgroundColor: theme.screen.iconBg }}
					onPress={handleRate}
				>
					<Text style={{ ...styles.body, color: theme.screen.text }}>
						{translate(TranslationKeys.rate_app)}
					</Text>
				</TouchableOpacity>
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
