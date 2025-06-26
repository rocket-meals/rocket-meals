import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useTheme } from '@/hooks/useTheme';
import styles from './styles';
import { NotificationSheetProps } from './types';
import { useDispatch, useSelector } from 'react-redux';
import usePlatformHelper from '@/helper/platformHelper';
import { FoodFeedbackHelper } from '@/redux/actions/FoodFeedbacks/FoodFeedbacks';
import {
  DELETE_FOOD_FEEDBACK_LOCAL,
  UPDATE_FOOD_FEEDBACK_LOCAL,
} from '@/redux/Types/types';
import { useLanguage } from '@/hooks/useLanguage';
import animation from '@/assets/animations/notificationBell.json';
import LottieView from 'lottie-react-native';
import { useFocusEffect } from 'expo-router';
import { replaceLottieColors } from '@/helper/animationHelper';
import { myContrastColor } from '@/helper/colorHelper';
import { TranslationKeys } from '@/locales/keys';
import { FoodsFeedbacks } from '@/constants/types';
import { RootState } from '@/redux/reducer';

const NotificationSheet: React.FC<NotificationSheetProps> = ({
  closeSheet,
  previousFeedback,
  foodDetails,
}) => {
  const { theme } = useTheme();
  const { translate } = useLanguage();
  const dispatch = useDispatch();
  const foodfeedbackHelper = new FoodFeedbackHelper();
  const {
    primaryColor,
    appSettings,
    selectedTheme: mode,
  } = useSelector((state: RootState) => state.settings);
  const { profile } = useSelector((state: RootState) => state.authReducer);
  const { isWeb } = usePlatformHelper();
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get('window').width
  );
  const [autoPlay, setAutoPlay] = useState(appSettings?.animations_auto_start);
  const animationRef = useRef<LottieView>(null);
  const [animationJson, setAmimationJson] = useState<any>(null);
  const foods_area_color = appSettings?.foods_area_color
    ? appSettings?.foods_area_color
    : primaryColor;
  const contrastColor = myContrastColor(
    foods_area_color,
    theme,
    mode === 'dark'
  );
  useFocusEffect(
    useCallback(() => {
      setAmimationJson(replaceLottieColors(animation, foods_area_color));
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

  const updateFoodFeedbackNotification = async () => {
    try {
      const payload = {
        ...previousFeedback,
        notify: !previousFeedback?.notify,
      };
      const updateFeedbackResult = (await foodfeedbackHelper.updateFoodFeedback(
        foodDetails?.id,
        profile?.id,
        payload
      )) as FoodsFeedbacks;
      if (updateFeedbackResult?.id) {
        dispatch({
          type: UPDATE_FOOD_FEEDBACK_LOCAL,
          payload: updateFeedbackResult,
        });
      } else {
        dispatch({
          type: DELETE_FOOD_FEEDBACK_LOCAL,
          payload: previousFeedback?.id,
        });
      }
      closeSheet();
    } catch (e) {
      console.error('Error creating feedback:', e);
      closeSheet();
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(Dimensions.get('window').width);
    };

    const subscription = Dimensions.addEventListener('change', handleResize);

    return () => subscription?.remove();
  }, []);
  return (
    <BottomSheetScrollView
      style={{ ...styles.sheetView, backgroundColor: theme.sheet.sheetBg }}
      contentContainerStyle={styles.contentContainer}
    >
      <View
        style={{
          ...styles.sheetHeader,
          paddingRight: isWeb() ? 10 : 0,
          paddingTop: isWeb() ? 10 : 0,
        }}
      >
        <View />
        <Text
          style={{
            ...styles.sheetHeading,
            fontSize: isWeb() ? (screenWidth > 800 ? 40 : 28) : 28,
            color: theme.sheet.text,
          }}
        >
          {translate(TranslationKeys.notification)}
        </Text>
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.gifContainer}>{renderLottie}</View>
        <Text
          style={{
            ...styles.body,
            color: theme.screen.text,
            fontSize: isWeb() ? (screenWidth > 800 ? 18 : 16) : 16,
          }}
        >
          {translate(
            TranslationKeys.notification_please_notify_me_on_my_smartphones_if_they_allow_to_be_notified
          )}
        </Text>
        <TouchableOpacity
          style={{ ...styles.button, backgroundColor: foods_area_color }}
          onPress={updateFoodFeedbackNotification}
        >
          <Text style={{ ...styles.buttonLabel, color: contrastColor }}>
            {translate(TranslationKeys.confirm)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ ...styles.cancelButton, borderColor: foods_area_color }}
          onPress={closeSheet}
        >
          <Text style={{ ...styles.buttonLabel, color: theme.screen.text }}>
            {translate(TranslationKeys.cancel)}
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheetScrollView>
  );
};

export default NotificationSheet;
