import React, { useEffect, useState, useCallback } from 'react';
import {
  FlatList,
  Text,
  View,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import {
  Ionicons,
  FontAwesome6,
  Entypo,
  MaterialIcons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';
import useSelectedCanteen from '@/hooks/useSelectedCanteen';
import { fetchFoodOffersByCanteen } from '@/redux/actions/FoodOffers/FoodOffers';
import { DatabaseTypes } from 'repo-depkit-common';
import { addDays, format } from 'date-fns';
import { useNavigation, router } from 'expo-router';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import FoodItem from '@/components/FoodItem/FoodItem';
import CanteenFeedbackLabels from '@/components/CanteenFeedbackLabels/CanteenFeedbackLabels';
import { CanteenFeedbackLabelHelper } from '@/redux/actions/CanteenFeedbacksLabel/CanteenFeedbacksLabel';
import { SET_CANTEEN_FEEDBACK_LABELS, SET_SELECTED_DATE } from '@/redux/Types/types';
import styles from './styles';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { TranslationKeys } from '@/locales/keys';
import { useLanguage } from '@/hooks/useLanguage';

interface DayData {
  date: string;
  offers: DatabaseTypes.Foodoffers[];
}

const FoodOffersScroll = () => {
  useSetPageTitle('FoodOffersScroll');
  const { translate } = useLanguage();
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const selectedCanteen = useSelectedCanteen();
  const { selectedDate } = useSelector((state: RootState) => state.food);
  const { profile } = useSelector((state: RootState) => state.authReducer);
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get('window').width,
  );
  const { canteenFeedbackLabels } = useSelector(
    (state: RootState) => state.canteenReducer,
  );
  const [days, setDays] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // This screen only supports scrolling forward in time
  // so we don't maintain loading state for previous days
  const navigation = useNavigation<DrawerNavigationProp<any>>();

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => sub?.remove();
  }, []);

  const loadDay = useCallback(async (date: string) => {
    const canteenId = selectedCanteen?.id as string;
    try {
      const res = await fetchFoodOffersByCanteen(canteenId, date);
      const offers = res?.data || [];
      return { date, offers } as DayData;
    } catch (e) {
      console.error('Error loading food offers', e);
      return { date, offers: [] } as DayData;
    }
  }, [selectedCanteen]);

  const init = useCallback(async () => {
    setLoading(true);
    const baseDate = new Date(selectedDate);
    // start with the selected date and the following two days
    const toLoad = [0, 1, 2];
    const loaded: DayData[] = [];
    for (const offset of toLoad) {
      const d = addDays(baseDate, offset).toISOString().split('T')[0];
      loaded.push(await loadDay(d));
    }
    setDays(loaded);
    setLoading(false);
  }, [selectedDate, loadDay]);

  useEffect(() => {
    init();
  }, [init]);

  const fetchCanteenLabels = useCallback(async () => {
    try {
      const helper = new CanteenFeedbackLabelHelper();
      const labels =
        (await helper.fetchCanteenFeedbackLabels()) as DatabaseTypes.CanteensFeedbacksLabels[];
      dispatch({ type: SET_CANTEEN_FEEDBACK_LABELS, payload: labels });
    } catch (e) {
      console.error('Error fetching Canteen Feedback Labels:', e);
    }
  }, [dispatch]);

  useEffect(() => {
    if (!canteenFeedbackLabels || canteenFeedbackLabels.length === 0) {
      fetchCanteenLabels();
    }
  }, [fetchCanteenLabels]);

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

  const handleScroll = (_e: NativeSyntheticEvent<NativeScrollEvent>) => {
    // Intentionally left blank to disable loading previous days
  };

  const getPriceGroup = (price_group: string) => {
    if (price_group) {
      return `price_group_${price_group.toLocaleLowerCase()}`;
    }
    return '';
  };

  const getDayLabel = (date: string) => {
    const currentDate = new Date();
    const day = new Date(date);

    currentDate.setHours(0, 0, 0, 0);
    day.setHours(0, 0, 0, 0);

    if (currentDate.toDateString() === day.toDateString()) {
      return 'today';
    }

    currentDate.setDate(currentDate.getDate() - 1);
    if (currentDate.toDateString() === day.toDateString()) {
      return 'yesterday';
    }

    currentDate.setDate(currentDate.getDate() + 2);
    if (currentDate.toDateString() === day.toDateString()) {
      return 'tomorrow';
    }

    return format(day, 'dd.MM.yyyy');
  };

  const handleDateChange = (direction: 'prev' | 'next') => {
    const currentDate = new Date(selectedDate);
    if (direction === 'prev') {
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    dispatch({
      type: SET_SELECTED_DATE,
      payload: currentDate.toISOString().split('T')[0],
    });
    init();
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
          {item.offers.map((offer) => (
            <FoodItem
              key={offer.id}
              item={offer}
              canteen={selectedCanteen}
              handleMenuSheet={() => {}}
              handleImageSheet={() => {}}
              handleEatingHabitsSheet={() => {}}
              setSelectedFoodId={() => {}}
            />
          ))}
          {item.offers.length === 0 && (
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

  const listHeader = (
    <View style={[styles.header, { backgroundColor: theme.header.background }]}>
      <View style={styles.row}>
        <View style={styles.col1}>
          <TouchableOpacity onPress={() => navigation.toggleDrawer()}>
            <Ionicons name='menu' size={24} color={theme.header.text} />
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={{ ...styles.heading, color: theme.header.text }}>
              {selectedCanteen?.alias || translate(TranslationKeys.food_offers)}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ ...styles.col2, gap: 10 }}>
          <TouchableOpacity onPress={() => router.navigate('/price-group')}>
            <FontAwesome6 name='euro-sign' size={24} color={theme.header.text} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.row}>
        <View style={{ ...styles.col2, gap: 10 }}>
          <TouchableOpacity onPress={() => handleDateChange('prev')}>
            <Entypo name='chevron-left' size={24} color={theme.header.text} />
          </TouchableOpacity>
          <TouchableOpacity>
            <MaterialIcons name='calendar-month' size={24} color={theme.header.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDateChange('next')}>
            <Entypo name='chevron-right' size={24} color={theme.header.text} />
          </TouchableOpacity>
          <Text style={{ ...styles.heading, color: theme.header.text }}>
            {selectedDate ? translate(getDayLabel(selectedDate)) : ''}
          </Text>
        </View>
        <View style={{ ...styles.col2, gap: 10 }}>
          <TouchableOpacity>
            <FontAwesome6 name='people-group' size={24} color={theme.header.text} />
          </TouchableOpacity>
          <TouchableOpacity>
            <MaterialCommunityIcons name='clock-time-eight' size={24} color={theme.header.text} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <FlatList
      data={days}
      keyExtractor={(item) => item.date}
      renderItem={renderDay}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={listHeader}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      contentContainerStyle={{ backgroundColor: theme.screen.background }}
    />
  );
};

export default FoodOffersScroll;
