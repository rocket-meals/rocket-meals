import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import { getPlatformHelper } from '@/helper/platformHelper';
import { getDeviceInformationWithoutPushToken } from './DeviceHelper';
import { DatabaseTypes } from 'repo-depkit-common';
// import {useSynchedDevices} from "@/states/SynchedDevices";
import type { ExpoPushToken, NotificationPermissionsStatus } from 'expo-notifications';

type NotificationsModule = typeof import('expo-notifications');

async function getNotificationsModule(): Promise<NotificationsModule | null> {
	if (Platform.OS === 'web') {
		return null;
	}
	return await import('expo-notifications');
}

export type NotificationObjType = {
	permission?: NotificationPermissionsStatus;
	pushtokenObj?: ExpoPushToken;
};

export type MyPushToken = ExpoPushToken;

export class NotificationHelper {
	static getProjectId(): string {
		return Constants.expoConfig?.extra?.eas?.projectId;
	}

	/**
	 * Reads the permission that was cached on the profile's device entry the last time the app
	 * synchronised it. It can be missing or outdated (a profile without devices reports "not
	 * granted"), so never gate an action on it - ask the system via
	 * {@link NotificationHelper.ensureDeviceNotificationPermission} instead.
	 */
	static useNotificationPermission(profile: DatabaseTypes.Profiles): [boolean, NotificationObjType, (timestamp?: string) => void, () => void] {
		const devices = profile?.devices || [];
		let deviceInformationsWithoutPushToken: Partial<DatabaseTypes.Devices> = getDeviceInformationWithoutPushToken();
		let deviceInformationsId = getDeviceIdentifier(deviceInformationsWithoutPushToken);
		let currentDevice = getCurrentDevice(deviceInformationsId);

		function getDeviceIdentifier(device: Partial<DatabaseTypes.Devices>) {
			return device.platform + '_' + device.brand + '_' + device.system_version;
		}

		function getCurrentDevice(deviceInformationsId: string | undefined): DatabaseTypes.Devices | undefined {
			let foundDevice: undefined | DatabaseTypes.Devices = undefined;
			if (deviceInformationsId) {
				for (const device of devices) {
					if (getDeviceIdentifier(device) === deviceInformationsId) {
						foundDevice = device;
						break;
					}
				}
			}
			return foundDevice;
		}

		// const [currentDevice, devices, setDevices, cacheHelperObjDevices] = useSynchedDevices()
		const pushTokenObj: NotificationObjType | undefined = currentDevice?.pushTokenObj || {
			permission: undefined,
			pushtokenObj: undefined,
		};
		let notificationGranted = NotificationHelper.isDeviceNotificationPermissionGranted(pushTokenObj);

		const requestDeviceNotificationPermission = NotificationHelper.requestDeviceNotificationPermission;

		return [notificationGranted, pushTokenObj, () => {}, requestDeviceNotificationPermission];
	}

	static getBadgeCountAsync() {
		return getNotificationsModule().then(m => (m ? m.getBadgeCountAsync() : 0));
	}

	static setBadgeCountAsync(count: number) {
		return getNotificationsModule().then(m => (m ? m.setBadgeCountAsync(count) : undefined));
	}

	static isDeviceNotificationPermissionDenied(notificationObj: NotificationObjType) {
		return notificationObj?.permission?.granted === false;
	}

	static isDeviceNotificationPermissionGranted(notificationObj: NotificationObjType) {
		return notificationObj?.permission?.granted === true;
	}

	static isDeviceNotificationPermissionUndetermined(notificationObj: NotificationObjType) {
		const { isIOS, isAndroid } = getPlatformHelper();
		if (isIOS()) {
			return notificationObj?.permission?.ios?.status === 0;
		} else if (isAndroid()) {
			return notificationObj?.permission?.android?.importance === undefined;
		}
	}

	static async loadDeviceNotificationPermission(): Promise<NotificationObjType> {
		const permission = await NotificationHelper.getDeviceNotificationPermission();
		let pushtokenObj = undefined;
		if (!!permission && permission.granted) {
			pushtokenObj = await NotificationHelper.getExpoPushTokenAsync();
		}
		return {
			permission: permission,
			pushtokenObj: pushtokenObj,
		};
	}

	static async getDeviceNotificationPermission(): Promise<NotificationPermissionsStatus | undefined> {
		try {
			const Notifications = await getNotificationsModule();
			if (!Notifications) {
				return undefined;
			}
			return await Notifications.getPermissionsAsync();
		} catch (err) {
			console.warn('NotificationHelper: could not get device notification permission (e.g. running on an emulator)', err);
		}
	}

	static async requestDeviceNotificationPermission(): Promise<NotificationPermissionsStatus | undefined> {
		try {
			const Notifications = await getNotificationsModule();
			if (!Notifications) {
				return undefined;
			}
			const permission = await Notifications.requestPermissionsAsync({
				android: {
					// On Android, all available permissions are granted by default
				},
				ios: {
					allowAlert: true,
					allowBadge: true,
					allowSound: true,
				},
			});
			// @ts-ignore
			return permission;
		} catch (err) {
			console.warn('NotificationHelper: could not request device notification permission (e.g. running on an emulator)', err);
			return undefined;
		}
	}

	/**
	 * Returns the current notification permission and asks the user for it when the system still
	 * allows asking.
	 *
	 * iOS only ever shows its permission dialog once: afterwards `requestPermissionsAsync()`
	 * resolves immediately with `granted: false` and `canAskAgain: false`. Callers therefore must
	 * not treat "not granted" as "nothing to do" - they have to send the user to the system
	 * settings, otherwise a toggle that depends on the permission simply does nothing.
	 */
	static async ensureDeviceNotificationPermission(): Promise<NotificationPermissionsStatus | undefined> {
		const currentPermission = await NotificationHelper.getDeviceNotificationPermission();
		if (currentPermission?.granted) {
			return currentPermission;
		}
		if (currentPermission?.canAskAgain === false) {
			return currentPermission;
		}
		const requestedPermission = await NotificationHelper.requestDeviceNotificationPermission();
		return requestedPermission ?? currentPermission;
	}

	/**
	 * Opens the system settings of the app so the user can grant the notification permission that
	 * can no longer be requested from inside the app.
	 */
	static async openSystemNotificationSettings(): Promise<void> {
		try {
			await Linking.openSettings();
		} catch (err) {
			console.warn('NotificationHelper: could not open the system settings', err);
		}
	}

	static async getExpoPushTokenAsync(): Promise<ExpoPushToken | undefined> {
		try {
			const Notifications = await getNotificationsModule();
			if (!Notifications) {
				return undefined;
			}
			const projectId = NotificationHelper.getProjectId();
			return await Notifications.getExpoPushTokenAsync({
				projectId: projectId,
			});
		} catch (err) {
			console.warn('NotificationHelper: could not get Expo push token (e.g. running on an emulator)', err);
			return undefined;
		}
	}

	static async scheduleLocalNotification(title: string, body: string, secondsFromNow: number, customIdentifier?: string) {
		const Notifications = await getNotificationsModule();
		if (!Notifications) {
			return null;
		}
		const notification_id = await Notifications.scheduleNotificationAsync({
			content: {
				title: title,
				body: body,
				data: { customIdentifier: customIdentifier },
				sound: Platform.OS === 'android' ? false : 'default', // https://stackoverflow.com/a/70085728/8908657
			},
			trigger: {
				seconds: secondsFromNow,
				channelId: 'testChannel',
			},
		});
		const notification = await NotificationHelper.getScheduledLocalNotification(notification_id);
		return notification;
	}

	static async cancelScheduledLocalNotification(notificationId: string) {
		const Notifications = await getNotificationsModule();
		if (!Notifications) {
			return false;
		}
		await Notifications.cancelScheduledNotificationAsync(notificationId);
		const foundNotification = await NotificationHelper.getScheduledLocalNotification(notificationId);
		return !foundNotification;
	}

	static getNotificationChannelsAsync() {
		return getNotificationsModule().then(m => (m ? m.getNotificationChannelsAsync() : []));
	}

	static setNotificationChannelAsync(channel: string) {
		getNotificationsModule().then(Notifications => {
			if (!Notifications) {
				return;
			}
			Notifications.setNotificationChannelAsync(channel, {
				name: channel,
				importance: Notifications.AndroidImportance.HIGH,
				sound: 'default',
			});
		});
	}

	static async getAllScheduledNotificationsAsync() {
		const Notifications = await getNotificationsModule();
		if (!Notifications) {
			return [];
		}
		const notifications = await Notifications.getAllScheduledNotificationsAsync();
		return notifications;
	}

	static async getScheduledLocalNotification(notificationId: string) {
		const notifications = await NotificationHelper.getAllScheduledNotificationsAsync();
		if (notifications) {
			return notifications.find(notification => notification?.identifier === notificationId);
		}
		return null;
	}

	static async getScheduleLocalNotificationByCustomIdentifier(customIdentifier: string) {
		const notifications = await NotificationHelper.getAllScheduledNotificationsAsync();
		if (notifications) {
			return notifications.find(notification => notification?.content?.data?.customIdentifier === customIdentifier);
		}
		return null;
	}
}