import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { NotificationHelper } from '@/helper/NotificationHelper';

/**
 * Sets the number on the app icon (badge) back to 0 whenever the app is opened: once on start and
 * every time it comes back to the foreground. A push message can set the badge, opening the app
 * always clears it. No effect on web.
 *
 * Fire and forget: a failed reset must never disturb the app.
 */
export function useAppIconBadgeReset() {
	const appState = useRef<AppStateStatus>(AppState.currentState as AppStateStatus);

	useEffect(() => {
		const reset = () => {
			NotificationHelper.setBadgeCountAsync(0).catch(error => {
				console.log('useAppIconBadgeReset: could not reset the badge', error);
			});
		};

		reset();
		const subscription = AppState.addEventListener('change', nextState => {
			const cameToForeground = appState.current !== 'active' && nextState === 'active';
			appState.current = nextState;
			if (cameToForeground) {
				reset();
			}
		});
		return () => subscription.remove();
	}, []);
}
