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
  TouchableOpacity,
  Dimensions,
  Text,
  TextInput,
} from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { router, useFocusEffect } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import styles from './styles';
import BaseBottomSheet from '@/components/BaseBottomSheet';
import type BottomSheet from '@gorhom/bottom-sheet';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import {
  AntDesign,
  Entypo,
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import { useLanguage } from '@/hooks/useLanguage';
import ManagementCanteensSheet from '@/components/ManagementCanteensSheet/ManagementCanteensSheet';
import { SET_DAY_PLAN } from '@/redux/Types/types';
import ManagementFoodCategorySheet from '@/components/ManagementFoodCategorySheet/ManagementFoodCategorySheet';
import { CanteenProps } from '@/components/CanteenSelectionSheet/types';
import { Switch } from '@gluestack-ui/themed';
import { myContrastColor } from '@/helper/colorHelper';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { RootState } from '@/redux/reducer';
const Index = () => {
  useSetPageTitle(TranslationKeys.food_plan_day);
  const { theme } = useTheme();
  const { translate } = useLanguage();
  const dispatch = useDispatch();
  const {
    primaryColor: projectColor,
    appSettings,
    selectedTheme: mode,
  } = useSelector((state: RootState) => state.settings);
  const { dayPlan } = useSelector((state: RootState) => state.management);
  const [isActive, setIsActive] = useState(false);
  const [value, setValue] = useState('');
  const canteenSheetRef = useRef<BottomSheet>(null);
  const foodCategorySheetRef = useRef<BottomSheet>(null);
  const intervalSheetRef = useRef<BottomSheet>(null);
  const [windowWidth, setWindowWidth] = useState(
    Dimensions.get('window').width
  );
  const [selectedInterval, setSelectedInterval] = useState({
    key: '',
    label: '',
  });
  const [selectedFoodCategory, setSelectedFoodCategory] = useState({
    key: '',
    label: '',
  });
  const foods_area_color = appSettings?.foods_area_color
    ? appSettings?.foods_area_color
    : projectColor;
  const contrastColor = myContrastColor(
    foods_area_color,
    theme,
    mode === 'dark'
  );
  const openCanteenSheet = () => {
    canteenSheetRef?.current?.expand();
  };

  const closeCanteenSheet = () => {
    canteenSheetRef?.current?.close();
  };

  const openFoodCategorySheet = (key: string, label: string) => {
    setSelectedFoodCategory({ key: key, label: label });
    foodCategorySheetRef?.current?.expand();
  };

  const closeFoodCategorySheet = () => {
    foodCategorySheetRef?.current?.close();
  };

  const openIntervalSheet = (intervalKey: string, intervalLabel: string) => {
    setSelectedInterval({ key: intervalKey, label: intervalLabel });

    // Set the value based on the selected interval
    if (intervalKey === 'foodInterval') {
      setValue(
        dayPlan?.nextFoodInterval ? String(dayPlan.nextFoodInterval) : ''
      );
    } else if (intervalKey === 'refreshFoodInterval') {
      setValue(dayPlan?.refreshInterval ? String(dayPlan.refreshInterval) : '');
    }

    intervalSheetRef?.current?.expand();
  };

  const closeIntervalSheet = () => {
    intervalSheetRef?.current?.close();
  };

  const toggleMenuSwitch = () => {
    dispatch({
      type: SET_DAY_PLAN,
      payload: { isMenuCategory: !dayPlan.isMenuCategory },
    });
  };

  const toggleMenuNameSwitch = () => {
    dispatch({
      type: SET_DAY_PLAN,
      payload: { isMenuCategoryName: !dayPlan.isMenuCategoryName },
    });
  };

  const toggleFullScreenSwitch = () => {
    dispatch({
      type: SET_DAY_PLAN,
      payload: { isFullScreen: !dayPlan.isFullScreen },
    });
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

  const handleSelectCanteen = (canteen: CanteenProps) => {
    dispatch({
      type: SET_DAY_PLAN,
      payload: { selectedCanteen: canteen },
    });
    closeCanteenSheet();
  };

  return (
    <>
      <ScrollView
        style={{
          ...styles.container,
          backgroundColor: theme.screen.background,
        }}
        contentContainerStyle={{
          ...styles.contentContainer,
          backgroundColor: theme.screen.background,
        }}
      >
        <TouchableOpacity
          style={{
            ...styles.list,
            backgroundColor: theme.screen.iconBg,
            paddingHorizontal: windowWidth > 600 ? 20 : 10,
          }}
          onPress={openCanteenSheet}
        >
          <View style={styles.col1}>
            <Ionicons
              name='restaurant-sharp'
              size={24}
              color={theme.screen.icon}
            />
            <Text style={{ ...styles.label, color: theme.screen.text }}>
              {translate(TranslationKeys.canteen)}
            </Text>
          </View>
          <View style={styles.col2}>
            <Text style={{ ...styles.label, color: theme.screen.text }}>
              {dayPlan?.selectedCanteen?.alias}
            </Text>
            <MaterialCommunityIcons
              name='pencil'
              size={22}
              color={theme.screen.icon}
            />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            ...styles.list,
            backgroundColor: theme.screen.iconBg,
            paddingHorizontal: windowWidth > 600 ? 20 : 10,
          }}
          onPress={() =>
            openFoodCategorySheet(
              'Speiseangebot',
              'Speiseangebot Kategorie Wählen'
            )
          }
        >
          <View style={styles.col1}>
            <Text style={{ ...styles.label, color: theme.screen.text }}>
              Speiseangebot Kategorie (optional)
            </Text>
          </View>
          <View style={styles.col2}>
            <Text style={{ ...styles.label, color: theme.screen.text }}>
              {dayPlan?.mealOfferCategory?.alias
                ? dayPlan?.mealOfferCategory?.alias
                : ''}
            </Text>
            <MaterialCommunityIcons
              name='pencil'
              size={22}
              color={theme.screen.icon}
            />
          </View>
        </TouchableOpacity>
        <View
          style={{
            ...styles.list,
            backgroundColor: theme.screen.iconBg,
            paddingHorizontal: windowWidth > 600 ? 20 : 10,
          }}
        >
          <View style={styles.col1}>
            <Text style={{ ...styles.label, color: theme.screen.text }}>
              Zeige Speiseangebot Kateogrie Name
            </Text>
          </View>
          <View style={styles.col2}>
            <Switch
              value={dayPlan.isMenuCategory}
              onValueChange={toggleMenuSwitch}
              thumbColor={foods_area_color}
              trackColor={{
                false: theme.screen.icon,
                true: foods_area_color,
              }}
            />
          </View>
        </View>
        <TouchableOpacity
          style={{
            ...styles.list,
            backgroundColor: theme.screen.iconBg,
            paddingHorizontal: windowWidth > 600 ? 20 : 10,
          }}
          onPress={() =>
            openIntervalSheet('foodInterval', 'Next Food Interval')
          }
        >
          <View style={styles.col1}>
            <Text style={{ ...styles.label, color: theme.screen.text }}>
              Next Food Interval
            </Text>
          </View>
          <View style={styles.col2}>
            <Text style={{ ...styles.label, color: theme.screen.text }}>
              {dayPlan?.nextFoodInterval}
            </Text>
            <MaterialCommunityIcons
              name='pencil'
              size={22}
              color={theme.screen.icon}
            />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            ...styles.list,
            backgroundColor: theme.screen.iconBg,
            paddingHorizontal: windowWidth > 600 ? 20 : 10,
          }}
          onPress={() =>
            openIntervalSheet(
              'refreshFoodInterval',
              'Refresh Food Offers Interval'
            )
          }
        >
          <View style={styles.col1}>
            <Text style={{ ...styles.label, color: theme.screen.text }}>
              Refresh Food Offers Interval
            </Text>
          </View>
          <View style={styles.col2}>
            <Text style={{ ...styles.label, color: theme.screen.text }}>
              {dayPlan?.refreshInterval}
            </Text>
            <MaterialCommunityIcons
              name='pencil'
              size={22}
              color={theme.screen.icon}
            />
          </View>
        </TouchableOpacity>
        <View
          style={{
            ...styles.list,
            backgroundColor: theme.screen.iconBg,
            paddingHorizontal: windowWidth > 600 ? 20 : 10,
          }}
        >
          <View style={styles.col1}>
            <Text style={{ ...styles.label, color: theme.screen.text }}>
              Full Screen
            </Text>
          </View>
          <View style={styles.col2}>
            <Switch
              value={dayPlan.isFullScreen}
              onValueChange={toggleFullScreenSwitch}
              thumbColor={foods_area_color}
              trackColor={{
                false: theme.screen.icon,
                true: foods_area_color,
              }}
            />
          </View>
        </View>
        <TouchableOpacity
          style={{
            ...styles.list,
            backgroundColor: theme.screen.iconBg,
            paddingHorizontal: windowWidth > 600 ? 20 : 10,
          }}
          onPress={() =>
            openFoodCategorySheet('Speise', 'Speise Kategorie Wählen')
          }
        >
          <View style={styles.col1}>
            <Text style={{ ...styles.label, color: theme.screen.text }}>
              Speise Kategorie (optional)
            </Text>
          </View>
          <View style={styles.col2}>
            <Text style={{ ...styles.label, color: theme.screen.text }}>
              {dayPlan?.foodCategory?.alias ? dayPlan?.foodCategory?.alias : ''}
            </Text>
            <MaterialCommunityIcons
              name='pencil'
              size={22}
              color={theme.screen.icon}
            />
          </View>
        </TouchableOpacity>
        <View
          style={{
            ...styles.list,
            backgroundColor: theme.screen.iconBg,
            paddingHorizontal: windowWidth > 600 ? 20 : 10,
          }}
        >
          <View style={styles.col1}>
            <Text style={{ ...styles.label, color: theme.screen.text }}>
              Zeige Speiseangebot Kateogrie Name
            </Text>
          </View>
          <View style={styles.col2}>
            <Switch
              value={dayPlan.isMenuCategoryName}
              onValueChange={toggleMenuNameSwitch}
              thumbColor={foods_area_color}
              trackColor={{
                false: theme.screen.icon,
                true: foods_area_color,
              }}
            />
          </View>
        </View>
        <TouchableOpacity
          style={{
            ...styles.button,
            backgroundColor: theme.screen.iconBg,
            paddingHorizontal: windowWidth > 600 ? 20 : 10,
            opacity: dayPlan?.selectedCanteen?.alias ? 1 : 0.5,
          }}
          disabled={dayPlan?.selectedCanteen?.alias ? false : true}
          onPress={() => {
            if (dayPlan?.selectedCanteen?.alias) {
              router.push({
                pathname: '/bigScreen',
                params: {
                  canteens_id: dayPlan?.selectedCanteen?.id || '',
                  foodCategoryIds: dayPlan?.mealOfferCategory?.id || '',
                  showFoodCategoryName: dayPlan?.isMenuCategory || false,
                  foodOfferCategoryIds: dayPlan?.foodCategory?.id || '',
                  showFoodofferCategoryName:
                    dayPlan?.isMenuCategoryName || false,
                  nextFoodIntervalInSeconds: dayPlan?.nextFoodInterval || 0,
                  refreshFoodOffersIntervalInSeconds:
                    dayPlan?.refreshInterval || 0,
                  fullscreen: dayPlan?.isFullScreen || false,
                },
              });
            }
          }}
        >
          <View style={styles.col1}>
            <Text style={{ ...styles.label, color: theme.screen.text }}>
              BigScreen
            </Text>
          </View>
          <View style={styles.col2}>
            <Entypo
              name='chevron-small-right'
              size={22}
              color={theme.screen.icon}
            />
          </View>
        </TouchableOpacity>
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
          <ManagementCanteensSheet
            closeSheet={closeCanteenSheet}
            handleSelectCanteen={handleSelectCanteen}
          />
        </BaseBottomSheet>
      )}
      {isActive && (
        <BaseBottomSheet
          ref={intervalSheetRef}
          index={-1}
          backgroundStyle={{
            ...styles.sheetBackground,
            backgroundColor: theme.sheet.sheetBg,
          }}
          enablePanDownToClose
          handleComponent={null}
          onClose={closeIntervalSheet}
        >
          <BottomSheetView
            style={{
              ...styles.sheetView,
              backgroundColor: theme.sheet.sheetBg,
            }}
          >
            <View style={styles.modalHeader}>
              <View />
              <Text
                style={{
                  ...styles.modalHeading,
                  color: theme.modal.text,
                  fontSize: windowWidth < 500 ? 24 : 28,
                }}
              >
                {selectedInterval?.label}
              </Text>

              <TouchableOpacity
                style={{
                  ...styles.closeButton,
                  backgroundColor: theme.modal.closeBg,
                  height: 40,
                  width: 40,
                }}
                onPress={closeIntervalSheet}
              >
                <AntDesign
                  name='close'
                  size={26}
                  color={theme.modal.closeIcon}
                />
              </TouchableOpacity>
            </View>
            <View
              style={[
                styles.modalContent,
                { paddingHorizontal: windowWidth < 600 ? 5 : 30 },
              ]}
            >
              <TextInput
                style={{
                  ...styles.input,
                  color: 'black',
                  backgroundColor: '#fff',
                  borderWidth: 1,
                  height: 60,
                  textAlignVertical: 'top',
                }}
                value={value}
                onChangeText={(text) => {
                  const numericValue = text.replace(/[^0-9]/g, '');
                  setValue(numericValue);
                }}
                keyboardType='number-pad'
              />

              <View
                style={[
                  styles.buttonContainer,
                  {
                    width:
                      windowWidth < 500
                        ? '70%'
                        : windowWidth < 800
                        ? '50%'
                        : '30%',
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={() => {
                    closeIntervalSheet();
                    setValue('');
                  }}
                  style={{
                    ...styles.cancelButton,
                    borderColor: foods_area_color,
                  }}
                >
                  <Text style={[styles.buttonText, { color: contrastColor }]}>
                    cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (selectedInterval.key === 'foodInterval') {
                      dispatch({
                        type: SET_DAY_PLAN,
                        payload: { nextFoodInterval: value },
                      });
                    } else {
                      dispatch({
                        type: SET_DAY_PLAN,
                        payload: { refreshInterval: value },
                      });
                    }
                    closeIntervalSheet();
                  }}
                  style={{
                    ...styles.saveButton,
                    backgroundColor: foods_area_color,
                  }}
                >
                  <Text style={[styles.buttonText, { color: contrastColor }]}>
                    save
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </BottomSheetView>
        </BaseBottomSheet>
      )}
      {isActive && (
        <BaseBottomSheet
          ref={foodCategorySheetRef}
          index={-1}
          backgroundStyle={{
            ...styles.sheetBackground,
            backgroundColor: theme.sheet.sheetBg,
          }}
          enablePanDownToClose
          handleComponent={null}
          onClose={closeFoodCategorySheet}
        >
          <ManagementFoodCategorySheet
            closeSheet={closeFoodCategorySheet}
            selectedFoodCategory={selectedFoodCategory}
          />
        </BaseBottomSheet>
      )}
    </>
  );
};

export default Index;
