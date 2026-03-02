import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment';
import { useRouter } from 'expo-router';
import { SET_WEEK_PLAN } from '@/redux/Types/types';
import { myContrastColor } from '@/helper/ColorHelper';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { RootState } from '@/redux/reducer';

const Index = () => {
	useSetPageTitle('FoodPlan:Week');
	const currentYear: number = moment().year();
	const { theme } = useTheme();
	const router = useRouter();
	const dispatch = useDispatch();
	const { width } = useWindowDimensions();
	const [years, setYears] = useState<number[]>([currentYear - 1, currentYear, currentYear + 1]);
	const [selectedYear, setSelectedYear] = useState<number>(currentYear);
	const { weekPlan } = useSelector((state: RootState) => state.management);
	const [weeks, setWeeks] = useState<{ weekNumber: number; dateRange: string }[]>(generateWeeks(currentYear));
	const [selectedWeek, setSelectedWeek] = useState<number>(moment().isoWeek());
	const { primaryColor: projectColor, appSettings, selectedTheme: mode } = useSelector((state: RootState) => state.settings);
	const foods_area_color = appSettings?.foods_area_color ? appSettings?.foods_area_color : projectColor;

	const contrastColor = myContrastColor(foods_area_color, theme, mode === 'dark');

	function generateWeeks(year: number): { weekNumber: number; dateRange: string }[] {
		const weeksData: { weekNumber: number; dateRange: string }[] = [];
		const totalWeeks: number = moment(`${year}-12-31`).isoWeeksInYear();

		for (let i = 1; i <= totalWeeks; i++) {
			weeksData.push({
				weekNumber: i,
				dateRange: getDateRangeForWeek(i, year),
			});
		}
		return weeksData;
	}

	function getDateRangeForWeek(weekNumber: number, year: number): string {
		const startOfWeek: moment.Moment = moment().year(year).isoWeek(weekNumber).startOf('isoWeek');
		const endOfWeek: moment.Moment = startOfWeek.clone().endOf('isoWeek');

		return `${startOfWeek.format('DD.MM.')} - ${endOfWeek.format('DD.MM.')}`;
	}

	const handleWeekPress = (type: string, weekNumber: number): void => {
		setSelectedWeek(weekNumber);
		const startOfWeek: moment.Moment = moment().year(selectedYear).isoWeek(weekNumber).startOf('isoWeek');
		const dateIso = startOfWeek.toISOString();
		const formattedDates: { [key: string]: { date: string } }[] = [];
		const weekDays: string[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

		for (let i = 0; i < 7; i++) {
			formattedDates.push({
				[weekDays[i]]: {
					date: startOfWeek.clone().add(i, 'days').format('YYYY-MM-DD'),
				},
			});
		}

		if (formattedDates) {
			dispatch({
				type: SET_WEEK_PLAN,
				payload: { selectedWeek: { week: weekNumber, days: formattedDates } },
			});
			let params: {};
			if (type === 'current') {
				params = {
					canteens_id: weekPlan?.selectedCanteen?.id,
					canteen_alias: weekPlan?.selectedCanteen.alias,
					week: weekNumber,
					show_markings: weekPlan?.isAllergene,
				};
			} else {
				params = {
					canteens_id: weekPlan?.selectedCanteen?.id,
					canteen_alias: weekPlan?.selectedCanteen.alias,
					week: weekNumber,
					date_iso: dateIso,
					show_markings: weekPlan?.isAllergene,
				};
			}
			router.push({
				pathname: '/list-week-screen/details',
				params: params,
			});
		}
	};

	const handleForward = () => {
		const newYears = years.map(year => year + 1);
		setYears(newYears);
		setSelectedYear(selectedYear + 1);
		setWeeks(generateWeeks(selectedYear + 1));
	};

	const handleBack = () => {
		const newYears = years.map(year => year - 1);
		setYears(newYears);
		setSelectedYear(selectedYear - 1);
		setWeeks(generateWeeks(selectedYear - 1));
	};

	return (
		<View style={[styles.container, { backgroundColor: theme.screen.background }]}>
			<View style={[styles.header, { backgroundColor: theme.screen.background }]}>
				<TouchableOpacity
					style={{
						...styles.currentWeekButton,
						backgroundColor: foods_area_color,
					}}
					onPress={() => handleWeekPress('current', selectedWeek)}
				>
					<View />
					<Text
						style={{
							...styles.headerText,
							color: contrastColor,
						}}
					>
						Immer Aktuelle Woche
					</Text>
					<FontAwesome6 name="arrow-up-right-from-square" size={16} color={contrastColor} />
				</TouchableOpacity>
			</View>

			<View style={styles.yearSelector}>
				<View style={styles.yearsContainer}>
					<TouchableOpacity
						onPress={handleBack}
						style={{
							...styles.yearButton,
							backgroundColor: theme.screen.iconBg,
							borderColor: theme.screen.icon,
						}}
					>
						<Ionicons name="chevron-back" size={20} color={theme.screen.text} />
						<Text style={{ ...styles.yearText, color: theme.screen.text }}>{selectedYear - 1}</Text>
					</TouchableOpacity>

					<View style={[styles.yearButton, [styles.selectedYear, { backgroundColor: foods_area_color }]]}>
						<Text style={{ ...styles.selectedYearText, color: contrastColor }}>{selectedYear}</Text>
					</View>

					<TouchableOpacity
						onPress={handleForward}
						style={{
							...styles.yearButton,
							backgroundColor: theme.screen.iconBg,
							borderColor: theme.screen.icon,
						}}
					>
						<Text style={{ ...styles.yearText, color: theme.screen.text }}>{selectedYear + 1}</Text>
						<Ionicons name="chevron-forward" size={20} color={theme.screen.text} />
					</TouchableOpacity>
				</View>
			</View>

			<ScrollView contentContainerStyle={styles.weeksContainer}>
				<View style={[styles.weeksGrid, { justifyContent: 'center', alignItems: 'center', gap: 10 }]}>
					{weeks.map(week => (
						<TouchableOpacity
							key={week.weekNumber}
							style={[
								styles.weekButton,
								selectedWeek === week.weekNumber
									? [
											styles.selectedWeek,
											{
												backgroundColor: foods_area_color,
												borderColor: theme.screen.background,
											},
										]
									: [
											{
												backgroundColor: theme.screen.iconBg,
												borderColor: theme.screen.background,
											},
										],
								{
									width: width < 450 ? width / 2 - 20 : width > 900 ? 250 : 200,
								},
							]}
							onPress={() => handleWeekPress('any', week.weekNumber)}
						>
							<Text style={[styles.weekText, selectedWeek === week.weekNumber ? { ...styles.selectedWeekText, color: contrastColor } : { ...styles.selectedWeekText, color: theme.screen.text }, { fontSize: width < 450 ? 10 : 14 }]}>
								Week {week.weekNumber} ({week.dateRange})
							</Text>
							<FontAwesome6 name="arrow-up-right-from-square" size={width < 450 ? 14 : 16} color={selectedWeek === week.weekNumber ? contrastColor : theme.screen.text} />
						</TouchableOpacity>
					))}
				</View>
			</ScrollView>
		</View>
	);
};

export default Index;
