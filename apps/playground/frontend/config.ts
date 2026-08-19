import { ImageSourcePropType } from 'react-native';
import type { CustomerConfigBase } from 'repo-depkit-common/appconfig/expoAppConfig';

// Shared shape (see repo-depkit-common/appconfig/expoAppConfig.ts) bound to
// react-native's image source type.
export type CustomerConfig = CustomerConfigBase<ImageSourcePropType>;

// DO NOT CHANGE THE NAME OF THIS FUNCTION: getBuildNumber
// The workflow action check-build-number-online will use this function to determine the build number
// and will fail if the function is not present or does not return a number.
// The build number is used to determine if a new build is required.
export function getBuildNumber() {
	// 1: first build - Expo + React Native Godot experiment.
	return 1;
}

// DO NOT CHANGE THE NAME OF THIS FUNCTION: getMajorVersion
// The ios-submit-review workflow reads this function: while the major version is
// below 1 the app counts as still in development and is never submitted to
// App Review automatically after a build. The playground is a scratchpad for
// experiments and is not meant for the stores, so this stays at 0.
export function getMajorVersion() {
	return 0;
}

export function getVersionPatch() {
	// Never decrease the visible patch version.
	// 1: initial version - Godot view with touch controls.
	// 2: appstore:create-app script fills in the App Store Connect Apple-ID.
	return 2;
}

// Version used for app.config.ts (`version`, and thus the expo-updates
// runtimeVersion via policy "appVersion") — the patch segment is pinned to 0
// like in apps/frontend/app: OTA updates only apply when the runtime version
// matches the installed binary exactly, so including the (OTA-bumped) patch
// here would make every patch update invisible to existing builds.
export function getVersion() {
	return getMajorVersion() + '.' + getBuildNumber() + '.' + 0;
}

// Full version incl. the real patch segment, meant for any settings/about UI
// so users can verify which OTA update they are running (same contract as
// apps/frontend, geonexia, score-tracker and tag-und-jahr).
export function getVersionInternalForAppsettingsScreen() {
	return getMajorVersion() + '.' + getBuildNumber() + '.' + getVersionPatch();
}

// Contact address shown for support.
export const SUPPORT_EMAIL = 'nils@baumgartner-software.de';

// Public privacy policy (only relevant once something from here is published).
export const PRIVACY_POLICY_URL = 'https://github.com/rocket-meals/rocket-meals/blob/master/apps/playground/PRIVACY.md';

export const playgroundConfig: CustomerConfig = {
	// User-facing brand name - matches `name` in app.config.ts (home screen) so
	// the device and the in-app branding say the same.
	projectName: 'Playground',
	// No App Store Connect Apple-ID yet: the playground is a development-only
	// app. Fill this in once it is created in App Store Connect, then re-run
	// `yarn workspace playground generate:eas`.
	images: {
		company_logo_source_get_for_react_native: () => require('./assets/icons/app_icon_source.png'),
	},
};

export function getCustomerConfig(): CustomerConfig {
	return playgroundConfig;
}

export function getCompanyLogoLocalSaved(): ImageSourcePropType {
	return getCustomerConfig().images.company_logo_source_get_for_react_native();
}

export function getAppIconInsideExpoLocalSaved() {
	return require('./assets/icons/app_icon_source.png');
}
