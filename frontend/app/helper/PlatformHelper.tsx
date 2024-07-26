import {Platform} from 'react-native';

export class PlatformHelper {

	static isWeb() {
		return Platform.OS === 'web';
	}

	static isIOS() {
		return Platform.OS === 'ios';
	}

	static isAndroid() {
		return Platform.OS === 'android';
	}

	static isSmartPhone() {
		//or is it better to as !isWeb
		return PlatformHelper.isAndroid() ||  PlatformHelper.isIOS()
	}

	static getPlatformDependentValue(webValue: any, iosValue: any, androidValue: any, defaultValue: any) {
		if (PlatformHelper.isWeb()) {
			return webValue;
		} else if (PlatformHelper.isIOS()) {
			return iosValue;
		} else if (PlatformHelper.isAndroid()) {
			return androidValue;
		}
		return defaultValue;
	}

	static getPlatformDisplayName() {
		if (PlatformHelper.isWeb()) {
			return 'Web';
		} else if (PlatformHelper.isIOS()) {
			return 'iOS';
		} else if (PlatformHelper.isAndroid()) {
			return 'Android';
		} else {
			return 'Unknown';
		}
	}
}
