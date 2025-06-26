import {
  ActivityIndicator,
  Dimensions,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import Modal from 'react-native-modal';
import { styles } from './styles';
import { AntDesign } from '@expo/vector-icons';
import { ManagementModalProps } from './types';
import { useSelector } from 'react-redux';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';

const ManagementModal: React.FC<ManagementModalProps> = ({
  isVisible,
  setIsVisible,
  handleLogin,
  loading,
}) => {
  const { theme } = useTheme();
  const { translate } = useLanguage();
  const { primaryColor } = useSelector((state: RootState) => state.settings);

  const [formState, setFormState] = useState({
    email: '',
    password: '',
    isEmailValid: false,
    isPasswordValid: false,
  });

  const handleEmailChange = (text: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setFormState((prev) => ({
      ...prev,
      email: text,
      isEmailValid: emailRegex.test(text),
    }));
  };

  const handlePasswordChange = (text: string) => {
    setFormState((prev) => ({
      ...prev,
      password: text,
      isPasswordValid: text.length >= 6, // Ensures password is at least 8 characters
    }));
  };

  const isFormValid = formState.isEmailValid && formState.isPasswordValid;

  const getModalWidth = (windowWidth: number) => {
    if (windowWidth < 800) return '100%';
    if (windowWidth >= 800 && windowWidth <= 1200) return 700;
    return 600;
  };

  const [modalWidth, setModalWidth] = useState(() => {
    const windowWidth = Dimensions.get('window').width;
    return getModalWidth(windowWidth);
  });

  useEffect(() => {
    const handleResize = () => {
      const windowWidth = Dimensions.get('window').width;

      setModalWidth(getModalWidth(windowWidth));
    };

    const subscription = Dimensions.addEventListener('change', handleResize);

    return () => {
      subscription.remove();
    };
  }, []);

  const [isLargeScreen, setIsLargeScreen] = useState(false);

  useEffect(() => {
    const screenHeight = Dimensions.get('window').height;
    setIsLargeScreen(screenHeight > 500); // Detect if screen height is greater than 500px
  }, []);

  return (
    <Modal
      isVisible={isVisible}
      style={styles.modalContainer}
      onClose={() => setIsVisible(false)}
    >
      <View
        style={{
          ...styles.modalView,
          height: 450,
          backgroundColor: theme.modal.modalBg,
          width: modalWidth,
        }}
      >
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={{
              ...styles.closeButton,

              backgroundColor: theme.modal.closeBg,
              height: isLargeScreen ? 42 : 50,
              width: isLargeScreen ? 42 : 50,
            }}
            onPress={() => setIsVisible(false)}
          >
            <AntDesign
              name='close'
              size={isLargeScreen ? 22 : 28}
              color={theme.modal.closeIcon}
            />
          </TouchableOpacity>
        </View>
        <Text
          style={{
            ...styles.modalHeading,
            color: theme.modal.text,
            fontSize: Dimensions.get('window').width < 500 ? 23 : 28,
          }}
        >
          {translate(
            TranslationKeys.show_login_for_management_with_email_and_password
          )}
        </Text>
        <Text
          style={{
            ...styles.modalSubHeading,
            color: theme.modal.text,
            fontSize: Dimensions.get('window').width < 500 ? 16 : 18,
          }}
        >
          Sign in with open account
        </Text>
        <TextInput
          style={{
            ...styles.input,
            color: theme.modal.text,
            backgroundColor: theme.modal.inputBg,
            borderColor: formState.isEmailValid
              ? theme.modal.inputBorderValid
              : theme.modal.inputBorderInvalid,
            borderWidth: 1,
            width: Dimensions.get('window').width < 700 ? '100%' : '80%',
          }}
          cursorColor={theme.modal.text}
          placeholderTextColor={theme.modal.placeholder}
          onChangeText={handleEmailChange}
          value={formState.email}
          placeholder='You@swosy.com'
        />
        <TextInput
          style={{
            ...styles.input,
            color: theme.modal.text,
            backgroundColor: theme.modal.inputBg,
            borderColor: formState.isPasswordValid
              ? theme.modal.inputBorderValid
              : theme.modal.inputBorderInvalid,
            borderWidth: 1,
            width: Dimensions.get('window').width < 700 ? '100%' : '80%',
          }}
          onChangeText={handlePasswordChange}
          cursorColor={theme.modal.text}
          placeholderTextColor={theme.modal.placeholder}
          value={formState.password}
          secureTextEntry
          placeholder={translate(TranslationKeys.password)}
        />
        <TouchableOpacity
          style={{
            ...styles.loginButton,
            marginBottom: 20,
            backgroundColor: isFormValid
              ? primaryColor
              : theme.modal.buttonDisabled,
            width: Dimensions.get('window').width < 500 ? '100%' : '80%',
          }}
          disabled={!isFormValid}
          onPress={() =>
            handleLogin(undefined, formState.email, formState.password)
          }
        >
          {loading ? (
            <ActivityIndicator size='large' color={theme.screen.text} />
          ) : (
            <Text
              style={{
                ...styles.loginLabel,
                color: isFormValid ? theme.activeText : theme.screen.text,
              }}
            >
              {translate(TranslationKeys.sign_in)}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

export default ManagementModal;
