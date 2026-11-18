import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Entypo, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { addDays, format, isValid, parse } from 'date-fns';
import { AppUsageEventNames, CollectibleAt } from 'repo-depkit-common';
import { myContrastColor } from '@/helper/ColorHelper';
import CustomMenuHeader from '@/components/CustomMenuHeader/CustomMenuHeader';
import IconButton from '@/components/UI/IconButton';
import CollectibleSpot from '@/components/CollectibleItem/CollectibleSpot';
import MyMarkdownProjectColored from '@/components/MyMarkdownProjectColored';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import CourseEventDetailsSheet, { NEW_COURSE_EVENT_ID, createCourseEventDraft, setCourseEventDraft } from '@/components/CourseTimetableViews/CourseEventDetailsSheet';
import CourseTimetableDayView, { minutesOfDay } from '@/components/CourseTimetableViews/CourseTimetableDayView';
import CourseTimetableWeekView, { WeekViewDay } from '@/components/CourseTimetableViews/CourseTimetableWeekView';
import LunchSuggestionCard from '@/components/CourseTimetableViews/LunchSuggestionCard';
import StudipImportSheet from '@/components/CourseTimetableViews/StudipImportSheet';
import SettingsList from '@/components/SettingsList';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import useTrackScreenOpened from '@/hooks/useTrackScreenOpened';
import { useSmartReadableDateMethod } from '@/helper/DateHelper';
import useCourseTimetable from '@/hooks/useCourseTimetable';
import useCourseTimetableLunchSuggestions, { LunchSuggestionDay } from '@/hooks/useCourseTimetableLunchSuggestions';
import useMyScrollviewModalDatePicker from '@/hooks/useMyScrollviewModalDatePicker';
import { useMyScrollviewModalCourseTimetableOptions } from '@/hooks/useMyScrollviewModalCourseTimetableOptions';
import { useFirstDayOfWeekModal } from '@/hooks/useFirstDayOfWeekModal';
import { useAppSelector } from '@/redux/hooks';
import { TranslationKeys } from '@/locales/keys';
import { darkTheme } from '@/styles/themes';
import { COURSE_TIMETABLE_WEEKDAYS, eventsForWeekday, weekdayOfDate } from '@/helper/courseTimetable/CourseTimetableModel';
import { createCourseTimetableDemoEvents } from '@/helper/courseTimetable/CourseTimetableDemo';

type ViewMode = 'day' | 'week';

const DATE_FORMAT = 'yyyy-MM-dd';
/** From this width on the screen opens in week view. */
const WEEK_VIEW_MIN_WIDTH = 700;
/** From this width on the week view gets a side panel with the selected day. */
const SIDE_PANEL_MIN_WIDTH = 1100;

const MONTH_SHORT_KEYS: TranslationKeys[] = [TranslationKeys.Jan, TranslationKeys.Feb, TranslationKeys.Mar, TranslationKeys.Apr, TranslationKeys.MayShort, TranslationKeys.Jun, TranslationKeys.Jul, TranslationKeys.Aug, TranslationKeys.Sep, TranslationKeys.Oct, TranslationKeys.Nov, TranslationKeys.Dec];

const WEEKDAY_SHORT_KEYS: Record<string, TranslationKeys> = {
	monday: TranslationKeys.Mon_S,
	tuesday: TranslationKeys.Tue_S,
	wednesday: TranslationKeys.Wed_S,
	thursday: TranslationKeys.Thu_S,
	friday: TranslationKeys.Fri_S,
	saturday: TranslationKeys.Sat_S,
	sunday: TranslationKeys.Sun_S,
};

function parseDate(dateString: string): Date {
	const parsed = parse(dateString, DATE_FORMAT, new Date());
	return isValid(parsed) ? parsed : new Date();
}

/** Start of the week that contains `date`, for a week starting on `firstWeekday`. */
function startOfWeekFor(date: Date, firstWeekday: string): Date {
	const firstIndex = Math.max(0, COURSE_TIMETABLE_WEEKDAYS.indexOf(firstWeekday as (typeof COURSE_TIMETABLE_WEEKDAYS)[number]));
	const currentIndex = COURSE_TIMETABLE_WEEKDAYS.indexOf(weekdayOfDate(date));
	return addDays(date, -((currentIndex - firstIndex + 7) % 7));
}

const CourseTimetableScreen = () => {
	useSetPageTitle(TranslationKeys.course_timetable);
	useTrackScreenOpened(AppUsageEventNames.COURSE_TIMETABLE_SCREEN_OPENED, 'course-timetable');
	const { theme } = useTheme();
	const isDark = theme === darkTheme;
	const { translate } = useLanguage();
	const router = useRouter();
	const { width } = useWindowDimensions();
	const { show } = useMyScrollViewModal();
	const { openDatePickerModal } = useMyScrollviewModalDatePicker();
	const { openFirstDayOfWeekModal } = useFirstDayOfWeekModal();
	const { events, saveEvents } = useCourseTimetable();
	const { primaryColor, appSettings, firstDayOfTheWeek } = useAppSelector(state => state.settings);
	const accentColor = appSettings?.course_timetable_area_color || primaryColor;
	const accentText = myContrastColor(accentColor, theme, isDark);

	const isWide = width >= WEEK_VIEW_MIN_WIDTH;
	const showSidePanel = width >= SIDE_PANEL_MIN_WIDTH;
	const [viewMode, setViewMode] = useState<ViewMode>(isWide ? 'week' : 'day');
	// Tablet and desktop default to the week, phones to the day. On web the first render can
	// report a smaller width than the window really has, so follow the width until the user
	// picks a view themselves.
	const [viewModeChosen, setViewModeChosen] = useState(false);
	useEffect(() => {
		if (!viewModeChosen) setViewMode(isWide ? 'week' : 'day');
	}, [isWide, viewModeChosen]);
	const chooseViewMode = (mode: ViewMode) => {
		setViewModeChosen(true);
		setViewMode(mode);
	};
	const [selectedDate, setSelectedDate] = useState(() => format(new Date(), DATE_FORMAT));
	const [now, setNow] = useState(() => new Date());

	useEffect(() => {
		const interval = setInterval(() => setNow(new Date()), 60_000);
		return () => clearInterval(interval);
	}, []);

	const todayString = format(now, DATE_FORMAT);
	const nowMinutes = minutesOfDay(now);
	const selected = parseDate(selectedDate);

	const monthShort = useCallback((date: Date) => translate(MONTH_SHORT_KEYS[date.getMonth()] ?? TranslationKeys.Jan), [translate]);

	// Week: every day of the week, weekend days only when they carry events.
	const weekDays: WeekViewDay[] = useMemo(() => {
		const start = startOfWeekFor(selected, firstDayOfTheWeek?.id ?? 'monday');
		const days: WeekViewDay[] = [];
		for (let i = 0; i < 7; i++) {
			const date = addDays(start, i);
			const weekday = weekdayOfDate(date);
			const dayEvents = eventsForWeekday(events, weekday);
			if ((weekday === 'saturday' || weekday === 'sunday') && dayEvents.length === 0) continue;
			const dateString = format(date, DATE_FORMAT);
			days.push({
				dateString,
				weekday,
				shortLabel: translate(WEEKDAY_SHORT_KEYS[weekday] ?? TranslationKeys.Mon_S),
				dayNumber: date.getDate(),
				isToday: dateString === todayString,
				events: dayEvents,
			});
		}
		return days;
		// selectedDate covers `selected`
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedDate, firstDayOfTheWeek?.id, events, todayString, translate]);

	const selectedWeekday = weekdayOfDate(selected);
	const selectedDayEvents = useMemo(() => eventsForWeekday(events, selectedWeekday), [events, selectedWeekday]);

	const lunchDays: LunchSuggestionDay[] = useMemo(() => {
		const days: LunchSuggestionDay[] = [];
		if (viewMode === 'week') {
			days.push(...weekDays.map(day => ({ dateString: day.dateString, weekday: day.weekday, events: day.events })));
		}
		if ((viewMode === 'day' || showSidePanel) && !days.some(day => day.dateString === selectedDate)) {
			days.push({ dateString: selectedDate, weekday: selectedWeekday, events: selectedDayEvents });
		}
		return days;
	}, [viewMode, weekDays, showSidePanel, selectedDate, selectedWeekday, selectedDayEvents]);
	const lunches = useCourseTimetableLunchSuggestions(lunchDays);

	const weekLabel = useMemo(() => {
		const first = weekDays[0];
		const last = weekDays.at(-1);
		if (!first || !last) return '';
		const firstDate = parseDate(first.dateString);
		const lastDate = parseDate(last.dateString);
		if (firstDate.getMonth() === lastDate.getMonth()) {
			return `${firstDate.getDate()}.–${lastDate.getDate()}. ${monthShort(lastDate)}`;
		}
		return `${firstDate.getDate()}. ${monthShort(firstDate)} – ${lastDate.getDate()}. ${monthShort(lastDate)}`;
	}, [weekDays, monthShort]);

	// "Heute", "Morgen", a weekday within the next week, otherwise the date.
	const smartReadableDate = useSmartReadableDateMethod();
	const dayLabel = smartReadableDate(selected);

	const moveSelection = (direction: 1 | -1) => {
		const step = viewMode === 'week' ? 7 : 1;
		setSelectedDate(format(addDays(selected, direction * step), DATE_FORMAT));
	};

	const openEvent = useCallback(
		(id: string) => {
			show({ title: translate(TranslationKeys.event), children: <CourseEventDetailsSheet eventId={id} /> });
		},
		[show, translate]
	);

	const addEvent = useCallback(() => {
		setCourseEventDraft(createCourseEventDraft(selectedWeekday));
		show({
			title: `${translate(TranslationKeys.event)}: ${translate(TranslationKeys.create)}`,
			children: <CourseEventDetailsSheet eventId={NEW_COURSE_EVENT_ID} />,
		});
	}, [selectedWeekday, show, translate]);

	const openLunch = useCallback(
		(dateString: string) => {
			const suggestion = lunches[dateString];
			if (!suggestion) return;
			show({ title: translate(TranslationKeys.course_timetable_lunch_suggestion), children: <LunchSuggestionCard suggestion={suggestion} dateString={dateString} /> });
		},
		[lunches, show, translate]
	);

	const openImport = useCallback(() => {
		show({ title: translate(TranslationKeys.course_timetable_reimport), children: <StudipImportSheet /> });
	}, [show, translate]);

	const { openCourseTimetableOptionsModal } = useMyScrollviewModalCourseTimetableOptions({
		onReimport: openImport,
		onReset: () => saveEvents([]),
		onLoadDemo: () => saveEvents(createCourseTimetableDemoEvents()),
		onFirstDayOfWeek: openFirstDayOfWeekModal,
		onSettings: () => router.navigate('/settings'),
	});

	const optionsButton = (
		<IconButton onPress={openCourseTimetableOptionsModal} style={styles.headerButton} accessibilityRole="button" accessibilityLabel={translate(TranslationKeys.more_options)}>
			<Entypo name="dots-three-vertical" size={22} color={theme.header.text} />
		</IconButton>
	);

	const segment = (mode: ViewMode, label: string) => {
		const active = viewMode === mode;
		return (
			<TouchableOpacity key={mode} onPress={() => chooseViewMode(mode)} style={[styles.segment, active && { backgroundColor: theme.screen.background }]} accessibilityRole="button" accessibilityState={{ selected: active }}>
				<Text style={[styles.segmentText, { color: active ? theme.screen.text : theme.screen.placeholder }, active && styles.segmentTextActive]}>{label}</Text>
			</TouchableOpacity>
		);
	};

	const navigation = (
		<View style={styles.navigation}>
			<IconButton onPress={() => moveSelection(-1)} accessibilityRole="button" accessibilityLabel={translate(viewMode === 'week' ? TranslationKeys.course_timetable_previous_week : TranslationKeys.course_timetable_previous_day)} style={styles.navButton}>
				<Entypo name="chevron-left" size={24} color={theme.header.text} />
			</IconButton>
			{viewMode === 'week' ? (
				<Text style={[styles.navLabel, styles.navLabelShrink, { color: theme.header.text }]} numberOfLines={1}>
					{weekLabel}
				</Text>
			) : (
				<IconButton onPress={() => openDatePickerModal({ selectedDateProp: selectedDate, onSelect: setSelectedDate })} accessibilityRole="button" accessibilityLabel={`${translate(TranslationKeys.select)}: ${translate(TranslationKeys.date)}`} style={styles.navButton}>
					<MaterialIcons name="calendar-month" size={24} color={theme.header.text} />
				</IconButton>
			)}
			<IconButton onPress={() => moveSelection(1)} accessibilityRole="button" accessibilityLabel={translate(viewMode === 'week' ? TranslationKeys.course_timetable_next_week : TranslationKeys.course_timetable_next_day)} style={styles.navButton}>
				<Entypo name="chevron-right" size={24} color={theme.header.text} />
			</IconButton>
			{viewMode === 'day' ? (
				<Text style={[styles.navLabel, styles.navLabelShrink, { color: theme.header.text }]} numberOfLines={1}>
					{dayLabel}
				</Text>
			) : null}
		</View>
	);

	const dayView = <CourseTimetableDayView events={selectedDayEvents} dateString={selectedDate} nowMinutes={selectedDate === todayString ? nowMinutes : null} lunch={lunches[selectedDate]} onOpenEvent={openEvent} />;

	return (
		<SafeAreaView style={[styles.safeArea, { backgroundColor: theme.screen.background }]}>
			<CustomMenuHeader label={translate(TranslationKeys.course_timetable)} rightContent={optionsButton} />
			<View style={[styles.toolbar, { backgroundColor: theme.header.background, borderBottomColor: theme.screen.iconBg }]}>
				{navigation}
				<View style={[styles.segmented, { backgroundColor: theme.screen.iconBg }]}>
					{segment('day', translate(TranslationKeys.day))}
					{segment('week', translate(TranslationKeys.week))}
				</View>
			</View>

			<ScrollView contentContainerStyle={[styles.content, isWide && styles.contentWide]}>
				{events.length === 0 ? (
					<View style={[styles.emptyInfo, { backgroundColor: theme.screen.iconBg }]}>
						<MyMarkdownProjectColored content={translate(TranslationKeys.courseTimetableDescriptionEmpty)} />
						<View style={styles.importButton}>
							<SettingsList leftIcon={<MaterialCommunityIcons name="cloud-download-outline" size={20} />} iconBackgroundColor={accentColor} title={translate(TranslationKeys.course_timetable_import_studip)} rightIcon={<Entypo name="chevron-small-right" color={theme.screen.icon} size={24} />} onPress={openImport} backgroundColor={theme.screen.background} groupPosition="single" showSeparator={false} />
						</View>
					</View>
				) : null}
				{viewMode === 'week' ? (
					<View style={styles.weekLayout}>
						<View style={styles.weekMain}>
							<CourseTimetableWeekView days={weekDays} lunches={lunches} nowMinutes={nowMinutes} compact={!isWide} onOpenEvent={openEvent} onOpenLunch={openLunch} />
						</View>
						{showSidePanel ? (
							<View style={styles.sidePanel}>
								<Text style={[styles.sidePanelTitle, { color: theme.screen.text }]}>{dayLabel}</Text>
								{dayView}
							</View>
						) : null}
					</View>
				) : (
					<View style={styles.dayContainer}>{dayView}</View>
				)}
				<CollectibleSpot collectibleKey={CollectibleAt.collectible_at_course_timetable} />
			</ScrollView>

			<TouchableOpacity onPress={addEvent} style={[styles.fab, { backgroundColor: accentColor }]} accessibilityRole="button" accessibilityLabel={`${translate(TranslationKeys.event)}: ${translate(TranslationKeys.create)}`}>
				<MaterialCommunityIcons name="plus" size={22} color={accentText} />
				<Text style={[styles.fabText, { color: accentText }]}>{translate(TranslationKeys.course_timetable_add_event)}</Text>
			</TouchableOpacity>
		</SafeAreaView>
	);
};

export default CourseTimetableScreen;

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
	},
	headerButton: {
		padding: 10,
	},
	toolbar: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		// Navigation and the day/week switch share one row; the date label shrinks first.
		gap: 8,
		paddingHorizontal: 10,
		paddingVertical: 8,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	navigation: {
		flexDirection: 'row',
		alignItems: 'center',
		flexShrink: 1,
		minWidth: 0,
	},
	navButton: {
		padding: 6,
	},
	// Same type as the other screen headers (CustomMenuHeader, food offers).
	navLabel: {
		fontSize: 18,
		fontFamily: 'Poppins_400Regular',
		paddingHorizontal: 4,
	},
	navLabelShrink: {
		flexShrink: 1,
	},
	segmented: {
		flexShrink: 0,
		flexDirection: 'row',
		borderRadius: 10,
		padding: 3,
	},
	segment: {
		paddingHorizontal: 12,
		paddingVertical: 7,
		borderRadius: 8,
	},
	segmentText: {
		fontSize: 14,
		fontFamily: 'Poppins_400Regular',
	},
	segmentTextActive: {
		fontFamily: 'Poppins_700Bold',
	},
	content: {
		padding: 12,
		paddingBottom: 120,
		gap: 12,
	},
	contentWide: {
		padding: 20,
		paddingBottom: 120,
	},
	importButton: {
		marginTop: 8,
	},
	emptyInfo: {
		borderRadius: 16,
		padding: 16,
	},
	weekLayout: {
		flexDirection: 'row',
		gap: 20,
		alignItems: 'flex-start',
	},
	weekMain: {
		flex: 1,
		minWidth: 0,
	},
	sidePanel: {
		width: 340,
		gap: 12,
	},
	sidePanelTitle: {
		fontSize: 17,
		fontFamily: 'Poppins_700Bold',
	},
	dayContainer: {
		width: '100%',
		maxWidth: 720,
		alignSelf: 'center',
	},
	fab: {
		position: 'absolute',
		right: 16,
		bottom: 24,
		height: 56,
		borderRadius: 18,
		paddingLeft: 18,
		paddingRight: 22,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.2,
		shadowRadius: 10,
		elevation: 6,
	},
	fabText: {
		fontSize: 16,
		fontFamily: 'Poppins_700Bold',
	},
});
