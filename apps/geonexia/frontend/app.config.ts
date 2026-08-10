import type { ConfigContext, ExpoConfig } from '@expo/config';

// Register ts-node so Expo can load TypeScript config helpers without a
// precompiled JavaScript file.
require('ts-node').register({
	transpileOnly: true,
	compilerOptions: {
		module: 'Node16',
		moduleResolution: 'node16',
	},
});

const { getBuildNumber, getVersion } = require('./config.ts');
const { collectLicenses } = require('repo-depkit-common/licenses/collectLicenses.ts');

module.exports = function getExpoConfig({ config }: ConfigContext): ExpoConfig {
	const buildNumber = getBuildNumber();
	return {
		...config,
		owner: 'baumgartner-software',
		name: 'Geonexia',
		slug: 'geonexia',
		version: getVersion(),
		orientation: 'default',
		icon: './assets/generated/icon.png',
		scheme: 'geonexia',
		userInterfaceStyle: 'automatic',
		ios: {
			supportsTablet: true,
			bundleIdentifier: 'de.baumgartner-software.geonexia',
			buildNumber: buildNumber.toString(),
			infoPlist: {
				UIBackgroundModes: ['audio', 'location'],
				NSPhotoLibraryUsageDescription: 'We need access to your photo library to select files',
				NSDocumentDirectoryUsageDescription: 'We need access to your document directory to select files',
			},
			config: {
				usesNonExemptEncryption: false,
			},
			privacyManifests: {
				NSPrivacyCollectedDataTypes: [
					{
						NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePreciseLocation',
						NSPrivacyCollectedDataTypeLinked: false,
						NSPrivacyCollectedDataTypeTracking: false,
						NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeProductPersonalization', 'NSPrivacyCollectedDataTypePurposeAppFunctionality', 'NSPrivacyCollectedDataTypePurposeOther'],
					},
					{
						NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeEmailsOrTextMessages',
						NSPrivacyCollectedDataTypeLinked: true,
						NSPrivacyCollectedDataTypeTracking: false,
						NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeProductPersonalization', 'NSPrivacyCollectedDataTypePurposeAppFunctionality'],
					},
					{
						NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePhotosorVideos',
						NSPrivacyCollectedDataTypeLinked: true,
						NSPrivacyCollectedDataTypeTracking: false,
						NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
					},
					{
						NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeOtherUserContent',
						NSPrivacyCollectedDataTypeLinked: true,
						NSPrivacyCollectedDataTypeTracking: false,
						NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
					},
					{
						NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeEmailAddress',
						NSPrivacyCollectedDataTypeLinked: true,
						NSPrivacyCollectedDataTypeTracking: false,
						NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
					},
				],
				NSPrivacyAccessedAPITypes: [
					{
						NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
						NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
					},
					{
						NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
						NSPrivacyAccessedAPITypeReasons: ['8FFB.1'],
					},
					{
						NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
						NSPrivacyAccessedAPITypeReasons: ['85F4.1'],
					},
					{
						NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
						NSPrivacyAccessedAPITypeReasons: ['DDA9.1'],
					},
				],
			},
		},
		android: {
			adaptiveIcon: {
				foregroundImage: './assets/generated/adaptive-icon.png',
				backgroundColor: '#ffffff',
			},
			package: 'com.geonexia.app',
			blockedPermissions: ['android.permission.READ_MEDIA_IMAGES', 'android.permission.READ_MEDIA_VIDEO'],
			versionCode: buildNumber,
		},
		web: {
			bundler: 'metro',
			output: 'static',
			favicon: './assets/generated/favicon.png',
		},
		plugins: [
			'expo-router',
			'expo-secure-store',
			'expo-notifications',
			'expo-web-browser',
			['expo-document-picker', { iCloudContainerEnvironment: 'Production' }],
			'expo-task-manager',
			[
				'expo-audio',
				{
					enableBackgroundPlayback: true,
				},
			],
			[
				'expo-location',
				{
					locationWhenInUsePermission: 'Allow Geonexia to use your location to center the map and track your activity.',
					locationAlwaysAndWhenInUsePermission: 'Allow Geonexia to use your location in the background to continue recording your activity.',
					isIosBackgroundLocationEnabled: true,
					isAndroidBackgroundLocationEnabled: true,
				},
			],
			[
				'expo-splash-screen',
				{
					image: './assets/generated/splash.png',
					imageWidth: 200,
					resizeMode: 'contain',
					backgroundColor: '#ffffff',
				},
			],
			['expo-updates', { username: 'jack5496' }],
			[
				'expo-image-picker',
				{
					photosPermission: 'This app needs access to your photo library to capture and manage meal photos as part of the core digital meal plan functionality. Photos are essential for documenting meals in our canteen and restaurant management system.',
					cameraPermission: 'This app needs camera access to take photos of meals for the digital meal plan management system. Camera functionality is core to documenting and tracking meals in canteens and restaurants.',
					'//': 'Disables the microphone permission',
					microphonePermission: false,
				},
			],
			[
				'expo-build-properties',
				{
					android: {
						compileSdkVersion: 36,
						targetSdkVersion: 36,
						buildToolsVersion: '36.0.0',
					},
					ios: {
						deploymentTarget: '15.1',
					},
				},
			],
			'expo-localization',
			'expo-asset',
			'expo-font',
		],
		updates: {
			enabled: true,
			url: 'https://u.expo.dev/8fbc9283-a03b-4ca0-92cd-fcb87d2e64f4',
			fallbackToCacheTimeout: 10 * 1000,
		},
		runtimeVersion: {
			policy: 'appVersion',
		},
		experiments: {
			typedRoutes: true,
		},
		extra: {
			eas: {
				projectId: '8fbc9283-a03b-4ca0-92cd-fcb87d2e64f4',
			},
			// Open-source dependency versions of this app and of its workspace
			// packages (repo-depkit-common, repo-depkit-common-ui), collected from
			// node_modules at config-evaluation time (expo start / export / build /
			// update) and read at runtime via Constants.expoConfig.extra.licenses.
			licenses: collectLicenses(__dirname),
		},
	};
};
