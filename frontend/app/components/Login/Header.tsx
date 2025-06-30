import { View, Platform, TouchableOpacity, Text } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { styles } from './styles';
import { isWeb } from '@/constants/Constants';
import { useLanguage } from '@/hooks/useLanguage';
import { useLocales } from 'expo-localization';
import { useDispatch, useSelector } from 'react-redux';
import { SET_DRAWER_POSITION } from '@/redux/Types/types';
import ModalComponent from '../ModalSetting/ModalComponent';
import { languages } from '../../constants/SettingData';
import { Image } from 'expo-image';
import { Entypo } from '@expo/vector-icons';
import LanguageSheet from '../LanguageSheet/LanguageSheet';
import { getImageUrl } from '@/constants/HelperFunctions';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';

const LoginHeader = () => {
  const { translate, setLanguageMode, language } = useLanguage();
  const locales = useLocales();
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const { primaryColor, serverInfo } = useSelector(
    (state: RootState) => state.settings
  );

  function useDeviceLocaleCodesWithoutRegionCode(): string[] {
    let localeCodes: string[] = [];

    for (let i = 0; i < locales.length; i++) {
      let locale = locales[i];
      localeCodes.push(locale.languageTag);
    }

    const defaultLanguageCode = 'de';
    const defaultFallbackLanguageCode = 'en';

    if (Platform.OS === 'web') {
      localeCodes = localeCodes.sort((a, b) => {
        if (a.startsWith(defaultLanguageCode)) {
          return -1;
        } else if (b.startsWith(defaultLanguageCode)) {
          return 1;
        } else {
          return 0;
        }
      });
    }

    return localeCodes.length > 0 ? localeCodes : [defaultFallbackLanguageCode];
  }

  useEffect(() => {
    if (!language) {
      const deviceLocale: any = useDeviceLocaleCodesWithoutRegionCode();
      const langCode = deviceLocale[0]?.split('-')[0];
      setLanguageMode(langCode);
      if (langCode === 'ar') {
        dispatch({
          type: SET_DRAWER_POSITION,
          payload: 'right',
        });
      }
    } else {
      if (language === 'ar') {
        dispatch({
          type: SET_DRAWER_POSITION,
          payload: 'right',
        });
      }
    }
  }, []);

  const openLanguageModal = () => {
    setIsLanguageModalVisible(true);
  };

  const closeLanguageModal = () => {
    setIsLanguageModalVisible(false);
  };

  useEffect(() => {
    setSelectedLanguage(language);
  }, [language]);

  const saveLanguage = () => {
    closeLanguageModal();
  };

  const changeLanguage = (language: {
    label?: string;
    flag?: string;
    value: any;
  }) => {
    setSelectedLanguage(language.value);
    setLanguageMode(language.value);
    closeLanguageModal();
  };
  return (
    <View style={styles.header}>
      <Image
        source={{
          uri: getImageUrl(serverInfo?.info?.project?.project_logo),
        }}
        style={{
          width: 64,
          height: 64,
          resizeMode: 'contain',
          borderRadius: 6,
        }}
      />
      <TouchableOpacity
        onPress={openLanguageModal}
        style={{
          ...styles.picker,
          height: isWeb ? 41 : 'auto',
          backgroundColor: theme.login.pickerBg,
          color: theme.login.pickerText,
        }}
      >
        <Text
          style={{
            ...styles.selectText,
            color: theme.screen.text,
          }}
        >
          {languages.find((lang) => lang.value === selectedLanguage)?.label ||
            'selected language'}
        </Text>
        <Entypo name='chevron-small-down' size={25} color={theme.screen.icon} />
      </TouchableOpacity>

      <ModalComponent
        isVisible={isLanguageModalVisible}
        onClose={closeLanguageModal}
        title={translate(TranslationKeys.language)}
        onSave={saveLanguage}
        showButtons={false}
      >
        <LanguageSheet
          closeSheet={closeLanguageModal}
          selectedLanguage={selectedLanguage}
          onSelect={(value) => {
            changeLanguage({ value } as any);
          }}
        />
      </ModalComponent>
    </View>
  );
};

export default LoginHeader;
