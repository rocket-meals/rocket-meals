import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Checkbox from 'expo-checkbox';
import { useTheme } from '@/hooks/useTheme';
import { UrlHelper } from '@/constants/UrlHelper';
import { styles } from './styles';
import { FormProps } from './types';
import { generateCodeChallenge, generateCodeVerifier } from '@/constants/HelperFunctions';
import usePlatformHelper from '@/helper/platformHelper';
import { fetchAuthorizationUrl, fetchToken } from '@/redux/actions/ApiService/ApiService';
import { handleNativeLogin, handleWebLogin } from '@/helper/authHelper';
import { useLanguage } from '@/hooks/useLanguage';
import { useDispatch, useSelector } from 'react-redux';
import { UPDATE_PRIVACY_POLICY_DATE } from '@/redux/Types/types';
import { format } from 'date-fns';
import { myContrastColor } from '@/helper/ColorHelper';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';

const LoginForm: React.FC<FormProps> = ({ openSheet, onSuccess, openAttentionSheet, providers }) => {
	const [isChecked, setChecked] = useState(false);
	const { theme } = useTheme();
	const dispatch = useDispatch();
	const { isWeb } = usePlatformHelper();
	const { translate } = useLanguage();
	const { primaryColor, selectedTheme: mode } = useSelector((state: RootState) => state.settings);
	const contrastColor = myContrastColor(primaryColor || theme.login.linkButton, theme, mode === 'dark');

	const getToken = async (codeVerifier: string, code: string) => {
		try {
			const { directus_refresh_token } = await fetchToken(codeVerifier, code);

			if (directus_refresh_token && onSuccess) {
				onSuccess(directus_refresh_token);
			}
		} catch (error) {
			console.error('Error fetching token:', error);
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

			const { urlToProviderLogin } = await fetchAuthorizationUrl(payload);

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
			<Text style={{ ...styles.heading, color: theme.login.text }}>{translate(TranslationKeys.sign_in)}</Text>
			<View>
				<TouchableOpacity
					onPress={() => {
						setChecked(!isChecked);
					}}
					style={styles.section}
				>
					<Checkbox style={styles.checkbox} value={isChecked} onValueChange={setChecked} color={isChecked ? '#000000' : undefined} />
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
			<View style={{ width: '100%', opacity: isChecked ? 1 : 0.3 }}>
				<View style={styles.firstRow}>
					{providers &&
						providers?.map((provider: any, index: number) => (
							<TouchableOpacity
								key={index}
								style={{
									...styles.button,
									borderColor: theme.login.border,
								}}
								disabled={!isChecked}
								onPress={() => onPressLogin(provider?.name)}
							>
								<View style={{ ...styles.leftIcon, backgroundColor: primaryColor }}>
									<MaterialCommunityIcons name={provider?.icon} size={22} color={contrastColor} />
								</View>
								<Text style={{ ...styles.buttonLabel, color: theme.login.text }}>{`${translate(TranslationKeys.sign_in_with)}: ${provider?.name?.charAt(0)?.toUpperCase() + provider?.name?.slice(1)?.toLowerCase()}`}</Text>
								<View style={{ width: 58 }} />
							</TouchableOpacity>
						))}
				</View>
				<TouchableOpacity
					style={{
						...styles.button,
						...styles.incognito,
						borderColor: theme.login.border,
					}}
					disabled={!isChecked}
					onPress={openAttentionSheet}
				>
					<View style={{ ...styles.leftIcon, backgroundColor: primaryColor }}>
						<MaterialCommunityIcons name="incognito" size={28} color={contrastColor} />
					</View>
					<Text style={{ ...styles.buttonLabel, color: theme.login.text }}>{translate(TranslationKeys.continue_without_account)}</Text>
					<View style={{ width: 58 }} />
				</TouchableOpacity>
			</View>

			<View style={styles.managementLogin}>
				<Text style={{ ...styles.fromManagement, color: theme.login.text }}>{`${translate(TranslationKeys.for_management)}?`}</Text>
				<TouchableOpacity
					onPress={() => {
						openSheet();
					}}
				>
					<Text style={{ ...styles.loginText, color: theme.screen.text }}>{translate(TranslationKeys.sign_in)}</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
};

export default LoginForm;
