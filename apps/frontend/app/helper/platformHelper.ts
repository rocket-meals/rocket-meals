import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

const usePlatformHelper = () => {
	const isWeb = () => Platform.OS === 'web';

	const isIOS = () => Platform.OS === 'ios';

	const isAndroid = () => Platform.OS === 'android';

	const isSmartPhone = () => isAndroid() || isIOS();

	const getPlatformDisplayName = () => {
		if (isWeb()) return 'Web';
		if (isIOS()) return 'iOS';
		if (isAndroid()) return 'Android';
		return 'Unknown';
	};

	const getPlatformDependentValue = (
		webValue: any,
		iosValue: any,
		androidValue: any,
		defaultValue: any
	) => {
		if (isWeb()) return webValue;
		if (isIOS()) return iosValue;
		if (isAndroid()) return androidValue;
		return defaultValue;
	};

	const getAndroidPreferredBrowserPackageOption = async () => {
		try {
			const customTabsSupporting =
				await WebBrowser.getCustomTabsSupportingBrowsersAsync();

			const {
				preferredBrowserPackage,
				browserPackages = [],
				servicePackages = [],
			} = customTabsSupporting;

			// Default fallback to Chrome
			const defaultBrowserPackage = 'com.android.chrome';

			return {
				browserPackage:
					preferredBrowserPackage ||
					browserPackages[0] ||
					servicePackages[0] ||
					defaultBrowserPackage,
			};
		} catch (error) {
			console.error('Error fetching preferred browser package:', error);
			return { browserPackage: 'com.android.chrome' }; // Fallback
		}
	};

	return {
		isWeb,
		isIOS,
		isAndroid,
		isSmartPhone,
		getPlatformDisplayName,
		getPlatformDependentValue,
		getAndroidPreferredBrowserPackageOption,
	};
};

export default usePlatformHelper;
