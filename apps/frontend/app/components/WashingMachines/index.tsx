import { Platform, Text, View } from 'react-native';
import AppLoadingView from '@/components/AppLoadingView';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { DatabaseTypes } from 'repo-depkit-common';
import { differenceInSeconds, format, isAfter, isBefore } from 'date-fns';
import washingmachine from '@/assets/animations/washingmachine/washingmachine.json';
import washingmachineEmpty from '@/assets/animations/washingmachine/washingmachineEmpty.json';
import { useAppSelector } from '@/redux/hooks';
import type LottieView from 'lottie-react-native';
import { useFocusEffect } from 'expo-router';
import { replaceLottieColors } from '@/helper/animationHelper';
import { TranslationKeys } from '@/locales/keys';
import { ApartmentsHelper } from '@/redux/actions/Apartments/Apartments';
import { RootState } from '@/redux/reducer';
import SafeLottieView from '@/components/SafeLottieView/SafeLottieView';
import useIsLtrLanguage from '@/hooks/useIsLtrLanguage';

const WashingMachines: React.FC<any> = ({ campusDetails }) => {
	const { translate, language } = useLanguage();
	const isLtrLanguage = useIsLtrLanguage();
	const isRtl = !isLtrLanguage;
	const { theme } = useTheme();
	const apartmentsHelper = new ApartmentsHelper();
	const [washingMachines, setWashingMachines] = useState<DatabaseTypes.Washingmachines[] | any[]>();
	const [loading, setLoading] = useState(false);
	const { primaryColor, appSettings } = useAppSelector((state) => state.settings);
	const [autoPlay, setAutoPlay] = useState(appSettings?.animations_auto_start);
	const animationRef = useRef<LottieView>(null);
	const [animationJson, setAmimationJson] = useState<any>(null);

	useFocusEffect(
		useCallback(() => {
			setAmimationJson(replaceLottieColors(washingmachineEmpty, primaryColor));
			return () => {
				setAmimationJson(null);
			};
		}, [])
	);

	useFocusEffect(
		useCallback(() => {
			setAutoPlay(appSettings?.animations_auto_start);

			return () => {
				setAutoPlay(false);
				setAmimationJson(null);
			};
		}, [appSettings?.animations_auto_start])
	);

	useEffect(() => {
		if (animationJson && autoPlay && animationRef.current) {
			animationRef?.current?.play();
		}
	}, [animationJson, autoPlay]);

	const loadApartmentWithWashingMachinesFromServer = async (apartmentId: string) => {
		setLoading(true);

		const response = (await apartmentsHelper.fetchApartmentWithWashingMachines(apartmentId)) as DatabaseTypes.Apartments;
		if (response.washingmachines) {
			setWashingMachines(response?.washingmachines);
		}
		setLoading(false);
	};

	useEffect(() => {
		if (campusDetails) {
			loadApartmentWithWashingMachinesFromServer(campusDetails?.apartments[0]);
		}
	}, [campusDetails]);

	// Check and request notification permissions
	const checkPermissions = async () => {
		try {
			if (Platform.OS === 'web') {
				return;
			}
			const Notifications = await import('expo-notifications');
			const { status } = await Notifications.getPermissionsAsync();
			if (status !== 'granted') {
				await Notifications.requestPermissionsAsync();
			}
		} catch (error) {
			console.error('Error checking permissions:', error);
		}
	};

	// Schedule notifications for washing machines
	const scheduleNotifications = async () => {
		if (!washingMachines) return;
		if (Platform.OS === 'web') return;
		const Notifications = await import('expo-notifications');
		const now = new Date();

		for (const machine of washingMachines) {
			const { date_finished, alias, id } = machine;

			if (date_finished) {
				const finishDate = new Date(date_finished);
				const secondsFromNow = differenceInSeconds(finishDate, now);

				if (secondsFromNow > 0) {
					// Schedule the notification
					await Notifications.scheduleNotificationAsync({
						content: {
							title: translate(TranslationKeys.washingMachineNotificationTitle).replace('${alias}', String(alias ?? '')),
							body: translate(TranslationKeys.washingMachineNotificationBody).replace('${date}', format(finishDate, 'dd.MM.yyyy HH:mm')),
						},
						trigger: {
							type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
							repeats: false,
							seconds: secondsFromNow,
						},
					});
				} else {
					console.log(`${alias}: Washing already finished.`);
				}
			} else {
				console.log(`${alias}: Status unknown (no finish date).`);
			}
		}
	};

	useEffect(() => {
		if (washingMachines && washingMachines?.length > 0) {
			if (Platform.OS !== 'web') {
				checkPermissions().then(scheduleNotifications);
			}
		}
	}, [washingMachines]);

	const getStatusText = (date_finished: string | null) => {
		if (!date_finished) {
			return translate(TranslationKeys.statusUnknown);
		}

		const currentDate = new Date();
		const finishedDate = new Date(date_finished);

		// Determine the correct status based on the date
		if (isAfter(finishedDate, currentDate)) {
			return translate(TranslationKeys.finishesOnWithDate).replace('${date}', format(finishedDate, 'dd.MM.yyyy HH:mm'));
		} else if (isBefore(finishedDate, currentDate)) {
			return translate(TranslationKeys.washingmachine_state_finished);
		}

		return translate(TranslationKeys.statusUnknown);
	};

	return (
		<View style={styles.container}>
			<Text style={{ ...styles.heading, color: theme.screen.text, textAlign: isRtl ? 'right' : 'left', writingDirection: isRtl ? 'rtl' : 'ltr' }}>{translate(TranslationKeys.washing_machines)}</Text>
			<View style={styles.washingMachines}>
				{loading ? (
					<AppLoadingView height={120} size="large" />
				) : (
					washingMachines &&
					washingMachines?.map((item: any) => {
						if (item?.status === 'published') {
							const isStatusUnknown = !item?.date_finished;
							const isWashingFinished = item?.date_finished ? isBefore(new Date(item.date_finished), new Date()) : false;

							const animationSource = isStatusUnknown || isWashingFinished ? washingmachineEmpty : washingmachine;
							return (
								<View style={{ ...styles.card, flexDirection: isRtl ? 'row-reverse' : 'row' }} key={item?.id}>
									<View
										style={{
											width: 150,
											height: 150,
											justifyContent: 'center',
											alignItems: 'center',
										}}
									>
										<SafeLottieView
											source={replaceLottieColors(animationSource, primaryColor)}
											autoPlay={autoPlay ?? false}
											loop={!isWashingFinished}
											resizeMode="contain"
											style={Platform.OS === 'web' ? { width: 150, height: 150 } : { width: '100%', height: '100%' }}
										/>
									</View>
									<View style={{ ...styles.details, alignItems: isRtl ? 'flex-end' : 'flex-start' }}>
										<Text style={{ ...styles.title, color: theme.screen.text, textAlign: isRtl ? 'right' : 'left', writingDirection: isRtl ? 'rtl' : 'ltr' }}>{item?.alias}</Text>
										<Text
											style={{
												...styles.description,
												color: theme.screen.text,
												textAlign: isRtl ? 'right' : 'left',
												writingDirection: isRtl ? 'rtl' : 'ltr',
											}}
										>
											{getStatusText(item?.date_finished)}
										</Text>
									</View>
								</View>
							);
						}
					})
				)}
			</View>
		</View>
	);
};

export default WashingMachines;
