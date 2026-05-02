import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Dimensions, Platform, Image } from 'react-native';
import { useDispatch, useStore, shallowEqual } from 'react-redux';
import { DatabaseTypes, FoodSortOption, sortBySortField } from 'repo-depkit-common';
import { addDays, format, parse } from 'date-fns';
import { fetchFoodOffersByCanteen } from '@/redux/actions/FoodOffers/FoodOffers';
import { sortFoodOffers } from '@/helper/foodOfferSortHelper';
import { runAfterInteractions } from '@/helper/interactionHelper';

const parseDateOnly = (date: string): Date => {
    const [year, month, day] = date.split('-').map(Number);
    if (!year || !month || !day) {
        return new Date(date);
    }
    return new Date(year, month - 1, day);
};
import {
    SET_SELECTED_CANTEEN_FOOD_OFFERS,
    SET_SELECTED_CANTEEN_FOOD_OFFERS_LOCAL,
    SET_CANTEEN_FEEDBACK_LABELS,
    SET_SELECTED_DATE
} from '@/redux/Types/types';
import { CanteenFeedbackLabelHelper } from '@/redux/actions/CanteenFeedbacksLabel/CanteenFeedbacksLabel';
import * as Notifications from 'expo-notifications';
import LottieView from 'lottie-react-native';
import noFoodOffersFound from '@/assets/animations/noFoodOffersFound.json';
import { replaceLottieColors } from '@/helper/animationHelper';
import { useFocusEffect } from 'expo-router';
import BottomSheet from '@gorhom/bottom-sheet';
import { useAppSelector } from '@/redux/hooks';
import { RootState } from '@/redux/reducer';

// --- Types ---
export interface DayItem {
    foodoffer: DatabaseTypes.Foodoffers | null;
    foodofferInfoItem: DatabaseTypes.FoodoffersInfoItems | null;
}

export const useLayoutConfig = (amountColumnsForcard?: number) => {
    const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
    const [listWidth, setListWidth] = useState<number | null>(null);

    useEffect(() => {
        const handleResize = () => setScreenWidth(Dimensions.get('window').width);
        const subscription = Dimensions.addEventListener('change', handleResize);
        return () => subscription?.remove();
    }, []);

    const MIN_CARD_WIDTH = 280;
    const numColumns = useMemo(() => {
        if (amountColumnsForcard && amountColumnsForcard > 0) {
            return amountColumnsForcard;
        }
        if (!listWidth) return 2;
        const cols = Math.floor(listWidth / MIN_CARD_WIDTH);
        return Math.max(2, cols);
    }, [amountColumnsForcard, listWidth]);

    const cardWidth = useMemo(() => {
        if (!listWidth || !numColumns) return undefined;
        const horizontalMargin = 10;
        const totalMargin = horizontalMargin * 2 * numColumns;
        const availableWidth = listWidth - totalMargin;
        return availableWidth / numColumns;
    }, [listWidth, numColumns]);

    const itemGap = useMemo(() => {
        if (screenWidth >= 1600) return 28;
        if (screenWidth >= 1300) return 24;
        if (screenWidth >= 1000) return 20;
        if (screenWidth >= 700) return 16;
        if (screenWidth >= 500) return 12;
        if (screenWidth >= 300) return 10;
        return 8;
    }, [screenWidth]);

    return { screenWidth, listWidth, setListWidth, numColumns, cardWidth, itemGap };
};

export const useFoodOffersData = (
    selectedCanteen: DatabaseTypes.Canteens | null,
    selectedDate: string,
    sortBy: string | undefined,
    languageCode: string,
    profile: any,
) => {
    const dispatch = useDispatch();
    const store = useStore();

    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [prefetchedFoodOffers, setPrefetchedFoodOffers] = useState<Record<string, DatabaseTypes.Foodoffers[]>>({});
    const [feedbackLabelsLoading, setFeedbackLabelsLoading] = useState(true);
    const canteenFeedbackLabelHelper = useMemo(() => new CanteenFeedbackLabelHelper(), []);

    const prefetchedKeys = useRef<Set<string>>(new Set());
    
    // Refs to stabilize callbacks and prevent unnecessary re-renders/fetches
    const stateRef = useRef({
        profile,
        languageCode
    });

    const currentFoodOffers = useAppSelector((state: RootState) => state.canteenReducer.canteenFoodOffers, shallowEqual);

    useEffect(() => {
        stateRef.current = {
            profile,
            languageCode
        };
    }, [profile, languageCode]);

    const getCacheKey = (canteenId: string, date: string) => {
        return `${canteenId}_${format(new Date(date), 'dd.MM.yyyy')}`;
    };

    const getCachedOffers = useCallback((canteenId: string, date: string) => {
        return prefetchedFoodOffers[getCacheKey(canteenId, date)];
    }, [prefetchedFoodOffers]);

    const updateSort = useCallback((id: FoodSortOption, foodOffers: DatabaseTypes.Foodoffers[]) => {
        const { profile, languageCode } = stateRef.current;
        const state = store.getState() as RootState;
        const { ownFoodFeedbacks, foodCategories, foodOfferCategories } = state.food;

        const sortedOffers = sortFoodOffers(id, foodOffers, {
            languageCode,
            ownFoodFeedbacks,
            profile: profile || { markings: [] },
            foodCategories,
            foodOfferCategories,
        });
        dispatch({ type: SET_SELECTED_CANTEEN_FOOD_OFFERS, payload: sortedOffers });
    }, [dispatch, store]); // store is stable

    const fetchFoods = useCallback(async (forceFetch = false) => {
        const canteenId = selectedCanteen?.id as string;
        if (!canteenId || !selectedDate) return;

        let foodOffers = getCachedOffers(canteenId, selectedDate);
        const cacheKey = getCacheKey(canteenId, selectedDate);

        // Optimization: Use cached data immediately if available and not forcing fetch
        if (foodOffers && !forceFetch) {
            // Always resort with current sortBy to reflect UI changes
            updateSort(sortBy as FoodSortOption, foodOffers);
            // Dispatch local raw offers only if reference changed
            if (foodOffers !== currentFoodOffers) {
                dispatch({ type: SET_SELECTED_CANTEEN_FOOD_OFFERS_LOCAL, payload: foodOffers });
            }
        } else {
            try {
                setLoading(true);
                const foodData = await fetchFoodOffersByCanteen(canteenId, selectedDate);
                foodOffers = foodData?.data || [];
                
                // Update cache and dispatch
                setPrefetchedFoodOffers(prev => ({ ...prev, [cacheKey]: foodOffers }));
                prefetchedKeys.current.add(cacheKey);
                
                // Always resort with current sortBy to reflect UI changes
                updateSort(sortBy as FoodSortOption, foodOffers);
                // Dispatch local raw offers only if reference changed
                if (foodOffers !== currentFoodOffers) {
                    dispatch({ type: SET_SELECTED_CANTEEN_FOOD_OFFERS_LOCAL, payload: foodOffers });
                }
            } catch (error) {
                console.error('Error fetching Food Offers:', error);
            } finally {
                setLoading(false);
            }
        }

        // Prefetch next 2 days in background
        runAfterInteractions(() => {
            for (let i = 1; i <= 2; i++) {
                const date = format(addDays(parseDateOnly(selectedDate), i), 'yyyy-MM-dd');
                const nextCacheKey = getCacheKey(canteenId, date);
                
                // Check if already fetched or in progress to prevent duplicate calls
                if (!prefetchedKeys.current.has(nextCacheKey) && !prefetchedFoodOffers[nextCacheKey]) {
                    prefetchedKeys.current.add(nextCacheKey);
                    fetchFoodOffersByCanteen(canteenId, date)
                        .then(res => {
                            const offers = res?.data || [];
                            setPrefetchedFoodOffers(p => ({ ...p, [nextCacheKey]: offers }));
                        })
                        .catch(e => {
                            console.error('Error prefetching Food Offers:', e);
                            prefetchedKeys.current.delete(nextCacheKey); // Allow retry on error
                        });
                }
            }
        });
    }, [selectedCanteen, selectedDate, getCachedOffers, prefetchedFoodOffers, updateSort, sortBy, dispatch, currentFoodOffers]);

    const fetchCanteenLabels = useCallback(async () => {
        try {
            setFeedbackLabelsLoading(true);
            const labels = (await canteenFeedbackLabelHelper.fetchCanteenFeedbackLabels()) as DatabaseTypes.CanteensFeedbacksLabels[];
            dispatch({ type: SET_CANTEEN_FEEDBACK_LABELS, payload: labels });
        } catch (error) {
            console.error('Error fetching Canteen Feedback Labels:', error);
        } finally {
            setFeedbackLabelsLoading(false);
        }
    }, [canteenFeedbackLabelHelper, dispatch]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        Promise.all([fetchFoods(true), fetchCanteenLabels()]).finally(() => setRefreshing(false));
    }, [fetchFoods, fetchCanteenLabels]);

    useEffect(() => {
        runAfterInteractions(() => {
            fetchFoods();
        });
    }, [selectedCanteen, selectedDate]); // Removed updateSort and others to prevent loops, relying on fetchFoods dependencies

    useEffect(() => {
        runAfterInteractions(() => {
            fetchCanteenLabels();
        });
    }, [fetchCanteenLabels]);

    const cachedFoodOfferDates = useMemo(() => {
        const canteenId = selectedCanteen?.id;
        if (!canteenId) return [];

        return Object.keys(prefetchedFoodOffers)
            .filter(key => key.startsWith(`${canteenId}_`))
            .map(key => key.replace(`${canteenId}_`, ''))
            .map(date => parse(date, 'dd.MM.yyyy', new Date()))
            .filter(date => !Number.isNaN(date.getTime()))
            .sort((a, b) => a.getTime() - b.getTime())
            .map(date => format(date, 'yyyy-MM-dd'));
    }, [prefetchedFoodOffers, selectedCanteen]);

    const nextAvailableDate = useMemo(() => {
        const canteenId = selectedCanteen?.id as string;
        for (let i = 1; i <= 2; i++) {
            const date = format(addDays(parseDateOnly(selectedDate), i), 'yyyy-MM-dd');
            const offers = getCachedOffers(canteenId, date);
            if (offers && offers.length > 0) return date;
        }
        return null;
    }, [prefetchedFoodOffers, selectedCanteen, selectedDate, getCachedOffers]);

    return {
        loading,
        refreshing,
        onRefresh,
        fetchFoods,
        feedbackLabelsLoading,
        cachedFoodOfferDates,
        nextAvailableDate
    };
};

export const useSheetHandling = (
    openFoodofferSortingModal: () => void
) => {
    const bottomSheetRef = useRef<BottomSheet>(null);
    const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
    const [sheetProps, setSheetProps] = useState<Record<string, any>>({});
    // Optimization: Keep sheet active to prevent unmount/remount on navigation
    const [isActive, setIsActive] = useState(true);

    const openSheet = useCallback((sheet: 'menu' | 'sort' | string, props = {}) => {
        if (sheet === 'sort') {
            openFoodofferSortingModal();
            return;
        }
        setSelectedSheet(sheet);
        setSheetProps(props);
    }, [openFoodofferSortingModal]);

    const closeSheet = useCallback(() => {
        bottomSheetRef.current?.snapToIndex(-1);
        bottomSheetRef.current?.close();
        setTimeout(() => {
            setSelectedSheet(null);
            setSheetProps({});
        }, 150);
    }, []);

    useEffect(() => {
        if (isActive && selectedSheet) {
            setTimeout(() => bottomSheetRef.current?.expand(), 150);
        }
    }, [selectedSheet, isActive]);

    return {
        bottomSheetRef,
        selectedSheet,
        sheetProps,
        openSheet,
        closeSheet,
        isActive
    };
};

export const useNotifications = () => {
    const requestPermissions = async () => {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
            await Notifications.requestPermissionsAsync();
        }
    };
    useEffect(() => {
        if (Platform.OS !== 'web') requestPermissions();
    }, []);
};

export const useAnimationLogic = (
    appSettings: any,
    foods_area_color: string
) => {
    const [autoPlay, setAutoPlay] = useState(appSettings?.animations_auto_start);
    const [animationJson, setAmimationJson] = useState<any>(null);
    const animationRef = useRef<LottieView>(null);

    // Optimization: Load animation once and keep it. Don't re-parse on every focus.
    useEffect(() => {
        runAfterInteractions(() => {
            setAmimationJson(replaceLottieColors(noFoodOffersFound, foods_area_color));
        });
    }, [foods_area_color]);

    // Optimization: Only update autoplay setting when it changes, don't toggle on focus
    useEffect(() => {
        setAutoPlay(appSettings?.animations_auto_start);
    }, [appSettings?.animations_auto_start]);

    useEffect(() => {
        if (animationJson && autoPlay && animationRef.current) {
            animationRef.current.play();
        }
    }, [animationJson, autoPlay]);

    return { animationRef, animationJson, autoPlay };
};

export const useDateNavigation = (selectedDate: string) => {
    const dispatch = useDispatch();
    const handleDateChange = useCallback((direction: 'prev' | 'next') => {
        const currentDate = parseDateOnly(selectedDate);
        if (direction === 'prev') currentDate.setDate(currentDate.getDate() - 1);
        else currentDate.setDate(currentDate.getDate() + 1);
        dispatch({ type: SET_SELECTED_DATE, payload: format(currentDate, 'yyyy-MM-dd') });
    }, [selectedDate, dispatch]);

    const getDayLabel = useCallback((date: string) => {
        const currentDate = new Date();
        const day = parseDateOnly(date);
        currentDate.setHours(0, 0, 0, 0);
        day.setHours(0, 0, 0, 0);
        if (currentDate.toDateString() === day.toDateString()) return 'today';
        currentDate.setDate(currentDate.getDate() - 1);
        if (currentDate.toDateString() === day.toDateString()) return 'yesterday';
        currentDate.setDate(currentDate.getDate() + 2);
        if (currentDate.toDateString() === day.toDateString()) return 'tomorrow';
        return format(day, 'dd.MM.yyyy');
    }, []);

    const getWeekdayKey = useCallback((date: string) => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return days[parseDateOnly(date).getDay()];
    }, []);

    return { handleDateChange, getDayLabel, getWeekdayKey };
};
