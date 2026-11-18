import React, { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import Form from '@/components/Login/Form';
import Header from '@/components/Login/Header';
import Footer from '@/components/Login/Footer';
import ManagementSheet from '@/components/Login/ManagementSheet';
import { isWeb } from '@/constants/Constants';
import { router, useFocusEffect, useGlobalSearchParams } from 'expo-router';
import { ServerAPI } from '@/redux/actions/Auth/Auth';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/redux/hooks';
import { SET_APP_SETTINGS, SET_WIKIS, UPDATE_MANAGEMENT, UPDATE_PRIVACY_POLICY_DATE } from '@/redux/Types/types';
import AttentionSheet from '@/components/Login/AttentionSheet';
import useToast from '@/hooks/useToast';
import { updateLoginStatus } from '@/constants/HelperFunctions';
import { DatabaseTypes, EmailHelper, GuestAccountCredentials } from 'repo-depkit-common';
import { format } from 'date-fns';
import { WikisHelper } from '@/redux/actions/Wikis/Wikis';
import { AppSettingsHelper } from '@/redux/actions/AppSettings/AppSettings';
import DeviceMock from '@/components/DeviceMock/DeviceMock';
import { getDetailedDescriptionTranslation, getIntroDescriptionTranslation } from '@/helper/resourceHelper';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import { completeLoginFromDeepLinkCode } from '@/helper/authHelper';
import LoginDebugPanel from '@/components/Login/LoginDebugPanel';
import { createAndStoreGuestAccount, getStoredGuestAccountCredentials } from '@/helper/guestAccountHelper';
import { useLanguage } from '@/hooks/useLanguage';
import { OnboardingUserCountCache } from '@/helper/OnboardingUserCountCache';


/** Width in points from which the login shows the welcome panel beside it. */
const LOGIN_TWO_COLUMN_MIN_WIDTH = 900;

export default function Login() {
	useSetPageTitle(TranslationKeys.sign_in);
	const toast = useToast();
	const { translate } = useLanguage();
	const { theme } = useTheme();
	const dispatch = useDispatch();
	const { deviceMock, code } = useGlobalSearchParams();
	const appSettingsHelper = new AppSettingsHelper();
	const wikisHelper = new WikisHelper();
	const [loading, setLoading] = useState(false);
	const [providers, setProviders] = useState<any>([]);
	// Hidden diagnostics: toggled by long-pressing the app logo in the header.
	const [showLoginDebug, setShowLoginDebug] = useState(false);
	const { appSettings, language } = useAppSelector((state) => state.settings);
	const sessionExpired = useAppSelector((state) => state.authReducer.sessionExpired);
	const intro_description = appSettings?.login_screen_translations && getIntroDescriptionTranslation(appSettings?.login_screen_translations, language);
	const detailed_description = appSettings?.login_screen_translations && getDetailedDescriptionTranslation(appSettings?.login_screen_translations, language);
	const [heading, subHeading] = intro_description?.split('-') || ['', ''];
	const safeAreaInsets = useSafeAreaInsets();
	const { width: windowWidth } = useWindowDimensions();
	// The welcome panel next to the login only appears when there is room for
	// both: below this the login column (35 %) gets too narrow for its buttons.
	// Counted is the width left between the side insets, not the whole window.
	const isWebVisible = windowWidth - safeAreaInsets.left - safeAreaInsets.right >= LOGIN_TWO_COLUMN_MIN_WIDTH;
	const { show: showManagementModal, close: closeManagementModal } = useMyScrollViewModal();
	const { show: showAttentionModal, close: closeAttentionModal } = useMyScrollViewModal();
	const getProviders = async () => {
		const providers = await ServerAPI.getAuthProviders();
		if (providers) {
			setProviders(providers);
		}
	};

	const getAppSettings = async () => {
		try {
			const result = (await appSettingsHelper.fetchAppSettings({})) as DatabaseTypes.AppSettings;
			if (result) {
				dispatch({ type: SET_APP_SETTINGS, payload: result });
			}
		} catch (error) {
			console.error('Error fetching app settings:', error);
		}
	};

	useEffect(() => {
		void getAppSettings();
		void getProviders();
		// Prefetch for the onboarding after login, so its user counter can start as "00.000"
		void OnboardingUserCountCache.fetchUserCount();
	}, []);

	// Fallback for the native SSO flow: when the auth redirect opens the app as
	// a plain deep link (scheme://login?code=...) without the pending
	// WebBrowser auth session catching it (see helper/authHelper.ts), the code
	// arrives here as route param and the token exchange is completed from it.
	const deepLinkCode = Array.isArray(code) ? code[0] : code;
	useEffect(() => {
		if (deepLinkCode) {
			void completeLoginFromDeepLinkCode(deepLinkCode, token => {
				void handleUserLogin(token);
			});
		}
	}, [deepLinkCode]);

	// Everything after a successful authentication: load the user, decide about
	// management mode, store the login and open the app.
	const completeLogin = async () => {
		const user = await ServerAPI.getMe();
		const roles = await ServerAPI.readRemoteRoles();

		let usersRoleId = user?.role;
		let isManagement = false;
		if (usersRoleId) {
			const role = roles.find(role => role.id === usersRoleId);
			if (role && role.name !== 'User') {
				isManagement = true;
			}
		}
		dispatch({ type: UPDATE_MANAGEMENT, payload: isManagement });

		updateLoginStatus(dispatch, user as DatabaseTypes.DirectusUsers);
		const currentDate = getCurrentDate();

		dispatch({
			type: UPDATE_PRIVACY_POLICY_DATE,
			payload: currentDate,
		});
		setLoading(false);
		closeManagementModal();
		router.replace('/(app)');
	};

	const handleUserLogin = async (token?: string, email?: string, password?: string) => {
		try {
			// Authenticate based on token or credentials
			setLoading(true);
			if (token) {
				await ServerAPI.authenticateWithAccessToken(token);
			} else if (email && password) {
				const trimmedEmail = EmailHelper.sanitize(email);
				const result = await ServerAPI.authenticateWithEmailAndPassword(trimmedEmail, password);
				if (!result) throw new Error('Invalid credentials');
			}

			await completeLogin();
		} catch (error) {
			console.error('Error during login: ', error);
			if (!token) {
				toast('Invalid credentials', 'error');
				setLoading(false);
			}
		}
	};

	const authenticateWithGuestAccountCredentials = async (credentials: GuestAccountCredentials): Promise<boolean> => {
		try {
			const result = await ServerAPI.authenticateWithEmailAndPassword(credentials.email, credentials.password);
			return !!result;
		} catch (error) {
			console.error('Guest login failed: ', error);
			return false;
		}
	};

	// Signs in to the guest account stored on this device. Without one (or when
	// it no longer exists on the server) the server creates a new guest account.
	const handleGuestLogin = async () => {
		if (loading) {
			return;
		}
		setLoading(true);
		try {
			const storedCredentials = await getStoredGuestAccountCredentials();
			let authenticated = !!storedCredentials && (await authenticateWithGuestAccountCredentials(storedCredentials));
			if (!authenticated) {
				const newCredentials = await createAndStoreGuestAccount();
				authenticated = await authenticateWithGuestAccountCredentials(newCredentials);
			}
			if (!authenticated) {
				throw new Error('Could not sign in to the guest account');
			}
			await completeLogin();
		} catch (error) {
			console.error('Error during guest login: ', error);
			toast(translate(TranslationKeys.guest_account_creation_failed), 'error');
			setLoading(false);
		}
	};

	const openSheet = useCallback(() => {
		showManagementModal({
			onClose: closeManagementModal,
			children: (
				<ManagementSheet
					closeSheet={closeManagementModal}
					handleLogin={handleUserLogin}
					loading={loading}
				/>
			),
		});
	}, [closeManagementModal, handleUserLogin, loading, showManagementModal]);

	const handleAnonymousLogin = () => {
		// @ts-ignore
		updateLoginStatus(dispatch, { id: '' });
		router.replace('/(app)');
		const currentDate = getCurrentDate();

		dispatch({
			type: UPDATE_PRIVACY_POLICY_DATE,
			payload: currentDate,
		});
	};

	const getCurrentDate = () => {
		const now = new Date();
		const currentDate = format(now, 'dd.MM.yyyy HH:mm:ss');
		return currentDate;
	};

	const openAttentionSheet = useCallback(() => {
		showAttentionModal({
			onClose: closeAttentionModal,
			children: (
				<AttentionSheet
					closeSheet={closeAttentionModal}
					handleLogin={handleAnonymousLogin}
				/>
			),
		});
	}, [closeAttentionModal, handleAnonymousLogin, showAttentionModal]);

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

	useFocusEffect(
		useCallback(() => {
			void getWikis();
		}, [])
	);

	const extractDescriptionAndImage = (content: string): [string, string] => {
		if (!content) return ['', ''];

		const imageRegex = /!\[.*?\]\((.*?)\)/;
		const imageMatch = imageRegex.exec(content);
		const imageUrl = imageMatch ? imageMatch[1] : '';

		const description = content.replace(imageRegex, '').trim();

		return [description, imageUrl];
	};

	const renderContent = () => {
		const [description, imageUrl] = extractDescriptionAndImage(detailed_description);

		return (
			<View style={styles.detailedContentContainer}>
				{Boolean(imageUrl) && (
					<Image
						source={{ uri: imageUrl }}
						style={{
							width: '95%',
							resizeMode: 'cover',
							marginBottom: 10,
							borderRadius: 8,
							aspectRatio: 16 / 10,
						}}
					/>
				)}
				{!!description && <Text style={{ ...styles.subTitle, color: theme.login.text }}>{description}</Text>}
			</View>
		);
	};

	return (
		<>
			{!!(deviceMock && deviceMock === 'iphone' && isWeb) && <DeviceMock />}
			<ScrollView
				style={{
					...styles.mainContainer,
					backgroundColor: theme.login.background,
				}}
				contentContainerStyle={{
					...styles.contentContainer,
					backgroundColor: theme.login.background,
					padding: 20,
					// Keeps clear of what the system draws along the sides, e.g. the
					// upright status bar on the outer display of the iPhone Duo.
					paddingLeft: 20 + safeAreaInsets.left,
					paddingRight: 20 + safeAreaInsets.right,
					justifyContent: isWeb ? 'space-between' : 'flex-start',
				}}
			>
				<View
					style={{
						...styles.loginContainer,
						width: isWeb && isWebVisible ? '35%' : '100%',
					}}
				>
					<Header onLogoLongPress={() => setShowLoginDebug(current => !current)} />
					{!!sessionExpired && (
						<View style={[sessionExpiredStyles.container, { borderColor: theme.login.text }]}>
							<Text style={[sessionExpiredStyles.text, { color: theme.login.text }]}>{translate(TranslationKeys.session_expired_please_sign_in_again)}</Text>
						</View>
					)}
					<Form
						openSheet={openSheet}
						openAttentionSheet={openAttentionSheet}
						onSuccess={handleUserLogin}
						onGuestLogin={handleGuestLogin}
						showGuestLogin={!!appSettings?.guest_profiles_enabled}
						providers={providers}
					/>
					{!isWeb && showLoginDebug && <LoginDebugPanel />}
					<Footer />
				</View>
				{isWeb && isWebVisible && (
					<View
						style={{
							...styles.webContainer,
							backgroundColor: theme.login.webContainerBg,
						}}
					>
						<View style={styles.webTitleContainer}>
							{heading && <Text style={{ ...styles.title, color: theme.login.text }}>{heading}</Text>}
							{subHeading && <Text style={{ ...styles.subTitle, color: theme.login.text }}>{subHeading}</Text>}
						</View>
						{renderContent()}
					</View>
				)}
			</ScrollView>
		</>
	);
}

const sessionExpiredStyles = StyleSheet.create({
	container: {
		width: '100%',
		borderWidth: 1,
		borderRadius: 12,
		padding: 12,
		marginVertical: 10,
	},
	text: {
		fontSize: 15,
		textAlign: 'center',
	},
});
