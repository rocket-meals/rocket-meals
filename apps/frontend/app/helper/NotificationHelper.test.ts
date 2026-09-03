import type { NotificationPermissionsStatus } from 'expo-notifications';
import { NotificationHelper } from './NotificationHelper';

const buildPermission = (permission: Partial<NotificationPermissionsStatus>) => permission as NotificationPermissionsStatus;

describe('NotificationHelper.ensureDeviceNotificationPermission', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('does not ask again when the permission is already granted', async () => {
		const granted = buildPermission({ granted: true, canAskAgain: true });
		jest.spyOn(NotificationHelper, 'getDeviceNotificationPermission').mockResolvedValue(granted);
		const request = jest.spyOn(NotificationHelper, 'requestDeviceNotificationPermission');

		await expect(NotificationHelper.ensureDeviceNotificationPermission()).resolves.toBe(granted);
		expect(request).not.toHaveBeenCalled();
	});

	it('asks the user as long as the system allows it', async () => {
		const undetermined = buildPermission({ granted: false, canAskAgain: true });
		const granted = buildPermission({ granted: true, canAskAgain: true });
		jest.spyOn(NotificationHelper, 'getDeviceNotificationPermission').mockResolvedValue(undetermined);
		const request = jest.spyOn(NotificationHelper, 'requestDeviceNotificationPermission').mockResolvedValue(granted);

		await expect(NotificationHelper.ensureDeviceNotificationPermission()).resolves.toBe(granted);
		expect(request).toHaveBeenCalledTimes(1);
	});

	it('reports the denial instead of asking when iOS will not show its dialog again', async () => {
		// This is the case that used to make the "notify me" toggle look dead: the request resolves
		// with granted: false without ever showing a dialog.
		const denied = buildPermission({ granted: false, canAskAgain: false });
		jest.spyOn(NotificationHelper, 'getDeviceNotificationPermission').mockResolvedValue(denied);
		const request = jest.spyOn(NotificationHelper, 'requestDeviceNotificationPermission');

		const permission = await NotificationHelper.ensureDeviceNotificationPermission();

		expect(permission?.granted).toBe(false);
		expect(request).not.toHaveBeenCalled();
	});

	it('falls back to the known permission when the request fails', async () => {
		const undetermined = buildPermission({ granted: false, canAskAgain: true });
		jest.spyOn(NotificationHelper, 'getDeviceNotificationPermission').mockResolvedValue(undetermined);
		jest.spyOn(NotificationHelper, 'requestDeviceNotificationPermission').mockResolvedValue(undefined);

		await expect(NotificationHelper.ensureDeviceNotificationPermission()).resolves.toBe(undetermined);
	});
});
