import React, { useEffect, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { Stack } from 'expo-router';
import CustomStackHeader from '@/components/CustomStackHeader/CustomStackHeader';
import TranslatedStackHeader from '@/components/CustomStackHeader/TranslatedStackHeader';
import { TranslationKeys } from '@/locales/keys';
import { DatabaseTypes, sortMarkingsByGroup } from 'repo-depkit-common';
import { MarkingGroupsHelper } from '@/redux/actions/MarkingGroups/MarkingGroups';
import { MarkingHelper } from '@/redux/actions/Markings/Markings';
import { useDispatch } from 'react-redux';
import { SET_APP_SETTINGS, UPDATE_MARKING_GROUPS, UPDATE_MARKINGS } from '@/redux/Types/types';
import { View } from 'react-native';
import LoadingIndicator from '@/components/LoadingIndicator/LoadingIndicator';
import { AppSettingsHelper } from '@/redux/actions/AppSettings/AppSettings';
import { useAppSelector } from '@/redux/hooks';

const StatisticsHeader = () => <CustomStackHeader label={'Statistics'} key={'statistics'} />;

// `Stack.Screen`'s `options.header` calls this as a plain function (never as
// a JSX tag), so a factory returning a stable function avoids defining a new
// arrow (and thus a new "component") on every render.
function makeTranslatedStackHeader(labelKey: TranslationKeys, headerKey?: string) {
	return () => <TranslatedStackHeader labelKey={labelKey} headerKey={headerKey} />;
}

export default function MonitorLayout() {
	const { theme } = useTheme();
	const dispatch = useDispatch();
	const markingHelper = new MarkingHelper();
	const appSettingsHelper = new AppSettingsHelper();
	const markingGroupsHelper = new MarkingGroupsHelper();
	const [loading, setLoading] = useState(true);
	const { markings } = useAppSelector((state) => state.food);
	const { appSettings } = useAppSelector((state) => state.settings);

	const getMarkings = async () => {
		const markingResult = (await markingHelper.fetchMarkings({})) as DatabaseTypes.Markings[];
		const markingGroupResult = (await markingGroupsHelper.fetchMarkingGroups({})) as DatabaseTypes.MarkingsGroups[];

		// Use the sortMarkingsByGroup function to sort markings
		const sortedMarkings = sortMarkingsByGroup(markingResult, markingGroupResult);

		dispatch({ type: UPDATE_MARKINGS, payload: sortedMarkings });
		dispatch({ type: UPDATE_MARKING_GROUPS, payload: markingGroupResult });
	};

	const getAppSettings = async () => {
		const result = (await appSettingsHelper.fetchAppSettings({})) as DatabaseTypes.AppSettings;
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
		void getAllData();
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
				<LoadingIndicator size={30} color={theme.screen.text} />
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
					header: StatisticsHeader,
				}}
			/>
			<Stack.Screen
				name="foodPlanWeek/index"
				options={{
					title: 'FoodPlan:Week',
					header: makeTranslatedStackHeader(TranslationKeys.Food_Plan_Week, 'foodPlanWeek'),
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
					header: makeTranslatedStackHeader(TranslationKeys.food_Plan_Day, 'foodPlanDay'),
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
					header: makeTranslatedStackHeader(TranslationKeys.Food_Plan_List, 'foodPlanList'),
				}}
			/>
			<Stack.Screen
				name="list-day-screen/index"
				options={{
					headerShown: false,
				}}
			/>
			<Stack.Screen
				name="collectible-event-monitor/index"
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
