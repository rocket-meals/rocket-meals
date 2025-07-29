import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  View,
  Text,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { addDays, format } from 'date-fns';
import { useTheme } from '@/hooks/useTheme';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';
import { fetchFoodOffersByCanteen } from '@/redux/actions/FoodOffers/FoodOffers';
import { DatabaseTypes } from 'repo-depkit-common';
import FoodItem from '@/components/FoodItem/FoodItem';
import FoodofferInfoItem from '@/components/FoodofferInfoItem/FoodofferInfoItem';
import CanteenFeedbackLabels from '@/components/CanteenFeedbackLabels/CanteenFeedbackLabels';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import {
  intelligentSort,
  sortByEatingHabits,
  sortByFoodCategory,
  sortByFoodName,
  sortByFoodOfferCategory,
  sortByOwnFavorite,
  sortByPublicFavorite,
} from '@/helper/sortingHelper';
import { FoodSortOption } from '@/constants/SortingEnums';
import styles from './styles';

interface FoodOffersScrollListProps {
  canteenId: string;
  startDate: string;
}

interface DayItem {
  foodoffer: DatabaseTypes.Foodoffers | null;
  foodofferInfoItem: DatabaseTypes.FoodoffersInfoItems | null;
}

interface DayData {
  date: string;
  items: DayItem[];
}

const FoodOffersScrollList: React.FC<FoodOffersScrollListProps> = ({
  canteenId,
  startDate,
}) => {
  const { theme } = useTheme();
  const { translate } = useLanguage();
  const { canteenFeedbackLabels, canteens } = useSelector(
    (state: RootState) => state.canteenReducer,
  );
  const { sortBy, language } = useSelector((state: RootState) => state.settings);
  const {
    ownFoodFeedbacks,
    foodCategories,
    foodOfferCategories,
    foodOffersInfoItems,
  } = useSelector((state: RootState) => state.food);
  const { profile } = useSelector((state: RootState) => state.authReducer);
  const selectedCanteen = canteens?.find((c) => c.id === canteenId) as
    | DatabaseTypes.Canteens
    | undefined;
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get('window').width,
  );
  const [days, setDays] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const sortOffers = useCallback(
    (foodOffers: DatabaseTypes.Foodoffers[]) => {
      let copiedFoodOffers = [...foodOffers];

      switch (sortBy as FoodSortOption) {
        case FoodSortOption.ALPHABETICAL:
          copiedFoodOffers = sortByFoodName(copiedFoodOffers, language);
          break;
        case FoodSortOption.FAVORITE:
          copiedFoodOffers = sortByOwnFavorite(copiedFoodOffers, ownFoodFeedbacks);
          break;
        case FoodSortOption.EATING:
          copiedFoodOffers = sortByEatingHabits(copiedFoodOffers, profile.markings);
          break;
        case FoodSortOption.FOOD_CATEGORY:
          copiedFoodOffers = sortByFoodCategory(copiedFoodOffers, foodCategories, language);
          break;
        case FoodSortOption.FOODOFFER_CATEGORY:
          copiedFoodOffers = sortByFoodOfferCategory(copiedFoodOffers, foodOfferCategories);
          break;
        case FoodSortOption.RATING:
          copiedFoodOffers = sortByPublicFavorite(copiedFoodOffers);
          break;
        case FoodSortOption.INTELLIGENT:
          copiedFoodOffers = intelligentSort(
            copiedFoodOffers,
            ownFoodFeedbacks,
            profile.markings,
            language,
            foodCategories,
            foodOfferCategories,
          );
          break;
        default:
          break;
      }

      return copiedFoodOffers;
    },
    [sortBy, language, ownFoodFeedbacks, profile.markings, foodCategories, foodOfferCategories],
  );

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => sub?.remove();
  }, []);

  useEffect(() => {
    setDays((prev) =>
      prev.map((d) => {
        const startInfo = d.items
          .filter((i) => i.foodofferInfoItem && (i.foodofferInfoItem.placement === 'start' || !i.foodofferInfoItem.placement))
          .sort((a, b) => ((a.foodofferInfoItem?.sort || 0) - (b.foodofferInfoItem?.sort || 0)));
        const endInfo = d.items
          .filter((i) => i.foodofferInfoItem && i.foodofferInfoItem.placement === 'end')
          .sort((a, b) => ((a.foodofferInfoItem?.sort || 0) - (b.foodofferInfoItem?.sort || 0)));
        const offers = d.items
          .filter((i) => i.foodoffer)
          .map((i) => i.foodoffer as DatabaseTypes.Foodoffers);
        const sortedOffers = sortOffers(offers).map((o) => ({ foodoffer: o, foodofferInfoItem: null }));
        return { ...d, items: [...startInfo, ...sortedOffers, ...endInfo] } as DayData;
      }),
    );
  }, [sortOffers]);

  const loadDay = useCallback(
    async (date: string) => {
      try {
        const res = await fetchFoodOffersByCanteen(canteenId, date);
        const offers = res?.data || [];
        const sortedOffers = sortOffers(offers);

        const infoItems = foodOffersInfoItems.filter(
          (i) => !i.canteen || i.canteen === canteenId,
        );
        const filteredInfo =
          sortedOffers.length > 0
            ? infoItems.filter((i) => !i.show_only_when_no_foodoffers_found)
            : infoItems;
        const sortedInfo = [...filteredInfo].sort(
          (a, b) => (a.sort || 0) - (b.sort || 0),
        );

        const startInfo = sortedInfo.filter(
          (i) => i.placement === 'start' || !i.placement,
        );
        const endInfo = sortedInfo.filter((i) => i.placement === 'end');

        const items: DayItem[] = [
          ...startInfo.map((i) => ({ foodoffer: null, foodofferInfoItem: i })),
          ...sortedOffers.map((o) => ({ foodoffer: o, foodofferInfoItem: null })),
          ...endInfo.map((i) => ({ foodoffer: null, foodofferInfoItem: i })),
        ];
        return { date, items } as DayData;
      } catch (e) {
        console.error('Error loading food offers', e);
        return { date, items: [] } as DayData;
      }
    },
    [canteenId, sortOffers, foodOffersInfoItems],
  );

  const init = useCallback(async () => {
    setLoading(true);
    const baseDate = new Date(startDate);
    const toLoad = [0, 1, 2];
    const loaded: DayData[] = [];
    for (const offset of toLoad) {
      const d = addDays(baseDate, offset).toISOString().split('T')[0];
      loaded.push(await loadDay(d));
    }
    setDays(loaded);
    setLoading(false);
  }, [startDate, loadDay]);

  useEffect(() => {
    init();
  }, [init]);

  const loadNext = async () => {
    const lastDate = days[days.length - 1].date;
    const nextDate = addDays(new Date(lastDate), 1).toISOString().split('T')[0];
    const nextDay = await loadDay(nextDate);
    setDays((prev) => [...prev, nextDay]);
  };

  const onEndReached = () => {
    loadNext();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await init();
    setRefreshing(false);
  };

  const renderDay = ({ item }: { item: DayData }) => {
    const feedbacks = canteenFeedbackLabels?.map((label, idx) => (
      <CanteenFeedbackLabels key={`fl-${idx}`} label={label} date={item.date} />
    ));

    return (
      <View style={styles.dayContainer}>
        <Text style={[styles.dateHeader, { color: theme.screen.text }]}> {format(new Date(item.date), 'dd.MM.yyyy')} </Text>
        <View
          style={{
            ...styles.foodContainer,
            gap: screenWidth > 550 ? 10 : 10,
            justifyContent: 'center',
          }}
        >
          {item.items.map((entry) =>
            entry.foodoffer ? (
              <FoodItem
                key={entry.foodoffer.id}
                item={entry.foodoffer}
                canteen={selectedCanteen as DatabaseTypes.Canteens}
                handleMenuSheet={() => {}}
                handleImageSheet={() => {}}
                handleEatingHabitsSheet={() => {}}
                setSelectedFoodId={() => {}}
              />
            ) : entry.foodofferInfoItem ? (
              <FoodofferInfoItem key={entry.foodofferInfoItem.id} item={entry.foodofferInfoItem} />
            ) : null,
          )}
          {item.items.length === 0 && (
            <Text style={{ color: theme.screen.text }}>
              {translate(TranslationKeys.no_foodoffers_found_for_selection)}
            </Text>
          )}
        </View>
        {feedbacks && feedbacks.length > 0 && (
          <View style={styles.feebackContainer}>{feedbacks}</View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: theme.screen.background }]}> 
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      data={days}
      keyExtractor={(item) => item.date}
      renderItem={renderDay}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      scrollEventThrottle={16}
      style={{ flex: 1 }}
      contentContainerStyle={{ backgroundColor: theme.screen.background }}
    />
  );
};

export default FoodOffersScrollList;
