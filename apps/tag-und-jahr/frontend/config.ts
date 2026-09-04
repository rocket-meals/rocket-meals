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
	// 3: Photo-grid food widget (content margins disabled - native change)
	// and clock themes (year start, sun/moon day display).
	// 4: shared expo-build-properties plugin from repo-depkit-common/appconfig
	return 4;
}

// DO NOT CHANGE THE NAME OF THIS FUNCTION: getMajorVersion
// The ios-submit-review workflow reads this function: while the major version is
// below 1 the app counts as still in development and is never submitted to
// App Review automatically after a build. Raise to 1 for the first public release.
export function getMajorVersion() {
	return 0;
}

export function getVersionPatch() {
	// Never decrease the visible patch version.
	// 1: expo-updates runtime version pinned to patch 0 (getVersion)
	// 2: shared Expo app config moved to repo-depkit-common/appconfig
	// 3: privacy manifest declared per app from named building blocks
	// 4: SonarCloud clean-up (widget settings sync split into helpers)
	// 5: SonarCloud/data-clumps clean-up (settings screen split into panels,
	//    shared customer config type)
	// 6: app version shown at the bottom of the drawer
	// 7: UuidHelper added to the shared repo-depkit-common package
	// 8: shared translation keys/catalogue moved to repo-depkit-common
	// 9: repaired French texts in the shared translation catalogue
	// 10: apostrophe-truncation check added to the shared translation validation
	// 11: translation lookup accepts a language code in any case and region
	// 12: shared food offer price helper added to repo-depkit-common
	return 12;
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
// apps/frontend, geonexia and score-tracker).
export function getVersionInternalForAppsettingsScreen() {
	return getMajorVersion() + '.' + getBuildNumber() + '.' + getVersionPatch();
}

// Contact address shown for support and used as the Google Play contact email
// in store-metadata.ts.
export const SUPPORT_EMAIL = 'nils@baumgartner-software.de';

// Public privacy policy for the app stores (App Store Connect "App-Informationen").
export const PRIVACY_POLICY_URL = 'https://github.com/rocket-meals/rocket-meals/blob/master/apps/tag-und-jahr/PRIVACY.md';

export const tagUndJahrConfig: CustomerConfig = {
	// User-facing brand name - matches `name` in app.config.ts (home screen) so
	// the store listing, the device and the in-app branding all say the same.
	projectName: 'Tag und Jahr',
	// App Store Connect Apple-ID (App-Informationen -> Apple-ID), required for
	// non-interactive "eas submit" (injected as submit.production.ios.ascAppId).
	appleAppId: '6799734478',
	images: {
		company_logo_source_get_for_react_native: () => require('./assets/icons/app_icon_source.png'),
	},
};

export function getCustomerConfig(): CustomerConfig {
	return tagUndJahrConfig;
}

export function getCompanyLogoLocalSaved(): ImageSourcePropType {
	return getCustomerConfig().images.company_logo_source_get_for_react_native();
}

export function getAppIconInsideExpoLocalSaved() {
	return require('./assets/icons/app_icon_source.png');
}
