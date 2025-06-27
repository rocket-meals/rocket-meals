import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ScrollView,
  Dimensions,
  View,
  Image,
  Platform,
  Linking,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import AppButton from '@/components/AppButton';
import { useTheme } from '@/hooks/useTheme';
import { router, useFocusEffect } from 'expo-router';
import SupportFAQ from '../../../components/SupportFAQ/SupportFAQ';
import styles from './styles';
import { useLanguage } from '@/hooks/useLanguage';
import useToast from '@/hooks/useToast';
import { useDispatch, useSelector } from 'react-redux';
import animation from '@/assets/animations/astronaut-computer.json';
import LottieView from 'lottie-react-native';
import { replaceLottieColors } from '@/helper/animationHelper';
import { AntDesign, MaterialCommunityIcons } from '@expo/vector-icons';
import { isWeb } from '@/constants/Constants';
import ModalComponent from '@/components/ModalSetting/ModalComponent';
import { deleteProfileRemote } from '@/redux/actions/Profile/Profile';
import { performLogout } from '@/helper/logoutHelper';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';

const index = () => {
  const { translate } = useLanguage();
  const { theme } = useTheme();
  const toast = useToast();
  const dispatch = useDispatch();
  const { profile, user } = useSelector(
    (state: RootState) => state.authReducer
  );
  const [projectName, setProjectName] = useState('');
  const [windowWidth, setWindowWidth] = useState(
    Dimensions.get('window').width
  );
  const { serverInfo, appSettings, primaryColor } = useSelector(
    (state: RootState) => state.settings
  );
  const [animationJson, setAmimationJson] = useState<any>(null);
  const [autoPlay, setAutoPlay] = useState(appSettings?.animations_auto_start);
  const animationRef = useRef<LottieView>(null);
  const [isDeleteAccount, setIsDeleteAccount] = useState(false);
  const [loading, setLoading] = useState(false);

  const openDeleteAcountModal = () => {
    setIsDeleteAccount(true);
  };
  const closeDeleteAccountModal = () => {
    setIsDeleteAccount(false);
  };
  useFocusEffect(
    useCallback(() => {
      setAmimationJson(replaceLottieColors(animation, primaryColor));
      return () => {
        setAmimationJson(null);
      };
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      setAutoPlay(appSettings?.animations_auto_start); // Enable when entering

      return () => {
        setAutoPlay(false); // Reset when leaving
        setAmimationJson(null);
      };
    }, [appSettings?.animations_auto_start])
  );

  useEffect(() => {
    if (animationJson && autoPlay && animationRef.current) {
      animationRef?.current?.play(); // Reset animation to ensure it starts fresh
    }
  }, [animationJson, autoPlay]);

  const renderLottie = useMemo(() => {
    if (animationJson) {
      return (
        <LottieView
          ref={animationRef}
          source={animationJson}
          resizeMode='contain'
          style={{ width: '100%', height: '100%' }}
          autoPlay={autoPlay}
          loop={false}
        />
      );
    }
  }, [autoPlay, animationJson]);

  useEffect(() => {
    if (serverInfo && serverInfo?.info) {
      setProjectName(serverInfo?.info?.project?.project_name);
    }
  }, [serverInfo]);

  useEffect(() => {
    const onChange = ({ window }: { window: any }) => {
      setWindowWidth(window.width);
    };

    const subscription = Dimensions.addEventListener('change', onChange);
    return () => {
      subscription.remove();
    };
  }, []);

  const openInBrowser = async (url: string) => {
    try {
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        const supported = await Linking.canOpenURL(url);

        if (supported) {
          await Linking.openURL(url);
        } else {
          toast(`Cannot open URL: ${url}`, 'error');
        }
      }
    } catch (error) {
      console.error('An error occurred:', error);
    }
  };

  const handleDeleteAccount = async () => {
    if (profile?.id) {
      setLoading(true);
      await deleteProfileRemote(profile.id);
      await performLogout(dispatch, router);
      setLoading(false);
    } else {
      setLoading(false);
    }
  };

  return (
    <View
      style={{
        ...styles.container,
        backgroundColor: theme.screen.background,
      }}
    >
      <ScrollView>
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <View style={styles.imageContainer}>{renderLottie}</View>
          <View style={{ width: windowWidth > 600 ? '85%' : '95%' }}>
            <Text style={{ ...styles.deleteInfo, color: theme.screen.text }}>
              {translate(TranslationKeys.account_deletion_info)}
            </Text>
          </View>
          <View
            style={[
              styles.section,
              { width: windowWidth > 600 ? '85%' : '95%' },
            ]}
          >
            <View
              style={{
                ...styles.list,
                backgroundColor: theme.screen.iconBg,
                paddingHorizontal: isWeb ? 20 : 10,
              }}
            >
              <View style={{ ...styles.col }}>
                <MaterialCommunityIcons
                  name='clipboard-account'
                  size={24}
                  color={theme.screen.icon}
                />
                <Text style={{ ...styles.label, color: theme.screen.text }}>
                  {translate(TranslationKeys.account)}
                </Text>
              </View>
              <View style={{ ...styles.col, maxWidth: '60%' }}>
                <Text
                  style={{
                    ...styles.value,
                    color: theme.screen.text,
                    fontSize: isWeb ? 16 : 14,
                    textAlign: 'right',
                  }}
                >
                  {user?.id
                    ? user?.id
                    : translate(TranslationKeys.without_account)}
                </Text>
              </View>
            </View>
          </View>
          <View
            style={[
              styles.section,
              { width: windowWidth > 600 ? '85%' : '95%' },
            ]}
          >
            <TouchableOpacity
              style={{
                ...styles.list,
                backgroundColor: theme.screen.iconBg,
                paddingHorizontal: isWeb ? 20 : 10,
              }}
              onPress={openDeleteAcountModal}
              disabled={!profile?.id}
            >
              <View style={{ ...styles.col }}>
                <AntDesign
                  name='deleteuser'
                  size={24}
                  color={theme.screen.icon}
                />
                <Text style={{ ...styles.label, color: theme.screen.text }}>
                  {translate(TranslationKeys.account_delete)}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.section,
              { width: windowWidth > 600 ? '85%' : '95%' },
            ]}
          >
            <View
              style={{ ...styles.row, backgroundColor: theme.screen.iconBg }}
            >
              <View style={styles.leftView}>
                <Text
                  style={[
                    styles.linkText,
                    {
                      color: theme.screen.text,
                      fontSize: windowWidth < 500 ? 14 : 18,
                    },
                  ]}
                >
                  {translate(TranslationKeys.project_name)}
                </Text>
              </View>
              <View style={styles.textIcon}>
                <Text
                  style={[
                    styles.iconText,
                    {
                      color: theme.screen.text,
                      fontSize: windowWidth < 500 ? 14 : 18,
                    },
                  ]}
                >
                  {projectName?.length > 0 ? projectName : 'SWOSY Test'}
                </Text>
              </View>
            </View>

            <SupportFAQ
              label={translate(TranslationKeys.developer)}
              isArrowRight={false}
              text='Baumgartner Software UG'
              onPress={() => {
                openInBrowser('https://baumgartner-software.de/homepage/');
              }}
            />
            <SupportFAQ
              label={translate(TranslationKeys.software_name)}
              text='Rocket Meals'
              isArrowRight={false}
              onPress={() => {
                openInBrowser('https://rocket-meals.de/homepage/');
              }}
            />
          </View>
        </View>
      </ScrollView>
      <ModalComponent
        isVisible={isDeleteAccount}
        onClose={closeDeleteAccountModal}
        title={translate(TranslationKeys.attention)}
        onSave={() => {}}
        showButtons={false}
      >
        {/*  delete account */}
        <View style={styles.deleteAccountContent}>
          <View style={styles.gifContainer}>{renderLottie}</View>
          <Text
            style={{
              ...styles.deleteYourAccount,
              color: theme.screen.text,
            }}
          >
            {translate(TranslationKeys.are_you_sure_to_delete_your_account)}
          </Text>
          <View style={styles.attentionActions}>
            <AppButton
              style={[styles.confirmButton, { backgroundColor: primaryColor }]}
              label={
                loading ? '' : translate(TranslationKeys.confirm)
              }
              labelStyle={[styles.confirmLabel, { color: theme.light }]}
              onPress={handleDeleteAccount}
              icon={
                loading ? (
                  <ActivityIndicator size={24} color={theme.screen.text} />
                ) : undefined
              }
              useProjectColor
            />
            <AppButton
              style={styles.cancleButton}
              label={translate(TranslationKeys.cancel)}
              labelStyle={styles.confirmLabel}
              onPress={closeDeleteAccountModal}
            />
          </View>
        </View>
      </ModalComponent>
    </View>
  );
};

export default index;
