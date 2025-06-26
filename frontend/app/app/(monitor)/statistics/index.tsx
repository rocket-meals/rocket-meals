import { Dimensions, ScrollView, Text, View } from 'react-native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import StatisticsCard from '@/components/StatisticsCard/StatisticsCard';
import { loadMostLikedOrDislikedFoods } from '@/helper/FoodHelper';
import { useDispatch, useSelector } from 'react-redux';
import {
  SET_MOST_DISLIKED_FOODS,
  SET_MOST_LIKED_FOODS,
} from '@/redux/Types/types';
import { Foods } from '@/constants/types';
import BaseBottomSheet from '@/components/BaseBottomSheet';
import type BottomSheet from '@gorhom/bottom-sheet';
import ImageManagementSheet from '@/components/ImageManagementSheet/ImageManagementSheet';
import { useFocusEffect } from 'expo-router';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';

const index = () => {
  useSetPageTitle(TranslationKeys.statistiken);
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const [isActive, setIsActive] = useState(false);
  const [selectedFoodId, setSelectedFoodId] = useState('');
  const imageManagementSheetRef = useRef<BottomSheet>(null);

  const { mostLikedFoods, mostDislikedFoods } = useSelector(
    (state: RootState) => state.food
  );
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get('window').width
  );

  const openImageManagementSheet = () => {
    imageManagementSheetRef?.current?.expand();
  };

  const closeImageManagementSheet = () => {
    imageManagementSheetRef?.current?.close();
  };

  const fetchMostLikedFoods = async () => {
    const mostLikedFoods = await loadMostLikedOrDislikedFoods(
      10,
      0,
      undefined,
      true
    );
    if (mostLikedFoods) {
      dispatch({ type: SET_MOST_LIKED_FOODS, payload: mostLikedFoods });
    }
  };

  const fetchMostDisLikedFoods = async () => {
    const mostDisLikedFoods = await loadMostLikedOrDislikedFoods(
      10,
      0,
      undefined,
      false
    );
    if (mostDisLikedFoods) {
      dispatch({ type: SET_MOST_DISLIKED_FOODS, payload: mostDisLikedFoods });
    }
  };

  const fetchFoods = () => {
    fetchMostLikedFoods();
    fetchMostDisLikedFoods();
  };

  useEffect(() => {
    fetchFoods();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(Dimensions.get('window').width);
    };

    const subscription = Dimensions.addEventListener('change', handleResize);

    return () => subscription?.remove();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsActive(true);
      return () => {
        setIsActive(false);
      };
    }, [])
  );

  return (
    <View
      style={{ ...styles.container, backgroundColor: theme.screen.background }}
    >
      <View
        style={{
          ...styles.statisticsContainer,
          padding: screenWidth > 600 ? 20 : 5,
          gap: screenWidth > 600 ? 20 : 10,
        }}
      >
        <View style={styles.topContainer}>
          <Text style={{ ...styles.heading, color: theme.screen.text }}>
            Top 10
          </Text>
          <ScrollView>
            {mostLikedFoods &&
              mostLikedFoods?.map((item: Foods) => (
                <StatisticsCard
                  key={item.id}
                  food={item}
                  handleImageSheet={openImageManagementSheet}
                  setSelectedFoodId={setSelectedFoodId}
                />
              ))}
          </ScrollView>
        </View>

        <View style={styles.worstContainer}>
          <Text style={{ ...styles.heading, color: theme.screen.text }}>
            Worst 10
          </Text>
          <ScrollView>
            {mostDislikedFoods &&
              mostDislikedFoods?.map((item: Foods) => (
                <StatisticsCard
                  key={item.id}
                  food={item}
                  handleImageSheet={openImageManagementSheet}
                  setSelectedFoodId={setSelectedFoodId}
                />
              ))}
          </ScrollView>
        </View>
      </View>
      {isActive && (
        <BaseBottomSheet
          ref={imageManagementSheetRef}
          index={-1}
          backgroundStyle={{
            ...styles.sheetBackground,
            backgroundColor: theme.sheet.sheetBg,
          }}
          handleComponent={null}
          enablePanDownToClose
          enableHandlePanningGesture={false}
          enableContentPanningGesture={false}
          onClose={closeImageManagementSheet}
        >
          <ImageManagementSheet
            closeSheet={closeImageManagementSheet}
            selectedFoodId={selectedFoodId}
            handleFetch={fetchFoods}
            fileName='foods'
          />
        </BaseBottomSheet>
      )}
    </View>
  );
};

export default index;
