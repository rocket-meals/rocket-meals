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
import {
  SET_FOOD_ATTRIBUTES,
  SET_FOOD_ATTRIBUTES_DICT,
  SET_FOOD_PLAN,
} from '@/redux/Types/types';
import { CanteenProps } from '@/components/CanteenSelectionSheet/types';
import CustomCollapsible from '@/components/CustomCollapsible/CustomCollapsible';
import { isWeb } from '@/constants/Constants';
import { getFoodAttributesTranslation } from '@/helper/resourceHelper';
import { myContrastColor } from '@/helper/colorHelper';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { RootState } from '@/redux/reducer';
import { FoodsAttributes } from '@/constants/types';
import { FoodAttributesHelper } from '@/redux/actions/FoodAttributes/FoodAttributes';

type FoodAttribute = {
  id: string;
  sort: number;
  selected: boolean;
  alias?: string;
};

const Index = () => {
  useSetPageTitle(TranslationKeys.food_plan_list);
  const { theme } = useTheme();
  const { translate } = useLanguage();
  const dispatch = useDispatch();
  const foodAttributesHelper = new FoodAttributesHelper();
  const { foodAttributes: initialFoodAttributes } = useSelector(
    (state: RootState) => state.foodAttributes
  );
  const [foodAttributes, setFoodAttributes] = useState<FoodAttribute[]>();
  const {
    primaryColor: projectColor,
    language,
    appSettings,
    selectedTheme: mode,
  } = useSelector((state: RootState) => state.settings);
  const { foodPlan } = useSelector((state: RootState) => state.management);
  const [isActive, setIsActive] = useState(false);
  const [value, setValue] = useState('');
  const [selectedCanteenOption, setSelectedCanteenOption] = useState('');
  const canteenSheetRef = useRef<BottomSheet>(null);
  const intervalSheetRef = useRef<BottomSheet>(null);
  const [windowWidth, setWindowWidth] = useState(
    Dimensions.get('window').width
  );
  const foods_area_color = appSettings?.foods_area_color
    ? appSettings?.foods_area_color
    : projectColor;

  const contrastColor = myContrastColor(
    foods_area_color,
    theme,
    mode === 'dark'
  );
  const [selectedInterval, setSelectedInterval] = useState({
    key: '',
    label: '',
  });

  const getAllFoodAttributes = async () => {
    try {
      const result =
        (await foodAttributesHelper.fetchAllFoodAttributes()) as FoodsAttributes[];
      if (result) {
        const attributesDict = result.reduce((acc, attr) => {
          if (attr.id) {
            acc[attr.id] = attr;
          }
          return acc;
        }, {} as Record<string, FoodsAttributes>);
        dispatch({ type: SET_FOOD_ATTRIBUTES, payload: result });
        dispatch({ type: SET_FOOD_ATTRIBUTES_DICT, payload: attributesDict });
      }
    } catch (error) {
      console.error('Error fetching Food attribute', error);
    }
  };

  useEffect(() => {
    if (initialFoodAttributes.length > 0) {
      setFoodAttributes(
        initialFoodAttributes.map((attr: any, index: number) => {
          const title = attr?.translations
            ? getFoodAttributesTranslation(attr?.translations, language)
            : '';
          return {
            id: attr?.id,
            alias: title ? title : attr?.alias,
            sort: attr.sort || index + 1,
            selected: attr.status === 'published' ? true : false,
          };
        })
      );
    } else {
      getAllFoodAttributes();
    }
  }, [initialFoodAttributes]);

  const handleSortChange = (id: string, newValue: string) => {
    const numericValue = Math.max(0, Math.min(99, parseInt(newValue) || 0));

    setFoodAttributes((prev: any) =>
      prev.map((attr: any) =>
        attr.id === id ? { ...attr, sort: numericValue } : attr
      )
    );
  };

  const toggleAttributeSelection = (id: string) => {
    setFoodAttributes((prev: any) =>
      prev.map((attr: any) =>
        attr.id === id ? { ...attr, selected: !attr.selected } : attr
      )
    );
  };

  const openCanteenSheet = (option: string) => {
    setSelectedCanteenOption(option);
    canteenSheetRef?.current?.expand();
  };

  const closeCanteenSheet = () => {
    canteenSheetRef?.current?.close();
  };

  const openIntervalSheet = (intervalKey: string, intervalLabel: string) => {
    setSelectedInterval({ key: intervalKey, label: intervalLabel });

    // Set the value based on the selected interval
    if (intervalKey === 'foodInterval') {
      setValue(
        foodPlan?.nextFoodInterval ? String(foodPlan.nextFoodInterval) : ''
      );
    } else if (intervalKey === 'refreshFoodInterval') {
      setValue(
        foodPlan?.refreshInterval ? String(foodPlan.refreshInterval) : ''
      );
    }

    intervalSheetRef?.current?.expand();
  };

  const closeIntervalSheet = () => {
    intervalSheetRef?.current?.close();
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
    if (selectedCanteenOption === 'canteen') {
      dispatch({
        type: SET_FOOD_PLAN,
        payload: { selectedCanteen: canteen },
      });
    } else {
      dispatch({
        type: SET_FOOD_PLAN,
        payload: { additionalSelectedCanteen: canteen },
      });
    }
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
          onPress={() => openCanteenSheet('canteen')}
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
              {foodPlan?.selectedCanteen?.alias}
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
          onPress={() => openCanteenSheet('optional')}
        >
          <View style={styles.col1}>
            <Ionicons
              name='restaurant-sharp'
              size={24}
              color={theme.screen.icon}
            />
            <Text style={{ ...styles.label, color: theme.screen.text }}>
              Optional: Zusätzliche Mensa/Cafeteria
            </Text>
          </View>
          <View style={styles.col2}>
            <Text style={{ ...styles.label, color: theme.screen.text }}>
              {foodPlan?.additionalSelectedCanteen?.alias}
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
              {foodPlan?.nextFoodInterval}
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
              Refresh Data Interval (seconds)
            </Text>
          </View>
          <View style={styles.col2}>
            <Text style={{ ...styles.label, color: theme.screen.text }}>
              {foodPlan?.refreshInterval}
            </Text>
            <MaterialCommunityIcons
              name='pencil'
              size={22}
              color={theme.screen.icon}
            />
          </View>
        </TouchableOpacity>

        <View style={{ width: '100%' }}>
          <CustomCollapsible
            headerText={translate(TranslationKeys.food_attributes)}
            customColor={theme.screen.iconBg}
          >
            <ScrollView
              style={styles.attributeListContainer}
              contentContainerStyle={styles.attributeListContent}
            >
              {foodAttributes &&
                foodAttributes?.map((attribute: any) => {
                  return (
                    <View style={styles.attributeContainer} key={attribute?.id}>
                      <TextInput
                        value={attribute?.sort}
                        onChangeText={(text) =>
                          handleSortChange(attribute.id, text)
                        }
                        keyboardType='numeric'
                        maxLength={2}
                        style={{
                          ...styles.sortField,
                          color: theme.screen.text,
                          borderColor: theme.screen.iconBg,
                        }}
                      />
                      <TouchableOpacity
                        style={{
                          ...styles.row,
                          paddingHorizontal: isWeb ? 20 : 10,

                          backgroundColor: attribute?.selected
                            ? foods_area_color
                            : theme.screen.iconBg,
                        }}
                        onPress={() => toggleAttributeSelection(attribute.id)}
                      >
                        <Text
                          style={{
                            ...styles.text,
                            color: attribute?.selected
                              ? contrastColor
                              : theme.header.text,
                          }}
                        >
                          {attribute?.alias}
                        </Text>

                        <MaterialCommunityIcons
                          name={
                            attribute?.selected
                              ? 'checkbox-marked'
                              : 'checkbox-blank'
                          }
                          size={24}
                          color={
                            attribute?.selected ? contrastColor : '#ffffff'
                          }
                          style={styles.radioButton}
                        />
                      </TouchableOpacity>
                    </View>
                  );
                })}
            </ScrollView>
          </CustomCollapsible>
        </View>

        <TouchableOpacity
          style={{
            ...styles.button,
            backgroundColor: theme.screen.iconBg,
            paddingHorizontal: windowWidth > 600 ? 20 : 10,
            opacity: foodPlan?.selectedCanteen?.alias ? 1 : 0.5,
          }}
          disabled={foodPlan?.selectedCanteen?.alias ? false : true}
          onPress={() => {
            if (foodPlan?.selectedCanteen?.alias) {
              // const selectedAttributes = foodAttributes
              //   ? foodAttributes
              //       .filter((attr) => attr.selected)
              //       .map(({ id, sort, alias }) => ({ id, sort, alias }))
              //   : [];
              // console.log('selectedAttributes', selectedAttributes);
              const sortedIds = foodAttributes
                ?.filter((attr) => attr.selected)
                .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
                .map(({ id }) => id);
              router.push({
                pathname: '/list-day-screen',
                params: {
                  canteens_id: foodPlan?.selectedCanteen?.id,
                  nextPageIntervalInSeconds: foodPlan?.nextFoodInterval,
                  refreshDataIntervalInSeconds: foodPlan?.refreshInterval,
                  monitor_additional_canteens_id: foodPlan
                    ?.additionalSelectedCanteen?.id
                    ? foodPlan?.additionalSelectedCanteen?.id
                    : '',
                  foodAttributesData: sortedIds
                    ? JSON.stringify(sortedIds)
                    : '',
                },
              });
            }
          }}
        >
          <View style={styles.col1}>
            <Text style={{ ...styles.label, color: theme.screen.text }}>
              DayScreen
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
                  fontSize: 28,
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
                        type: SET_FOOD_PLAN,
                        payload: { nextFoodInterval: value },
                      });
                    } else {
                      dispatch({
                        type: SET_FOOD_PLAN,
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
    </>
  );
};

export default Index;
