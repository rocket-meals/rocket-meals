import React, { useCallback, useEffect, useState } from 'react';
import {
  TouchableOpacity,
  ScrollView,
  View,
  Dimensions,
  Text,
  TextInput,
  Platform,
  PixelRatio,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import FeedbackItem from '../../../components/FeedbackSupport/FeedbackSupport';
import styles from './styles';
import { isWeb } from '@/constants/Constants';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  feedbackData,
  deviceData,
} from '../../../constants/FeedbackSupportData';
import ModalComponent from '../../../components/ModalSetting/ModalComponent';
import { useLanguage } from '@/hooks/useLanguage';
import { useSelector } from 'react-redux';
import * as DeviceInfo from 'expo-device';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { AppFeedback } from '@/redux/actions/AppFeedback/AppFeedback';
import { FontAwesome5 } from '@expo/vector-icons';
import { FeedbackResponse } from './types';
import useToast from '@/hooks/useToast';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { AppFeedbacks } from '@rocket-meals/shared';
import { RootState } from '@/redux/reducer';
import { myContrastColor } from '@/helper/colorHelper';

const FeedbackScreen = () => {
  useSetPageTitle(TranslationKeys.feedback_and_support);
  const { translate } = useLanguage();
  const { theme } = useTheme();
  const toast = useToast();
  const appFeedback = new AppFeedback();
  const { app_feedbacks_id } = useLocalSearchParams();
  const { profile } = useSelector((state: RootState) => state.authReducer);
  const { primaryColor, selectedTheme: mode } = useSelector(
    (state: RootState) => state.settings
  );
  const contrastColor = myContrastColor(primaryColor, theme, mode === 'dark');
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [selectedKey, setSelectedKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputValues, setInputValues] = useState<{
    [key: string]: string | boolean | number | any;
  }>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorJson, setErrorJson] = useState<string | null>(null);
  const [windowWidth, setWindowWidth] = useState(
    Dimensions.get('window').width
  );

  useFocusEffect(
    useCallback(() => {
      fetchDeviceInfo();
    }, [])
  );

  const fetchFeedbackById = async () => {
    const response = (await appFeedback.fetchAppFeedbackById(
      String(app_feedbacks_id)
    )) as AppFeedbacks;
    if (response) {
      setInputValues({
        title: response?.title,
        content: response?.content,
        contact_email: response?.contact_email ? response?.contact_email : '',
        device_brand: response?.device_brand,
        device_system_version: response?.device_system_version,
        device_platform: response?.device_platform,
        display_height: response?.display_height,
        display_width: response?.display_width,
        display_fontscale: response?.display_fontscale,
        display_pixelratio: response?.display_pixelratio,
        display_scale: response?.display_scale,
        positive: response?.positive,
        profile: response?.profile,
      });
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (app_feedbacks_id && profile?.id) {
        fetchFeedbackById();
      }
      return () => {};
    }, [app_feedbacks_id, profile?.id])
  );

  function getIsLandScape(): boolean {
    const windowWidth = Dimensions.get('screen').width;
    const windowHeight = Dimensions.get('screen').height;
    let isLandscape = windowWidth > windowHeight;
    if (Platform.OS === 'web') {
      isLandscape = windowWidth > windowHeight;
    }
    return isLandscape;
  }

  const fetchDeviceInfo = async () => {
    const windowWidth = Dimensions.get('screen').width;
    const windowHeight = Dimensions.get('screen').height;
    const windowScale = Dimensions.get('screen').scale;
    const isSimulator = !DeviceInfo.isDevice;
    const isTablet = DeviceInfo.deviceType === DeviceInfo.DeviceType.TABLET;
    const brand = DeviceInfo.brand;
    const platform =
      Platform.OS === 'web' ? 'Web' : Platform.OS === 'ios' ? 'iOS' : 'Android';
    const systemVersion = DeviceInfo.osVersion;
    let isLandscape = getIsLandScape();

    setInputValues({
      title: '',
      content: '',
      email: '',
      device_brand: brand,
      device_system_version: systemVersion,
      device_platform: platform,
      display_height: windowHeight,
      display_width: windowWidth,
      display_fontscale: PixelRatio?.getFontScale(),
      display_pixelratio: PixelRatio?.get(),
      display_scale: windowScale,
    });
    setErrorMessage(null);
    setErrorJson(null);
  };

  const handleInputChange = (key: string, text: string) => {
    setInputValues((prevState) => ({
      ...prevState,
      [key]: text,
    }));
  };

  useEffect(() => {
    const onChange = ({ window }: { window: any }) => {
      setWindowWidth(window.width);
    };

    const subscription = Dimensions.addEventListener('change', onChange);
    return () => {
      subscription.remove();
    };
  }, []);

  const openModal = (key: string, title: string) => {
    setSelectedTitle(title);
    setSelectedKey(key);
    setModalVisible(true);
  };

  const closeModal = () => {
    setSelectedTitle('');
    setSelectedKey('');
    setModalVisible(false);
  };

  const handleCreateAppFeedback = async () => {
    if (inputValues) {
      setLoading(true);
      const { email, ...filteredInputValues } = inputValues;
      if (profile?.id) {
        filteredInputValues.profile = profile?.id;
      }
      const sanitizedInput = Object.fromEntries(
        Object.entries(filteredInputValues).filter(([_, value]) => {
          if (value === undefined || value === null) return false;
          if (typeof value === 'string') {
            return value.trim() !== '';
          }
          return true;
        })
      );
      try {
        await appFeedback.createAppFeedback(sanitizedInput);
        setLoading(false);
        fetchDeviceInfo();
        toast(
          'Feedback submitted successfully! Thank you for your input.',
          'success'
        );
        if (profile?.id) {
          router.navigate('/support-ticket');
        } else {
          router.navigate('/support-FAQ');
        }
      } catch (e: any) {
        setLoading(false);
        setErrorMessage(e?.message || String(e));
        try {
          setErrorJson(JSON.stringify(e));
        } catch (jsonError) {
          setErrorJson(String(e));
        }
        toast(`Error: ${e?.message || e}`, 'error');
      }
    }
  };
  const handleUpdateAppFeedback = async () => {
    if (inputValues && app_feedbacks_id) {
      setLoading(true);
      const { email, ...filteredInputValues } = inputValues;
      if (profile?.id) {
        filteredInputValues.profile = profile?.id;
      }
      const sanitizedInput = Object.fromEntries(
        Object.entries(filteredInputValues).filter(([_, value]) => {
          if (value === undefined || value === null) return false;
          if (typeof value === 'string') {
            return value.trim() !== '';
          }
          return true;
        })
      );
      try {
        await appFeedback.updateAppFeedback(
          String(app_feedbacks_id),
          sanitizedInput
        );
        setLoading(false);
        fetchDeviceInfo();
        toast(
          'Feedback updated successfully! Thank you for your input.',
          'success'
        );
        router.navigate('/support-ticket');
      } catch (e: any) {
        setLoading(false);
        setErrorMessage(e?.message || String(e));
        try {
          setErrorJson(JSON.stringify(e));
        } catch (jsonError) {
          setErrorJson(String(e));
        }
        toast(`Error: ${e?.message || e}`, 'error');
      }
    }
  };

  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 10,
        backgroundColor: theme.screen.background,
      }}
    >
      <ScrollView>
        <View style={{ alignItems: 'center' }}>
          <View
            style={[
              styles.section,
              { width: windowWidth > 600 ? '85%' : '100%' },
            ]}
          >
            <Text
              style={{
                fontSize: windowWidth > 600 ? (isWeb ? 20 : 24) : 24,
                color: theme.screen.text,
                padding: 15,
              }}
            >
              {translate(TranslationKeys.your_request)}
            </Text>
            {feedbackData.map((item, index) => (
              <FeedbackItem
                key={index}
                icon={item.icon}
                title={item.title}
                extraIcons={item.extraIcons}
                theme={theme}
                windowWidth={windowWidth}
                value={inputValues[item.key] || ''}
                inputValues={inputValues}
                setInputValues={setInputValues}
                onPress={() => {
                  if (item.title !== 'like_status') {
                    openModal(item.key, item.title);
                  } else {
                  }
                }}
              />
            ))}
            {!profile?.id && (
              <Text
                style={{
                  fontSize: windowWidth > 600 ? (isWeb ? 17 : 20) : 20,
                  color: theme.screen.text,
                  padding: 15,
                }}
              >
                {translate(
                  TranslationKeys.support_warning_no_account_or_mail_provided_therefore_we_cannot_answer_your_request
                )}
              </Text>
            )}
          </View>

          <View
            style={[
              styles.section,
              { width: windowWidth > 600 ? '85%' : '100%' },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.row,
                {
                  padding: 15,
                  borderRadius: 10,
                  backgroundColor: primaryColor,
                  opacity:
                    inputValues?.title?.length === 0 ||
                    inputValues?.content?.length === 0
                      ? 0.5
                      : 1,
                },
              ]}
              onPress={() => {
                if (app_feedbacks_id) {
                  handleUpdateAppFeedback();
                } else {
                  handleCreateAppFeedback();
                }
              }}
              disabled={
                inputValues?.title?.length === 0 ||
                inputValues?.content?.length === 0
              }
            >
              {loading ? (
                <View style={{ width: '100%' }}>
                  <ActivityIndicator size={30} color={theme.screen.text} />
                </View>
              ) : (
                <>
                  <View style={styles.leftView}>
                    <Text
                      style={[
                        styles.linkText,
                        {
                          color: contrastColor,
                          fontSize: windowWidth > 600 ? (isWeb ? 18 : 16) : 16,
                        },
                      ]}
                    >
                      {app_feedbacks_id
                        ? translate(TranslationKeys.to_update)
                        : translate(TranslationKeys.send)}
                    </Text>
                  </View>
                  <View>
                    {app_feedbacks_id ? (
                      <FontAwesome5
                        name='save'
                        size={24}
                        color={contrastColor}
                      />
                    ) : (
                      <MaterialCommunityIcons
                        name='plus'
                        size={24}
                        color={contrastColor}
                      />
                    )}
                  </View>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.section,
              { width: windowWidth > 600 ? '85%' : '100%' },
            ]}
          >
            {!app_feedbacks_id && profile?.id && (
              <View
                style={{
                  ...styles.row,
                  padding: 15,
                  borderRadius: 10,
                  backgroundColor: theme.screen.iconBg,
                }}
              >
                <View style={styles.leftView}>
                  <Text
                    style={[
                      styles.linkText,
                      {
                        color: theme.screen.text,
                        fontSize: windowWidth > 600 ? (isWeb ? 18 : 16) : 16,
                      },
                    ]}
                  >
                    Profile ID
                  </Text>
                </View>

                <View style={{ maxWidth: '70%' }}>
                  <Text
                    style={[
                      styles.linkText,
                      {
                        color: theme.screen.text,
                        fontSize: windowWidth > 600 ? (isWeb ? 18 : 16) : 16,
                      },
                    ]}
                  >
                    {profile?.id}
                  </Text>
                </View>
              </View>
            )}

            {app_feedbacks_id && inputValues?.profile && (
              <View
                style={{
                  ...styles.row,
                  padding: 15,
                  borderRadius: 10,
                  backgroundColor: theme.screen.iconBg,
                }}
              >
                <View style={styles.leftView}>
                  <Text
                    style={[
                      styles.linkText,
                      {
                        color: theme.screen.text,
                        fontSize: windowWidth > 600 ? (isWeb ? 18 : 16) : 16,
                      },
                    ]}
                  >
                    Profile ID
                  </Text>
                </View>

                <View style={{ maxWidth: '70%' }}>
                  <Text
                    style={[
                      styles.linkText,
                      {
                        color: theme.screen.text,
                        fontSize: windowWidth > 600 ? (isWeb ? 18 : 16) : 16,
                      },
                    ]}
                  >
                    {inputValues?.profile}
                  </Text>
                </View>
              </View>
            )}
            {deviceData.map((item, index) => (
              <TouchableOpacity key={index}>
                <FeedbackItem
                  key={index}
                  title={item.title}
                  value={
                    item?.key === 'device_brand'
                      ? inputValues[item.key]
                        ? inputValues[item.key]
                        : translate(TranslationKeys.unknown)
                      : inputValues[item.key] || ''
                  }
                  theme={theme}
                  windowWidth={windowWidth}
                  onPress={() => openModal(item.key, item.title)}
                />
              </TouchableOpacity>
            ))}

            {errorJson && (
              <Text style={{ color: 'red', marginVertical: 10 }}>
                {errorJson}
              </Text>
            )}
            {errorMessage && (
              <Text style={{ color: 'red', marginBottom: 10 }}>
                {errorMessage}
              </Text>
            )}
          </View>

          <ModalComponent
            isVisible={isModalVisible}
            title={selectedTitle}
            onClose={closeModal}
            onSave={() => {
              closeModal();
            }}
          >
            <TextInput
              style={{
                ...styles.input,
                color: 'black',
                backgroundColor: '#fff',
                borderWidth: 1,
                height: selectedTitle === 'feedback' ? 150 : 60,
                textAlignVertical: 'top',
              }}
              value={inputValues[selectedKey] || ''}
              onChangeText={(text) => handleInputChange(selectedKey, text)}
              multiline={true}
              numberOfLines={selectedTitle === 'feedback' ? 4 : 1}
            />
          </ModalComponent>
        </View>
      </ScrollView>
    </View>
  );
};

export default FeedbackScreen;
