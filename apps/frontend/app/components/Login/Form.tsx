import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { UrlHelper } from '@/constants/UrlHelper';
import { styles } from './styles';
import { FormProps } from './types';
import { generateCodeChallenge, generateCodeVerifier } from '@/constants/HelperFunctions';
import usePlatformHelper from '@/helper/platformHelper';
import { fetchAuthorizationUrl } from '@/redux/actions/ApiService/ApiService';
import { fetchTokenWithRetry, handleNativeLogin, handleWebLogin } from '@/helper/authHelper';
import { addLoginLog, describeError } from '@/helper/loginDebug';
import { useLanguage } from '@/hooks/useLanguage';
import { useDispatch } from 'react-redux';
import { UPDATE_PRIVACY_POLICY_DATE } from '@/redux/Types/types';
import { format } from 'date-fns';
import { myContrastColor } from '@/helper/ColorHelper';
import { TranslationKeys } from '@/locales/keys';
import { useAppSelector } from '@/redux/hooks';
import { ComponentIds } from '@/constants/ComponentIds';

const LoginForm: React.FC<FormProps> = ({ openSheet, onSuccess, onGuestLogin, showGuestLogin, openAttentionSheet, providers }) => {
	const [isChecked, setChecked] = useState(false);
	const [agbError, setAgbError] = useState(false);
	const { theme } = useTheme();
	const dispatch = useDispatch();
	const { isWeb } = usePlatformHelper();
	const { translate } = useLanguage();
	const state = useAppSelector((state) => state);
	const { primaryColor, selectedTheme: mode } = state.settings;
	const contrastColor = myContrastColor(primaryColor || theme.login.linkButton, theme, mode === 'dark');

	const requireAgb = (proceed: () => void) => {
		if (!isChecked) {
			setAgbError(true);
			return;
		}
		proceed();
	};

	const getToken = async (codeVerifier: string, code: string) => {
		try {
			const { directus_refresh_token } = await fetchTokenWithRetry(codeVerifier, code);

			if (directus_refresh_token && onSuccess) {
				addLoginLog('Token-Austausch erfolgreich, melde an');
				onSuccess(directus_refresh_token);
			} else {
				addLoginLog('Token-Austausch lieferte keinen Refresh-Token');
			}
		} catch (error) {
			console.error('Error fetching token:', error);
			addLoginLog(`Token-Austausch fehlgeschlagen: ${describeError(error)}`);
		}
	};

	const onPressLogin = async (provider: string) => {
		try {
			const desiredRedirectURL = UrlHelper.getURLToLogin();
			const codeVerifier = await generateCodeVerifier();
			const codeChallenge = await generateCodeChallenge(codeVerifier);
			const currentDate = getCurrentDate();

			const payload = {
				provider,
				redirect_url: desiredRedirectURL,
				code_challenge_method: 'S256',
				code_challenge: codeChallenge,
			};

			addLoginLog(`Fordere Authorize-URL an (Provider: ${provider}, redirect_url: ${desiredRedirectURL})`);
			const { urlToProviderLogin } = await fetchAuthorizationUrl(payload);
			addLoginLog('Authorize-URL vom Server erhalten');

			if (isWeb()) {
				await handleWebLogin(urlToProviderLogin, desiredRedirectURL, codeVerifier, getToken);
			} else {
				await handleNativeLogin(urlToProviderLogin, desiredRedirectURL, codeVerifier, getToken);
			}

			dispatch({
				type: UPDATE_PRIVACY_POLICY_DATE,
				payload: currentDate,
			});
		} catch (error) {
			console.error('Login Error:', error);
			addLoginLog(`Login-Fehler: ${describeError(error)}`);
		}
	};

	const getCurrentDate = () => {
		const now = new Date();
		const currentDate = format(now, 'dd.MM.yyyy HH:mm:ss');
		return currentDate;
	};

	return (
		<View
			style={{
				...styles.loginForm,
				alignItems: isWeb() ? 'flex-start' : 'center',
			}}
		>
			<Text role="heading" aria-level={1} style={{ ...styles.heading, color: theme.login.text }}>{translate(TranslationKeys.sign_in)}</Text>
			<View
				style={{
					borderWidth: agbError ? 2 : 0,
					borderColor: agbError ? 'red' : 'transparent',
					borderRadius: 8,
					padding: agbError ? 4 : 0,
				}}
			>
				<TouchableOpacity
					onPress={() => {
						const newValue = !isChecked;
						setChecked(newValue);
						if (newValue) setAgbError(false);
					}}
					style={styles.section}
					id={ComponentIds.LOGIN_ACCEPT_PRIVACY}
					accessibilityRole="checkbox"
					accessibilityState={{ checked: isChecked }}
					// react-native-web does not reliably map accessibilityState.checked to
					// aria-checked here, but role="checkbox" requires it (axe aria-required-attr)
					aria-checked={isChecked}
					accessibilityLabel={translate(TranslationKeys.i_accept_privacy_policy_and_terms_of_service)}
				>
					{/* Icon-based checkbox instead of expo-checkbox: its web implementation
					    renders a native <input> that can't receive an accessible label
					    (critical axe-core "label" violation). The TouchableOpacity above
					    carries the checkbox role/state/label instead. */}
					<MaterialCommunityIcons
						style={styles.checkbox}
						name={isChecked ? 'checkbox-marked' : 'checkbox-blank-outline'}
						size={30}
						color={theme.login.text}
					/>
					<Text
						style={{
							...styles.checkboxLabel,
							color: theme.login.text,
							width: isWeb() ? '100%' : '90%',
						}}
					>
						{translate(TranslationKeys.i_accept_privacy_policy_and_terms_of_service)}
					</Text>
				</TouchableOpacity>
			</View>
			<View style={{ width: '100%' }}>
				<View style={styles.firstRow}>
					{providers?.map((provider: any) => (
							<TouchableOpacity
								key={provider?.name}
								style={{
									...styles.button,
									borderColor: theme.login.border,
								}}
								onPress={() => requireAgb(() => onPressLogin(provider?.name))}
							>
								<View style={{ ...styles.leftIcon, backgroundColor: primaryColor }}>
									<MaterialCommunityIcons name={provider?.icon} size={22} color={contrastColor} />
								</View>
								<Text style={{ ...styles.buttonLabel, color: theme.login.text }}>{`${translate(TranslationKeys.sign_in_with)}: ${provider?.label || provider?.name?.charAt(0)?.toUpperCase() + provider?.name?.slice(1)?.toLowerCase()}`}</Text>
								<View style={{ width: 50 }} />
							</TouchableOpacity>
						))}
				</View>
				{showGuestLogin && (
					<TouchableOpacity
						style={{
							...styles.button,
							marginTop: 10,
							borderColor: theme.login.border,
						}}
						onPress={() => requireAgb(onGuestLogin)}
						id={ComponentIds.LOGIN_CONTINUE_AS_GUEST}
					>
						<View style={{ ...styles.leftIcon, backgroundColor: primaryColor }}>
							<MaterialCommunityIcons name="account-outline" size={26} color={contrastColor} />
						</View>
						<Text style={{ ...styles.buttonLabel, color: theme.login.text }}>{translate(TranslationKeys.sign_in_as_guest)}</Text>
						<View style={{ width: 50 }} />
					</TouchableOpacity>
				)}
			</View>

			<View style={styles.managementLogin}>
				<Text style={{ ...styles.fromManagement, color: theme.login.text }}>{translate(TranslationKeys.without_account_question)}</Text>
				<TouchableOpacity
					style={styles.linkTouchTarget}
					onPress={() => requireAgb(openAttentionSheet)}
					accessibilityRole="link"
					id={ComponentIds.LOGIN_CONTINUE_WITHOUT_ACCOUNT}
				>
					<Text style={{ ...styles.loginText, color: theme.screen.text, textDecorationLine: 'underline' }}>{translate(TranslationKeys.continue_without_account)}</Text>
				</TouchableOpacity>
			</View>
			<View style={{ ...styles.managementLogin, marginTop: 0 }}>
				<Text style={{ ...styles.fromManagement, color: theme.login.text }}>{translate(TranslationKeys.management_login_question)}</Text>
				<TouchableOpacity
					style={styles.linkTouchTarget}
					onPress={() => requireAgb(openSheet)}
					accessibilityRole="link"
				>
					<Text style={{ ...styles.loginText, color: theme.screen.text, textDecorationLine: 'underline' }}>{translate(TranslationKeys.sign_in_here)}</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
};

export default LoginForm;
