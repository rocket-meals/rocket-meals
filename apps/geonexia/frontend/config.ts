import { ImageSourcePropType } from 'react-native';

export type CustomerConfig = {
	projectName: string;
	images: {
		company_logo_source_get_for_react_native: () => ImageSourcePropType;
	};
};

// DO NOT CHANGE THE NAME OF THIS FUNCTION: getBuildNumber
// The workflow action check-build-number will use this function to determine the build number
// and will fail if the function is not present or does not return a number.
// The build number is used to determine if a new build is required.
export function getBuildNumber() {
	return 13;
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
