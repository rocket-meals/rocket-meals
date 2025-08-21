import { Linking } from 'react-native';
// import {LocationType} from '@/helper/geo/LocationType';
import usePlatformHelper from '@/helper/platformHelper';
import * as IntentLauncher from 'expo-intent-launcher';

const { isAndroid, isIOS } = usePlatformHelper();

const isAndroidDevice = isAndroid();
const isIOSDevice = isIOS();
const isMobile = isAndroidDevice || isIOSDevice;

export class HrefHelper {
	static MAILTO: string = 'mailto:';
	static TEL: string = 'tel:';
	static GEO_ANDROID: string = 'geo:';
	static GEO_IOS: string = 'maps:';
}

const ANDROID_PARAM_NEW_ACTIVITY = {
	flags: ['FLAG_ACTIVITY_NEW_TASK'],
};

export class CommonSystemActionHelper {
	static async openExternalURL(url: string, newWindow = false) {
		if (isMobile) {
			await Linking.openURL(url);
		} else {
			let target = '_self';
			if (newWindow) {
				target = '_blank';
			}
			await window.open(url, target);
		}
	}

	// static async openMaps(location: LocationType, useGoogleMaps?: boolean) {
	// 	const latitude = location?.latitude;
	// 	const longitude = location?.longitude;

	// 	let alwaysUseGoogleMaps = true;
	// 	if (useGoogleMaps !== undefined && useGoogleMaps !== null) {
	// 		alwaysUseGoogleMaps = useGoogleMaps;
	// 	}

	// 	let url =
	//         'https://www.google.com/maps?q=' +
	//         latitude +
	//         ',' +
	//         longitude;

	// 	if (!alwaysUseGoogleMaps) {
	// 		if (isIOSDevice) {
	// 			url = HrefHelper.GEO_IOS + latitude + ',' + longitude;
	// 		} else if (isAndroidDevice) {
	// 			url = HrefHelper.GEO_ANDROID + latitude + ',' + longitude
	// 		}
	// 	}

	// 	await CommonSystemActionHelper.openExternalURL(url, true);
	// }
}

class PrivateSystemActionHelper extends CommonSystemActionHelper {
	static async androidStartActivityAsync(activityAction: string, extras?: any) {
		return await IntentLauncher.startActivityAsync(activityAction, {
			...ANDROID_PARAM_NEW_ACTIVITY,
			...extras,
		});
	}

	static async openActivity(
		iosURL: string,
		androidAction: string,
		androidExtras?: any
	) {
		if (isIOSDevice) {
			return await Linking.openURL(iosURL);
		} else if (isAndroidDevice) {
			return await PrivateSystemActionHelper.androidStartActivityAsync(
				androidAction,
				androidExtras
			);
		}
	}
}

class MobileSystemActionHelper extends PrivateSystemActionHelper {
	static async openSystemAppSettings() {
		if (isMobile) {
			await Linking.openSettings();
		}
	}

	static async openSystemSettings() {
		return await PrivateSystemActionHelper.openActivity(
			'App-Prefs:',
			IntentLauncher.ActivityAction.SETTINGS
		);
	}
}

class iPhoneSystemActionHelper extends MobileSystemActionHelper {}

class androidSystemActionHelper extends MobileSystemActionHelper {
	static async openNFCSettings() {
		return await MobileSystemActionHelper.openActivity(
			'',
			IntentLauncher.ActivityAction.NFC_SETTINGS
		);
	}
}

export class SystemActionHelper {
	static MobileSystemActionHelper = MobileSystemActionHelper;
	static iPhoneSystemActionHelper = iPhoneSystemActionHelper;
	static androidSystemActionHelper = androidSystemActionHelper;
}
