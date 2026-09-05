// This file is evaluated in two contexts: by Expo when it builds the app
// config (see app.config.ts) and inside the app bundle itself, so it may only
// import modules that are safe in both - no Node built-ins.
import { ServerHelper } from 'repo-depkit-common';
// Settings that are deliberately identical in every app of this monorepo (iOS
// deployment target, Android SDK levels, OTA setup) live in
// repo-depkit-common/appconfig, together with the named building blocks each
// app composes its own privacy manifest from.
import {
	EXPO_OWNER,
	PrivacyAccessedApi,
	PrivacyCollectedData,
	getExpoBuildPropertiesPlugin,
	getExpoSplashScreenPlugin,
	getExpoUpdatesPlugin,
	getMealPhotoImagePickerPlugin,
	getPrivacyManifests,
	getRuntimeVersion,
	getUpdatesConfig,
	getWebConfig,
} from 'repo-depkit-common/appconfig/expoAppConfig';
import {ImageSourcePropType} from "react-native";

export { EXPO_ASC_KEY_ID, EXPO_ASC_ISSUER_ID, EXPO_APPLE_TEAM_ID, EXPO_APPLE_TEAM_TYPE } from 'repo-depkit-common';

export type CustomerConfig = {
        projectName: string;
        projectSlug: string | undefined;
	easUpdateId: string | undefined;
	easProjectId: string | undefined;
	appScheme: string | undefined;
	bundleIdIos: string | undefined;
	bundleIdAndroid: string | undefined;
	baseUrl: string;
	server_url: string;
	appleAppId?: string;
	// Controls whether the iOS submit workflow submits new builds to App Review.
	// Defaults to true when not set; set to false for apps that must never be submitted
	// automatically (e.g. the Rocket Meals demo/test app).
	iosAppStoreReviewSubmitEnabled?: boolean;
        images: {
                company_logo_source_path: string;
                company_logo_source_get_for_react_native: () => ImageSourcePropType;
                icon_logo_source_path: string;
                icon_logo_source_get_for_react_native: () => ImageSourcePropType;
        };
        foodoffers_show_separated_markings_breakdown?: boolean;
};

export enum ConfigCustomerEnum {
        TEST = 'test',
        SWOSY = 'swosy',
        STUDI_FUTTER = 'studi-futter'
}

// DO NOT CHANGE THE NAME OF THIS FUNCTION: getBuildNumber
// The workflow action check-build-number-online will use this function to determine the build number
// and will fail if the function is not present or does not return a number.
// The build number is used to determine if a new build is required.
export function getBuildNumber() {
	return 206;
}

export function getMajorVersion() {
	return 21;
}

export function getVersionPatch() {
        // 12: shared Expo app config moved to repo-depkit-common/appconfig
        // 13: privacy manifest declared per app from named building blocks
        // 14: content rights declared as "third-party content, rights held"
        // 15: SonarCloud clean-up (map message origin check, login debug panel)
        // 16: SonarCloud/data-clumps clean-up (shared redirect button, license and
        //     Google service account types)
        // 17: MyMap (web): message origin check kept inline at the listener
        // 18: image and file uploads fixed for Expo SDK 57 (expo/fetch form parts)
        // 19: food info modal titled "Speise Info"; app version shown in the drawer
        // 20: app usage event reported before the native rating prompt
        // 21: shared translation keys/catalogue moved to repo-depkit-common
        // 22: shared translation catalogue now also serves the backend; French texts repaired
        // 23: 20 French texts repaired that were cut off at an apostrophe
        // 24: language codes matched case- and region-insensitively when picking a translation
        // 25: housing analytics reports for the handover protocols (management menu)
        // 26: housing analytics reports exportable as PDF (print) and CSV on the web
        // 27: common-ui: PrintHidden keeps tap affordances off the printed page
        return 27;
}

export function getVersionInternalForAppsettingsScreen() {
	return getMajorVersion() + '.' + getBuildNumber() + '.' + getVersionPatch();
}

export function getVersion() {
	return getMajorVersion() + '.' + getBuildNumber() + '.' + 0;
}

export function getIosBuildNumber() {
	return getBuildNumber().toString();
}

export function getAppIconInsideExpoLocalSaved(): ImageSourcePropType {
	const customerConfig: CustomerConfig = getCustomerConfig();
	return customerConfig.images.icon_logo_source_get_for_react_native();
}

export function getCompanyLogoLocalSaved(): ImageSourcePropType {
	const customerConfig: CustomerConfig = getCustomerConfig();
	return customerConfig.images.company_logo_source_get_for_react_native();
}

export const devConfig: CustomerConfig = {
	projectName: 'Rocket Meals',
	projectSlug: 'rocket-meals-dev',
	easUpdateId: '36f72583-5997-4602-8609-05f39444f2e7',
	easProjectId: '36f72583-5997-4602-8609-05f39444f2e7',
	appScheme: 'app-rocket-meals',
	bundleIdIos: 'de.baumgartner-software.rocket-meals-demo',
	bundleIdAndroid: 'com.baumgartnersoftware.rocketmealsdev',
	baseUrl: '/rocket-meals',
	server_url: ServerHelper.TEST_SERVER_CONFIG.server_url,
	appleAppId: '6483930801',
	// The demo app is only for testing - builds are uploaded but never submitted to App Review.
	iosAppStoreReviewSubmitEnabled: false,
	images: {
		company_logo_source_path: 'assets/images/customers/rocket-meals/company.png',
		company_logo_source_get_for_react_native: () => {return require('@/assets/images/customers/rocket-meals/company.png')},
		icon_logo_source_path: 'assets/images/customers/rocket-meals/icon.png',
		icon_logo_source_get_for_react_native: () => {return require('@/assets/images/customers/swosy/icon.png')},
	},
};

export const swosyConfig: CustomerConfig = {
	projectName: 'SWOSY 2.0',
	projectSlug: 'rocket-meals-swosy',
	easUpdateId: '4147159f-d7b5-4db5-b6eb-f9988519950c',
	easProjectId: '4147159f-d7b5-4db5-b6eb-f9988519950c',
	appScheme: 'app-rocket-meals-swosy',
	bundleIdIos: 'de.baumgartner-software.swosy',
	bundleIdAndroid: 'de.baumgartnersoftware.swosy',
	baseUrl: '/swosy',
	server_url: ServerHelper.SWOSY_SERVER_CONFIG.server_url,
	appleAppId: '6667117575',
	iosAppStoreReviewSubmitEnabled: true,
	images: {
		company_logo_source_path: 'assets/images/customers/swosy/company.png',
		company_logo_source_get_for_react_native: () => {return require('@/assets/images/customers/swosy/company.png')},
		icon_logo_source_path: 'assets/images/customers/swosy/icon.png',
		icon_logo_source_get_for_react_native: () => {return require('@/assets/images/customers/swosy/icon.png')},
	}
};

export const studiFutterConfig: CustomerConfig = {
        projectName: 'Studi|Futter',
        projectSlug: 'rocket-meals-studi-futter',
	easUpdateId: '461671f9-774f-4bc4-80a8-5601313539b0',
	easProjectId: '461671f9-774f-4bc4-80a8-5601313539b0',
	appScheme: 'app-rocket-meals-studi-futter',
	bundleIdIos: 'de.stwh.app',
	bundleIdAndroid: 'de.baumgartnersoftware.studifutter',
	baseUrl: '/studi-futter',
	server_url: ServerHelper.STUDI_FUTTER_SERVER_CONFIG.server_url,
	appleAppId: '1548108390',
	iosAppStoreReviewSubmitEnabled: true,
	images: {
		company_logo_source_path: 'assets/images/customers/studi-futter/company.png',
		company_logo_source_get_for_react_native: () => {return require('@/assets/images/customers/studi-futter/company.png')},
		icon_logo_source_path: 'assets/images/customers/studi-futter/icon.png',
		icon_logo_source_get_for_react_native: () => {return require('@/assets/images/customers/studi-futter/icon.png')},
        },
    foodoffers_show_separated_markings_breakdown: true
};

export function getCustomerConfigsDict(): Record<ConfigCustomerEnum, CustomerConfig> {
        return {
                [ConfigCustomerEnum.TEST]: devConfig,
                [ConfigCustomerEnum.SWOSY]: swosyConfig,
                [ConfigCustomerEnum.STUDI_FUTTER]: studiFutterConfig,
        };
}

export function getCustomerEnumForConfig(config: CustomerConfig): ConfigCustomerEnum | null {
        const matchingEntry = Object.entries(getCustomerConfigsDict()).find(([, customerConfig]) =>
                customerConfig.server_url === config.server_url
        );

        return matchingEntry ? (matchingEntry[0] as ConfigCustomerEnum) : null;
}

export const configMuenster: CustomerConfig = {
        projectName: 'Münster',
        projectSlug: undefined,
	easUpdateId:  undefined,
	easProjectId:  undefined,
	appScheme:  undefined,
	bundleIdIos:  undefined,
	bundleIdAndroid:  undefined,
	baseUrl: '/muenster',
	server_url: ServerHelper.SERVER_CONFIG_MUENSTER.server_url,
	images: {
		company_logo_source_path: 'assets/images/customers/rocket-meals/company.png',
		company_logo_source_get_for_react_native: () => {return require('@/assets/images/customers/rocket-meals/company.png')},
		icon_logo_source_path: 'assets/images/customers/rocket-meals/icon.png',
		icon_logo_source_get_for_react_native: () => {return require('@/assets/images/customers/rocket-meals/icon.png')},
	}
};

export function getCustomerConfigurations(): CustomerConfig[] {
	return [
		devConfig,
		swosyConfig,
		studiFutterConfig,
		configMuenster,
	];
}

// EXPO_PUBLIC_CUSTOMER is inlined into the JS bundle by Metro at build time and therefore
// remains available after an OTA update (eas update) in the running app bundle.
// CUSTOMER is only available in the Node context at build time (e.g. app.config.ts, icon generation)
// but not in the app bundle itself. Both variables are needed so that the customer
// is resolved correctly for both native builds and OTA updates.
export function getCustomerEnvVariable(): string | undefined {
	return process.env.EXPO_PUBLIC_CUSTOMER || process.env.CUSTOMER || undefined;
}

export function getCustomerConfig(): CustomerConfig {
	const customer = getCustomerEnvVariable();
	return getCustomerConfigsDict()[customer as ConfigCustomerEnum] || devConfig;
}

export function getGeneratedAssetsPath(): string {
	const customer = getCustomerEnvVariable() || ConfigCustomerEnum.TEST;
	return `./assets/generated/${customer}`;
}

// Apple privacy manifest of THIS app (required for App Review). Rocket Meals
// talks to a canteen backend, so location, messages, photos, other user content
// and the account email leave the device.
const ROCKET_MEALS_PRIVACY = {
	collectedDataTypes: [
		PrivacyCollectedData.PreciseLocation,
		PrivacyCollectedData.EmailsOrTextMessages,
		PrivacyCollectedData.PhotosOrVideos,
		PrivacyCollectedData.OtherUserContent,
		PrivacyCollectedData.EmailAddress,
	],
	// Required-reason APIs of the React Native/Expo runtime itself.
	accessedApiTypes: [
		PrivacyAccessedApi.UserDefaults,
		PrivacyAccessedApi.SystemBootTime,
		PrivacyAccessedApi.DiskSpace,
		PrivacyAccessedApi.FileTimestamp,
	],
};

export function getFinalConfig(config?: any, licenses?: unknown[]) {
	const customerConfig: CustomerConfig = getCustomerConfig();
	const generatedPath = getGeneratedAssetsPath();
	return {
		expo: {
			name: customerConfig.projectName,
			slug: customerConfig.projectSlug,
			version: getVersion(),
			orientation: 'default',
			icon: `${generatedPath}/icon.png`,
			notification: {
				icon: `${generatedPath}/notification-icon.png`,
			},
			updates: getUpdatesConfig(customerConfig.easUpdateId),
			scheme: customerConfig.appScheme,
			userInterfaceStyle: 'automatic',
			splash: {
				image: `${generatedPath}/splash.png`,
				resizeMode: 'contain',
				backgroundColor: '#ffffff',
			},
			assetBundlePatterns: ['**/*'],
			ios: {
				supportsTablet: true,
				bundleIdentifier: customerConfig.bundleIdIos,
				buildNumber: getIosBuildNumber(),
				...(customerConfig.appleAppId ? { appId: customerConfig.appleAppId } : {}),
				infoPlist: {
					NSPhotoLibraryUsageDescription: 'We need access to your photo library to select files',
					NSDocumentDirectoryUsageDescription: 'We need access to your document directory to select files',
				},
				config: {
					usesNonExemptEncryption: false,
				},
				entitlements: {
					'com.apple.developer.applesignin': ['Default'],
				},
				privacyManifests: getPrivacyManifests(ROCKET_MEALS_PRIVACY),
			},
			android: {
				adaptiveIcon: {
					foregroundImage: `${generatedPath}/adaptive-icon.png`,
					backgroundColor: '#ffffff',
				},
				package: customerConfig.bundleIdAndroid,
				blockedPermissions: ['android.permission.READ_MEDIA_IMAGES', 'android.permission.READ_MEDIA_VIDEO'],
				versionCode: getBuildNumber(),
			},
			web: getWebConfig(`${generatedPath}/favicon.png`),
			plugins: [
				'expo-router',
				'expo-secure-store',
				'expo-location',
				'expo-notifications',
				'expo-web-browser',
				['expo-document-picker', { iCloudContainerEnvironment: 'Production' }],
				[
					'expo-camera',
					{
						cameraPermission: 'This app needs camera access to scan QR codes for adding friends.',
						recordAudioAndroid: false,
					},
				],
				getExpoSplashScreenPlugin({ image: `${generatedPath}/splash-icon.png`, backgroundColor: '#ffffff' }),
				[
					'react-native-nfc-manager',
					{
						nfcPermission: 'The app accesses NFC read your Card balance.',
						includeNdefEntitlement: false,
					},
				],
				getExpoUpdatesPlugin(),
				getMealPhotoImagePickerPlugin(),
				getExpoBuildPropertiesPlugin(),
				'expo-localization',
				'expo-asset',
				'expo-font',
			],
			experiments: {
				typedRoutes: true,
				baseUrl: customerConfig.baseUrl + (process.env.EXPO_PUBLIC_BASE_URL_SUFFIX || ''),
			},
			extra: {
				router: {
					origin: false,
				},
				eas: {
					projectId: customerConfig.easProjectId,
				},
				licenses: licenses ?? [],
			},
			owner: EXPO_OWNER,
			runtimeVersion: getRuntimeVersion(),
		},
	};
}
