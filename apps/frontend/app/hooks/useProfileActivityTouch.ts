import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { ProfileHelper } from '@/redux/actions/Profile/Profile';
import { UserHelper } from '@/helper/UserHelper';

/**
 * Marks the profile as active: an empty update makes Directus set `profiles.date_updated`.
 * Happens once when the profile is known (app start, also on web) and every time the app comes
 * back to the foreground. The backend page "Live-Puls" shows who was active lately from this field.
 *
 * Fire and forget: a failed touch must never disturb the app.
 */
export function useProfileActivityTouch(user: Record<string, any> | null, profileId: string | null | undefined) {
	const appState = useRef<AppStateStatus>(AppState.currentState as AppStateStatus);

	useEffect(() => {
		if (!UserHelper.isRegisteredUser(user) || !profileId) {
			return;
		}
		const profileHelper = new ProfileHelper();
		const touch = () => {
			profileHelper.updateItem(profileId, {}).catch(error => {
				console.log('useProfileActivityTouch: could not mark the profile as active', error);
			});
		};

		touch();
		const subscription = AppState.addEventListener('change', nextState => {
			const cameToForeground = appState.current !== 'active' && nextState === 'active';
			appState.current = nextState;
			if (cameToForeground) {
				touch();
			}
		});
		return () => subscription.remove();
	}, [user?.id, profileId]);
}
