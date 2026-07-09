import React, { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useDispatch } from 'react-redux';
import { AppScreens } from 'repo-depkit-common';
import { useAppSelector } from '@/redux/hooks';
import { UPDATE_PROFILE } from '@/redux/Types/types';

// Skip onboarding entirely once a canteen and price group are known (checked
// synchronously from the persisted state, no network round-trip needed) - otherwise
// onboarding would still mount and briefly flash before redirecting itself.
const Home = () => {
	const dispatch = useDispatch();
	const { profile } = useAppSelector((state) => state.authReducer);
	const { selectedCanteen } = useAppSelector((state) => state.canteenReducer);

	// Sessions from before profile.canteen was persisted (older app versions only ever set
	// the separately-tracked selectedCanteen) would look incomplete forever and be sent
	// through onboarding on every start - accept selectedCanteen as proof of a completed
	// canteen setup too.
	const hasCanteen = !!profile?.canteen || !!selectedCanteen?.id;
	const hasCompleteProfile = hasCanteen && !!profile?.price_group;

	// Backfill profile.canteen from the legacy selectedCanteen so future checks (and the
	// server sync for registered users in (app)/_layout's syncProfileDefaults) see it too.
	useEffect(() => {
		if (!profile?.canteen && selectedCanteen?.id) {
			dispatch({ type: UPDATE_PROFILE, payload: { ...profile, canteen: selectedCanteen.id } });
		}
	}, [profile, selectedCanteen?.id, dispatch]);

	if (hasCompleteProfile) {
		return <Redirect href={('/(app)/' + AppScreens.FOOD_OFFERS) as any} />;
	}
	return <Redirect href="/(app)/experimentell/onboarding" />;
};

export default Home;
