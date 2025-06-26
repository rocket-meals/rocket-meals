import React, { useState } from 'react';
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { styles } from './styles';
import { useTheme } from '@/hooks/useTheme';
import { SheetProps } from './types';
import { useLanguage } from '@/hooks/useLanguage';
import { useSelector } from 'react-redux';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';

const ManagementSheet: React.FC<SheetProps> = ({
  closeSheet,
  handleLogin,
  loading,
}) => {
  const { translate } = useLanguage();
  const { theme } = useTheme();
  const { primaryColor } = useSelector((state: RootState) => state.settings);
  const [formState, setFormState] = useState({
    email: '',
    password: '',
    isEmailValid: false,
    isPasswordValid: false,
  });

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setFormState((prevState) => ({
      ...prevState,
      email,
      isEmailValid: emailRegex.test(email),
    }));
  };

  const validatePassword = (password: string) => {
    setFormState((prevState) => ({
      ...prevState,
      password,
      isPasswordValid: password.length >= 6,
    }));
  };

  const isFormValid = formState.isEmailValid && formState.isPasswordValid;

  return (
    <BottomSheetView
      style={{ ...styles.sheetView, backgroundColor: theme.sheet.sheetBg }}
    >
      <View style={styles.sheetHeader}>
      </View>
      <Text style={{ ...styles.sheetHeading, color: theme.sheet.text }}>
        {translate(
          TranslationKeys.show_login_for_management_with_email_and_password
        )}
      </Text>
      <Text style={{ ...styles.sheetSubHeading, color: theme.sheet.text }}>
        Sign in with open account
      </Text>
      <TextInput
        style={{
          ...styles.sheetInput,
          color: theme.sheet.text,
          backgroundColor: theme.sheet.inputBg,
          borderColor: formState.isEmailValid
            ? theme.sheet.inputBorderValid
            : theme.sheet.inputBorderInvalid,
        }}
        placeholderTextColor={theme.sheet.placeholder}
        cursorColor={theme.sheet.text}
        selectionColor={primaryColor}
        onChangeText={validateEmail}
        value={formState.email}
        placeholder='You@swosy.com'
      />
      <TextInput
        style={{
          ...styles.sheetInput,
          color: theme.sheet.text,
          backgroundColor: theme.sheet.inputBg,
          borderColor: formState.isPasswordValid
            ? theme.sheet.inputBorderValid
            : theme.sheet.inputBorderInvalid,
        }}
        onChangeText={validatePassword}
        placeholderTextColor={theme.sheet.placeholder}
        cursorColor={theme.sheet.text}
        selectionColor={primaryColor}
        value={formState.password}
        secureTextEntry
        placeholder='Password'
      />
      <TouchableOpacity
        style={{
          ...styles.sheetLoginButton,
          backgroundColor: isFormValid
            ? primaryColor
            : theme.sheet.buttonDisabled,
        }}
        disabled={!isFormValid}
        onPress={() =>
          handleLogin(undefined, formState.email, formState.password)
        }
      >
        {loading ? (
          <ActivityIndicator size={'small'} color={theme.screen.text} />
        ) : (
          <Text
            style={{
              ...styles.sheetLoginLabel,
              color: isFormValid ? theme.activeText : theme.screen.text,
            }}
          >
            {translate(TranslationKeys.sign_in)}
          </Text>
        )}
      </TouchableOpacity>
    </BottomSheetView>
  );
};

export default ManagementSheet;
