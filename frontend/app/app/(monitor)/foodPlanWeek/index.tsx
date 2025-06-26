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
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { router, useFocusEffect } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import styles from './styles';
import BaseBottomSheet from '@/components/BaseBottomSheet';
import type BottomSheet from '@gorhom/bottom-sheet';
import { Entypo, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '@/hooks/useLanguage';
import ManagementCanteensSheet from '@/components/ManagementCanteensSheet/ManagementCanteensSheet';
import { SET_WEEK_PLAN } from '@/redux/Types/types';
import { CanteenProps } from '@/components/CanteenSelectionSheet/types';
import { Switch } from '@gluestack-ui/themed';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { RootState } from '@/redux/reducer';

const Index = () => {
  useSetPageTitle(TranslationKeys.food_plan_week);
  const { theme } = useTheme();
  const { translate } = useLanguage();
  const dispatch = useDispatch();
  const { primaryColor: projectColor, appSettings } = useSelector(
    (state: RootState) => state.settings
  );
  const { weekPlan } = useSelector((state: RootState) => state.management);
  const [isActive, setIsActive] = useState(false);
  const canteenSheetRef = useRef<BottomSheet>(null);
  const [windowWidth, setWindowWidth] = useState(
    Dimensions.get('window').width
  );
  const foods_area_color = appSettings?.foods_area_color
    ? appSettings?.foods_area_color
    : projectColor;

  const openCanteenSheet = () => {
    canteenSheetRef?.current?.expand();
  };

  const closeCanteenSheet = () => {
    canteenSheetRef?.current?.close();
  };

  const toggleMenuSwitch = () => {
    dispatch({
      type: SET_WEEK_PLAN,
      payload: { isAllergene: !weekPlan?.isAllergene },
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
      type: SET_WEEK_PLAN,
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
            {windowWidth < 600 && weekPlan?.selectedCanteen?.alias ? (
              <Text style={{ ...styles.label, color: theme.screen.text }}>
                {weekPlan?.selectedCanteen?.alias}
              </Text>
            ) : (
              <Text style={{ ...styles.label, color: theme.screen.text }}>
                {translate(TranslationKeys.canteen)}
              </Text>
            )}
          </View>
          <View style={styles.col2}>
            {windowWidth > 600 && (
              <Text style={{ ...styles.label, color: theme.screen.text }}>
                {weekPlan?.selectedCanteen?.alias}
              </Text>
            )}
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
              Allergene Anzeigen
            </Text>
          </View>
          <View style={styles.col2}>
            <Switch
              value={weekPlan?.isAllergene}
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
            ...styles.button,
            backgroundColor: theme.screen.iconBg,
            paddingHorizontal: windowWidth > 600 ? 20 : 10,
            opacity: weekPlan?.selectedCanteen?.alias ? 1 : 0.5,
          }}
          disabled={weekPlan?.selectedCanteen?.alias ? false : true}
          onPress={() => {
            if (weekPlan?.selectedCanteen?.alias) {
              router.navigate('/list-week-screen');
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
    </>
  );
};

export default Index;
