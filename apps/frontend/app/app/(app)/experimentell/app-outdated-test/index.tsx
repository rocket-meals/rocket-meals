import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import SettingsList from '@/components/SettingsList/SettingsList';
import { useShowAppOutdatedSheet } from '@/components/AppOutdatedSheet/AppOutdatedSheet';
import { getCustomerConfig, getCustomerConfigurations, getVersionInternalForAppsettingsScreen } from '@/config';
import { InstalledAppStoreCheck, StoreVersionComparison, StoreVersionHelper } from '@/helper/StoreVersionHelper';

const COMPARISON_TEXT_KEYS: Record<StoreVersionComparison, TranslationKeys> = {
	newer_in_store: TranslationKeys.store_versions_newer_in_store,
	up_to_date: TranslationKeys.store_versions_up_to_date,
	older_in_store: TranslationKeys.store_versions_older_in_store,
	unknown: TranslationKeys.unknown,
};

// Lets you try the "new version available" sheet. The check below is the real
// one (installed app against its own store, the same AppOutdatedNotice runs on
// app start), the button shows the sheet whatever the check says.
const AppOutdatedTest = () => {
	useSetPageTitle(TranslationKeys.app_outdated_test);
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const installedVersion = getVersionInternalForAppsettingsScreen();
	const installedAppIds = useMemo(() => StoreVersionHelper.getInstalledAppIds(Constants.expoConfig, getCustomerConfig()), []);

	const [check, setCheck] = useState<InstalledAppStoreCheck | null>(null);
	const showAppOutdatedSheet = useShowAppOutdatedSheet();

	const runCheck = useCallback(() => {
		setCheck(null);
		StoreVersionHelper.checkInstalledAppAgainstStore(Platform.OS, installedAppIds, installedVersion).then(setCheck);
	}, [installedAppIds, installedVersion]);

	useEffect(() => {
		runCheck();
	}, [runCheck]);

	const previewStoreUrl = useMemo(() => {
		if (check?.storeUrl) return check.storeUrl;
		if (Platform.OS === 'android' && installedAppIds.bundleIdAndroid) return StoreVersionHelper.getGooglePlayUrl(installedAppIds.bundleIdAndroid);
		const appleAppId = StoreVersionHelper.findConfigForInstalledApp(getCustomerConfigurations(), installedAppIds)?.appleAppId;
		return appleAppId ? `https://apps.apple.com/app/id${appleAppId}` : null;
	}, [check, installedAppIds]);

	let storeVersionText = translate(TranslationKeys.loading);
	if (Platform.OS === 'web') {
		storeVersionText = translate(TranslationKeys.app_outdated_no_store_on_web);
	} else if (check) {
		storeVersionText = check.storeVersion ?? `${translate(TranslationKeys.error)}: ${check.error ?? ''}`;
	}

	return (
		<ScrollView style={[styles.container, { backgroundColor: theme.screen.background }]} contentContainerStyle={{ backgroundColor: theme.screen.background }}>
			<View style={styles.content}>
				<Text style={[styles.heading, { color: theme.screen.text }]}>{translate(TranslationKeys.app_outdated_test)}</Text>
				<Text style={[styles.hint, { color: theme.screen.text }]}>{translate(TranslationKeys.app_outdated_test_hint)}</Text>
				<SettingsList
					label={translate(TranslationKeys.store_versions_installed)}
					value={installedVersion}
					groupPosition="top"
					showSeparator
					leftIcon={<MaterialCommunityIcons name="cellphone-information" size={22} color={theme.screen.icon} />}
					iconBgColor="transparent"
				/>
				<SettingsList
					label={translate(TranslationKeys.app_outdated_store_version)}
					value={storeVersionText}
					groupPosition="middle"
					showSeparator
					leftIcon={<MaterialCommunityIcons name="store-outline" size={22} color={theme.screen.icon} />}
					iconBgColor="transparent"
				/>
				<SettingsList
					label={translate(TranslationKeys.app_outdated_check_result)}
					value={check ? translate(COMPARISON_TEXT_KEYS[check.comparison]) : translate(TranslationKeys.loading)}
					groupPosition="middle"
					showSeparator
					leftIcon={<MaterialCommunityIcons name={check?.comparison === 'newer_in_store' ? 'alert-outline' : 'check-circle-outline'} size={22} color={theme.screen.icon} />}
					iconBgColor="transparent"
				/>
				<SettingsList
					label={translate(TranslationKeys.store_versions_reload)}
					handleFunction={runCheck}
					groupPosition="middle"
					showSeparator
					leftIcon={<MaterialCommunityIcons name="refresh" size={22} color={theme.screen.icon} />}
					iconBgColor="transparent"
				/>
				<SettingsList
					label={translate(TranslationKeys.app_outdated_show_preview)}
					handleFunction={() => showAppOutdatedSheet(previewStoreUrl)}
					groupPosition="middle"
					showSeparator
					leftIcon={<MaterialCommunityIcons name="cellphone-arrow-down" size={22} color={theme.screen.icon} />}
					iconBgColor="transparent"
				/>
				<SettingsList
					label={translate(TranslationKeys.app_outdated_show_preview_canteen_background)}
					handleFunction={() => showAppOutdatedSheet(previewStoreUrl, undefined, 'canteenBackground')}
					groupPosition="bottom"
					showSeparator={false}
					leftIcon={<MaterialCommunityIcons name="image-filter-hdr" size={22} color={theme.screen.icon} />}
					iconBgColor="transparent"
				/>
			</View>
		</ScrollView>
	);
};

export default AppOutdatedTest;

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
	hint: {
		fontSize: 14,
		fontFamily: 'Poppins_400Regular',
		marginBottom: 10,
	},
});
