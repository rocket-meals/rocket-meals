import type { ConfigContext, ExpoConfig } from '@expo/config';

// Register ts-node so Expo can load TypeScript config helpers without a
// precompiled JavaScript file.
require('ts-node').register({
	transpileOnly: true,
	compilerOptions: {
		module: 'Node16',
		moduleResolution: 'node16',
		resolveJsonModule: true,
	},
});

const { getBuildNumber } = require('./config.ts');

module.exports = function ({ config }: ConfigContext): ExpoConfig {
	const buildNumber = getBuildNumber();
	return {
		...config,
		owner: 'baumgartner-software',
		name: 'Score Tracker',
		slug: 'score-tracker',
		version: `1.0.${buildNumber}`,
		orientation: 'default',
		icon: './assets/icons/app_icon_source.png',
		scheme: 'score-tracker',
		userInterfaceStyle: 'automatic',
		ios: {
			supportsTablet: true,
			bundleIdentifier: 'de.baumgartner-software.score-tracker',
			buildNumber: buildNumber.toString(),
			config: {
				usesNonExemptEncryption: false,
			},
		},
		android: {
			adaptiveIcon: {
				foregroundImage: './assets/icons/app_icon_source.png',
				backgroundColor: '#ffffff',
			},
			package: 'com.scoretracker.app',
			versionCode: buildNumber,
		},
		web: {
			bundler: 'metro',
			output: 'static',
			favicon: './assets/icons/app_icon_source.png',
		},
		updates: {
			enabled: true,
			url: 'https://u.expo.dev/7ea1e999-21dd-41ec-96b3-fc8aa7ad9993',
			fallbackToCacheTimeout: 10 * 1000,
		},
		runtimeVersion: {
			policy: 'appVersion',
		},
		plugins: [
			'expo-router',
			[
				'expo-splash-screen',
				{
					image: './assets/icons/app_icon_source.png',
					imageWidth: 200,
					resizeMode: 'contain',
					backgroundColor: '#ffffff',
				},
			],
			['expo-updates', { username: 'jack5496' }],
			'expo-localization',
			'expo-font',
		],
		experiments: {
			typedRoutes: true,
		},
		extra: {
			eas: {
				projectId: '7ea1e999-21dd-41ec-96b3-fc8aa7ad9993',
			},
		}
	};
};
