import { ImageSourcePropType } from 'react-native';
import appBuildNumberJson from './build-number.json';
import commonBuildNumberJson from 'repo-depkit-common/build-number.json';

export type CustomerConfig = {
	projectName: string;
	images: {
		company_logo_source_get_for_react_native: () => ImageSourcePropType;
	};
};

// The effective build number is the sum of:
// - ./build-number.json (bump for app-specific changes that need a new store build)
// - packages/common/build-number.json (bump to trigger a new store build of ALL apps,
//   e.g. after changing a native dependency in a shared package)
// The CI action .github/actions/check-build-number reads the same JSON files and
// triggers a store build when this sum is higher than the last successfully built
// number (recorded as git tag last-built/<build-key>/<number>).
export function getBuildNumber() {
	return appBuildNumberJson.buildNumber + commonBuildNumberJson.buildNumber;
}

export const geonexiaConfig: CustomerConfig = {
	projectName: 'Geonexia',
	images: {
		company_logo_source_get_for_react_native: () => require('./assets/generated/company.png'),
	},
};

export function getCustomerConfig(): CustomerConfig {
	return geonexiaConfig;
}

export function getCompanyLogoLocalSaved(): ImageSourcePropType {
	return getCustomerConfig().images.company_logo_source_get_for_react_native();
}

export function getAppIconInsideExpoLocalSaved() {
	return require('./assets/icons/app_icon_source.png');
}
