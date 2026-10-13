import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SettingsListGroupTitle } from 'repo-depkit-common-ui';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import SettingsList from '@/components/SettingsList/SettingsList';
import useCustomerConfig from '@/hooks/useCustomerConfig';
import { getCustomerConfig, getCustomerConfigurations, getVersionInternalForAppsettingsScreen } from '@/config';
import { CommonSystemActionHelper } from '@/helper/SystemActionHelper';
import { StoreAppRef, StoreVersionComparison, StoreVersionHelper, StoreVersionResult } from '@/helper/StoreVersionHelper';
import { useAppSelector } from '@/redux/hooks';

const COMPARISON_TEXT_KEYS: Record<StoreVersionComparison, TranslationKeys> = {
	newer_in_store: TranslationKeys.store_versions_newer_in_store,
	up_to_date: TranslationKeys.store_versions_up_to_date,
	older_in_store: TranslationKeys.store_versions_older_in_store,
	unknown: TranslationKeys.unknown,
};

const COMPARISON_ICONS: Record<StoreVersionComparison, keyof typeof MaterialCommunityIcons.glyphMap> = {
	newer_in_store: 'arrow-up-bold-circle-outline',
	up_to_date: 'check-circle-outline',
	older_in_store: 'arrow-down-bold-circle-outline',
	unknown: 'help-circle-outline',
};

type StoreResults = {
	appStore: StoreVersionResult | null;
	googlePlay: StoreVersionResult | null;
};

type AppSourceKey = 'installed' | 'customer' | 'server';

const EMPTY_RESULTS: Record<AppSourceKey, StoreResults> = {
	installed: { appStore: null, googlePlay: null },
	customer: { appStore: null, googlePlay: null },
	server: { appStore: null, googlePlay: null },
};

type StoreRowsProps = {
	storeName: string;
	appId: string | undefined;
	installedVersion: string;
	result: StoreVersionResult | null;
	isFirst: boolean;
	isLast: boolean;
};

const MAX_STARS = 5;

// "3,4 ★★★☆☆ (76)" - the average rounded to whole stars for the symbols
const formatRating = (rating: number | null, ratingCount: number | null, language: string): string | null => {
	if (rating === null) return null;
	const fullStars = Math.min(MAX_STARS, Math.max(0, Math.round(rating)));
	const stars = '★'.repeat(fullStars) + '☆'.repeat(MAX_STARS - fullStars);
	const average = rating.toLocaleString(language, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
	return ratingCount === null ? `${average} ${stars}` : `${average} ${stars} (${ratingCount})`;
};

// Three rows per store: the id that was looked up, the version found in the
// store compared with the installed one (tapping it opens the store) and the
// star rating.
const StoreRows = ({ storeName, appId, installedVersion, result, isFirst, isLast }: StoreRowsProps) => {
	const { theme } = useTheme();
	const { translate, language } = useLanguage();

	let valueText = translate(TranslationKeys.loading);
	if (result) {
		const comparisonText = translate(COMPARISON_TEXT_KEYS[StoreVersionHelper.compare(installedVersion, result.version)]);
		valueText = result.version ? `${result.version} · ${comparisonText}` : `${translate(TranslationKeys.error)}: ${result.error ?? ''}`;
	}
	const comparison = result ? StoreVersionHelper.compare(installedVersion, result.version) : 'unknown';
	const storeUrl = result?.storeUrl;

	let ratingText = translate(TranslationKeys.loading);
	if (result) {
		ratingText = formatRating(result.rating, result.ratingCount, language) ?? translate(TranslationKeys.unknown);
	}

	return (
		<>
			<SettingsList
				label={`${storeName} · ${translate(TranslationKeys.store_versions_app_id)}`}
				value={appId ?? translate(TranslationKeys.unknown)}
				groupPosition={isFirst ? 'top' : 'middle'}
				showSeparator
				leftIcon={<MaterialCommunityIcons name="identifier" size={22} color={theme.screen.icon} />}
				iconBgColor="transparent"
			/>
			<SettingsList
				label={storeName}
				value={valueText}
				handleFunction={storeUrl ? () => CommonSystemActionHelper.openExternalURL(storeUrl, true) : undefined}
				groupPosition="middle"
				showSeparator
				leftIcon={<MaterialCommunityIcons name={COMPARISON_ICONS[comparison]} size={22} color={theme.screen.icon} />}
				iconBgColor="transparent"
			/>
			<SettingsList
				label={`${storeName} · ${translate(TranslationKeys.store_versions_rating)}`}
				value={ratingText}
				groupPosition={isLast ? 'bottom' : 'middle'}
				showSeparator={!isLast}
				leftIcon={<MaterialCommunityIcons name="star-outline" size={22} color={theme.screen.icon} />}
				iconBgColor="transparent"
			/>
		</>
	);
};

type AppSourceSectionProps = {
	title: string;
	appRef: StoreAppRef;
	installedVersion: string;
	results: StoreResults;
};

const AppSourceSection = ({ title, appRef, installedVersion, results }: AppSourceSectionProps) => (
	<>
		<SettingsListGroupTitle title={title} />
		<StoreRows storeName="App Store" appId={appRef.bundleIdIos ?? appRef.appleAppId} installedVersion={installedVersion} result={results.appStore} isFirst isLast={false} />
		<StoreRows storeName="Google Play" appId={appRef.bundleIdAndroid} installedVersion={installedVersion} result={results.googlePlay} isFirst={false} isLast />
	</>
);

const loadStoreResults = async (appRef: StoreAppRef): Promise<StoreResults> => {
	const [appStore, googlePlay] = await Promise.all([StoreVersionHelper.fetchAppStoreVersion(appRef), StoreVersionHelper.fetchGooglePlayVersion(appRef.bundleIdAndroid)]);
	return { appStore, googlePlay };
};

const StoreVersions = () => {
	useSetPageTitle(TranslationKeys.store_versions);
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { appSettings } = useAppSelector(state => state.settings);
	const installedVersion = getVersionInternalForAppsettingsScreen();

	// Three apps that can differ from each other:
	// - installed: the binary on this device, ids from the embedded app config
	// - customer: the customer configuration selected in the app (settings) -
	//   switching it changes the backend, not the installed binary
	// - server: the app the server links to in app_settings (app download banner)
	const installedAppRef = useMemo(() => StoreVersionHelper.getInstalledAppIds(Constants.expoConfig, getCustomerConfig()), []);
	const installedAppConfig = useMemo(() => StoreVersionHelper.findConfigForInstalledApp(getCustomerConfigurations(), installedAppRef), [installedAppRef]);
	const installedAppName = installedAppConfig?.projectName ?? Constants.expoConfig?.name ?? translate(TranslationKeys.unknown);
	const installedAppId = Platform.select({ ios: installedAppRef.bundleIdIos, android: installedAppRef.bundleIdAndroid });

	const customerConfig = useCustomerConfig();
	const customerAppRef = useMemo<StoreAppRef>(
		() => ({ bundleIdIos: customerConfig.bundleIdIos, appleAppId: customerConfig.appleAppId, bundleIdAndroid: customerConfig.bundleIdAndroid }),
		[customerConfig]
	);
	const customerDiffers = !!installedAppConfig && installedAppConfig.projectName !== customerConfig.projectName;

	const serverAppRef = useMemo(
		() => StoreVersionHelper.getStoreAppRefFromStoreUrls(appSettings?.app_stores_url_to_apple, appSettings?.app_stores_url_to_google),
		[appSettings?.app_stores_url_to_apple, appSettings?.app_stores_url_to_google]
	);

	const [results, setResults] = useState<Record<AppSourceKey, StoreResults>>(EMPTY_RESULTS);

	const loadStoreVersions = useCallback(() => {
		setResults(EMPTY_RESULTS);
		const sources: [AppSourceKey, StoreAppRef][] = [
			['installed', installedAppRef],
			['customer', customerAppRef],
			['server', serverAppRef],
		];
		for (const [key, appRef] of sources) {
			loadStoreResults(appRef).then(result => setResults(prev => ({ ...prev, [key]: result })));
		}
	}, [installedAppRef, customerAppRef, serverAppRef]);

	useEffect(() => {
		loadStoreVersions();
	}, [loadStoreVersions]);

	const customerTitle = `${translate(TranslationKeys.backend_server)}: ${customerConfig.projectName}`;

	return (
		<ScrollView style={[styles.container, { backgroundColor: theme.screen.background }]} contentContainerStyle={{ backgroundColor: theme.screen.background }}>
			<View style={styles.content}>
				<Text style={[styles.heading, { color: theme.screen.text }]}>{translate(TranslationKeys.store_versions)}</Text>
				<Text style={[styles.hint, { color: theme.screen.text }]}>{translate(TranslationKeys.store_versions_hint)}</Text>
				<SettingsListGroupTitle title={translate(TranslationKeys.store_versions_this_device)} />
				<SettingsList
					label={translate(TranslationKeys.store_versions_app)}
					value={installedAppName}
					groupPosition="top"
					showSeparator
					leftIcon={<MaterialCommunityIcons name="cellphone" size={22} color={theme.screen.icon} />}
					iconBgColor="transparent"
				/>
				{installedAppId && (
					<SettingsList
						label={translate(TranslationKeys.store_versions_app_id)}
						value={installedAppId}
						groupPosition="middle"
						showSeparator
						leftIcon={<MaterialCommunityIcons name="identifier" size={22} color={theme.screen.icon} />}
						iconBgColor="transparent"
					/>
				)}
				<SettingsList
					label={translate(TranslationKeys.store_versions_installed)}
					value={installedVersion}
					groupPosition="middle"
					showSeparator
					leftIcon={<MaterialCommunityIcons name="cellphone-information" size={22} color={theme.screen.icon} />}
					iconBgColor="transparent"
				/>
				<SettingsList
					label={translate(TranslationKeys.backend_server)}
					value={customerDiffers ? `${customerConfig.projectName} (${translate(TranslationKeys.store_versions_differs_from_installed_app)})` : customerConfig.projectName}
					groupPosition="middle"
					showSeparator
					leftIcon={<MaterialCommunityIcons name={customerDiffers ? 'alert-outline' : 'server'} size={22} color={theme.screen.icon} />}
					iconBgColor="transparent"
				/>
				<SettingsList
					label={translate(TranslationKeys.store_versions_reload)}
					handleFunction={loadStoreVersions}
					groupPosition="bottom"
					showSeparator={false}
					leftIcon={<MaterialCommunityIcons name="refresh" size={22} color={theme.screen.icon} />}
					iconBgColor="transparent"
				/>
				<AppSourceSection title={translate(TranslationKeys.store_versions_installed_app)} appRef={installedAppRef} installedVersion={installedVersion} results={results.installed} />
				<AppSourceSection title={customerTitle} appRef={customerAppRef} installedVersion={installedVersion} results={results.customer} />
				<AppSourceSection title={translate(TranslationKeys.store_versions_server_app)} appRef={serverAppRef} installedVersion={installedVersion} results={results.server} />
			</View>
		</ScrollView>
	);
};

export default StoreVersions;

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
