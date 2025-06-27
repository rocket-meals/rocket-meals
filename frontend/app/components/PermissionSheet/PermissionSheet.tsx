import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import React, { useState } from 'react';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { useDispatch, useSelector } from 'react-redux';
import { useLanguage } from '@/hooks/useLanguage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { ON_LOGOUT } from '@/redux/Types/types';
import { persistor } from '@/redux/store';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';
import type { PermissionSheetProps } from './types';

const PermissionSheet: React.FC<PermissionSheetProps> = ({ closeSheet }) => {
  const { theme } = useTheme();
  const { translate } = useLanguage();
  const dispatch = useDispatch();
  const router = useRouter();
  const { primaryColor } = useSelector((state: RootState) => state.settings);
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setLoading(true);
      await AsyncStorage.multiRemove(['auth_data', 'persist:root']);
      dispatch({ type: ON_LOGOUT });
      dispatch({ type: 'RESET_STORE' });
      persistor.purge();
      setLoading(false);
      closeSheet();
      router.replace('/(auth)/login');
    } catch (error) {
      setLoading(false);
      console.error('Error during logout:', error);
    }
  };

  return (
    <BottomSheetScrollView
      style={{ ...styles.sheetView, backgroundColor: theme.sheet.sheetBg }}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.sheetHeader}>
        <View style={{ width: 50 }} />
        <Text style={{ ...styles.sheetHeading, color: theme.sheet.text }}>
          {translate(TranslationKeys.access_limited)}
        </Text>
      </View>
      <Text style={{ ...styles.sheetSubHeading, color: theme.sheet.text }}>
        {translate(TranslationKeys.limited_access_description)}
      </Text>
      <TouchableOpacity
        style={{ ...styles.loginButton, backgroundColor: primaryColor }}
        onPress={handleLogout}
      >
        {loading ? (
          <ActivityIndicator size={22} color={theme.background} />
        ) : (
          <Text style={{ ...styles.loginLabel, color: theme.activeText }}>
            {translate(TranslationKeys.sign_in)} /{' '}
            {translate(TranslationKeys.create_account)}
          </Text>
        )}
      </TouchableOpacity>
    </BottomSheetScrollView>
  );
};

export default PermissionSheet;
