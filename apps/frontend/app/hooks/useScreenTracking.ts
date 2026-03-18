import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAppSelector } from '@/redux/hooks';
import { AppScreenVisits } from '@/redux/actions/AppScreenVisits/AppScreenVisits';

const DEBOUNCE_MS = 5000;

const useScreenTracking = (screenName: string) => {
	const profile = useAppSelector((state) => state.authReducer.profile);
	const lastSentRef = useRef<number>(0);

	useFocusEffect(
		useCallback(() => {
			const now = Date.now();
			if (now - lastSentRef.current < DEBOUNCE_MS) {
				return;
			}
			lastSentRef.current = now;

			const profileId = profile?.id ?? null;
			const action = new AppScreenVisits();
			action.createScreenVisit({
				screen_name: screenName,
				profile: profileId,
			}).catch(() => {
				// Silently ignore tracking errors to avoid disrupting the user experience
			});
		}, [screenName, profile?.id])
	);
};

export default useScreenTracking;
