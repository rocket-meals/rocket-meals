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
	// 23: OTA updates were broken: runtimeVersion policy "appVersion" included
	// the patch segment, so patch-only OTA updates never matched the installed
	// binary. getVersion() now pins the patch segment to 0 (like apps/frontend
	// and geonexia) — this build picks up the stable runtime version.
	// 25: shared expo-build-properties plugin from repo-depkit-common/appconfig
	return 25;
}

// DO NOT CHANGE THE NAME OF THIS FUNCTION: getMajorVersion
// The ios-submit-review workflow reads this function: while the major version is
// below 1 the app counts as still in development and is never submitted to
// App Review automatically after a build. Raise to 1 for the first public release.
export function getMajorVersion() {
	return 0;
}

export function getVersionPatch() {
	// 3: the summed-patch experiment already shipped patch 2 from master;
	// never decrease the visible patch version.
	// 4: common/common-ui: weather API helper + WeatherPreview playbook entry
	// 5: settings: whole-database export/import (Datensicherung group);
	//    version display from the JS bundle (OTA patch bumps visible)
	// 6: shared Expo app config moved to repo-depkit-common/appconfig
	// 7: privacy manifest declared per app from named building blocks
	// 8: SonarCloud clean-up (count labels, import plan and share codec split)
	// 9: data-clumps clean-up (shared app settings, match record and customer
	//    config types)
	// 10: MyMap (web): message origin check kept inline at the listener
	// 11: app version shown at the bottom of the drawer
	// 12: local ids from the shared UuidHelper (repo-depkit-common)
	// 13: shared translation keys/catalogue moved to repo-depkit-common
	// 14: repaired French texts in the shared translation catalogue
	// 15: apostrophe-truncation check added to the shared translation validation
	// 16: translation lookup accepts a language code in any case and region
	// 17: shared food offer price helper added to repo-depkit-common
	return 17;
}

// Version used for app.config.ts (`version`, and thus the expo-updates
// runtimeVersion via policy "appVersion") — the patch segment is pinned to 0
// like in apps/frontend/app: OTA updates only apply when the runtime version
// matches the installed binary exactly, so including the (OTA-bumped) patch
// here would make every patch update invisible to existing builds.
export function getVersion() {
	return getMajorVersion() + '.' + getBuildNumber() + '.' + 0;
}

// Full version incl. the real patch segment, shown on the settings screen so
// users can verify which OTA update they are running.
export function getVersionInternalForAppsettingsScreen() {
	return getMajorVersion() + '.' + getBuildNumber() + '.' + getVersionPatch();
}

// Contact address shown in the settings screen (support row) and used as the
// Google Play contact email in store-metadata.ts.
export const SUPPORT_EMAIL = 'nils@baumgartner-software.de';

// Public privacy policy for the app stores (App Store Connect "App-Informationen"
// and the in-app "Datenschutzerklärung" row link to the same ground truth).
export const PRIVACY_POLICY_URL = 'https://github.com/rocket-meals/rocket-meals/blob/master/apps/score-tracker/PRIVACY.md';

export const scoreTrackerConfig: CustomerConfig = {
	// User-facing brand name - matches `name` in app.config.ts (home screen) so
	// the store listing, the device and the in-app branding all say the same.
	projectName: 'Punktlandung',
	// App Store Connect Apple-ID (App-Informationen -> Apple-ID), required for
	// non-interactive "eas submit" (injected as submit.production.ios.ascAppId).
	appleAppId: '6791191897',
	images: {
		company_logo_source_get_for_react_native: () => require('./assets/icons/app_icon_source.png'),
	},
};

export function getCustomerConfig(): CustomerConfig {
	return scoreTrackerConfig;
}

export function getCompanyLogoLocalSaved(): ImageSourcePropType {
	return getCustomerConfig().images.company_logo_source_get_for_react_native();
}

export function getAppIconInsideExpoLocalSaved() {
	return require('./assets/icons/app_icon_source.png');
}
