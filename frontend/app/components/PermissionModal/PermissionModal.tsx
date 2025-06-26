import {
  ActivityIndicator,
  Dimensions,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import Modal from 'react-native-modal';
import { styles } from './styles';
import { AntDesign } from '@expo/vector-icons';
import { PermissionModalProps } from './types';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ON_LOGOUT } from '@/redux/Types/types';
import { useLanguage } from '@/hooks/useLanguage';
import { persistor } from '@/redux/store';
import { useTheme } from '@/hooks/useTheme';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';

const PermissionModal: React.FC<PermissionModalProps> = ({
  isVisible,
  setIsVisible,
}) => {
  const { theme } = useTheme();
  const { translate } = useLanguage();
  const { primaryColor } = useSelector((state: RootState) => state.settings);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const dispatch = useDispatch();

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
  const handleLogout = async () => {
    try {
      setLoading(true);
      await AsyncStorage.multiRemove(['auth_data', 'persist:root']);
      dispatch({ type: ON_LOGOUT });
      dispatch({ type: 'RESET_STORE' });
      persistor.purge();
      setLoading(false);
      router.replace('/(auth)/login');
    } catch (error) {
      setLoading(false);
      console.error('Error during logout:', error);
    }
  };

  return (
    <Modal
      isVisible={isVisible}
      style={styles.modalContainer}
      onClose={() => setIsVisible(false)}
    >
      <View
        style={{
          ...styles.modalView,
          backgroundColor: theme.modal.modalBg,
          width: modalWidth,
        }}
      >
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={{
              ...styles.closeButton,
              backgroundColor: theme.modal.closeBg,
            }}
            onPress={() => setIsVisible(false)}
          >
            <AntDesign name='close' size={28} color={theme.modal.closeIcon} />
          </TouchableOpacity>
        </View>
        <Text
          style={{
            ...styles.modalHeading,
            color: theme.modal.text,
            fontSize: Dimensions.get('window').width < 500 ? 26 : 36,
          }}
        >
          Access Limited
        </Text>
        <Text
          style={{
            ...styles.modalSubHeading,
            color: theme.modal.text,
            fontSize: Dimensions.get('window').width < 500 ? 14 : 18,
          }}
        >
          To enjoy a personalized experience, please log in or create an
          account. Alternatively, you can continue as a guest with limited
          features.
        </Text>
        <TouchableOpacity
          style={{
            ...styles.loginButton,
            backgroundColor: primaryColor,
            width: Dimensions.get('window').width < 500 ? '100%' : '80%',
          }}
          onPress={handleLogout}
        >
          {loading ? (
            <ActivityIndicator size={22} color={theme.background} />
          ) : (
            <Text style={{ ...styles.loginLabel, color: theme.light }}>
              {/* Sign In / Create Account */}
              {translate(TranslationKeys.sign_in)} /{' '}
              {translate(TranslationKeys.create_account)}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

export default PermissionModal;
