import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import * as StoreReview from 'expo-store-review';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SettingsListGroupTitle } from 'repo-depkit-common-ui';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { RateAppSettingsItem } from '@/components/RateAppSettingsItem/RateAppSettingsItem';
import SettingsList from '@/components/SettingsList/SettingsList';

const RateApp = () => {
	useSetPageTitle(TranslationKeys.rate_app);
	const { theme } = useTheme();
	const { translate } = useLanguage();

	const [hasAction, setHasAction] = useState<string>('…');
	const [isAvailable, setIsAvailable] = useState<string>('…');
	const [storeUrl, setStoreUrl] = useState<string>('…');

	useEffect(() => {
		StoreReview.hasAction().then((v) => setHasAction(String(v)));
		StoreReview.isAvailableAsync().then((v) => setIsAvailable(String(v)));
		setStoreUrl(StoreReview.storeUrl() ?? 'null');
	}, []);

	const handleRequestReview = useCallback(async () => {
		await StoreReview.requestReview();
	}, []);

	return (
		<ScrollView
			style={[styles.container, { backgroundColor: theme.screen.background }]}
			contentContainerStyle={{ backgroundColor: theme.screen.background }}
		>
			<View style={styles.content}>
				<Text style={[styles.heading, { color: theme.screen.text }]}>{translate(TranslationKeys.rate_app)}</Text>
				<RateAppSettingsItem debug />
				<SettingsListGroupTitle title="Weitere Informationen" />
				<SettingsList
					label="hasAction()"
					value={hasAction}
					groupPosition="top"
					showSeparator
					leftIcon={<MaterialCommunityIcons name="information-outline" size={22} color={theme.screen.icon} />}
					iconBgColor="transparent"
				/>
				<SettingsList
					label="isAvailableAsync()"
					value={isAvailable}
					groupPosition="middle"
					showSeparator
					leftIcon={<MaterialCommunityIcons name="check-circle-outline" size={22} color={theme.screen.icon} />}
					iconBgColor="transparent"
				/>
				<SettingsList
					label="requestReview()"
					handleFunction={handleRequestReview}
					groupPosition="middle"
					showSeparator
					leftIcon={<MaterialCommunityIcons name="star-outline" size={22} color={theme.screen.icon} />}
					iconBgColor="transparent"
				/>
				<SettingsList
					label="storeUrl()"
					value={storeUrl}
					groupPosition="bottom"
					showSeparator={false}
					leftIcon={<MaterialCommunityIcons name="link-variant" size={22} color={theme.screen.icon} />}
					iconBgColor="transparent"
				/>
			</View>
		</ScrollView>
	);
};

export default RateApp;

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
});
