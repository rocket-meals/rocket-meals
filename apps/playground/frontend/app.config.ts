import type { ConfigContext, ExpoConfig } from '@expo/config';

// Register ts-node so Expo can load TypeScript config helpers without a
// precompiled JavaScript file.
require('repo-depkit-common/appconfig/registerTsNode.js').registerTsNode();

const { getBuildNumber, getVersion } = require('./config.ts');
const { collectLicenses } = require('repo-depkit-common/licenses/collectLicenses.ts');
const { getGodotAndroidMavenRepo } = require('./plugin/godotPrebuilt.js');
// Settings that are deliberately identical in every app of this monorepo (iOS
// deployment target, Android SDK levels, OTA setup) live in
// repo-depkit-common/appconfig, together with the named building blocks each
// app composes its own privacy manifest from.
const {
	EXPO_OWNER,
	PrivacyAccessedApi,
	getExpoBuildPropertiesPlugin,
	getExpoSplashScreenPlugin,
	getExpoUpdatesPlugin,
	getPrivacyManifests,
	getRuntimeVersion,
	getWebConfig,
} = require('repo-depkit-common/appconfig/expoAppConfig.ts');

// Apple privacy manifest of THIS app (required for App Review). The playground
// runs entirely on the device - no collected data types at all.
const PLAYGROUND_PRIVACY = {
	// Required-reason APIs of the React Native/Expo runtime itself.
	accessedApiTypes: [
		PrivacyAccessedApi.UserDefaults,
		PrivacyAccessedApi.SystemBootTime,
		PrivacyAccessedApi.DiskSpace,
		PrivacyAccessedApi.FileTimestamp,
	],
};

// React Native Godot needs two Android-only build settings on top of the shared
// ones: LibGodot requires API level 29, and its AAR is consumed from a local
// Maven repository inside node_modules. Both are merged into the shared
// expo-build-properties entry instead of spelling the shared values out again
// (see AGENTS.md: shared build settings live in repo-depkit-common).
function getPlaygroundBuildPropertiesPlugin() {
	const [pluginName, options] = getExpoBuildPropertiesPlugin();
	return [
		pluginName,
		{
			...options,
			android: {
				...options.android,
				// LibGodot's minimum, higher than the Expo default.
				minSdkVersion: 29,
				extraMavenRepos: [getGodotAndroidMavenRepo()],
			},
		},
	];
}

module.exports = function getExpoConfig({ config }: ConfigContext): ExpoConfig {
	const buildNumber = getBuildNumber();
	return {
		...config,
		owner: EXPO_OWNER,
		name: 'Playground',
		slug: 'playground',
		version: getVersion(),
		// The bundled Godot demo is a platformer meant to be played in
		// landscape; change this if a future experiment needs portrait.
		orientation: 'landscape',
		icon: './assets/icons/app_icon_source.png',
		scheme: 'playground',
		userInterfaceStyle: 'automatic',
		ios: {
			supportsTablet: true,
			bundleIdentifier: 'de.baumgartner-software.playground',
			buildNumber: buildNumber.toString(),
			config: {
				usesNonExemptEncryption: false,
			},
			privacyManifests: getPrivacyManifests(PLAYGROUND_PRIVACY),
		},
		android: {
			adaptiveIcon: {
				foregroundImage: './assets/icons/app_icon_source.png',
				backgroundColor: '#12141f',
			},
			package: 'de.baumgartnersoftware.playground',
			versionCode: buildNumber,
		},
		web: getWebConfig('./assets/icons/app_icon_source.png'),
		// `updates` is missing on purpose: the app is not linked to an EAS
		// project yet. The first CI run of playground-expo-update creates it
		// (eas init) and writes both the EAS id and the updates block into this
		// file - afterwards the injected literal should be replaced by
		// getUpdatesConfig(...) from repo-depkit-common, like in the other apps.
		runtimeVersion: getRuntimeVersion(),
		plugins: [
			'expo-router',
			getExpoSplashScreenPlugin({ image: './assets/icons/app_icon_source.png', backgroundColor: '#12141f' }),
			getExpoUpdatesPlugin(),
			'expo-font',
			// Copies the Godot game into the native projects during prebuild.
			'./plugin/withGodotAssets.js',
			getPlaygroundBuildPropertiesPlugin(),
		],
		experiments: {
			typedRoutes: true,
		},
		extra: {
			// Open-source dependency versions of this app and of its workspace
			// packages, collected from node_modules at config-evaluation time
			// (expo start / export / build / update) and read at runtime via
			// Constants.expoConfig.extra.licenses.
			licenses: collectLicenses(__dirname),
		},
	};
};
