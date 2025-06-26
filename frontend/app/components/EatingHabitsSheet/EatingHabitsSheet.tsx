import { Text, TouchableOpacity, View } from 'react-native';
import React from 'react';
import { isWeb } from '@/constants/Constants';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useTheme } from '@/hooks/useTheme';
import styles from './styles';
import { EatingHabitsSheetProps } from './types';
import MarkingLabels from '../MarkingLabels/MarkingLabels';
import { useSelector } from 'react-redux';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';

const EatingHabitsSheet: React.FC<EatingHabitsSheetProps> = ({
  closeSheet,
}) => {
  const { theme } = useTheme();
  const { translate } = useLanguage();
  const { selectedFoodMarkings } = useSelector(
    (state: RootState) => state.food
  );
  return (
    <BottomSheetScrollView
      style={{ ...styles.sheetView, backgroundColor: theme.sheet.sheetBg }}
      contentContainerStyle={styles.contentContainer}
    >
      <View
        style={{
          ...styles.sheetHeader,
          paddingRight: isWeb ? 10 : 0,
          paddingTop: isWeb ? 10 : 0,
        }}
      >
        <View />
        <Text
          style={{
            ...styles.sheetHeading,
            fontSize: isWeb ? 40 : 28,
            color: theme.sheet.text,
          }}
        >
          {translate(TranslationKeys.eating_habits)}
        </Text>
      </View>
      <View style={styles.eatingHabitsList}>
        {selectedFoodMarkings?.map((marking: any, index: number) => (
          <View key={index}>
            <MarkingLabels
              key={marking?.id + index}
              markingId={marking.markings_id}
            />
            <View style={styles.divider} />
          </View>
        ))}
        <View style={styles.divider} />
      </View>
    </BottomSheetScrollView>
  );
};

export default EatingHabitsSheet;
