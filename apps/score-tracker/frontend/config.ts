import { ImageSourcePropType } from 'react-native';

export type CustomerConfig = {
	projectName: string;
	appleAppId?: string;
	images: {
		company_logo_source_get_for_react_native: () => ImageSourcePropType;
	};
};

// DO NOT CHANGE THE NAME OF THIS FUNCTION: getBuildNumber
// The workflow action check-build-number-online will use this function to determine the build number
// and will fail if the function is not present or does not return a number.
// The build number is used to determine if a new build is required.
export function getBuildNumber() {
	// 22: Trigger new builds incl. Android preview APK link in the README.
	return 22;
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
	return 4;
}

// Same semver scheme as apps/frontend/app: major.buildNumber.patch
export function getVersion() {
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
