import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/redux/hooks';
import useSelectedCanteen from '@/hooks/useSelectedCanteen';
import { SET_SELECTED_CANTEEN } from '@/redux/Types/types';
import { AppScreens, DatabaseTypes } from 'repo-depkit-common';
import { Redirect, useRouter } from 'expo-router';

const Home = () => {
	const dispatch = useDispatch();
	const router = useRouter();
	const { canteens } = useAppSelector((state) => state.canteenReducer);
	const { profile } = useAppSelector((state) => state.authReducer);
	const selectedCanteen = useSelectedCanteen();

	useEffect(() => {
		if (selectedCanteen || canteens.length === 0) return;
		const profileCanteenId = profile?.canteen
			? typeof profile.canteen === 'string'
				? profile.canteen
				: (profile.canteen as DatabaseTypes.Canteens)?.id
			: null;
		if (!profileCanteenId) return;
		const canteen = canteens.find((c) => String(c.id) === String(profileCanteenId));
		if (canteen) {
			dispatch({ type: SET_SELECTED_CANTEEN, payload: canteen });
			router.replace(('/(app)/' + AppScreens.FOOD_OFFERS) as any);
		}
	}, [profile?.canteen, canteens, selectedCanteen, dispatch, router]);

	if (selectedCanteen) {
		return <Redirect href={('/(app)/' + AppScreens.FOOD_OFFERS) as any} />;
	}

	return <Redirect href="/(app)/experimentell/onboarding" />;
};

export default Home;
