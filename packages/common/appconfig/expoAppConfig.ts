/**
 * Shared Expo app config building blocks for every app in this monorepo
 * (apps/frontend, apps/geonexia, apps/score-tracker, apps/tag-und-jahr).
 *
 * Two kinds of things live here:
 *
 * 1. Values that are deliberately identical across all apps - the iOS
 *    deployment target, the Android SDK levels, the OTA/update setup. Keeping
 *    one copy means a bump (e.g. the next Expo SDK raising the iOS minimum) is
 *    a single edit instead of four, and the apps cannot silently drift apart.
 * 2. Named building blocks that each app composes itself, above all the Apple
 *    privacy manifest (PrivacyAccessedApi / PrivacyCollectedData). Those must
 *    NOT be shared as a ready-made list: what an app declares to Apple is a
 *    statement about that app, so every app spells its own list out in its own
 *    config and only the Apple reason codes are shared knowledge.
 *
 * Usage from an app's app.config.ts (Node context, ts-node registered):
 *
 *   const { getExpoBuildPropertiesPlugin } = require('repo-depkit-common/appconfig/expoAppConfig.ts');
 *
 * or, from a config.ts that is also bundled into the app:
 *
 *   import { getExpoBuildPropertiesPlugin } from 'repo-depkit-common/appconfig/expoAppConfig';
 *
 * This module therefore contains plain data and pure functions only - no
 * Node built-ins (fs/path), so it is safe in a Metro bundle as well. The
 * Node-only counterpart is repo-depkit-common/licenses/collectLicenses.ts.
 */

// A plugin entry of an Expo config's `plugins` array: either the bare plugin
// name or a [name, options] tuple.
export type ExpoPluginEntry = string | [string, Record<string, unknown>];

// The Expo/EAS organisation all apps are published under.
export const EXPO_OWNER = 'baumgartner-software';

// Expo account whose credentials sign the OTA updates (expo-updates plugin).
export const EXPO_UPDATES_USERNAME = 'jack5496';

/**
 * iOS deployment target - the oldest iOS version every app is built for.
 *
 * All apps share one floor on purpose: a device that can run one of them can
 * run all of them, and App Review/support expectations stay identical. The
 * value is dictated by the Expo SDK in use (SDK 58 does not support anything
 * below 16.4), so raise it here whenever the SDK minimum rises - never per
 * app.
 */
export const IOS_DEPLOYMENT_TARGET = '16.4';

// Android SDK levels every app compiles and targets against. They follow the
// defaults of the React Native version the Expo SDK ships (SDK 58 / RN 0.88:
// compile against 37, target 36).
export const ANDROID_COMPILE_SDK_VERSION = 37;
export const ANDROID_TARGET_SDK_VERSION = 36;
export const ANDROID_BUILD_TOOLS_VERSION = '37.0.0';

// How long a cold start waits for a fresh OTA update before falling back to
// the bundled/cached one.
export const UPDATES_FALLBACK_TO_CACHE_TIMEOUT_MS = 10 * 1000;

/**
 * DO NOT CHANGE THE NAME OF THIS FUNCTION: getIosDeploymentTarget
 * Single source of truth for the iOS deployment target of all apps, see
 * IOS_DEPLOYMENT_TARGET.
 */
export function getIosDeploymentTarget(): string {
	return IOS_DEPLOYMENT_TARGET;
}

/**
 * The expo-build-properties plugin entry: iOS deployment target plus the
 * Android SDK levels. Requires `expo-build-properties` in the app's
 * dependencies.
 */
export function getExpoBuildPropertiesPlugin(): ExpoPluginEntry {
	return [
		'expo-build-properties',
		{
			android: {
				compileSdkVersion: ANDROID_COMPILE_SDK_VERSION,
				targetSdkVersion: ANDROID_TARGET_SDK_VERSION,
				buildToolsVersion: ANDROID_BUILD_TOOLS_VERSION,
			},
			ios: {
				deploymentTarget: getIosDeploymentTarget(),
			},
		},
	];
}

/** The expo-updates plugin entry (OTA update signing account). */
export function getExpoUpdatesPlugin(): ExpoPluginEntry {
	return ['expo-updates', { username: EXPO_UPDATES_USERNAME }];
}

/** The expo-splash-screen plugin entry - same geometry in every app. */
export function getExpoSplashScreenPlugin(options: { image: string; backgroundColor: string }): ExpoPluginEntry {
	return [
		'expo-splash-screen',
		{
			image: options.image,
			imageWidth: 200,
			resizeMode: 'contain',
			backgroundColor: options.backgroundColor,
		},
	];
}

/**
 * The expo-image-picker plugin entry for the apps that let users attach photos
 * of meals (apps/frontend, apps/geonexia). The microphone permission is
 * switched off - the picker never records audio, and asking for it would raise
 * App Review questions.
 */
export function getMealPhotoImagePickerPlugin(): ExpoPluginEntry {
	return [
		'expo-image-picker',
		{
			photosPermission:
				'This app needs access to your photo library to capture and manage meal photos as part of the core digital meal plan functionality. Photos are essential for documenting meals in our canteen and restaurant management system.',
			cameraPermission:
				'This app needs camera access to take photos of meals for the digital meal plan management system. Camera functionality is core to documenting and tracking meals in canteens and restaurants.',
			'//': 'Disables the microphone permission',
			microphonePermission: false,
		},
	];
}

/** The `updates` section of an Expo config, derived from the EAS project id. */
export function getUpdatesConfig(easUpdateId: string | undefined) {
	return {
		enabled: true,
		url: 'https://u.expo.dev/' + easUpdateId,
		fallbackToCacheTimeout: UPDATES_FALLBACK_TO_CACHE_TIMEOUT_MS,
	};
}

/**
 * The `runtimeVersion` section of an Expo config.
 *
 * Production builds are tied to the app version, but Expo Go only loads
 * updates whose runtime version has the exposdk:<version> form. The PR preview
 * workflow publishes an additional update with EXPO_GO_PREVIEW=true so PRs can
 * be tested in Expo Go.
 */
export function getRuntimeVersion() {
	return {
		policy: (process.env.EXPO_GO_PREVIEW === 'true' ? 'sdkVersion' : 'appVersion') as 'sdkVersion' | 'appVersion',
	};
}

/** The `web` section of an Expo config - identical apart from the favicon. */
export function getWebConfig(favicon: string) {
	return {
		bundler: 'metro' as const,
		output: 'static' as const,
		favicon,
	};
}

export type PrivacyCollectedDataType = {
	NSPrivacyCollectedDataType: string;
	NSPrivacyCollectedDataTypeLinked: boolean;
	NSPrivacyCollectedDataTypeTracking: boolean;
	NSPrivacyCollectedDataTypePurposes: string[];
};

export type PrivacyAccessedApiType = {
	NSPrivacyAccessedAPIType: string;
	NSPrivacyAccessedAPITypeReasons: string[];
};

/**
 * Catalog of required-reason APIs, one named entry per Apple category with the
 * reason code that applies here. These are building blocks, not an app's
 * declaration: every app picks the entries it actually needs (see
 * getPrivacyManifests). The four below are hit by the React Native/Expo runtime
 * itself, which is why every app currently lists all of them.
 */
export const PrivacyAccessedApi = {
	/** CA92.1: reading/writing the app's own user defaults. */
	UserDefaults: {
		NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
		NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
	},
	/** 8FFB.1: measuring elapsed time inside the app. */
	SystemBootTime: {
		NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
		NSPrivacyAccessedAPITypeReasons: ['8FFB.1'],
	},
	/** 85F4.1: writing/deleting files only when enough space is available. */
	DiskSpace: {
		NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
		NSPrivacyAccessedAPITypeReasons: ['85F4.1'],
	},
	/** DDA9.1: timestamps of files the app itself created. */
	FileTimestamp: {
		NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
		NSPrivacyAccessedAPITypeReasons: ['DDA9.1'],
	},
} satisfies Record<string, PrivacyAccessedApiType>;

/**
 * Catalog of collected data types, one named entry per Apple data type with the
 * linking/tracking flags and purposes that apply here. Again building blocks:
 * an app that keeps everything on the device declares none of them.
 */
export const PrivacyCollectedData = {
	/** Location of the device, not linked to the user's identity. */
	PreciseLocation: {
		NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePreciseLocation',
		NSPrivacyCollectedDataTypeLinked: false,
		NSPrivacyCollectedDataTypeTracking: false,
		NSPrivacyCollectedDataTypePurposes: [
			'NSPrivacyCollectedDataTypePurposeProductPersonalization',
			'NSPrivacyCollectedDataTypePurposeAppFunctionality',
			'NSPrivacyCollectedDataTypePurposeOther',
		],
	},
	/** Messages users send through the app, linked to their account. */
	EmailsOrTextMessages: {
		NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeEmailsOrTextMessages',
		NSPrivacyCollectedDataTypeLinked: true,
		NSPrivacyCollectedDataTypeTracking: false,
		NSPrivacyCollectedDataTypePurposes: [
			'NSPrivacyCollectedDataTypePurposeProductPersonalization',
			'NSPrivacyCollectedDataTypePurposeAppFunctionality',
		],
	},
	/** Photos users upload, linked to their account. */
	PhotosOrVideos: {
		NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePhotosorVideos',
		NSPrivacyCollectedDataTypeLinked: true,
		NSPrivacyCollectedDataTypeTracking: false,
		NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
	},
	/** Any other user-generated content, linked to their account. */
	OtherUserContent: {
		NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeOtherUserContent',
		NSPrivacyCollectedDataTypeLinked: true,
		NSPrivacyCollectedDataTypeTracking: false,
		NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
	},
	/** The account's email address. */
	EmailAddress: {
		NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeEmailAddress',
		NSPrivacyCollectedDataTypeLinked: true,
		NSPrivacyCollectedDataTypeTracking: false,
		NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
	},
} satisfies Record<string, PrivacyCollectedDataType>;

/**
 * An app's own privacy declaration, composed from the catalogs above. Each app
 * spells its list out in its own config so a reviewer sees at a glance what
 * that app declares - nothing is inherited from another app.
 */
export type AppPrivacyManifest = {
	/** Required-reason APIs the app uses, e.g. [PrivacyAccessedApi.SystemBootTime]. */
	accessedApiTypes: PrivacyAccessedApiType[];
	/** Data the app sends off-device. Omit for apps that keep everything local. */
	collectedDataTypes?: PrivacyCollectedDataType[];
};

/** The `ios.privacyManifests` section (required for App Review). */
export function getPrivacyManifests(privacy: AppPrivacyManifest) {
	return {
		NSPrivacyCollectedDataTypes: privacy.collectedDataTypes ?? [],
		NSPrivacyAccessedAPITypes: privacy.accessedApiTypes,
	};
}

/**
 * Branding an app exposes to its own UI (logo) and to the store tooling (Apple-ID).
 *
 * The image source type is a type parameter on purpose: the concrete
 * `ImageSourcePropType` lives in react-native, and this module is also loaded in
 * Node (app.config.ts) and by the backend, so it must stay free of react-native
 * imports. Each app declares
 * `export type CustomerConfig = CustomerConfigBase<ImageSourcePropType>;`
 * in its own config.ts and adds the fields that are specific to it.
 */
export type CustomerConfigBase<TImageSource> = {
	/** User-facing brand name - matches `name` in app.config.ts. */
	projectName: string;
	/** App Store Connect Apple-ID (App-Informationen -> Apple-ID), needed for non-interactive `eas submit`. */
	appleAppId?: string;
	images: {
		company_logo_source_get_for_react_native: () => TImageSource;
	};
};
