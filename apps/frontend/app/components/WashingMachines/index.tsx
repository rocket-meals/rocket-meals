import { Platform, Text, View } from 'react-native';
import LoadingIndicator from '@/components/LoadingIndicator/LoadingIndicator';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { DatabaseTypes } from 'repo-depkit-common';
import { differenceInSeconds, format, isAfter, isBefore } from 'date-fns';
import washingmachine from '@/assets/animations/washingmachine/washingmachine.json';
import washingmachineEmpty from '@/assets/animations/washingmachine/washingmachineEmpty.json';
import { useAppSelector } from '@/redux/hooks';
import LottieView from 'lottie-react-native';
import { useFocusEffect } from 'expo-router';
import { replaceLottieColors } from '@/helper/animationHelper';
import { TranslationKeys } from '@/locales/keys';
import { ApartmentsHelper } from '@/redux/actions/Apartments/Apartments';

const WashingMachines: React.FC<any> = ({ campusDetails }) => {
	const { translate } = useLanguage();
	const { theme } = useTheme();
	const apartmentsHelper = new ApartmentsHelper();
	const [washingMachines, setWashingMachines] = useState<DatabaseTypes.Washingmachines[] | any[]>();
	const [loading, setLoading] = useState(false);
	const { primaryColor, appSettings } = useAppSelector((state) => state.settings);
	const [autoPlay, setAutoPlay] = useState(appSettings?.animations_auto_start);
	const animationRef = useRef<LottieView>(null);
	const [animationJson, setAnimationJson] = useState<any>(null);

	useFocusEffect(
		useCallback(() => {
			setAnimationJson(replaceLottieColors(washingmachineEmpty, primaryColor));
			return () => {
				setAnimationJson(null);
			};
		}, [])
	);

	useFocusEffect(
		useCallback(() => {
			setAutoPlay(appSettings?.animations_auto_start);

			return () => {
				setAutoPlay(false);
				setAnimationJson(null);
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
			void loadApartmentWithWashingMachinesFromServer(campusDetails?.apartments[0]);
		}
	}, [campusDetails]);

	// Only checks the notification permission: the system dialog can be shown only once on iOS
	// (twice on Android 13+), so it is never shown just because this screen opened - only after
	// our own explanation (usePushNotificationOptInPrompt).
	const hasNotificationPermission = async (): Promise<boolean> => {
		try {
			if (Platform.OS === 'web') {
				return false;
			}
			const Notifications = await import('expo-notifications');
			const { status } = await Notifications.getPermissionsAsync();
			return status === 'granted';
		} catch (error) {
			console.error('Error checking permissions:', error);
			return false;
		}
	};

	// Schedule notifications for washing machines
	const scheduleNotifications = async () => {
		if (!washingMachines) return;
		if (Platform.OS === 'web') return;
		const Notifications = await import('expo-notifications');
		const now = new Date();

		for (const machine of washingMachines) {
			const { date_finished, alias } = machine;

			if (date_finished) {
				const finishDate = new Date(date_finished);
				const secondsFromNow = differenceInSeconds(finishDate, now);

				if (secondsFromNow > 0) {
					// Schedule the notification
					await Notifications.scheduleNotificationAsync({ // NOSONAR S9382 - sequential on purpose: notifications are scheduled one after another so a failing OS call stops the remaining ones in a defined order
						content: {
							title: `Washing Machine ${alias}`,
							body: `Your washing will finish at ${format(finishDate, 'dd.MM.yyyy HH:mm')}.`,
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
				void hasNotificationPermission().then(granted => {
					if (granted) {
						void scheduleNotifications();
					}
				});
			}
		}
	}, [washingMachines]);

	const getStatusText = (date_finished: string | null) => {
		if (!date_finished) {
			return 'Status unknown';
		}

		const currentDate = new Date();
		const finishedDate = new Date(date_finished);

		// Determine the correct status based on the date
		if (isAfter(finishedDate, currentDate)) {
			return `Finishes on ${format(finishedDate, 'dd.MM.yyyy HH:mm')}`;
		} else if (isBefore(finishedDate, currentDate)) {
			return 'Washing Finished';
		}

		return 'Status unknown';
	};

	return (
		<View style={styles.container}>
			<Text style={{ ...styles.heading, color: theme.screen.text }}>{translate(TranslationKeys.washing_machines)}</Text>
			<View style={styles.washingMachines}>
				{loading ? (
					<View
						style={{
							width: '100%',
							height: 120,
							justifyContent: 'center',
							alignItems: 'center',
						}}
					>
						<LoadingIndicator size="large" color={theme.screen.text} />
					</View>
				) : (
					washingMachines?.map((item: any) => {
						if (item?.status === 'published') {
							const isStatusUnknown = !item?.date_finished;
							const isWashingFinished = item?.date_finished ? isBefore(new Date(item.date_finished), new Date()) : false;

							const animationSource = isStatusUnknown || isWashingFinished ? washingmachineEmpty : washingmachine;
							return (
								<View style={{ ...styles.card }} key={item?.id}>
									<View
										style={{
											width: 150,
											height: 150,
											justifyContent: 'center',
											alignItems: 'center',
										}}
									>
										<LottieView source={replaceLottieColors(animationSource, primaryColor)} autoPlay={autoPlay ?? false} loop={!isWashingFinished} resizeMode="contain" style={{ width: '100%', height: '100%' }} />
									</View>
									<View style={styles.details}>
										<Text style={{ ...styles.title, color: theme.screen.text }}>{item?.alias}</Text>
										<Text
											style={{
												...styles.description,
												color: theme.screen.text,
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