import { Text, TouchableOpacity, View } from 'react-native';
import React from 'react';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { isWeb } from '@/constants/Constants';
import {
  MaterialCommunityIcons,
  MaterialIcons,
} from '@expo/vector-icons';
import { FilterFormSheetProps } from './types';
import Checkbox from 'expo-checkbox';
import { useDispatch, useSelector } from 'react-redux';
import { useLanguage } from '@/hooks/useLanguage';
import { SET_FORM_FILTER } from '@/redux/Types/types';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';

const iconLibraries: any = {
  MaterialIcons,
  MaterialCommunityIcons,
};

const FilterFormSheet: React.FC<FilterFormSheetProps> = ({
  closeSheet,
  isFormSubmission,
  setSelectedOption,
  selectedOption,
  options,
  isEditMode = false,
}) => {
  const { theme } = useTheme();
  const { translate } = useLanguage();
  const dispatch = useDispatch();
  const { primaryColor } = useSelector((state: RootState) => state.settings);

  const updateSort = (option: { id: string }) => {
    setSelectedOption(option.id);
    if (isFormSubmission) {
      dispatch({ type: SET_FORM_FILTER, payload: option.id });
    }
    closeSheet();
  };

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
        <View style={{ width: 50 }} />
        <Text
          style={{
            ...styles.sheetHeading,
            fontSize: isWeb ? 40 : 28,
            color: theme.sheet.text,
          }}
        >
          {translate(TranslationKeys.filter)}
        </Text>
      </View>
      <View style={styles.sortingListContainer}>
        {options.map((option, index) => {
          if (isEditMode && option.label === 'syncing') {
            return null; // hide syncing when in edit mode
          }
          const IconComponent =
            option.icon && iconLibraries[option.icon.library]
              ? iconLibraries[option.icon.library]
              : null;
          return (
            <TouchableOpacity
              key={option.id + index}
              style={[
                styles.actionItem,
                selectedOption === option.id
                  ? {
                      backgroundColor: primaryColor,
                    }
                  : {
                      backgroundColor: theme.screen.iconBg,
                    },
              ]}
              onPress={() => updateSort(option)}
            >
              <View style={styles.col}>
                {IconComponent && (
                  <IconComponent
                    name={option.icon.name}
                    size={22}
                    color={
                      selectedOption === option.id
                        ? theme.activeText
                        : theme.screen.text
                    }
                  />
                )}
                <Text
                  style={[
                    styles.label,
                    selectedOption === option.id
                      ? {
                          color: theme.activeText,
                        }
                      : { color: theme.screen.text },
                  ]}
                >
                  {translate(option.label)}
                </Text>
              </View>
              <Checkbox
                style={styles.checkbox}
                value={selectedOption === option.id}
                color={selectedOption === option.id ? '#000000' : undefined}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </BottomSheetScrollView>
  );
};

export default FilterFormSheet;
