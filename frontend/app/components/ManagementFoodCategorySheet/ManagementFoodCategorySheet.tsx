import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import { ManagementFoodCategorySheetProps } from './types';
import { BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { isWeb } from '@/constants/Constants';
import { SET_DAY_PLAN } from '@/redux/Types/types';
import { getTextFromTranslation } from '@/helper/resourceHelper';
import { RootState } from '@/redux/reducer';
import { FoodoffersCategories, FoodsCategories } from '@/constants/types';

const ManagementFoodCategorySheet: React.FC<
  ManagementFoodCategorySheetProps
> = ({ closeSheet, selectedFoodCategory }) => {
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const [isCustom, setIsCustom] = useState(false);
  const [list, setList] = useState<FoodsCategories[] | FoodoffersCategories[]>(
    []
  );
  const { dayPlan } = useSelector((state: RootState) => state.management);
  const [value, setValue] = useState('');
  const [windowWidth, setWindowWidth] = useState(
    Dimensions.get('window').width
  );
  const { primaryColor, language } = useSelector(
    (state: RootState) => state.settings
  );
  const { foodCategories, foodOfferCategories } = useSelector(
    (state: RootState) => state.food
  );

  const currentSelectedId =
    selectedFoodCategory.key === 'Speiseangebot'
      ? dayPlan?.mealOfferCategory?.id
      : dayPlan?.foodCategory?.id;

  useEffect(() => {
    if (selectedFoodCategory.key === 'Speiseangebot') {
      setList(foodOfferCategories);
    } else {
      setList(foodCategories);
    }
  }, [selectedFoodCategory]);

  const handleSelect = (item: any) => {
    const alias =
      item?.translations?.length > 0
        ? getTextFromTranslation(item?.translations, language)
        : item?.alias || '';

    const payloadKey =
      selectedFoodCategory.key === 'Speiseangebot'
        ? 'mealOfferCategory'
        : 'foodCategory';

    // Toggle selection directly in Redux
    if (item?.id === currentSelectedId) {
      dispatch({
        type: SET_DAY_PLAN,
        payload: { [payloadKey]: { id: '', alias: '' } },
      });
    } else {
      dispatch({
        type: SET_DAY_PLAN,
        payload: { [payloadKey]: { id: item.id, alias: alias } },
      });
    }
    closeSheet();
  };

  const handleSaveCustom = () => {
    if (selectedFoodCategory.key === 'Speiseangebot') {
      dispatch({
        type: SET_DAY_PLAN,
        payload: { mealOfferCategory: { id: '', alias: value } },
      });
    } else {
      dispatch({
        type: SET_DAY_PLAN,
        payload: { foodCategory: { id: '', alias: value } },
      });
    }
    setIsCustom(false);
    setValue('');
    closeSheet();
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

  return (
    <BottomSheetView
      style={{
        ...styles.sheetView,
        backgroundColor: theme.sheet.sheetBg,
        paddingBottom: 20,
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
          {selectedFoodCategory.label}
        </Text>

      </View>
      {isCustom ? (
        <View style={styles.modalContent}>
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
            onChangeText={setValue}
          />

          <View style={[styles.buttonContainer, { width: '30%' }]}>
            <TouchableOpacity
              onPress={() => {
                setIsCustom(false);
                setValue('');
                closeSheet();
              }}
              style={{
                ...styles.cancelButton,
                borderColor: primaryColor,
              }}
            >
              <Text style={[styles.buttonText, { color: theme.screen.text }]}>
                cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSaveCustom}
              style={{
                ...styles.saveButton,
                backgroundColor: primaryColor,
              }}
            >
              <Text style={[styles.buttonText, { color: theme.activeText }]}>
                save
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <BottomSheetScrollView>
          {list &&
            list?.map((item: any) => (
              <TouchableOpacity
                style={{
                  ...styles.row,
                  paddingHorizontal: isWeb ? 20 : 10,
                  backgroundColor:
                    currentSelectedId === item?.id
                      ? primaryColor
                      : theme.screen.iconBg,
                }}
                key={item?.id}
                onPress={() => handleSelect(item)}
              >
                {/* Theme Text */}
                <Text
                  style={{
                    ...styles.text,
                    color:
                      currentSelectedId === item?.id
                        ? theme.activeText
                        : theme.header.text,
                  }}
                >
                  {item?.translations?.length > 0
                    ? getTextFromTranslation(item?.translations, language)
                    : item?.alias}
                </Text>

                {/* Radio Button */}
                <MaterialCommunityIcons
                  name={
                    currentSelectedId === item?.id
                      ? 'checkbox-marked'
                      : 'checkbox-blank'
                  }
                  size={24}
                  color={currentSelectedId === item?.id ? '#ffffff' : '#ffffff'}
                  style={styles.radioButton}
                />
              </TouchableOpacity>
            ))}
          <TouchableOpacity
            style={{
              ...styles.row,
              paddingHorizontal: isWeb ? 20 : 10,
              backgroundColor: theme.screen.iconBg,
            }}
            onPress={() => setIsCustom(true)}
          >
            {/* Theme Text */}
            <Text
              style={{
                ...styles.text,
                color: theme.header.text,
              }}
            >
              Custom
            </Text>

            {/* Radio Button */}
            <MaterialCommunityIcons
              name='pencil'
              size={22}
              color={theme.screen.icon}
            />
          </TouchableOpacity>
        </BottomSheetScrollView>
      )}
    </BottomSheetView>
  );
};

export default ManagementFoodCategorySheet;
