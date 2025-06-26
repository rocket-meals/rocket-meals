import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import LottieView from 'lottie-react-native';
import {
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { styles } from './styles';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { useDispatch, useSelector } from 'react-redux';
import { formatPrice, showFormatedPrice } from '@/constants/HelperFunctions';
import { format } from 'date-fns';
import useMyCardReader, { MyCardReaderInterface } from './MyCardReader';
import { isWeb } from '@/constants/Constants';
import CardResponse from '@/helper/nfcCardReaderHelper/CardResponse';
import BaseBottomSheet from '@/components/BaseBottomSheet';
import type BottomSheet from '@gorhom/bottom-sheet';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { useFocusEffect } from 'expo-router';
import { AntDesign } from '@expo/vector-icons';
import useToast from '@/hooks/useToast';
import { UPDATE_PROFILE } from '@/redux/Types/types';
import { getTextFromTranslation } from '@/helper/resourceHelper';
import { replaceLottieColors } from '@/helper/animationHelper';
import moneyConfused from '@/assets/animations/accountBalance/moneyConfused.json';
import moneyFitness from '@/assets/animations/accountBalance/moneyFitness.json';
import moneySad from '@/assets/animations/accountBalance/moneySad.json';
import moneyConfident from '@/assets/animations/accountBalance/moneyConfident.json';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import CustomMarkdown from '@/components/CustomMarkdown/CustomMarkdown';
import { RootState } from '@/redux/reducer';

enum BalanceStateLowerBound {
  CONFIDENT = 10,
  FITNESS = 3,
  SAD = 0,
  CONFUSED = -0.01,
}

const AccountBalanceScreen = () => {
  useSetPageTitle(TranslationKeys.accountbalance);
  const toast = useToast();
  const { theme } = useTheme();
  const { translate } = useLanguage();
  const dispatch = useDispatch();
  const { profile } = useSelector((state: RootState) => state.authReducer);
  const { appSettings, language, primaryColor } = useSelector(
    (state: RootState) => state.settings
  );
  const balance_area_color = appSettings?.balance_area_color
    ? appSettings?.balance_area_color
    : primaryColor;
  const [isNfcSupported, setIsNfcSupported] = useState(false);
  const [isNfcEnabled, setIsNfcEnabled] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [autoPlay, setAutoPlay] = useState(appSettings?.animations_auto_start);
  const animationRef = useRef<LottieView>(null);
  const nfcSheetRef = useRef<BottomSheet>(null);
  const [windowWidth, setWindowWidth] = useState(
    Dimensions.get('window').width
  );
  const [animationJson, setAmimationJson] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      if (profile?.credit_balance) {
        if (
          Number(profile?.credit_balance) >= BalanceStateLowerBound.CONFIDENT
        ) {
          setAmimationJson(
            replaceLottieColors(moneyConfident, balance_area_color)
          );
        } else if (
          Number(profile?.credit_balance) >= BalanceStateLowerBound.FITNESS
        ) {
          setAmimationJson(
            replaceLottieColors(moneyFitness, balance_area_color)
          );
        } else if (
          Number(profile?.credit_balance) >= BalanceStateLowerBound.SAD
        ) {
          setAmimationJson(replaceLottieColors(moneySad, balance_area_color));
        }
      } else {
        setAmimationJson(
          replaceLottieColors(moneyConfused, balance_area_color)
        );
      }
      return () => {
        setAmimationJson(null);
      };
    }, [profile?.credit_balance])
  );

  let myCardReader: MyCardReaderInterface = useMyCardReader();

  let callBack = async (answer: CardResponse | undefined) => {
    if (!answer) {
      return;
    }

    const nextBalanceAsString = answer.currentBalance;
    const nextBalanceDefined =
      nextBalanceAsString !== null && nextBalanceAsString !== undefined;

    const lastTransactionAsString = answer.lastTransaction;
    const lastTransactionDefined =
      lastTransactionAsString !== null && lastTransactionAsString !== undefined;

    dispatch({
      type: UPDATE_PROFILE,
      payload: {
        credit_balance: nextBalanceDefined
          ? parseFloat(nextBalanceAsString)
          : null,
        credit_balance_last_transaction: lastTransactionDefined
          ? parseFloat(lastTransactionAsString)
          : null,
        credit_balance_date_updated: answer?.readTime?.toISOString(),
      },
    });
  };

  const showInstruction = () => {
    nfcSheetRef.current?.expand();
  };

  const hideInstruction = () => {
    nfcSheetRef?.current?.close();
  };

  const onReadNfcPress = async () => {
    await myCardReader.readCard(
      callBack,
      showInstruction,
      hideInstruction,
      translate(TranslationKeys.nfcInstructionRead)
    );
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

  useFocusEffect(
    useCallback(() => {
      setIsActive(true);
      return () => {
        setIsActive(false);
      };
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      const checkNfcStatus = async () => {
        try {
          const nfcAvailable = await myCardReader.isNfcSupported();
          setIsNfcSupported(nfcAvailable);

          const nfcEnabled = await myCardReader.isNfcEnabled();
          setIsNfcEnabled(nfcEnabled);
        } catch (error) {
          console.error('Error checking NFC status:', error);
        }
      };

      checkNfcStatus();
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
          source={animationJson ? animationJson : {}}
          resizeMode='contain'
          style={{ width: '100%', height: '100%' }}
          autoPlay={autoPlay}
          loop={false}
        />
      );
    }
  }, [autoPlay, animationJson]);

  return (
    <ScrollView
      style={{ ...styles.container, backgroundColor: theme.screen.background }}
      contentContainerStyle={{ alignItems: 'center' }}
    >
      <View style={styles.imageContainer}>{renderLottie}</View>

      {/* Account Balance Info */}

      <Text style={{ ...styles.balanceTitle, color: theme.header.text }}>
        {translate(TranslationKeys.accountbalance)}
      </Text>
      <Text style={{ ...styles.balance, color: theme.header.text }}>
        {profile?.credit_balance
          ? showFormatedPrice(formatPrice(profile?.credit_balance))
          : '? €'}
      </Text>
      {(isWeb || !isNfcSupported) && (
        <Text style={{ ...styles.subText, color: theme.header.text }}>
          {translate(TranslationKeys.nfcNotSupported)}
        </Text>
      )}
      {!isWeb && isNfcEnabled && isNfcSupported && (
        <TouchableOpacity
          style={{ ...styles.nfcButton, borderColor: theme.screen.iconBg }}
          onPress={async () => {
            try {
              await onReadNfcPress();
            } catch (e: any) {
              toast(`${JSON.stringify(e)}`, 'error');
              console.error('Error', JSON.stringify(e));
            }
          }}
        >
          <MaterialCommunityIcons
            name='credit-card-wireless-outline'
            size={24}
            color={theme.screen.icon}
          />
          <Text style={{ ...styles.nfcLabel, color: theme.screen.text }}>
            {translate(TranslationKeys.nfcReadCard)}
          </Text>
        </TouchableOpacity>
      )}
      {isNfcSupported && !isNfcEnabled && (
        <TouchableOpacity
          style={{ ...styles.nfcButton, borderColor: theme.screen.iconBg }}
          onPress={() => Linking.openSettings()} // Open NFC settings
        >
          <MaterialCommunityIcons
            name='nfc'
            size={24}
            color={theme.screen.icon}
          />
          <Text style={{ ...styles.nfcLabel, color: theme.screen.text }}>
            {translate(TranslationKeys.pleaseEnableNFC)}
          </Text>
        </TouchableOpacity>
      )}

      {/* Additional Information */}
      <View
        style={[
          styles.infoContainer,
          { width: windowWidth > 600 ? '90%' : '100%' },
        ]}
      >
        <View style={styles.infoRow}>
          <View style={styles.iconLabelContainer}>
            <MaterialCommunityIcons
              name='credit-card'
              size={24}
              color={theme.screen.icon}
              style={styles.icon}
            />
            <Text style={{ ...styles.label, color: theme.header.text }}>
              {translate(TranslationKeys.accountbalance)}
            </Text>
          </View>

          <Text style={{ ...styles.value, color: theme.header.text }}>
            {profile?.credit_balance
              ? showFormatedPrice(formatPrice(profile?.credit_balance))
              : '? €'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <View style={styles.iconLabelContainer}>
            <MaterialCommunityIcons
              name='transfer'
              size={24}
              color={theme.screen.icon}
              style={styles.icon}
            />
            <Text style={{ ...styles.label, color: theme.header.text }}>
              {translate(TranslationKeys.accountbalanceLastTransaction)}
            </Text>
          </View>
          <Text style={{ ...styles.value, color: theme.header.text }}>
            {profile?.credit_balance_last_transaction
              ? showFormatedPrice(
                  formatPrice(profile?.credit_balance_last_transaction)
                )
              : '? €'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <View style={styles.iconLabelContainer}>
            <FontAwesome5
              name='calendar-alt'
              size={24}
              color={theme.screen.icon}
              style={styles.icon}
            />
            <Text style={{ ...styles.label, color: theme.header.text }}>
              {translate(TranslationKeys.accountbalanceDateUpdated)}
            </Text>
          </View>
          <Text style={{ ...styles.value, color: theme.header.text }}>
            {profile?.credit_balance_date_updated
              ? format(profile?.credit_balance_date_updated, 'dd.MM.yyyy HH:mm')
              : ''}
          </Text>
        </View>
        <View style={styles.additionalInfoContainer}>
          {appSettings && appSettings?.balance_translations && (
            <CustomMarkdown
              content={
                getTextFromTranslation(
                  appSettings?.balance_translations,
                  language
                ) || ''
              }
              backgroundColor={balance_area_color}
              imageWidth={'100%'}
              imageHeight={400}
            />
          )}
        </View>
      </View>
      {isActive && (
        <BaseBottomSheet
          ref={nfcSheetRef}
          index={-1}
          backgroundStyle={{
            ...styles.sheetBackground,
            backgroundColor: theme.sheet.sheetBg,
          }}
          enablePanDownToClose
          handleComponent={null}
          onClose={hideInstruction}
        >
          <BottomSheetView>
            <View
              style={{
                ...styles.sheetHeader,
              }}
            >
              <View />
              <Text
                style={{
                  ...styles.sheetHeading,
                  fontSize: 28,
                  color: theme.sheet.text,
                }}
              >
                NFC
              </Text>
            </View>
            <View style={styles.sheetView}>
              <Text
                style={{
                  ...styles.nfcInstructionRead,
                  color: theme.screen.text,
                }}
              >
                {translate(TranslationKeys.nfcInstructionRead)}
              </Text>
              <View
                style={{
                  width: 400,
                  height: 400,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <LottieView
                  source={require('@/assets/gifs/nfc.json')}
                  resizeMode='contain'
                  style={{ width: '100%', height: '100%' }}
                  autoPlay
                  loop
                />
              </View>
            </View>
          </BottomSheetView>
        </BaseBottomSheet>
      )}
    </ScrollView>
  );
};

export default AccountBalanceScreen;
