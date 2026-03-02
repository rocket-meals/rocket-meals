import React, { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';
import { registerForPushNotificationsAsync } from '@/helper/getPushToken';
import * as Notifications from 'expo-notifications';
import { UPDATE_PROFILE } from '@/redux/Types/types';
import { DatabaseTypes } from 'repo-depkit-common';
import { ProfileHelper } from '@/redux/actions/Profile/Profile';

const extractRawExpoToken = (token: string | null) => {
	if (!token) return null;
	const m = String(token).match(/\[(.+?)\]/);
	return m ? m[1] : token;
};

async function savePushTokenToAPI(opts: { token: string | null; profile: DatabaseTypes.Profiles | any; dispatch: any }) {
	const { token, profile, dispatch } = opts;
	if (!token) {
		return;
	}
	if (!profile?.id) {
		return;
	}

	try {
		const rawToken = extractRawExpoToken(token);

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

		const updatedDevices = devices.map((d: any) =>
			d.id === deviceToUpdate.id
			? {
				...d,
				pushTokenObj: normalizedPushTokenObj,
			}
			: d
		);

		const payload: Partial<DatabaseTypes.Profiles> = {
			id: profile.id,
			devices: updatedDevices as any,
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
	} catch (e) {
		console.error('Error in savePushTokenToAPI:', e);
	}
}

const Index = () => {
	const dispatch = useDispatch();
	const { loggedIn, profile } = useSelector((state: RootState) => state.authReducer);

	useEffect(() => {
		if (!loggedIn || !profile?.id) return;

		let subscription: Notifications.Subscription | undefined;

		(async () => {

			const token = await registerForPushNotificationsAsync();

			await savePushTokenToAPI({ token, profile, dispatch });

			subscription = Notifications.addNotificationReceivedListener(notification => {
			});
		})();

		return () => {
			if (subscription && typeof subscription.remove === 'function') {
				subscription.remove();
			}
		};
	}, [loggedIn, profile?.id]);

	if (loggedIn) {
		return <Redirect href="/(app)" />;
	} else {
		return <Redirect href="/(auth)/login" />;
	}
};

export default Index;
