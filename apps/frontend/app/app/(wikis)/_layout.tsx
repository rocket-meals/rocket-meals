import React, { useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { Stack } from 'expo-router';
import { DatabaseTypes } from 'repo-depkit-common';
import { SET_WIKIS } from '@/redux/Types/types';
import { useDispatch } from 'react-redux';
import { WikisHelper } from '@/redux/actions/Wikis/Wikis';
import { useAppSelector } from '@/redux/hooks';
export default function FoodOfferLayout() {
	const dispatch = useDispatch();
	const { theme } = useTheme();
	const wikisHelper = new WikisHelper();
	const { wikis } = useAppSelector((state) => state.settings);

	const getWikis = async () => {
		try {
			const response = (await wikisHelper.fetchWikis()) as DatabaseTypes.Wikis[];
			if (response) {
				dispatch({ type: SET_WIKIS, payload: response });
			}
		} catch (error) {
			console.error('Error fetching wikis:', error);
		}
	};

	useEffect(() => {
		if (wikis?.length === 0) {
			getWikis();
		}
	}, [wikis]);
	return (
		<Stack
			screenOptions={{
				headerStyle: { backgroundColor: theme.header.background },
				headerTintColor: theme.header.text,
			}}
		>
			<Stack.Screen
				name="wikis/index"
				options={{
					headerShown: false,
				}}
			/>
		</Stack>
	);
}
