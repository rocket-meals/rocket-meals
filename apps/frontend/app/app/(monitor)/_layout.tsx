import React, { useEffect, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { Stack } from 'expo-router';
import CustomStackHeader from '@/components/CustomStackHeader/CustomStackHeader';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { DatabaseTypes } from 'repo-depkit-common';
import { MarkingGroupsHelper } from '@/redux/actions/MarkingGroups/MarkingGroups';
import { MarkingHelper } from '@/redux/actions/Markings/Markings';
import { useDispatch, useSelector } from 'react-redux';
import { SET_APP_SETTINGS, UPDATE_MARKINGS } from '@/redux/Types/types';
import { RootState } from '@/redux/reducer';
import { ActivityIndicator, View } from 'react-native';
import { AppSettingsHelper } from '@/redux/actions/AppSettings/AppSettings';
import { sortMarkingsByGroup } from 'repo-depkit-common';

export default function MonitorLayout() {
	const { theme } = useTheme();
	const dispatch = useDispatch();
	const { translate } = useLanguage();
	const markingHelper = new MarkingHelper();
	const appSettingsHelper = new AppSettingsHelper();
	const markingGroupsHelper = new MarkingGroupsHelper();
	const [loading, setLoading] = useState(true);
	const { markings } = useSelector((state: RootState) => state.food);
	const { appSettings } = useSelector((state: RootState) => state.settings);

	const getMarkings = async () => {
		const markingResult = (await markingHelper.fetchMarkings(
			{}
		)) as DatabaseTypes.Markings[];
		const markingGroupResult = (await markingGroupsHelper.fetchMarkingGroups(
			{}
		)) as DatabaseTypes.MarkingsGroups[];

		// Use the sortMarkingsByGroup function to sort markings
		const sortedMarkings = sortMarkingsByGroup(markingResult, markingGroupResult);

		dispatch({ type: UPDATE_MARKINGS, payload: sortedMarkings });
	};

	const getAppSettings = async () => {
		const result = (await appSettingsHelper.fetchAppSettings(
			{}
		)) as DatabaseTypes.AppSettings;
		if (result) {
			dispatch({ type: SET_APP_SETTINGS, payload: result });
		}
	};

	const getAllData = async () => {
		const tasks: Promise<any>[] = [];

		if (!markings?.length) tasks.push(getMarkings());
		if (!Object.keys(appSettings || {}).length) tasks.push(getAppSettings());

		if (tasks.length === 0) {
			setLoading(false);
			return;
		}

		try {
			await Promise.allSettled(tasks);
		} catch (err) {
			console.error('Error in loading layout data:', err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		getAllData();
	}, []);

	if (loading) {
		return (
			<View
				style={{
					height: 200,
					width: '100%',
					justifyContent: 'center',
					alignItems: 'center',
				}}
			>
				<ActivityIndicator size={30} color={theme.screen.text} />
			</View>
		);
	}

	return (
		<Stack
			screenOptions={{
				headerStyle: { backgroundColor: theme.header.background },
				headerTintColor: theme.header.text,
			}}
		>
			<Stack.Screen
				name="statistics/index"
				options={{
					title: 'statistics',
					header: () => (
						<CustomStackHeader label={'Statistics'} key={'statistics'} />
					),
				}}
			/>
			<Stack.Screen
				name="foodPlanWeek/index"
				options={{
					title: 'FoodPlan:Week',
					header: () => (
						<CustomStackHeader
							label={translate(TranslationKeys.Food_Plan_Week)}
							key={'foodPlanWeek'}
						/>
					),
				}}
			/>
			<Stack.Screen
				name="list-week-screen"
				options={{
					title: 'list-week-screen',
					headerShown: false,
				}}
			/>
			<Stack.Screen
				name="foodPlanDay/index"
				options={{
					header: () => (
						<CustomStackHeader
							label={translate(TranslationKeys.food_Plan_Day)}
							key={'foodPlanDay'}
						/>
					),
				}}
			/>
			<Stack.Screen
				name="bigScreen/index"
				options={{
					headerShown: false,
				}}
			/>
			<Stack.Screen
				name="foodPlanList/index"
				options={{
					title: 'foodPlan:List',
					header: () => (
						<CustomStackHeader
							label={translate(TranslationKeys.Food_Plan_List)}
							key={'foodPlanList'}
						/>
					),
				}}
			/>
			<Stack.Screen
				name="list-day-screen/index"
				options={{
					headerShown: false,
				}}
			/>
			<Stack.Screen
				name="labels/index"
				options={{
					title: 'Labels',
					headerShown: false,
				}}
			/>
		</Stack>
	);
}
