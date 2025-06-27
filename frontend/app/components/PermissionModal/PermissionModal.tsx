import {
  ActivityIndicator,
  Dimensions,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import React, { useEffect, useState, useRef } from 'react';
import BaseBottomSheet from '../BaseBottomSheet';
import BottomSheet from '@gorhom/bottom-sheet';
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
import { myContrastColor } from '@/helper/colorHelper';
import { RootState } from '@/redux/reducer';

const PermissionModal: React.FC<PermissionModalProps> = ({
  isVisible,
  setIsVisible,
}) => {
  const { theme } = useTheme();
  const { translate } = useLanguage();
  const { primaryColor, selectedTheme: mode } = useSelector(
    (state: RootState) => state.settings
  );
  const contrastColor = myContrastColor(primaryColor, theme, mode === 'dark');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const dispatch = useDispatch();
  const sheetRef = useRef<BottomSheet>(null);

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
    if (isVisible) {
      sheetRef.current?.expand();
    }
  }, [isVisible]);

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

  if (!isVisible) {
    return null;
  }

  return (
    <BaseBottomSheet
      ref={sheetRef}
      index={-1}
      enablePanDownToClose
      onClose={() => setIsVisible(false)}
      backgroundStyle={{ backgroundColor: theme.sheet.sheetBg }}
    >
      <View
        style={{
          ...styles.modalView,
          backgroundColor: theme.sheet.sheetBg,
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
          {translate(TranslationKeys.access_limited)}
        </Text>
        <Text
          style={{
            ...styles.modalSubHeading,
            color: theme.modal.text,
            fontSize: Dimensions.get('window').width < 500 ? 14 : 18,
          }}
        >
          {translate(TranslationKeys.limited_access_description)}
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
            <Text style={{ ...styles.loginLabel, color: contrastColor }}>
              {translate(TranslationKeys.sign_in)} /{' '}
              {translate(TranslationKeys.create_account)}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </BaseBottomSheet>
  );
};

export default PermissionModal;
