import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Text, TouchableOpacity, View } from 'react-native';
import AppTextInput from '@/components/AppTextInput';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { days } from '../../constants/SettingData';
import FirstDayOfWeek from '../../components/FirstDay/FirstDayOfWeek';
import { BaseCourseTimetableEvent, CourseBottomSheetProps } from './types';
import styles from './styles';
import { isWeb } from '@/constants/Constants';
import { useTheme } from '@/hooks/useTheme';
import { ProfileHelper } from '@/redux/actions/Profile/Profile';
import { UPDATE_PROFILE } from '@/redux/Types/types';
import { colorData } from './constant';
import TimeTableData from '@/constants/TimeTable';
import useToast from '@/hooks/useToast';
import { isBefore, isEqual, parse } from 'date-fns';
import { useLanguage } from '@/hooks/useLanguage';
import { myContrastColor } from '@/helper/ColorHelper';
import { TranslationKeys } from '@/locales/keys';
import { DatabaseTypes } from 'repo-depkit-common';
import { useAppSelector } from '@/redux/hooks';
import AppButton from '@/components/AppButton';
import useIsLtrLanguage from '@/hooks/useIsLtrLanguage';

const CourseBottomSheet: React.FC<CourseBottomSheetProps> = ({ timeTableData, closeSheet, isUpdate, selectedEventId }) => {
	const { theme } = useTheme();
	const toast = useToast();
	const dispatch = useDispatch();
	const { translate } = useLanguage();
	const profileHelper = new ProfileHelper();
	const { profile } = useAppSelector((state) => state.authReducer);
	const [loading, setLoading] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const { primaryColor, appSettings, selectedTheme: mode, language } = useAppSelector((state) => state.settings);
	const isLtrLanguage = useIsLtrLanguage();
	const isArabic = !isLtrLanguage;

	const [selectedFirstDay, setSelectedFirstDay] = useState({
		id: 'Monday',
		name: 'Mon',
	});
	const [windowWidth, setWindowWidth] = useState<number>(Dimensions.get('window').width);
	const [selectedItem, setSelectedItem] = useState<any | null>(null);
	const [data, setData] = useState<any[]>(timeTableData);
	const [inputValue, setInputValue] = useState<string>('');
	const [selectedColor, setSelectedColor] = useState<string>('');

	useEffect(() => {
		if (isUpdate && timeTableData) {
			setData(timeTableData);
		}
	}, [timeTableData, isUpdate]);

	useEffect(() => {
		const onChange = ({ window }: { window: any }) => {
			setWindowWidth(window.width);
		};

		const subscription = Dimensions.addEventListener('change', onChange);
		return () => {
			subscription.remove();
		};
	}, []);

	const course_timetable_area_color = appSettings?.course_timetable_area_color ? appSettings?.course_timetable_area_color : primaryColor;
	const contrastColor = myContrastColor(course_timetable_area_color, theme, mode === 'dark');

	const getRtlChevronName = (name: string | undefined) => {
		if (!isArabic || !name) return name;
		if (name === 'chevron-right') return 'chevron-left';
		if (name === 'chevron-small-right') return 'chevron-small-left';
		if (name === 'arrow-right') return 'arrow-left';
		return name;
	};
	const SheetClose = () => {
		closeSheet();
		setSelectedItem(null);
	};

	const cancleSheet = () => {
		setSelectedItem(null);
	};

	const handleSavePress = () => {
		// Function to validate HH:MM format
		const validateTime = (time: string) => {
			const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/; // Regex for HH:MM format
			return regex.test(time);
		};

		if (selectedItem) {
			if (selectedItem?.label !== 'title' && selectedItem?.label !== 'location') {
				if (!validateTime(inputValue)) {
					// Show a toast for invalid time
					toast(translate(TranslationKeys.pleaseEnterTimeInHhMmFormat), 'error');

					return; // Prevent saving if time is invalid
				}
			}

			// Update the data if time is valid
			setData(prevData => prevData.map(item => (item.id === selectedItem.id ? { ...item, value: inputValue } : item)));
			setSelectedItem(null);
			setInputValue('');
		}
	};

	const handleItemPress = (item: any) => {
		setSelectedItem(item);
		setInputValue(item.value || '');
	};

	const handleDaySelect = (selectedDayId: string, selectedDayName: string) => {
		setSelectedFirstDay({ id: selectedDayId, name: selectedDayName });

		setData(prevData => prevData.map(item => (item.label === 'weekday' ? { ...item, value: { id: selectedDayId, name: selectedDayName } } : item)));
		setSelectedItem(null);
	};

	const handleColorPress = (selectedColor: string) => {
		setSelectedColor(selectedColor);

		setData(prevData => prevData.map(item => (item.label === 'color' ? { ...item, value: selectedColor } : item)));
		setSelectedItem(null);
	};

	const handleSaveTimeTable = async () => {
		setLoading(true);

		// Fetch start and end time
		const startTime = data?.find(item => item.label === 'startTime')?.value || '';
		const endTime = data?.find(item => item.label === 'endTime')?.value || '';

		// Function to validate and parse time
		const parseTime = (time: string) => {
			return parse(time, 'HH:mm', new Date());
		};

		const startTimeParsed = parseTime(startTime);
		const endTimeParsed = parseTime(endTime);

		// Check if start time is greater than or equal to end time
		if (!isBefore(startTimeParsed, endTimeParsed) || isEqual(startTimeParsed, endTimeParsed)) {
			toast(translate(TranslationKeys.startTimeMustBeEarlierThanEndTime), 'error');

			setLoading(false);
			return; // Prevent saving if times are invalid
		}

		let courseTimetable = (profile?.course_timetable ? { ...profile.course_timetable } : {}) as Record<string, BaseCourseTimetableEvent>;
		const id = Object.keys(courseTimetable)?.length > 0 ? (Object.keys(courseTimetable).length + 1).toString() : '1';
		const newTimetable: BaseCourseTimetableEvent = {
			id: id,
			title: data?.find(item => item.label === 'title')?.value,
			location: data?.find(item => item.label === 'location')?.value,
			color: data?.find(item => item.label === 'color')?.value,
			start: startTime,
			end: endTime,
			weekday: data?.find(item => item.label === 'weekday')?.value || '',
		};

		courseTimetable[id] = newTimetable;
		const updatedTimetableString = courseTimetable;

		if (profile?.id) {
			const result = (await profileHelper.updateProfile({
				...profile,
				course_timetable: updatedTimetableString,
			})) as DatabaseTypes.Profiles;
			if (result) {
				dispatch({
					type: UPDATE_PROFILE,
					payload: result,
				});
			}
		} else {
			dispatch({
				type: UPDATE_PROFILE,
				payload: { ...profile, course_timetable: updatedTimetableString },
			});
		}

		setData(() => TimeTableData(theme).map(item => ({ ...item })));
		setLoading(false);
		closeSheet();
	};

	const handleDeleteTimeTable = async () => {
		setIsDeleting(true);
		let courseTimetable = (profile?.course_timetable ? { ...profile.course_timetable } : {}) as Record<string, BaseCourseTimetableEvent>;
		if (courseTimetable) {
			delete courseTimetable[Number(selectedEventId)];
			if (profile?.id) {
				const result = (await profileHelper.updateProfile({
					...profile,
					course_timetable: courseTimetable,
				})) as DatabaseTypes.Profiles;
				if (result) {
					dispatch({
						type: UPDATE_PROFILE,
						payload: result,
					});
				}
			} else {
				dispatch({
					type: UPDATE_PROFILE,
					payload: {
						...profile,
						course_timetable: courseTimetable,
					},
				});
			}

			setData(() => TimeTableData(theme).map(item => ({ ...item })));
			setIsDeleting(false);
			closeSheet();
		}
	};

	const handleUpdateTimeTable = async () => {
		setLoading(true);

		// Fetch start and end time
		const startTime = data?.find(item => item.label === 'startTime')?.value || '';
		const endTime = data?.find(item => item.label === 'endTime')?.value || '';

		// Function to validate and parse time
		const parseTime = (time: string) => {
			return parse(time, 'HH:mm', new Date());
		};

		const startTimeParsed = parseTime(startTime);
		const endTimeParsed = parseTime(endTime);

		// Check if start time is greater than or equal to end time
		if (!isBefore(startTimeParsed, endTimeParsed) || isEqual(startTimeParsed, endTimeParsed)) {
			toast(translate(TranslationKeys.startTimeMustBeEarlierThanEndTime), 'error');

			setLoading(false);
			return; // Prevent saving if times are invalid
		}
		let courseTimetable = (profile?.course_timetable ? { ...profile.course_timetable } : {}) as Record<string, BaseCourseTimetableEvent>;
		if (courseTimetable) {
			const prevEvent = courseTimetable[Number(selectedEventId)];
			if (prevEvent) {
				const newEvent: BaseCourseTimetableEvent = {
					id: prevEvent?.id,
					title: data?.find(item => item.label === 'title')?.value,
					location: data?.find(item => item.label === 'location')?.value,
					color: data?.find(item => item.label === 'color')?.value,
					start: startTime,
					end: endTime,
					weekday: data?.find(item => item.label === 'weekday')?.value || '',
				};
				courseTimetable[Number(selectedEventId)] = newEvent;
				if (profile?.id) {
					const result = (await profileHelper.updateProfile({
						...profile,
						course_timetable: courseTimetable,
					})) as DatabaseTypes.Profiles;
					if (result) {
						dispatch({
							type: UPDATE_PROFILE,
							payload: result,
						});
					}
				} else {
					dispatch({
						type: UPDATE_PROFILE,
						payload: {
							...profile,
							course_timetable: courseTimetable,
						},
					});
				}

				setData(() => TimeTableData(theme).map(item => ({ ...item })));
				setLoading(false);
				closeSheet();
			}
		}
	};

	return (
		<View style={{ flex: 1 }}>
			<View
				style={{
					...styles.sheetHeader,
				}}
			>
				<View />
				<Text
					style={{
						...styles.sheetHeading,
						maxWidth: '70%',
						textAlign: 'center',
						fontSize: windowWidth > 800 ? 40 : 20,
						color: theme.sheet.text,
					}}
				>
					{selectedItem
						? translate(selectedItem.label)
						: isUpdate
							? `${translate(TranslationKeys.event)}: ${translate(TranslationKeys.edit)}`
							: `${translate(TranslationKeys.event)}: ${translate(TranslationKeys.create)}`}
				</Text>
			</View>

			<BottomSheetScrollView style={{ ...styles.sheetView, backgroundColor: theme.sheet.sheetBg }} contentContainerStyle={styles.contentContainer}>
				{selectedItem ? (
					selectedItem.label === 'color' ? (
						<View
							style={{
								width: '90%',
								display: 'flex',
								justifyContent: 'center',
								alignSelf: 'center',
							}}				
							>
							<View style={styles.weekdayView}>
								{colorData.map((color, index) => (
									<TouchableOpacity
										key={index}
										onPress={() => handleColorPress(color)}
										style={[
											styles.box,
											{
												width: isWeb ? 200 : '30%',
												backgroundColor: color,
											},
										]}
									></TouchableOpacity>
								))}
							</View>
						</View>
					) : selectedItem.label === 'weekday' ? (
						<View style={styles.languageContainer}>
							{days.map(firstDay => (
								<FirstDayOfWeek key={firstDay.id} position={firstDay} isSelected={selectedFirstDay.name === firstDay.name} onPress={() => handleDaySelect(firstDay.id, firstDay.name)} />
							))}
						</View>
					) : (
						<View style={styles.titleBt}>
							<AppTextInput
								style={styles.input}
								inputStyle={{
									backgroundColor: 'transparent',
									paddingHorizontal: 0,
								}}
								borderWidth={1}
								borderColor="#d14510"
								isBottomSheet={!isWeb}
								value={inputValue}
								onChangeText={setInputValue}
								placeholder={translate(TranslationKeys.enterAValue)}
								autoFocus
							/>

							<View style={[styles.buttonContainer]}>
								<AppButton
									text={translate(TranslationKeys.cancel)}
									onPress={cancleSheet}
									variant="outline"
									style={{ ...styles.cancelButton, borderColor: course_timetable_area_color, marginVertical: 0, height: undefined, minHeight: 0, gap: 0 }}
									textStyle={[styles.buttonText, { color: theme.screen.text }]}
									usePlainText
								/>
								<AppButton
									text={translate(TranslationKeys.save)}
									onPress={handleSavePress}
									style={{ ...styles.saveButton, backgroundColor: course_timetable_area_color, marginVertical: 0, height: undefined, minHeight: 0, gap: 0 }}
									textStyle={[styles.buttonText, { color: contrastColor }]}
									usePlainText
								/>
							</View>
						</View>
					)
				) : (
					<View>
						{data.map(item => (
							<TouchableOpacity
								key={item.id}
								style={{
									...styles.list,
									paddingHorizontal: isWeb ? 20 : 10,
									flexDirection: isArabic ? 'row-reverse' : 'row',
								}}
								onPress={() => handleItemPress(item)}
							>
								<View
									style={{
										...styles.col,
										gap: isWeb ? 10 : 5,
										flexDirection: isArabic ? 'row-reverse' : 'row',
									}}
								>
									{React.cloneElement(item.leftIcon, {
										color: theme.screen.text,
									})}
									<Text
										style={{
											...styles.label,
											color: theme.screen.text,
											fontSize: windowWidth > 500 ? 16 : 13,
											marginTop: isWeb ? 0 : 2,
											textAlign: isArabic ? 'right' : 'left',
											writingDirection: isArabic ? 'rtl' : 'ltr',
										}}
									>
										{translate(item.label)}
									</Text>
								</View>
								<View
									style={{
										...styles.col,
										gap: isWeb ? 10 : 5,
										alignItems: 'center',
										justifyContent: isArabic ? 'flex-start' : 'flex-end',
										flexDirection: isArabic ? 'row' : 'row',
									}}
								>
									{isArabic ? (
										<>
											{React.isValidElement(item.rightIcon)
												? React.cloneElement(item.rightIcon, {
														color: theme.screen.text,
														name: getRtlChevronName((item.rightIcon as any).props?.name),
													})
												: item.rightIcon}
											{item.value && (
												<Text
													style={{
														...styles.value,
														color: theme.screen.text,
														fontSize: windowWidth > 500 ? 16 : 13,
														marginTop: isWeb ? 0 : 2,
														textAlign: 'left',
														writingDirection: 'ltr',
													}}
												>
													{item.label === 'weekday' ? translate(item?.value?.name) : item.value}
												</Text>
											)}
										</>
									) : (
										<>
											{item.value && (
												<Text
													style={{
														...styles.value,
														color: theme.screen.text,
														fontSize: windowWidth > 500 ? 16 : 13,
														marginTop: isWeb ? 0 : 2,
														textAlign: 'right',
														writingDirection: 'ltr',
													}}
												>
													{item.label === 'weekday' ? translate(item?.value?.name) : item.value}
												</Text>
											)}
											{React.isValidElement(item.rightIcon)
												? React.cloneElement(item.rightIcon, {
														color: theme.screen.text,
													})
												: item.rightIcon}
										</>
									)}
								</View>
							</TouchableOpacity>
						))}
						<View style={styles.saveButtons}>
							{isUpdate && (
								<AppButton
									variant="ghost"
									usePlainText
									text={isDeleting ? '' : translate(TranslationKeys.delete)}
									onPress={handleDeleteTimeTable}
									style={{
										...styles.createButton,
										backgroundColor: 'red',
										marginVertical: 0,
									}}
									textStyle={
										isDeleting
											? { width: 0, height: 0 }
											: {
													...styles.createButtonText,
													color: theme.activeText,
												}
									}
									iconLeft={
										isArabic
											? undefined
											: isDeleting
												? <ActivityIndicator size="small" color={theme.screen.text} />
												: <MaterialCommunityIcons name="delete" size={20} color={theme.activeText} />
									}
									iconRight={
										isArabic
											? isDeleting
												? <ActivityIndicator size="small" color={theme.screen.text} />
												: <MaterialCommunityIcons name="delete" size={20} color={theme.activeText} />
											: undefined
									}
								/>
							)}
							<AppButton
								variant="ghost"
								usePlainText
								text={loading ? '' : translate(TranslationKeys.save)}
								onPress={isUpdate ? handleUpdateTimeTable : handleSaveTimeTable}
								style={{
									...styles.createButton,
									backgroundColor: course_timetable_area_color,
									marginVertical: 0,
								}}
								textStyle={
									loading
										? { width: 0, height: 0 }
										: {
												...styles.createButtonText,
												color: contrastColor,
											}
								}
								iconLeft={
									isArabic
										? undefined
										: loading
											? <ActivityIndicator size="small" color={theme.screen.text} />
											: <FontAwesome5 name="save" size={20} color={contrastColor} />
								}
								iconRight={
									isArabic
										? loading
											? <ActivityIndicator size="small" color={theme.screen.text} />
											: <FontAwesome5 name="save" size={20} color={contrastColor} />
										: undefined
								}
							/>
						</View>
					</View>
				)}
			</BottomSheetScrollView>
		</View>
	);
};

export default CourseBottomSheet;
