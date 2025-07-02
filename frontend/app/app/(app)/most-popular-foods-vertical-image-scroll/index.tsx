import { View, Dimensions, TouchableOpacity, Text } from 'react-native';
import React, { useEffect, useState } from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';
import CardDimensionHelper from '@/helper/CardDimensionHelper';
import AutoImageScroller from '@/components/AutoImageScroller';
import FoodImage from '@/components/FoodImage';
import { loadMostPopularFoodsWithImages } from '@/helper/FoodHelper';
import { Ionicons } from '@expo/vector-icons';
import { Foods } from '@/constants/types';

const MostPopularFoodsVerticalImageScroll = () => {
  useSetPageTitle(TranslationKeys.most_popular_foods_vertical_image_scroll);
  const { theme } = useTheme();
  const { amountColumnsForcard } = useSelector((state: RootState) => state.settings);
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

  const numColumns = CardDimensionHelper.getNumColumns(screenWidth, amountColumnsForcard);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => sub?.remove();
  }, []);

  const size =
    amountColumnsForcard === 0
      ? CardDimensionHelper.getCardDimension(screenWidth)
      : CardDimensionHelper.getCardWidth(screenWidth, numColumns);

  const [foods, setFoods] = useState<Foods[]>([]);

  useEffect(() => {
    const fetchFoods = async () => {
      try {
        const data = await loadMostPopularFoodsWithImages(100);
        setFoods(data);
      } catch (e) {
        console.error('Error fetching foods', e);
      }
    };
    fetchFoods();
  }, []);

  const [speedPercent, setSpeedPercent] = useState(5);

  return (
    <View
      key={amountColumnsForcard}
      style={[styles.container, { backgroundColor: theme.screen.background }]}
    >
      <View style={styles.controls}>
        <TouchableOpacity onPress={() => setSpeedPercent((s) => Math.max(1, s - 1))}>
          <Ionicons name='remove' size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={{ color: theme.primary }}>{Math.round(speedPercent)}%/s</Text>
        <TouchableOpacity onPress={() => setSpeedPercent((s) => s + 1)}>
          <Ionicons name='add' size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>
      <AutoImageScroller
        images={foods}
        numColumns={numColumns}
        size={size}
        speedPercent={speedPercent}
        loadMore={() => {}}
        renderItem={(item) => (
          <FoodImage
            image={item.image}
            imageRemoteUrl={item.image_remote_url}
            size={size}
            style={styles.image}
          />
        )}
      />
    </View>
  );
};

export default MostPopularFoodsVerticalImageScroll;
