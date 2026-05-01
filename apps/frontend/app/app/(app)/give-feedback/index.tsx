import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { RateAppSettingsItem } from '@/components/RateAppSettingsItem/RateAppSettingsItem';
import SettingsList from '@/components/SettingsList';
import { MaterialIcons, Octicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppSelector } from '@/redux/hooks';

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		width: '100%',
		height: '100%',
		padding: 20,
	},
	heading: {
		fontSize: 24,
		fontFamily: 'Poppins_700Bold',
		marginVertical: 10,
	},
	description: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
		marginBottom: 10,
	},
	groupContainer: {
		marginBottom: 20,
	},
});

const GiveFeedback = () => {
	useSetPageTitle(TranslationKeys.rueckmeldung_geben);
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { primaryColor } = useAppSelector((state) => state.settings);

	return (
		<ScrollView
			style={{ ...styles.container, backgroundColor: theme.screen.background }}
			contentContainerStyle={{ backgroundColor: theme.screen.background }}
		>
			<View style={styles.content}>
				<Text style={{ ...styles.heading, color: theme.screen.text }}>{translate(TranslationKeys.rueckmeldung_geben)}</Text>

				<View style={styles.groupContainer}>
					<Text style={{ ...styles.description, color: theme.screen.text }}>{translate(TranslationKeys.rueckmeldung_rate_app_description)}</Text>
					<RateAppSettingsItem />
				</View>

				<View style={styles.groupContainer}>
					<Text style={{ ...styles.description, color: theme.screen.text }}>{translate(TranslationKeys.rueckmeldung_feedback_description)}</Text>
					<SettingsList
						iconBgColor={primaryColor}
						leftIcon={<MaterialIcons name="feedback" size={24} color={theme.screen.icon} />}
						label={translate(TranslationKeys.feedback_and_support)}
						rightIcon={<Octicons name="chevron-right" size={24} color={theme.screen.icon} />}
						handleFunction={() => router.navigate('/feedback-support')}
						groupPosition="single"
					/>
				</View>
			</View>
		</ScrollView>
	);
};

export default GiveFeedback;
