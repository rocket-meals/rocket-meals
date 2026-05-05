import * as Notifications from 'expo-notifications';
import { ExpoPushToken } from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import usePlatformHelper from '@/helper/platformHelper';
import { IosAuthorizationStatus } from 'expo-notifications/src/NotificationPermissions.types';
import { getDeviceInformationWithoutPushToken } from './DeviceHelper';
import { DatabaseTypes } from 'repo-depkit-common';
// import {useSynchedDevices} from "@/states/SynchedDevices";

export type NotificationObjType = {
	permission?: Notifications.NotificationPermissionsStatus;
	pushtokenObj?: ExpoPushToken;
};

export type MyPushToken = ExpoPushToken;

export class NotificationHelper {
	static getProjectId(): string {
		return Constants.expoConfig?.extra?.eas?.projectId;
	}

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
		return Notifications.getBadgeCountAsync();
	}

	static setBadgeCountAsync(count: number) {
		return Notifications.setBadgeCountAsync(count);
	}

	static isDeviceNotificationPermissionDenied(notificationObj: NotificationObjType) {
		return notificationObj?.permission?.granted === false;
	}

	static isDeviceNotificationPermissionGranted(notificationObj: NotificationObjType) {
		return notificationObj?.permission?.granted === true;
	}

	static isDeviceNotificationPermissionUndetermined(notificationObj: NotificationObjType) {
		const { isIOS, isAndroid } = usePlatformHelper();
		if (isIOS()) {
			return notificationObj?.permission?.ios?.status === IosAuthorizationStatus.NOT_DETERMINED;
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

	static async getDeviceNotificationPermission(): Promise<Notifications.NotificationPermissionsStatus | undefined> {
		try {
			return await Notifications.getPermissionsAsync();
		} catch (err) {
			//TODO: handle emulator
			//console.log(err)
		}
	}

	static async requestDeviceNotificationPermission(): Promise<Notifications.NotificationPermissionsStatus | undefined> {
		try {
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
			//TODO: handle emulator
			//console.log(err)
			return undefined;
		}
	}

	static async getExpoPushTokenAsync(): Promise<ExpoPushToken | undefined> {
		try {
			const projectId = NotificationHelper.getProjectId();
			return await Notifications.getExpoPushTokenAsync({
				projectId: projectId,
			});
		} catch (err) {
			//TODO: handle emulator
			//console.log(err)
			return undefined;
		}
	}

	static async scheduleLocalNotification(title: string, body: string, secondsFromNow: number, customIdentifier?: string) {
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
		await Notifications.cancelScheduledNotificationAsync(notificationId);
		const foundNotification = await NotificationHelper.getScheduledLocalNotification(notificationId);
		return !foundNotification;
	}

	static getNotificationChannelsAsync() {
		return Notifications.getNotificationChannelsAsync();
	}

	static setNotificationChannelAsync(channel: string) {
		Notifications.setNotificationChannelAsync(channel, {
			name: channel,
			importance: Notifications.AndroidImportance.HIGH,
			sound: 'default',
		});
	}

	static async getAllScheduledNotificationsAsync() {
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
