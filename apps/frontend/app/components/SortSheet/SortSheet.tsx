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
import { FoodSortOption } from 'repo-depkit-common';
import { SET_SELECTED_CANTEEN_FOOD_OFFERS, SET_SORTING } from '@/redux/Types/types';
import { useDispatch, useSelector } from 'react-redux';
import {
  intelligentSort,
  sortByPrice,
  sortByEatingHabits,
  sortByFoodName,
  sortByOwnFavorite,
  sortByPublicFavorite,
  sortByFoodCategory,
  sortByFoodOfferCategory,
} from 'repo-depkit-common';
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
  const { ownFoodFeedbacks, foodCategories, foodOfferCategories } = useSelector(
    (state: RootState) => state.food
  );
  const { profile } = useSelector((state: RootState) => state.authReducer);
  const [selectedOption, setSelectedOption] = useState<FoodSortOption | null>(null);
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
      id: FoodSortOption.INTELLIGENT,
      label: 'sort_option_intelligent',
      icon: <MaterialCommunityIcons name='brain' size={24} />,
    },
    {
      id: FoodSortOption.FAVORITE,
      label: 'sort_option_favorite',
      icon: <AntDesign name='heart' size={24} />,
    },
    {
      id: FoodSortOption.EATING,
      label: 'eating_habits',
      icon: <Ionicons name='bag-add' size={24} />,
    },
    {
      id: FoodSortOption.FOOD_CATEGORY,
      label: 'sort_option_food_category',
      icon: <MaterialCommunityIcons name='food' size={24} />,
    },
    {
      id: FoodSortOption.FOODOFFER_CATEGORY,
      label: 'sort_option_foodoffer_category',
      icon: <MaterialCommunityIcons name='food-variant' size={24} />,
    },
    {
      id: FoodSortOption.RATING,
      label: 'sort_option_public_rating',
      icon: <AntDesign name='star' size={24} />,
    },
    {
      id: FoodSortOption.PRICE_ASCENDING,
      label: 'sort_option_price_ascending',
      icon: <FontAwesome5 name='sort-numeric-up' size={24} />,
    },
    {
      id: FoodSortOption.PRICE_DESCENDING,
      label: 'sort_option_price_descending',
      icon: <FontAwesome5 name='sort-numeric-down' size={24} />,
    },
    {
      id: FoodSortOption.ALPHABETICAL,
      label: 'sort_option_alphabetical',
      icon: <FontAwesome5 name='sort-alpha-down' size={24} />,
    },
    {
      id: FoodSortOption.NONE,
      label: 'sort_option_none',
      icon: <MaterialCommunityIcons name='sort-variant-remove' size={24} />,
    },
  ];

  const updateSort = (option: { id: FoodSortOption }) => {
    setSelectedOption(option.id);
    dispatch({ type: SET_SORTING, payload: option.id });

    // Copy food offers to avoid mutation
    let copiedFoodOffers = [...canteenFoodOffers];

    // Sorting logic based on option id
    switch (option.id) {
      case FoodSortOption.ALPHABETICAL:
        copiedFoodOffers = sortByFoodName(copiedFoodOffers, languageCode);
        break;
      case FoodSortOption.FAVORITE:
        copiedFoodOffers = sortByOwnFavorite(
          copiedFoodOffers,
          ownFoodFeedbacks
        );
        break;
      case FoodSortOption.EATING:
        copiedFoodOffers = sortByEatingHabits(
          copiedFoodOffers,
          profile.markings
        );
        break;
      case FoodSortOption.FOOD_CATEGORY:
        copiedFoodOffers = sortByFoodCategory(
          copiedFoodOffers,
          foodCategories,
            languageCode
        );
        break;
      case FoodSortOption.FOODOFFER_CATEGORY:
        copiedFoodOffers = sortByFoodOfferCategory(
          copiedFoodOffers,
          foodOfferCategories
        );
        break;
      case FoodSortOption.RATING:
        copiedFoodOffers = sortByPublicFavorite(copiedFoodOffers);
        break;
      case FoodSortOption.PRICE_ASCENDING:
        copiedFoodOffers = sortByPrice(
          copiedFoodOffers,
          profile?.price_group,
          false
        );
        break;
      case FoodSortOption.PRICE_DESCENDING:
        copiedFoodOffers = sortByPrice(
          copiedFoodOffers,
          profile?.price_group,
          true
        );
        break;
      case FoodSortOption.INTELLIGENT:
        copiedFoodOffers = intelligentSort(
          copiedFoodOffers,
          ownFoodFeedbacks,
          profile.markings,
          languageCode,
          foodCategories,
          foodOfferCategories
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
    setSelectedOption(sortBy as FoodSortOption);
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
