import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, Image, ScrollView, Text, View } from 'react-native';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import Form from '@/components/Login/Form';
import Header from '@/components/Login/Header';
import Footer from '@/components/Login/Footer';
import ManagementSheet from '@/components/Login/ManagementSheet';
import { isWeb } from '@/constants/Constants';
import { router, useFocusEffect, useGlobalSearchParams } from 'expo-router';
import { ServerAPI } from '@/redux/actions/Auth/Auth';
import { useDispatch, useSelector } from 'react-redux';
import { SET_APP_SETTINGS, SET_WIKIS, UPDATE_MANAGEMENT, UPDATE_PRIVACY_POLICY_DATE } from '@/redux/Types/types';
import AttentionSheet from '@/components/Login/AttentionSheet';
import useToast from '@/hooks/useToast';
import { updateLoginStatus } from '@/constants/HelperFunctions';
import { DatabaseTypes, EmailHelper } from 'repo-depkit-common';
import { format } from 'date-fns';
import { WikisHelper } from '@/redux/actions/Wikis/Wikis';
import { AppSettingsHelper } from '@/redux/actions/AppSettings/AppSettings';
import DeviceMock from '@/components/DeviceMock/DeviceMock';
import { getDetailedDescriptionTranslation, getIntroDescriptionTranslation } from '@/helper/resourceHelper';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { RootState } from '@/redux/reducer';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';

export default function Login() {
	useSetPageTitle(TranslationKeys.sign_in);
	const toast = useToast();
	const { theme } = useTheme();
	const dispatch = useDispatch();
	const { deviceMock } = useGlobalSearchParams();
	const appSettingsHelper = new AppSettingsHelper();
	const wikisHelper = new WikisHelper();
	const [loading, setLoading] = useState(false);
	const [providers, setProviders] = useState<any>([]);
	const [isWebVisible, setIsWebVisible] = useState(Dimensions.get('window').width > 500);
	const { appSettings, language } = useSelector((state: RootState) => state.settings);
	const intro_description = appSettings?.login_screen_translations && getIntroDescriptionTranslation(appSettings?.login_screen_translations, language);
	const detailed_description = appSettings?.login_screen_translations && getDetailedDescriptionTranslation(appSettings?.login_screen_translations, language);
	const [heading, subHeading] = intro_description?.split('-') || ['', ''];
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
		getAppSettings();
		getProviders();
	}, []);

        const handleUserLogin = async (token?: string, email?: string, password?: string) => {
                try {
                        // Authenticate based on token or credentials
                        setLoading(true);
                        if (token) {
                                await ServerAPI.authenticateWithAccessToken(token);
                        } else if (email && password) {
                                const trimmedEmail = EmailHelper.sanitize(email);
                                const result = await ServerAPI.authenticateWithEmailAndPassword(
                                        trimmedEmail,
                                        password
                                );
                                if (!result) throw new Error('Invalid credentials');
                        }

			// Fetch and process user data
			const user = await ServerAPI.getMe();
			const roles = await ServerAPI.readRemoteRoles();

			console.log('user: ', user);
			console.log('roles: ', roles);
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
			router.replace('/(app)');
		} catch (error) {
			console.error('Error during login: ', error);
			if (!token) {
				toast('Invalid credentials', 'error');
				setLoading(false);
			}
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

	useEffect(() => {
		const handleResize = () => {
			setIsWebVisible(Dimensions.get('window').width > 650);
		};

		const subscription = Dimensions.addEventListener('change', handleResize);

		return () => subscription?.remove();
	}, []);

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
			getWikis();
		}, [])
	);

	const extractDescriptionAndImage = (content: string): [string, string] => {
		if (!content) return ['', ''];

		const imageRegex = /!\[.*?\]\((.*?)\)/;
		const imageMatch = content.match(imageRegex);
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
					justifyContent: isWeb ? 'space-between' : 'flex-start',
				}}
			>
				<View
					style={{
						...styles.loginContainer,
						width: isWeb && isWebVisible ? '35%' : '100%',
					}}
				>
					<Header />
					<Form openSheet={openSheet} openAttentionSheet={openAttentionSheet} onSuccess={handleUserLogin} providers={providers} />
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
