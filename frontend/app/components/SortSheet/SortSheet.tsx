import { Text, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { isWeb } from '@/constants/Constants';
import {
  AntDesign,
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';

import { SortSheetProps } from './types';
import Checkbox from 'expo-checkbox';
import { SET_SELECTED_CANTEEN_FOOD_OFFERS, SET_SORTING } from '@/redux/Types/types';
import { useDispatch, useSelector } from 'react-redux';
import { intelligentSort, sortByEatingHabits, sortByFoodName, sortByOwnFavorite, sortByPublicFavorite } from '@/helper/sortingHelper';
import { useLanguage } from '@/hooks/useLanguage';
import { myContrastColor } from '@/helper/colorHelper';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';

const SortSheet: React.FC<SortSheetProps> = ({ closeSheet }) => {
  const { theme } = useTheme();
  const { translate } = useLanguage();

  const dispatch = useDispatch();
  const { canteenFoodOffers } = useSelector(
    (state: RootState) => state.canteenReducer
  );
  const {
    primaryColor,
    language: languageCode,
    sortBy,
    appSettings,
    selectedTheme: mode,
  } = useSelector((state: RootState) => state.settings);
  const { ownFoodFeedbacks } = useSelector((state: RootState) => state.food);
  const { profile } = useSelector((state: RootState) => state.authReducer);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const foods_area_color = appSettings?.foods_area_color
    ? appSettings?.foods_area_color
    : primaryColor;
  const contrastColor = myContrastColor(
    foods_area_color,
    theme,
    mode === 'dark'
  );

  const sortingOptions = [
    {
      id: 'intelligent',
      label: 'sort_option_intelligent',
      icon: <MaterialCommunityIcons name='brain' size={24} />,
    },
    {
      id: 'favorite',
      label: 'sort_option_favorite',
      icon: <AntDesign name='heart' size={24} />,
    },
    {
      id: 'eating',
      label: 'eating_habits',
      icon: <Ionicons name='bag-add' size={24} />,
    },
    {
      id: 'rating',
      label: 'sort_option_public_rating',
      icon: <AntDesign name='star' size={24} />,
    },
    {
      id: 'alphabetical',
      label: 'sort_option_alphabetical',
      icon: <FontAwesome5 name='sort-alpha-down' size={24} />,
    },
    {
      id: 'none',
      label: 'sort_option_none',
      icon: <MaterialCommunityIcons name='sort-variant-remove' size={24} />,
    },
  ];

  const updateSort = (option: { id: string }) => {
    setSelectedOption(option.id);
    dispatch({ type: SET_SORTING, payload: option.id });

    // Copy food offers to avoid mutation
    let copiedFoodOffers = [...canteenFoodOffers];

    // Sorting logic based on option id
    switch (option.id) {
      case 'alphabetical':
        copiedFoodOffers = sortByFoodName(copiedFoodOffers, languageCode);
        break;
      case 'favorite':
        copiedFoodOffers = sortByOwnFavorite(
          copiedFoodOffers,
          ownFoodFeedbacks
        );
        break;
      case 'eating':
        copiedFoodOffers = sortByEatingHabits(
          copiedFoodOffers,
          profile.markings
        );
        break;
      case 'rating':
        copiedFoodOffers = sortByPublicFavorite(copiedFoodOffers);
        break;
      case 'intelligent':
        copiedFoodOffers = intelligentSort(
          copiedFoodOffers,
          ownFoodFeedbacks,
          profile.markings,
          languageCode
        );
        break;
      default:
        console.warn('Unknown sorting option:', option.id);
        break;
    }

    // Dispatch updated food offers and close the sheet
    dispatch({
      type: SET_SELECTED_CANTEEN_FOOD_OFFERS,
      payload: copiedFoodOffers,
    });
    closeSheet();
  };

  useEffect(() => {
    setSelectedOption(sortBy);
  }, []);

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
            color: theme.screen.text,
          }}
        >
          {translate(TranslationKeys.sort)}
        </Text>
      </View>
      <View style={styles.sortingListContainer}>
        {sortingOptions.map((option, index) => (
          <TouchableOpacity
            key={option.id + index}
            style={[
              styles.actionItem,
              selectedOption === option.id
                ? {
                    backgroundColor: foods_area_color,
                  }
                : {
                    backgroundColor: theme.screen.iconBg,
                  },
            ]}
            onPress={() => updateSort(option)}
          >
            <View style={styles.col}>
              {React.cloneElement(
                option.icon,
                selectedOption === option.id
                  ? {
                      color: contrastColor,
                    }
                  : { color: theme.screen.icon }
              )}
              <Text
                style={[
                  styles.label,
                  selectedOption === option.id
                    ? {
                        color: contrastColor,
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
              // onValueChange={() => updateSort(option)} // Toggle option
              color={selectedOption === option.id ? '#000000' : undefined}
            />
          </TouchableOpacity>
        ))}
      </View>
    </BottomSheetScrollView>
  );
};

export default SortSheet;
