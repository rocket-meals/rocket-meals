import React, { useCallback, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import * as Haptics from 'expo-haptics';

import { RootState } from '@/redux/reducer';
import { useTheme } from '@/hooks/useTheme';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import styles from '../styles';

const HapticsScreen = () => {
	useSetPageTitle(TranslationKeys.haptics_test);
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { primaryColor } = useSelector((state: RootState) => state.settings);
	const [lastEvent, setLastEvent] = useState<string | null>(null);

	const handleHaptic = useCallback(async (label: string, action: () => Promise<void>) => {
		await action();
		setLastEvent(label);
	}, []);

	const options = [
		{
			key: 'selection',
			label: 'Selection',
			action: () => Haptics.selectionAsync(),
		},
		{
			key: 'impact-light',
			label: 'Impact Light',
			action: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
		},
		{
			key: 'impact-medium',
			label: 'Impact Medium',
			action: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
		},
		{
			key: 'impact-heavy',
			label: 'Impact Heavy',
			action: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
		},
		{
			key: 'notification-success',
			label: 'Notification Success',
			action: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
		},
		{
			key: 'notification-warning',
			label: 'Notification Warning',
			action: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
		},
		{
			key: 'notification-error',
			label: 'Notification Error',
			action: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
		},
	];

	return (
		<ScrollView
			style={{ ...styles.container, backgroundColor: theme.screen.background }}
			contentContainerStyle={{
				...styles.contentContainer,
				backgroundColor: theme.screen.background,
			}}
		>
			<View style={styles.content}>
				<Text style={{ ...styles.heading, color: theme.screen.text }}>{translate(TranslationKeys.haptics_test)}</Text>
				<View style={styles.section}>
					<Text style={{ ...styles.body, color: theme.screen.text }}>
						{translate(TranslationKeys.haptics_test_description)}
					</Text>
				</View>
				<View style={styles.section}>
					{options.map(option => {
						return (
							<TouchableOpacity
								key={option.key}
								onPress={() => handleHaptic(option.label, option.action)}
								style={{ ...styles.listItem, backgroundColor: theme.card.background }}
							>
								<View style={styles.col}>
									<View style={{ backgroundColor: primaryColor, borderRadius: 8, padding: 6 }}>
										<MaterialCommunityIcons name="vibrate" size={20} color={theme.screen.icon} />
									</View>
									<Text style={{ ...styles.body, color: theme.screen.text }}>{option.label}</Text>
								</View>
							</TouchableOpacity>
						);
					})}
				</View>
				<View style={[styles.logsContainer, { backgroundColor: theme.card.background }]}>
					<Text style={{ ...styles.body, color: theme.screen.text }}>{translate(TranslationKeys.last_haptic_event)}</Text>
					<Text style={{ ...styles.logEntry, color: theme.screen.text }}>
						{lastEvent ?? translate(TranslationKeys.haptics_test_empty)}
					</Text>
				</View>
			</View>
		</ScrollView>
	);
};

export default HapticsScreen;
