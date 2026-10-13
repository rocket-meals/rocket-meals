import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import useKioskMode from '@/hooks/useKioskMode';
import { getCustomerConfig, getVersionInternalForAppsettingsScreen } from '@/config';
import { StoreVersionHelper } from '@/helper/StoreVersionHelper';
import { AppOutdatedNoticeGate } from '@/helper/appOutdatedNoticeGate';
import { useShowAppOutdatedSheet } from '@/components/AppOutdatedSheet/AppOutdatedSheet';

// The popup events wait at most this long for the store check.
const STORE_CHECK_TIMEOUT_MS = 5000;

// One check per app start, even if the component mounts again.
let checkStarted = false;

/**
 * Mounted once in the root layout, so it also runs on the login screen. Once per
 * app start it compares the installed app with its own store (App Store on iOS,
 * Google Play on Android, major and build number only) and shows the
 * "new version" sheet when the store has a newer one. The popup events wait
 * until this is done (see AppOutdatedNoticeGate). Never on the web and never in
 * kiosk mode.
 */
const AppOutdatedNotice = () => {
	const kioskMode = useKioskMode();
	const showAppOutdatedSheet = useShowAppOutdatedSheet();

	useEffect(() => {
		if (checkStarted) return;
		checkStarted = true;
		if (Platform.OS === 'web' || kioskMode) {
			AppOutdatedNoticeGate.markDone();
			return;
		}

		// A slow or unreachable store must not hold the popup events back for long.
		const timeout = setTimeout(() => AppOutdatedNoticeGate.markDone(), STORE_CHECK_TIMEOUT_MS);
		const installedAppIds = StoreVersionHelper.getInstalledAppIds(Constants.expoConfig, getCustomerConfig());
		StoreVersionHelper.checkInstalledAppAgainstStore(Platform.OS, installedAppIds, getVersionInternalForAppsettingsScreen())
			.then(check => {
				clearTimeout(timeout);
				// Too late: the popup events had their turn already.
				if (AppOutdatedNoticeGate.isDone()) return;
				if (check.comparison !== 'newer_in_store') {
					AppOutdatedNoticeGate.markDone();
					return;
				}
				showAppOutdatedSheet(check.storeUrl, () => AppOutdatedNoticeGate.markDone());
			})
			.catch(() => {
				clearTimeout(timeout);
				AppOutdatedNoticeGate.markDone();
			});
	}, [kioskMode, showAppOutdatedSheet]);

	return null;
};

export default AppOutdatedNotice;
