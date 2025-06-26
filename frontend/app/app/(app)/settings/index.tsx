import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  ScrollView,
  Text,
  Dimensions,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/hooks/useTheme';
import styles from './styles';
import { Languages, PriceGroupKey } from './types';
import {
  AntDesign,
  Entypo,
  Feather,
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
  Octicons,
} from '@expo/vector-icons';
import { isWeb } from '@/constants/Constants';
import SettingList from '@/components/SettingList/SettingList';
import ModalComponent from '../../../components/ModalSetting/ModalComponent';
import ColorScheme from '../../../components/ColorScheme/ColorScheme';
import DrawerPosition from '../../../components/Drawer/DrawerPosition';
import FirstDayOfWeek from '../../../components/FirstDay/FirstDayOfWeek';
import { router, useFocusEffect } from 'expo-router';
import {
  themes,
  languages,
  drawers,
  AmountColumn,
  days,
} from '../../../constants/SettingData';
import { useDispatch, useSelector } from 'react-redux';
import AmountColumns from '@/components/AmountColumn/AmountColumns';
import { useLanguage } from '@/hooks/useLanguage';
import {
  CLEAR_ANONYMOUSLY,
  CLEAR_APARTMENTS,
  CLEAR_CAMPUSES,
  CLEAR_CANTEENS,
  CLEAR_COLLECTION_DATES_LAST_UPDATED,
  CLEAR_FOODS,
  CLEAR_MANAGEMENT,
  CLEAR_NEWS,
  CLEAR_SETTINGS,
  CLEAR_POPUP_EVENTS_HASH,
  ON_LOGOUT,
  SET_AMOUNT_COLUMNS_FOR_CARDS,
  SET_DRAWER_POSITION,
  SET_FIRST_DAY_OF_THE_WEEK,
  SET_NICKNAME_LOCAL,
  UPDATE_DEVELOPER_MODE,
  UPDATE_MANAGEMENT,
  UPDATE_PROFILE,
} from '@/redux/Types/types';
import { performLogout } from '@/helper/logoutHelper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BaseBottomSheet from '@/components/BaseBottomSheet';
import type BottomSheet from '@gorhom/bottom-sheet';
import CanteenSelectionSheet from '@/components/CanteenSelectionSheet/CanteenSelectionSheet';
import {
  excerpt,
  formatPrice,
  getImageUrl,
  showFormatedPrice,
} from '@/constants/HelperFunctions';
import { ProfileHelper } from '@/redux/actions/Profile/Profile';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { Profiles } from '@/constants/types';
import { RootState } from '@/redux/reducer';

const Settings = () => {
  useSetPageTitle(TranslationKeys.settings);
  const { theme, setThemeMode } = useTheme();
  const dispatch = useDispatch();
  const canteenSheetRef = useRef<BottomSheet>(null);
  const [isActive, setIsActive] = useState(false);
  const { translate, setLanguageMode, language } = useLanguage();
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);
  const [isNicknameModalVisible, setIsNicknameModalVisible] = useState(false);
  const [nickname, setNickname] = useState<string>('');
  const openModal = () => setIsNicknameModalVisible(true);
  const closeModal = () => setIsNicknameModalVisible(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [isDrawerModalVisible, setIsDrawerModalVisible] = useState(false);
  const [isAmountColumnModal, setIsAmountColumnModal] = useState(false);
  const [isFirstDayModalVisible, setIsFirstDayModalVisible] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [isColorSchemeModalVisible, setIsColorSchemeModalVisible] =
    useState(false);
  const {
    user,
    profile,
    termsAndPrivacyConsentAcceptedDate,
    isManagement,
    isDevMode,
  } = useSelector((state: RootState) => state.authReducer);

  const {
    primaryColor,
    drawerPosition,
    selectedTheme,
    nickNameLocal,
    firstDayOfTheWeek,
    amountColumnsForcard,
    serverInfo,
  } = useSelector((state: RootState) => state.settings);
  const { selectedCanteen } = useSelector(
    (state: RootState) => state.canteenReducer
  );
  const [windowWidth, setWindowWidth] = useState(
    Dimensions.get('window').width
  );
  const profileHelper = useMemo(() => new ProfileHelper(), []);

  const languageCode = language;

  const languageName = Languages[languageCode as keyof typeof Languages];

  const saveNickname = async () => {
    if (user?.id) {
      const result = (await profileHelper.updateProfile({
        ...profile,
        nickname: nickname?.trim(),
      })) as Profiles;
      if (result) {
        dispatch({
          type: UPDATE_PROFILE,
          payload: result,
        });
      }
    } else {
      dispatch({
        type: SET_NICKNAME_LOCAL,
        payload: nickname?.trim(),
      });
    }
    closeModal();
  };

  useFocusEffect(
    useCallback(() => {
      setIsActive(true);
      return () => {
        setIsActive(false);
      };
    }, [])
  );

  useEffect(() => {
    const onChange = ({ window }: { window: any }) => {
      setWindowWidth(window.width);
    };

    const subscription = Dimensions.addEventListener('change', onChange);
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    setSelectedLanguage(language);
  }, [language]);

  const saveLanguage = () => {
    closeModal();
  };

  const openLanguageModal = () => {
    setIsLanguageModalVisible(true);
  };

  const closeLanguageModal = () => {
    setIsLanguageModalVisible(false);
  };

  // ColorScheme

  const saveColorSheme = () => {
    closeModal();
  };

  const openColorschemeModal = () => {
    setIsColorSchemeModalVisible(true);
  };

  const closeColorschemeModal = () => {
    setIsColorSchemeModalVisible(false);
  };

  // Drawer Position

  const saveDrawer = () => {
    closeModal();
  };

  const openDrawerModal = () => {
    setIsDrawerModalVisible(true);
  };

  const closeDrawerModal = () => {
    setIsDrawerModalVisible(false);
  };

  // Amount Column Card

  const saveAmount = () => {
    closeModal();
  };

  const openAmountColumnModal = () => {
    setIsAmountColumnModal(true);
  };

  const closeAmountColumnModal = () => {
    setIsAmountColumnModal(false);
  };

  // first day of week

  const saveFirstDay = () => {
    closeModal();
  };

  const openFirstDayModal = () => {
    setIsFirstDayModalVisible(true);
  };

  const closeFirstDayModal = () => {
    setIsFirstDayModalVisible(false);
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

  const handleDrawerPosition = (position: string) => {
    dispatch({
      type: SET_DRAWER_POSITION,
      payload: position,
    });
    closeDrawerModal();
  };

  const handleTheme = (theme: any) => {
    setThemeMode(theme);
  };

  const handleLogout = async () => {
    await performLogout(dispatch, router);
  };

  const handleLogin = () => {
    performLogout(dispatch, router, true);
  };

  const openCanteenSheet = () => {
    canteenSheetRef?.current?.expand();
  };

  const closeCanteenSheet = () => {
    canteenSheetRef?.current?.close();
  };

  const handleDeleteAccount = async () => {
    router.navigate('/(user)/delete-user');
  };

  const priceGroups: Record<PriceGroupKey, { label: string }> = {
    student: {
      label: translate(TranslationKeys.price_group_student),
    },
    employee: {
      label: translate(TranslationKeys.price_group_employee),
    },
    guest: {
      label: translate(TranslationKeys.price_group_guest),
    },
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.screen.background }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          ...styles.contentContainer,
          backgroundColor: theme.screen.background,
        }}
      >
        <View
          style={{
            ...styles.settingContainer,
            width: windowWidth < 500 ? '100%' : isWeb ? '80%' : '100%',
          }}
        >
          {/* Account */}

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
          {/* NickName */}
          <ModalComponent
            isVisible={isNicknameModalVisible}
            onClose={closeModal}
            onSave={saveNickname}
            disableSave={disabled}
            title={translate(TranslationKeys.nickname)}
          >
            {/* Custom Content */}
            <TextInput
              style={{
                ...styles.input,
                color: 'black',
                backgroundColor: '#fff',
                borderWidth: 1,
              }}
              placeholder={translate(TranslationKeys.nickname)}
              value={nickname?.trim()}
              onChangeText={(text) => {
                setNickname(text);
                if (text === profile?.nickname) {
                  setDisabled(true);
                } else {
                  setDisabled(false);
                }
              }}
            />
          </ModalComponent>
          {/* </View> */}
          <SettingList
            leftIcon={
              <MaterialCommunityIcons
                name='account'
                size={24}
                color={theme.screen.icon}
              />
            }
            label={translate(TranslationKeys.nickname)}
            value={profile?.id ? profile?.nickname : nickNameLocal}
            rightIcon={
              <MaterialCommunityIcons
                name='pencil'
                size={24}
                color={theme.screen.icon}
              />
            }
            handleFunction={() => {
              openModal();
              setNickname(profile?.id ? profile?.nickname : nickNameLocal);
              if (profile?.nickname === nickname) {
                setDisabled(true);
              } else {
                setDisabled(false);
              }
            }}
          />
          {/* Language */}
          <ModalComponent
            isVisible={isLanguageModalVisible}
            onClose={closeLanguageModal}
            title={translate(TranslationKeys.language)}
            onSave={saveLanguage}
            showButtons={false}
          >
            <View style={styles.languageContainer}>
              {languages.map((language, index) => (
                <TouchableOpacity
                  key={index}
                  style={{
                    ...styles.languageRow,
                    paddingHorizontal: isWeb ? 20 : 10,

                    backgroundColor:
                      selectedLanguage === language.value
                        ? primaryColor
                        : theme.screen.iconBg,
                  }}
                  onPress={() => {
                    changeLanguage(language);
                  }}
                >
                  <Image
                    source={language.flag}
                    style={styles.flagIcon}
                    cachePolicy={'memory-disk'}
                    transition={500}
                    contentFit='cover'
                  />
                  <Text
                    style={{
                      ...styles.languageText,
                      color:
                        selectedLanguage === language.value
                          ? theme.activeText
                          : theme.screen.text,
                    }}
                  >
                    {language.label}
                  </Text>

                  {/* Radio Button */}
                  <MaterialCommunityIcons
                    name={
                      selectedLanguage === language.value
                        ? 'checkbox-marked'
                        : 'checkbox-blank'
                    }
                    size={24}
                    color={
                      selectedLanguage === language.value
                        ? '#ffffff'
                        : '#ffffff'
                    }
                    style={styles.radioButton}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </ModalComponent>
          <SettingList
            leftIcon={
              <Ionicons name='language' size={24} color={theme.screen.icon} />
            }
            label={translate(TranslationKeys.language)}
            value={languageName}
            rightIcon={
              <MaterialCommunityIcons
                name='pencil'
                size={20}
                color={theme.screen.icon}
              />
            }
            handleFunction={() => openLanguageModal()}
          />
          {/* Canteen */}
          <SettingList
            leftIcon={
              <MaterialIcons
                name='restaurant-menu'
                size={24}
                color={theme.screen.icon}
              />
            }
            label={translate(TranslationKeys.canteen)}
            value={excerpt(String(selectedCanteen?.alias), 30)}
            rightIcon={
              <MaterialCommunityIcons
                name='pencil'
                size={20}
                color={theme.screen.icon}
              />
            }
            handleFunction={openCanteenSheet}
          />
          <SettingList
            leftIcon={
              <Ionicons
                name='bag-add-sharp'
                size={24}
                color={theme.screen.icon}
              />
            }
            label={translate(TranslationKeys.eating_habits)}
            rightIcon={
              <Octicons
                name='chevron-right'
                size={24}
                color={theme.screen.icon}
              />
            }
            handleFunction={() => router.navigate('/eating-habits')}
          />
          <SettingList
            leftIcon={
              <MaterialIcons name='euro' size={24} color={theme.screen.icon} />
            }
            label={translate(TranslationKeys.price_group)}
            value={
              profile?.price_group &&
              priceGroups[profile.price_group as PriceGroupKey]
                ? priceGroups[profile.price_group as PriceGroupKey].label
                : ''
            }
            rightIcon={
              <Octicons
                name='chevron-right'
                size={24}
                color={theme.screen.icon}
              />
            }
            handleFunction={() => router.navigate('/price-group')}
          />
          <SettingList
            leftIcon={
              <Ionicons name='card' size={24} color={theme.screen.icon} />
            }
            label={translate(TranslationKeys.accountbalance)}
            value={
              profile?.credit_balance
                ? showFormatedPrice(formatPrice(profile?.credit_balance))
                : '€'
            }
            rightIcon={
              <Octicons
                name='chevron-right'
                size={24}
                color={theme.screen.icon}
              />
            }
            handleFunction={() => router.navigate('/account-balance')}
          />
          <SettingList
            leftIcon={
              <Ionicons
                name='notifications'
                size={24}
                color={theme.screen.icon}
              />
            }
            label={translate(TranslationKeys.notification)}
            rightIcon={
              <Octicons
                name='chevron-right'
                size={24}
                color={theme.screen.icon}
              />
            }
            handleFunction={() => router.navigate('/notification')}
          />
          {/* color Scheme */}
          <ModalComponent
            isVisible={isColorSchemeModalVisible}
            onClose={closeColorschemeModal}
            title={translate(TranslationKeys.color_scheme)}
            onSave={saveColorSheme}
            showButtons={false}
          >
            <View style={styles.languageContainer}>
              {themes.map((theme) => (
                <ColorScheme
                  key={theme.id}
                  theme={theme}
                  isSelected={selectedTheme === theme.id}
                  onPress={() => {
                    closeColorschemeModal();
                    handleTheme(theme.id);
                  }}
                />
              ))}
            </View>
          </ModalComponent>
          <SettingList
            leftIcon={
              <MaterialCommunityIcons
                name='theme-light-dark'
                size={24}
                color={theme.screen.icon}
              />
            }
            label={translate(TranslationKeys.color_scheme)}
            value={
              selectedTheme === 'systematic'
                ? translate(TranslationKeys.color_scheme_system)
                : selectedTheme === 'dark'
                ? translate(TranslationKeys.color_scheme_dark)
                : translate(TranslationKeys.color_scheme_light)
            }
            rightIcon={
              <Octicons
                name='chevron-right'
                size={24}
                color={theme.screen.icon}
              />
            }
            handleFunction={() => openColorschemeModal()}
          />

          <ModalComponent
            isVisible={isDrawerModalVisible}
            onClose={closeDrawerModal}
            title={translate(TranslationKeys.drawer_config_position)}
            onSave={saveDrawer}
            showButtons={false}
          >
            <View style={styles.languageContainer}>
              {drawers.map((drawer) => (
                <DrawerPosition
                  key={drawer.id}
                  position={drawer}
                  isSelected={drawerPosition === drawer.id}
                  onPress={() => {
                    handleDrawerPosition(drawer.id);
                  }}
                />
              ))}
            </View>
          </ModalComponent>

          <SettingList
            leftIcon={
              <Entypo name='menu' size={24} color={theme.screen.icon} />
            }
            label={translate(TranslationKeys.drawer_config_position)}
            value={translate(TranslationKeys.drawer_config_position_system)}
            rightIcon={
              <Octicons
                name='chevron-right'
                size={24}
                color={theme.screen.icon}
              />
            }
            handleFunction={() => openDrawerModal()}
          />

          <ModalComponent
            isVisible={isAmountColumnModal}
            onClose={closeAmountColumnModal}
            title={translate(TranslationKeys.amount_columns_for_cards)}
            onSave={saveAmount}
            showButtons={false}
          >
            <ScrollView style={styles.amountOfCardContainer}>
              {AmountColumn.map((column) => (
                <AmountColumns
                  key={column.id}
                  position={column}
                  isSelected={amountColumnsForcard === column.id}
                  onPress={() => {
                    dispatch({
                      type: SET_AMOUNT_COLUMNS_FOR_CARDS,
                      payload: column.id,
                    });
                    closeAmountColumnModal();
                  }}
                />
              ))}
            </ScrollView>
          </ModalComponent>
          <SettingList
            leftIcon={
              <FontAwesome5
                name='columns'
                size={24}
                color={theme.screen.icon}
              />
            }
            label={translate(TranslationKeys.amount_columns_for_cards)}
            value={
              amountColumnsForcard === 0
                ? translate(TranslationKeys.automatic)
                : amountColumnsForcard
            }
            rightIcon={
              <Octicons
                name='chevron-right'
                size={24}
                color={theme.screen.icon}
              />
            }
            handleFunction={() => openAmountColumnModal()}
          />
          <ModalComponent
            isVisible={isFirstDayModalVisible}
            onClose={closeFirstDayModal}
            title={translate(TranslationKeys.first_day_of_week)}
            onSave={saveFirstDay}
            showButtons={false}
          >
            <View style={styles.languageContainer}>
              {days.map((firstDay) => (
                <FirstDayOfWeek
                  key={firstDay.id}
                  position={firstDay}
                  isSelected={firstDayOfTheWeek?.name === firstDay?.name}
                  onPress={() => {
                    dispatch({
                      type: SET_FIRST_DAY_OF_THE_WEEK,
                      payload: { id: firstDay.id, name: firstDay?.name },
                    });
                    closeFirstDayModal();
                  }}
                />
              ))}
            </View>
          </ModalComponent>
          <SettingList
            leftIcon={
              <Feather name='calendar' size={24} color={theme.screen.icon} />
            }
            label={translate(TranslationKeys.first_day_of_week)}
            value={translate(firstDayOfTheWeek?.name)}
            rightIcon={
              <Octicons
                name='chevron-right'
                size={24}
                color={theme.screen.icon}
              />
            }
            handleFunction={() => openFirstDayModal()}
          />
          {user?.id ? (
            <SettingList
              leftIcon={
                <Entypo name='login' size={24} color={theme.screen.icon} />
              }
              label={translate(TranslationKeys.logout)}
              rightIcon={
                <Entypo name='login' size={24} color={theme.screen.icon} />
              }
              handleFunction={handleLogout}
            />
          ) : (
            <SettingList
              leftIcon={
                <Entypo name='login' size={24} color={theme.screen.icon} />
              }
              label={translate(TranslationKeys.sign_in)}
              rightIcon={
                <Entypo name='login' size={24} color={theme.screen.icon} />
              }
              handleFunction={handleLogin}
            />
          )}
          {user?.id && (
            <SettingList
              leftIcon={
                <AntDesign
                  name='deleteuser'
                  size={24}
                  color={theme.screen.icon}
                />
              }
              label={`${translate(TranslationKeys.account_delete)}`}
              rightIcon={
                <Octicons
                  name='chevron-right'
                  size={24}
                  color={theme.screen.icon}
                />
              }
              handleFunction={handleDeleteAccount}
            />
          )}
          <SettingList
            leftIcon={
              <MaterialCommunityIcons
                name='database-eye'
                size={24}
                color={theme.screen.icon}
              />
            }
            label={translate(TranslationKeys.dataAccess)}
            rightIcon={
              <Octicons
                name='chevron-right'
                size={24}
                color={theme.screen.icon}
              />
            }
            handleFunction={() => router.navigate('/data-access')}
          />
          <SettingList
            leftIcon={
              <MaterialIcons
                name='support-agent'
                size={24}
                color={theme.screen.icon}
              />
            }
            label={translate(TranslationKeys.feedback_support_faq)}
            rightIcon={
              <Octicons
                name='chevron-right'
                size={24}
                color={theme.screen.icon}
              />
            }
            handleFunction={() => router.navigate('/support-FAQ')}
          />
          <SettingList
            leftIcon={
              <MaterialCommunityIcons
                name='license'
                size={24}
                color={theme.screen.icon}
              />
            }
            label={translate(TranslationKeys.license_information)}
            rightIcon={
              <Octicons
                name='chevron-right'
                size={24}
                color={theme.screen.icon}
              />
            }
            handleFunction={() => router.navigate('/licenseInformation')}
          />
          {/* Terms & Conditions */}
          <View
            style={{
              ...styles.termList,
              backgroundColor: theme.screen.iconBg,
              paddingHorizontal: isWeb ? 20 : 10,
            }}
          >
            <View style={styles.termRow}>
              <MaterialCommunityIcons
                name='clipboard-account'
                size={24}
                color={theme.screen.icon}
              />
              <Text
                style={{
                  ...styles.label,
                  color: theme.screen.text,
                  fontSize: isWeb ? 16 : 14,
                }}
              >
                {translate(
                  TranslationKeys.terms_and_conditions_accepted_and_privacy_policy_read_at_date
                )}
              </Text>
            </View>
            <View style={styles.termRow2}>
              <Text
                style={{
                  ...styles.value,
                  color: theme.screen.text,
                  fontSize: isWeb ? 16 : 14,
                }}
              >
                {termsAndPrivacyConsentAcceptedDate}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.footer}
            onPress={() => {
              if (isManagement) {
                dispatch({ type: UPDATE_DEVELOPER_MODE, payload: false });
                dispatch({ type: UPDATE_MANAGEMENT, payload: false });
              } else {
                dispatch({ type: UPDATE_DEVELOPER_MODE, payload: true });
                dispatch({ type: UPDATE_MANAGEMENT, payload: true });
              }
            }}
          >
            <View style={styles.logoContainer}>
              <Image
                source={{
                  uri: getImageUrl(serverInfo?.info?.project?.project_logo),
                }}
                style={styles.logo}
              />
            </View>
            <Text style={{ ...styles.heading, color: theme.drawerHeading }}>
              {serverInfo?.info?.project?.project_name || 'SWOSY 2.0'}
            </Text>
          </TouchableOpacity>
          {isManagement && isDevMode && (
            <Text style={{ ...styles.devModeText, color: theme.screen.text }}>
              {translate(TranslationKeys.developerModeActive)}
            </Text>
          )}
        </View>
      </ScrollView>
      {isActive && (
        <BaseBottomSheet
          ref={canteenSheetRef}
          index={-1}
          backgroundStyle={{
            ...styles.sheetBackground,
            backgroundColor: theme.sheet.sheetBg,
          }}
          enablePanDownToClose
          handleComponent={null}
          onClose={closeCanteenSheet}
        >
          <CanteenSelectionSheet closeSheet={closeCanteenSheet} />
        </BaseBottomSheet>
      )}
    </SafeAreaView>
  );
};

export default Settings;
