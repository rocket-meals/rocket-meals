import { Text, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { isWeb } from '@/constants/Constants';
import {
  FontAwesome5,
  MaterialCommunityIcons,
} from '@expo/vector-icons';

import { BuildingSortSheetProps } from './types';
import Checkbox from 'expo-checkbox';
import {
  SET_APARTMENTS_SORTING,
  SET_CAMPUSES_SORTING,
} from '@/redux/Types/types';
import { useDispatch, useSelector } from 'react-redux';
import { useLanguage } from '@/hooks/useLanguage';
import { myContrastColor } from '@/helper/colorHelper';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';

const BuildingSortSheet: React.FC<BuildingSortSheetProps> = ({
  closeSheet,
  freeRooms,
}) => {
  const { theme } = useTheme();
  const { translate } = useLanguage();
  const dispatch = useDispatch();
  const {
    campusesSortBy,
    apartmentsSortBy,
    primaryColor: projectColor,
    appSettings,
    selectedTheme: mode,
  } = useSelector((state: RootState) => state.settings);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const housing_area_color = appSettings?.housing_area_color
    ? appSettings?.housing_area_color
    : projectColor;
  const campus_area_color = appSettings?.campus_area_color
    ? appSettings?.campus_area_color
    : projectColor;
  const contrastColor = myContrastColor(
    freeRooms ? housing_area_color : campus_area_color,
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
      id: 'free rooms',
      label: 'free_rooms',
      icon: <MaterialCommunityIcons name='door-open' size={24} />,
    },
    {
      id: 'distance',
      label: 'sort_option_distance',
      icon: <MaterialCommunityIcons name='map-marker-distance' size={24} />,
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

  const filteredSortingOptions = freeRooms
    ? sortingOptions
    : sortingOptions.filter((option) => option.id !== 'free rooms');

  const updateSort = (option: { id: string }) => {
    setSelectedOption(option.id);
    if (freeRooms) {
      dispatch({ type: SET_APARTMENTS_SORTING, payload: option.id });
    } else {
      dispatch({ type: SET_CAMPUSES_SORTING, payload: option.id });
    }
    closeSheet();
  };

  useEffect(() => {
    if (freeRooms) {
      setSelectedOption(apartmentsSortBy);
    } else {
      setSelectedOption(campusesSortBy);
    }
  }, [campusesSortBy, apartmentsSortBy]);

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
          {translate(TranslationKeys.sort)}
        </Text>
      </View>
      <View style={styles.sortingListContainer}>
        {filteredSortingOptions.map((option) => {
          return (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.actionItem,
                selectedOption === option.id
                  ? {
                      backgroundColor: freeRooms
                        ? housing_area_color
                        : campus_area_color,
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
                color={selectedOption === option.id ? '#000000' : undefined}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </BottomSheetScrollView>
  );
};

export default BuildingSortSheet;
