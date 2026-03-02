import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { styles } from './styles';
import { useTheme } from '@/hooks/useTheme';
import { SheetProps } from './types';
import { useLanguage } from '@/hooks/useLanguage';
import { useSelector } from 'react-redux';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';
import { myContrastColor } from '@/helper/ColorHelper';
import { EmailHelper } from 'repo-depkit-common';
import { SettingsListTextInputField } from '@/components/SettingsListTextInput';

const ManagementSheet: React.FC<SheetProps> = ({ handleLogin, loading }) => {
	const { translate } = useLanguage();
	const { theme } = useTheme();
	const { primaryColor, selectedTheme: mode } = useSelector((state: RootState) => state.settings);
	const contrastColor = myContrastColor(primaryColor, theme, mode === 'dark');
	const [formState, setFormState] = useState({
		email: '',
		password: '',
	});

	const emailValidation = useMemo(
		() => EmailHelper.sanitizeAndValidate(formState.email),
		[formState.email]
	);
	const isEmailValid = emailValidation.isValid;
	const isPasswordValid = formState.password.length > 0;

	const isFormValid = isEmailValid && isPasswordValid;

	const onSubmit = () => {
		if (!isFormValid || loading) return;
		const cleanEmail = EmailHelper.sanitize(formState.email);
		handleLogin(
			undefined,
			cleanEmail,
			formState.password
		);
	};

	return (
		<View style={styles.sheetView}>
			<View style={styles.sheetHeader}></View>
			<Text style={{ ...styles.sheetHeading, color: theme.sheet.text }}>
				{translate(TranslationKeys.show_login_for_management_with_email_and_password)}
			</Text>
			<Text style={{ ...styles.sheetSubHeading, color: theme.sheet.text }}>
				{translate(TranslationKeys.management_login_description)}
			</Text>
			<SettingsListTextInputField
				placeholder={translate(TranslationKeys.email)}
				value={formState.email}
				onChangeText={email => setFormState(prevState => ({ ...prevState, email }))}
				keyboardType="email-address"
				autoCapitalize="none"
				autoCorrect={false}
				textContentType="emailAddress"
				returnKeyType="next"
			/>
			<SettingsListTextInputField
				placeholder={translate(TranslationKeys.password)}
				value={formState.password}
				onChangeText={password => setFormState(prevState => ({ ...prevState, password }))}
				secureTextEntry
				autoCapitalize="none"
				autoCorrect={false}
				textContentType="password"
				returnKeyType="done"
				onSubmitEditing={onSubmit}
			/>
			<TouchableOpacity
				style={{
					...styles.sheetLoginButton,
					backgroundColor: isFormValid ? primaryColor : theme.sheet.buttonDisabled,
				}}
				disabled={!isFormValid}
				onPress={onSubmit}
			>
				{loading ? (
					<ActivityIndicator size={'small'} color={theme.screen.text} />
				) : (
					<Text
						style={{
							...styles.sheetLoginLabel,
							color: isFormValid ? contrastColor : theme.screen.text,
						}}
					>
						{translate(TranslationKeys.sign_in)}
					</Text>
				)}
			</TouchableOpacity>
		</View>
	);
};

export default ManagementSheet;
