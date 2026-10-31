import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LottieView from 'lottie-react-native';
import { Dimensions, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/redux/hooks';
import { formatPrice, showFormatedPrice, filterNullishProperties } from '@/constants/HelperFunctions';
import { format } from 'date-fns';
import useMyCardReader, { MyCardReaderInterface } from './MyCardReader';
import { isWeb } from '@/constants/Constants';
import CardResponse from '@/helper/nfcCardReaderHelper/CardResponse';
import { useFocusEffect } from 'expo-router';
import useToast from '@/hooks/useToast';
import { UPDATE_PROFILE } from '@/redux/Types/types';
import { getTextFromTranslation } from '@/helper/resourceHelper';
import { replaceLottieColors } from '@/helper/animationHelper';
import moneyConfused from '@/assets/animations/accountBalance/moneyConfused.json';
import moneyFitness from '@/assets/animations/accountBalance/moneyFitness.json';
import moneySad from '@/assets/animations/accountBalance/moneySad.json';
import moneyConfident from '@/assets/animations/accountBalance/moneyConfident.json';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import useTrackScreenOpened from '@/hooks/useTrackScreenOpened';
import MyMarkdownProjectColored from '@/components/MyMarkdownProjectColored';
import Server from '@/constants/ServerUrl';
import { ServerAPI } from '@/redux/actions';
import CollectibleSpot from '@/components/CollectibleItem/CollectibleSpot';
import { AppUsageEventNames, CollectibleAt } from 'repo-depkit-common';
import DebugView from '@/components/DebugView';
import ProjectButton from '@/components/ProjectButton';
import { myContrastColor } from '@/helper/ColorHelper';
import useAppRatingScore from '@/hooks/useAppRatingScore';
import useDebugMode from '@/hooks/useDebugMode';

enum BalanceStateLowerBound {
	CONFIDENT = 10,
	FITNESS = 3,
	SAD = 0,
	CONFUSED = -0.01,
}

export interface AccountBalanceScreenProps {
	/**
	 * When true, automatically triggers the NFC read (as if the user pressed
	 * the "read card" button) as soon as the screen is focused/active and NFC
	 * is supported+enabled. Used by the foodoffers quick-access button, which
	 * opens this screen in a modal and wants the scan to start immediately.
	 */
	autoStartNfc?: boolean;
}

const AccountBalanceScreen: React.FC<AccountBalanceScreenProps> = ({ autoStartNfc = false }) => {
	useSetPageTitle(TranslationKeys.accountbalance);
	useTrackScreenOpened(AppUsageEventNames.ACCOUNT_BALANCE_SCREEN_OPENED, 'account-balance');
	const toast = useToast();
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const dispatch = useDispatch();
	const debugMode = useDebugMode();
	const { profile } = useAppSelector((state) => state.authReducer);
	const { appSettings, language, primaryColor, selectedTheme: mode } = useAppSelector((state) => state.settings);
	const balance_area_color = appSettings?.balance_area_color ? appSettings?.balance_area_color : primaryColor;
	const [isNfcSupported, setIsNfcSupported] = useState(false);
	const [isNfcEnabled, setIsNfcEnabled] = useState(false);
	const [isActive, setIsActive] = useState(false);
        const [autoPlay, setAutoPlay] = useState(appSettings?.animations_auto_start);
        const animationRef = useRef<LottieView>(null);
        const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);
        const [animationJson, setAnimationJson] = useState<any>(null);
        const [debugErrors, setDebugErrors] = useState<Array<{ timestamp: Date; error: string; source: string }>>([]);
        // The NFC "hold your card" instruction (Android only - iOS has its own
        // system sheet, see MyNativeCardReader) used to be pushed as its own item
        // on the global modal stack on top of this screen's modal. That made the
        // modal-stack renderer (which only mounts the top-most stack item) unmount
        // this whole component whenever the instruction opened or closed, wiping
        // all local state and re-triggering autoStartNfc in a loop every time the
        // instruction closed. Rendering the instruction as local state instead
        // keeps this component mounted the entire time (works the same whether
        // opened as a modal from foodoffers or navigated to as a plain screen).
        const [showingInstruction, setShowingInstruction] = useState(false);
        const { addPointsForBalanceRead } = useAppRatingScore();

        const debugLogMessages = useMemo(
                () =>
                        debugErrors.map(errorItem =>
                                `${format(errorItem.timestamp, 'dd.MM.yyyy HH:mm:ss')} - ${errorItem.source}: ${errorItem.error}`
                        ),
                [debugErrors]
        );
	const contrastColor = useMemo(() => myContrastColor(primaryColor, theme, mode === 'dark'), [mode, primaryColor, theme]);

	// Helper function to add errors to debug list
	const addDebugError = useCallback((error: any, source: string) => {
		const errorMessage = typeof error === 'string' ? error : JSON.stringify(error);
		setDebugErrors(prev => [
			...prev,
			{
				timestamp: new Date(),
				error: errorMessage,
				source: source,
			},
		]);
	}, []);

        useFocusEffect(
		useCallback(() => {
			if (profile?.credit_balance) {
				if (Number(profile?.credit_balance) >= BalanceStateLowerBound.CONFIDENT) {
					setAnimationJson(replaceLottieColors(moneyConfident, balance_area_color));
				} else if (Number(profile?.credit_balance) >= BalanceStateLowerBound.FITNESS) {
					setAnimationJson(replaceLottieColors(moneyFitness, balance_area_color));
				} else if (Number(profile?.credit_balance) >= BalanceStateLowerBound.SAD) {
					setAnimationJson(replaceLottieColors(moneySad, balance_area_color));
				}
			} else {
				setAnimationJson(replaceLottieColors(moneyConfused, balance_area_color));
			}
			return () => {
				setAnimationJson(null);
			};
		}, [profile?.credit_balance])
	);

	let myCardReader: MyCardReaderInterface = useMyCardReader();

	let callBack = async (answer: CardResponse | undefined) => {
		if (!answer) {
			return;
		}

		const nextBalanceAsString = answer.currentBalance;
		const nextBalanceDefined = nextBalanceAsString !== null && nextBalanceAsString !== undefined;

		const lastTransactionAsString = answer.lastTransaction;
		const lastTransactionDefined = lastTransactionAsString !== null && lastTransactionAsString !== undefined;

		const credit_balance = nextBalanceDefined ? Number.parseFloat(nextBalanceAsString as string) : null;
		const credit_balance_last_transaction = lastTransactionDefined ? Number.parseFloat(lastTransactionAsString as string) : null;
		const credit_balance_date_updated = answer.readTime ? answer.readTime.toISOString() : new Date().toISOString();

		// dispatch({
		// 	type: UPDATE_PROFILE,
		// 	payload: {
		// 		credit_balance: nextBalanceDefined ? parseFloat(nextBalanceAsString) : null,
		// 		credit_balance_last_transaction: lastTransactionDefined ? parseFloat(lastTransactionAsString) : null,
		// 		credit_balance_date_updated: answer?.readTime?.toISOString(),
		// 	},
		// });

		dispatch({
			type: UPDATE_PROFILE,
			payload: {
				...profile,
				credit_balance,
				credit_balance_last_transaction,
				credit_balance_date_updated,
			},
		});

		addPointsForBalanceRead();

		try {
			if (!profile || !(profile as any).id) {
				console.warn('No profile id found, skipping balance persist');
				return;
			}

			const token = await ServerAPI.getClient().getToken();
			if (!token) {
				console.warn('No token found, skipping balance persist');
				return;
			}

			const body = filterNullishProperties({
				credit_balance,
				credit_balance_last_transaction,
				credit_balance_date_updated,
			});

			const res = await fetch(`${Server.ServerUrl}/items/profiles/${(profile as any).id}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(body),
			});

			if (!res.ok) {
				const text = await res.text();
				console.warn('Failed to persist credit balance', res.status, text);
				addDebugError(text, 'Persist credit balance');
			}
		} catch (e: any) {
			console.error('Error persisting credit balance', e);
			addDebugError(e, 'Persist credit balance');
		}
	};

        const hideInstruction = useCallback(() => {
                setShowingInstruction(false);
        }, []);

        // Debug-only: pretend the NFC module returned a card with the given balance,
        // running the exact same callback as a real read (redux update + persist),
        // then dismissing the instruction like a completed read would. Lets us verify
        // that a read finishing while the instruction is shown hides it again and
        // updates the UI.
        const simulateNfcRead = async (amount: number) => {
                const mock: CardResponse = {
                        currentBalance: amount.toFixed(2),
                        currentBalanceRaw: null,
                        lastTransaction: undefined,
                        lastTransactionRaw: null,
                        chooseAppRaw: null,
                        tag: null,
                        readTime: new Date(),
                };
                try {
                        await callBack(mock);
                        toast(`Simulated NFC read: ${amount}€`, 'info');
                } catch (e: any) {
                        console.error('Error in simulated read', e);
                        addDebugError(e, 'Simulated NFC Read');
                }
                hideInstruction();
        };

        const showInstruction = useCallback(() => {
                if (!isActive) return;
                setShowingInstruction(true);
        }, [isActive]);

        // Cancel button on the instruction: tears down the in-flight NFC session
        // (best-effort, safe even if the native call has already finished) and
        // immediately shows the normal balance content again, instead of waiting
        // for readCard()'s own cleanup to unwind.
        const handleCancelRead = useCallback(() => {
                setShowingInstruction(false);
                myCardReader.cancelRead().catch((e: any) => addDebugError(e, 'Cancel NFC Read'));
        }, [myCardReader, addDebugError]);

	const onReadNfcPress = async () => {
		await myCardReader.readCard(callBack, showInstruction, hideInstruction, translate(TranslationKeys.nfcInstructionRead));
	};

	const handleReadNfcPress = useCallback(async () => {
		try {
			await onReadNfcPress();
		} catch (e: any) {
			toast(`${JSON.stringify(e)}`, 'error');
			console.error('Error', JSON.stringify(e));
			addDebugError(e, 'NFC Card Read');
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [myCardReader, callBack, showInstruction, hideInstruction, translate, toast, addDebugError]);

	// Auto-start the NFC scan (as if the read-card button was pressed) once the
	// screen is active and NFC is confirmed supported+enabled - used when this
	// screen is opened from the foodoffers quick-access button. Guarded to fire
	// only once per mount so it doesn't re-trigger after the read completes and
	// the focus/NFC-status effects above re-run. Safe to keep as a plain local
	// ref: the instruction is now local state (see showingInstruction above)
	// instead of a second modal-stack item, so this component no longer
	// unmounts/remounts while the instruction is shown or dismissed.
	const hasAutoStartedNfcRef = useRef(false);
	useEffect(() => {
		if (!autoStartNfc || hasAutoStartedNfcRef.current) return;
		if (isWeb || !isActive || !isNfcSupported || !isNfcEnabled) return;
		hasAutoStartedNfcRef.current = true;
		handleReadNfcPress();
	}, [autoStartNfc, isActive, isNfcSupported, isNfcEnabled, handleReadNfcPress]);

	useEffect(() => {
		const onChange = ({ window }: { window: any }) => {
			setWindowWidth(window.width);
		};

		const subscription = Dimensions.addEventListener('change', onChange);

		return () => {
			subscription.remove();
		};
	}, []);

        useFocusEffect(
                useCallback(() => {
                        setIsActive(true);
                        return () => {
                                setIsActive(false);
			};
		}, [])
	);

	useFocusEffect(
		useCallback(() => {
			const checkNfcStatus = async () => {
				try {
					const nfcAvailable = await myCardReader.isNfcSupported();
					setIsNfcSupported(nfcAvailable.result);
					if (!nfcAvailable.result) {
						addDebugError(JSON.stringify(nfcAvailable, null, 2), 'NFC Supported Check');
					}

					const nfcEnabled = await myCardReader.isNfcEnabled();
					setIsNfcEnabled(nfcEnabled.result);
					if (!nfcEnabled.result) {
						addDebugError(JSON.stringify(nfcEnabled, null, 2), 'NFC Enabled Check');
					}
				} catch (error) {
					console.error('Error checking NFC status:', error);
					addDebugError(error, 'NFC Status Check');
				}
			};

			void checkNfcStatus();
		}, [addDebugError])
	);

	useFocusEffect(
		useCallback(() => {
			setAutoPlay(appSettings?.animations_auto_start); // Enable when entering

			return () => {
				setAutoPlay(false); // Reset when leaving
				// No setAnimationJson(null) here: this cleanup also runs when the app settings
				// arrive after the screen opened, and the animation was then gone for good (the
				// effect that picks it only re-runs on a new balance). Leaving the screen clears
				// it in that effect's own cleanup.
			};
		}, [appSettings?.animations_auto_start])
	);

        useEffect(() => {
                if (animationJson && autoPlay && animationRef.current) {
                        animationRef?.current?.play(); // Reset animation to ensure it starts fresh
                }
        }, [animationJson, autoPlay]);

        // Hide a lingering NFC instruction modal when the screen loses focus.
        // Harmless on mount since hideInstruction no-ops while nothing is open.
        useEffect(() => {
                if (!isActive) {
                        hideInstruction();
                }
        }, [isActive, hideInstruction]);

	const renderLottie = useMemo(() => {
		if (animationJson) {
			return <LottieView ref={animationRef} source={animationJson || {}} resizeMode="contain" style={{ width: '100%', height: '100%' }} autoPlay={!!autoPlay} loop={false} />;
		}
	}, [autoPlay, animationJson]);

	if (showingInstruction) {
		return (
			<ScrollView style={{ ...styles.container, backgroundColor: theme.screen.background }} contentContainerStyle={{ alignItems: 'center' }}>
				<View style={styles.sheetView}>
					{/* Previous balance (snapshot from before this read), so the user
					    still sees their old value while scanning - especially when the
					    foodoffers quick-access opens balance with auto-started NFC and
					    Android jumps straight to this instruction. Only shown when a
					    previous balance actually exists. */}
					{profile?.credit_balance !== null && profile?.credit_balance !== undefined && (
						<Text style={{ ...styles.nfcInstructionRead, color: theme.screen.text, marginBottom: 8 }}>
							{`${translate(TranslationKeys.nfcInstructionOldBalance)}: ${showFormatedPrice(formatPrice(profile.credit_balance))}`}
						</Text>
					)}
					<Text style={{ ...styles.nfcInstructionRead, color: theme.screen.text }}>{translate(TranslationKeys.nfcInstructionRead)}</Text>
					<View style={styles.nfcAnimationContainer}>
						<LottieView source={require('@/assets/gifs/nfc.json')} resizeMode="contain" style={styles.nfcAnimation} autoPlay loop />
					</View>
					<Text style={{ ...styles.nfcInstructionChipPosition, color: theme.screen.text }}>{translate(TranslationKeys.nfcInstructionChipPosition)}</Text>
					<TouchableOpacity style={{ ...styles.nfcButton, borderColor: theme.screen.iconBg, marginTop: 16 }} onPress={handleCancelRead}>
						<MaterialCommunityIcons name="close-circle-outline" size={24} color={theme.screen.icon} />
						<Text style={{ ...styles.nfcLabel, color: theme.screen.text }}>{translate(TranslationKeys.nfcCancelRead)}</Text>
					</TouchableOpacity>
					{debugMode && (
						<View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 4 }}>
							{[1, 5, 10].map(amount => (
								<TouchableOpacity
									key={`instruction-simulate-${amount}`}
									style={{
										paddingVertical: 8,
										paddingHorizontal: 14,
										borderRadius: 8,
										borderWidth: 1,
										borderColor: theme.screen.iconBg,
										marginHorizontal: 6,
										marginTop: 8,
									}}
									onPress={() => void simulateNfcRead(amount)}
								>
									<Text style={{ color: theme.screen.text }}>{`Simulate ${amount}€`}</Text>
								</TouchableOpacity>
							))}
						</View>
					)}
				</View>
			</ScrollView>
		);
	}

	return (
		<ScrollView style={{ ...styles.container, backgroundColor: theme.screen.background }} contentContainerStyle={{ alignItems: 'center' }}>
			<View style={styles.imageContainer}>{renderLottie}</View>

			{/* Account Balance Info */}

			<Text style={{ ...styles.balanceTitle, color: theme.header.text }}>{translate(TranslationKeys.accountbalance)}</Text>
			<Text style={{ ...styles.balance, color: theme.header.text }}>{profile?.credit_balance ? showFormatedPrice(formatPrice(profile?.credit_balance)) : '? €'}</Text>
			{(isWeb || !isNfcSupported) && <Text style={{ ...styles.subText, color: theme.header.text }}>{translate(TranslationKeys.nfcNotSupported)}</Text>}
			{!isWeb && isNfcEnabled && isNfcSupported && (
				<ProjectButton
					style={{ width: '80%' }}
					onPress={handleReadNfcPress}
					text={translate(TranslationKeys.nfcReadCard)}
					iconLeft={<MaterialCommunityIcons name="credit-card-wireless-outline" size={24} color={contrastColor} />}
				/>
			)}
			{isNfcSupported && !isNfcEnabled && (
				<TouchableOpacity
					style={{ ...styles.nfcButton, borderColor: theme.screen.iconBg }}
					onPress={() => Linking.openSettings()} // Open NFC settings
				>
					<MaterialCommunityIcons name="nfc" size={24} color={theme.screen.icon} />
					<Text style={{ ...styles.nfcLabel, color: theme.screen.text }}>{translate(TranslationKeys.pleaseEnableNFC)}</Text>
				</TouchableOpacity>
			)}

			{/* Additional Information */}
			<View style={[styles.infoContainer, { width: windowWidth > 600 ? '90%' : '100%' }]}>
				<View style={styles.infoRow}>
					<View style={styles.iconLabelContainer}>
						<MaterialCommunityIcons name="credit-card" size={24} color={theme.screen.icon} style={styles.icon} />
						<Text style={{ ...styles.label, color: theme.header.text }}>{translate(TranslationKeys.accountbalance)}</Text>
					</View>

					<Text style={{ ...styles.value, color: theme.header.text }}>{profile?.credit_balance ? showFormatedPrice(formatPrice(profile?.credit_balance)) : '? €'}</Text>
				</View>
				<View style={styles.infoRow}>
					<View style={styles.iconLabelContainer}>
						<MaterialCommunityIcons name="transfer" size={24} color={theme.screen.icon} style={styles.icon} />
						<Text style={{ ...styles.label, color: theme.header.text }}>{translate(TranslationKeys.accountbalanceLastTransaction)}</Text>
					</View>
					<Text style={{ ...styles.value, color: theme.header.text }}>{profile?.credit_balance_last_transaction ? showFormatedPrice(formatPrice(profile?.credit_balance_last_transaction)) : '? €'}</Text>
				</View>
				<View style={styles.infoRow}>
					<View style={styles.iconLabelContainer}>
						<FontAwesome5 name="calendar-alt" size={24} color={theme.screen.icon} style={styles.icon} />
						<Text style={{ ...styles.label, color: theme.header.text }}>{translate(TranslationKeys.accountbalanceDateUpdated)}</Text>
					</View>
					<Text style={{ ...styles.value, color: theme.header.text }}>{profile?.credit_balance_date_updated ? format(profile?.credit_balance_date_updated, 'dd.MM.yyyy HH:mm') : ''}</Text>
				</View>
				<View style={styles.additionalInfoContainer}>{appSettings?.balance_translations && <MyMarkdownProjectColored content={getTextFromTranslation(appSettings?.balance_translations, language) || ''} accentColor={balance_area_color} imageWidth={'100%'} imageHeight={400} collapsibleSections />}</View>
				<DebugView
					title={translate(TranslationKeys.debugErrors)}
					logs={debugLogMessages}
					actions={[
						{
							label: translate(TranslationKeys.showNfcInstruction),
							icon: 'cellphone-nfc',
							onPress: showInstruction,
							borderColor: theme.screen.iconBg,
							backgroundColor: theme.drawerBg,
						},
					]}
				>
					<View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 4 }}>
						{[1, 5, 20].map(amount => (
							<TouchableOpacity
								key={`simulate-${amount}`}
								style={{
									paddingVertical: 8,
									paddingHorizontal: 14,
									borderRadius: 8,
									borderWidth: 1,
									borderColor: theme.screen.iconBg,
									marginHorizontal: 6,
									marginTop: 8,
								}}
								onPress={async () => {
									const mock: CardResponse = {
										currentBalance: amount.toFixed(2),
										currentBalanceRaw: null,
										lastTransaction: undefined,
										lastTransactionRaw: null,
										chooseAppRaw: null,
										tag: null,
										readTime: new Date(),
									};
									try {
										await callBack(mock);
										toast(`Simulated NFC read: ${amount}€`, 'info');
									} catch (e: any) {
										console.error('Error in simulated read', e);
										addDebugError(e, 'Simulated NFC Read');
									}
								}}
							>
								<Text style={{ color: theme.screen.text }}>{`Simulate ${amount}€`}</Text>
							</TouchableOpacity>
						))}
					</View>
				</DebugView>
			</View>
                        <CollectibleSpot collectibleKey={CollectibleAt.collectible_at_card_balance} />
                </ScrollView>
        );
};

export default AccountBalanceScreen;
