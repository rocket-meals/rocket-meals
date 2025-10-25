import React, { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';
import { registerForPushNotificationsAsync } from '@/helper/getPushToken';
import * as Notifications from 'expo-notifications';
import { UPDATE_PROFILE } from '@/redux/Types/types';
import { DatabaseTypes } from 'repo-depkit-common';
import { ProfileHelper } from '@/redux/actions/Profile/Profile';

async function savePushTokenToAPI(opts: { token: string | null; profile: DatabaseTypes.Profiles | any; dispatch: any }) {
	const { token, profile, dispatch } = opts;
	if (!token) {
		return;
	}
	if (!profile?.id) {
		return;
	}

	try {
		const rawTokenMatch = token.match(/\[(.+?)\]/);
		const rawToken = rawTokenMatch ? rawTokenMatch[1] : token;

		const devices = Array.isArray(profile.devices) ? profile.devices : [];
		if (devices.length === 0) {
			return;
		}

		const deviceToUpdate = devices.slice().sort((a: any, b: any) => new Date(b?.date_updated ?? 0).getTime() - new Date(a?.date_updated ?? 0).getTime())[0] || devices[0];

		const existingPermission = deviceToUpdate?.pushTokenObj?.permission ?? null;

		const normalizedPushTokenObj: any = {
			...(existingPermission ? { permission: existingPermission } : {}),
			pushToken: rawToken,
		};

		const payload: Partial<DatabaseTypes.Profiles> = {
			id: profile.id,
			devices: [
				{
					id: deviceToUpdate.id,
					pushTokenObj: normalizedPushTokenObj,
				} as any,
			],
		};

		const helper = new ProfileHelper();
		const updated = (await helper.updateProfile(payload)) as DatabaseTypes.Profiles;

		if (updated) {
			dispatch({
				type: UPDATE_PROFILE,
				payload: updated,
			});
		} else {
		}
	} catch (e) {}
}

const Index = () => {
	const dispatch = useDispatch();
	const { loggedIn, profile } = useSelector((state: RootState) => state.authReducer);

	useEffect(() => {
		(async () => {
			const token = await registerForPushNotificationsAsync();
			console.log('Expo Push Token:', token);

			await savePushTokenToAPI({ token, profile, dispatch });

			const subscription = Notifications.addNotificationReceivedListener(notification => {
				console.log('Notification received:', notification);
			});

			return () => subscription.remove();
		})();
	}, [profile?.id]);

	if (loggedIn) {
		return <Redirect href="/(app)" />;
	} else {
		return <Redirect href="/(auth)/login" />;
	}
};

export default Index;
