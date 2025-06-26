import { Text, TouchableOpacity, View } from 'react-native';
import React, { useCallback, useRef, useState } from 'react';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { useTheme } from '@/hooks/useTheme';
import { AttentionSheetProps } from './types';
import { styles } from './styles';
import { isWeb } from '@/constants/Constants';
import { useLanguage } from '@/hooks/useLanguage';
import { useSelector } from 'react-redux';
import LottieView from 'lottie-react-native';
import { replaceLottieColors } from '@/helper/animationHelper';
import animationJson from '@/assets/animations/astronaut-computer.json';
import { useFocusEffect } from 'expo-router';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';

const AttentionSheet: React.FC<AttentionSheetProps> = ({
  closeSheet,
  handleLogin,
  isBottomSheetVisible,
}) => {
  const { translate } = useLanguage();
  const { theme } = useTheme();
  const { primaryColor, appSettings } = useSelector(
    (state: RootState) => state.settings
  );
  const updatedAnimationJson = replaceLottieColors(animationJson, primaryColor);
  const animationRef = useRef<LottieView>(null);
  const [hasPlayed, setHasPlayed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (isBottomSheetVisible) {
        if (!hasPlayed && appSettings?.animations_auto_start) {
          animationRef.current?.play();
          setHasPlayed(true);
        }
      }
    }, [isBottomSheetVisible, hasPlayed, appSettings])
  );

  return (
    <BottomSheetView
      style={{ ...styles.sheetView, backgroundColor: theme.sheet.sheetBg }}
    >
      <View style={styles.attentionSheetHeader}>
        <View />

      </View>

      <View style={styles.gifContainer}>
        <LottieView
          ref={animationRef}
          source={updatedAnimationJson}
          resizeMode='contain'
          style={{ width: '100%', height: '100%' }}
          autoPlay={false}
          loop={false}
        />
      </View>
      <Text
        style={{ ...styles.attentionSheetHeading, color: theme.sheet.text }}
      >
        {translate(TranslationKeys.attention)}
      </Text>
      <View
        style={{ ...styles.attentionContent, width: isWeb ? '80%' : '100%' }}
      >
        <Text style={{ ...styles.attentionBody, color: theme.sheet.text }}>
          {translate(TranslationKeys.without_account_limitations)}
        </Text>
        <View
          style={{ ...styles.attentionActions, width: isWeb ? '60%' : '100%' }}
        >
          <TouchableOpacity
            style={[styles.confirmButton, { backgroundColor: primaryColor }]}
            onPress={() => {
              handleLogin();
            }}
          >
            <Text style={[styles.confirmLabel, { color: theme.light }]}>
              {translate(TranslationKeys.confirm)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancleButton} onPress={closeSheet}>
            <Text style={styles.confirmLabel}>
              {translate(TranslationKeys.cancel)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheetView>
  );
};

export default AttentionSheet;
