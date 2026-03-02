import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AntDesign, FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
        CollectibleAt,
        FoodSortOption,
        intelligentSort,
        sortByEatingHabits,
        sortByFoodCategory,
        sortByFoodName,
        sortByFoodOfferCategory,
        sortByOwnFavorite,
        sortByPrice,
        sortByPublicFavorite,
} from 'repo-depkit-common';
import { useDispatch, useSelector } from 'react-redux';

import CollectibleSpot from '@/components/CollectibleItem/CollectibleSpot';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import SettingsListSelectOption from '@/components/SettingsListSelectOption/SettingsListSelectOption';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';
import { SET_SELECTED_CANTEEN_FOOD_OFFERS, SET_SORTING } from '@/redux/Types/types';

interface SortSheetProps {
        closeSheet: () => void;
}

const styles = StyleSheet.create({
        sortingListContainer: {
                width: '100%',
                paddingHorizontal: 10,
                marginTop: 12,
        },
});

export const SortSheet: React.FC<SortSheetProps> = ({ closeSheet }) => {
        const { translate } = useLanguage();

        const dispatch = useDispatch();
        const { canteenFoodOffers } = useSelector((state: RootState) => state.canteenReducer);
        const { primaryColor, language: languageCode, sortBy, appSettings } = useSelector((state: RootState) => state.settings);
        const { ownFoodFeedbacks, foodCategories, foodOfferCategories } = useSelector((state: RootState) => state.food);
        const { profile } = useSelector((state: RootState) => state.authReducer);
        const [selectedOption, setSelectedOption] = useState<FoodSortOption | null>(null);
        const foods_area_color = appSettings?.foods_area_color ? appSettings?.foods_area_color : primaryColor;

        const sortingOptions = [
                {
                        id: FoodSortOption.INTELLIGENT,
                        label: 'sort_option_intelligent',
                        icon: <MaterialCommunityIcons name="brain" size={24} />,
                },
                {
                        id: FoodSortOption.FAVORITE,
                        label: 'sort_option_favorite',
                        icon: <AntDesign name="heart" size={24} />,
                },
                {
                        id: FoodSortOption.EATING,
                        label: 'eating_habits',
                        icon: <Ionicons name="bag-add" size={24} />,
                },
                {
                        id: FoodSortOption.FOOD_CATEGORY,
                        label: 'sort_option_food_category',
                        icon: <MaterialCommunityIcons name="food" size={24} />,
                },
                {
                        id: FoodSortOption.FOODOFFER_CATEGORY,
                        label: 'sort_option_foodoffer_category',
                        icon: <MaterialCommunityIcons name="food-variant" size={24} />,
                },
                {
                        id: FoodSortOption.RATING,
                        label: 'sort_option_public_rating',
                        icon: <AntDesign name="star" size={24} />,
                },
                {
                        id: FoodSortOption.PRICE_ASCENDING,
                        label: 'sort_option_price_ascending',
                        icon: <FontAwesome5 name="sort-numeric-up" size={24} />,
                },
                {
                        id: FoodSortOption.PRICE_DESCENDING,
                        label: 'sort_option_price_descending',
                        icon: <FontAwesome5 name="sort-numeric-down" size={24} />,
                },
                {
                        id: FoodSortOption.ALPHABETICAL,
                        label: 'sort_option_alphabetical',
                        icon: <FontAwesome5 name="sort-alpha-down" size={24} />,
                },
                {
                        id: FoodSortOption.NONE,
                        label: 'sort_option_none',
                        icon: <MaterialCommunityIcons name="sort-variant-remove" size={24} />,
                },
        ];

        const updateSort = (option: { id: FoodSortOption }) => {
                setSelectedOption(option.id);
                dispatch({ type: SET_SORTING, payload: option.id });

                let copiedFoodOffers = [...canteenFoodOffers];

                switch (option.id) {
                        case FoodSortOption.ALPHABETICAL:
                                copiedFoodOffers = sortByFoodName(copiedFoodOffers, languageCode);
                                break;
                        case FoodSortOption.FAVORITE:
                                copiedFoodOffers = sortByOwnFavorite(copiedFoodOffers, ownFoodFeedbacks);
                                break;
                        case FoodSortOption.EATING:
                                copiedFoodOffers = sortByEatingHabits(copiedFoodOffers, profile.markings);
                                break;
                        case FoodSortOption.FOOD_CATEGORY:
                                copiedFoodOffers = sortByFoodCategory(copiedFoodOffers, foodCategories, languageCode);
                                break;
                        case FoodSortOption.FOODOFFER_CATEGORY:
                                copiedFoodOffers = sortByFoodOfferCategory(copiedFoodOffers, foodOfferCategories);
                                break;
                        case FoodSortOption.RATING:
                                copiedFoodOffers = sortByPublicFavorite(copiedFoodOffers);
                                break;
                        case FoodSortOption.PRICE_ASCENDING:
                                copiedFoodOffers = sortByPrice(copiedFoodOffers, profile?.price_group, false);
                                break;
                        case FoodSortOption.PRICE_DESCENDING:
                                copiedFoodOffers = sortByPrice(copiedFoodOffers, profile?.price_group, true);
                                break;
                        case FoodSortOption.INTELLIGENT:
                                copiedFoodOffers = intelligentSort(
                                        copiedFoodOffers,
                                        ownFoodFeedbacks,
                                        profile.markings,
                                        languageCode,
                                        foodCategories,
                                        foodOfferCategories
                                );
                                break;
                        default:
                                console.warn('Unknown sorting option:', option.id);
                                break;
                }

                dispatch({
                        type: SET_SELECTED_CANTEEN_FOOD_OFFERS,
                        payload: copiedFoodOffers,
                });
                closeSheet();
        };

        useEffect(() => {
                setSelectedOption(sortBy as FoodSortOption);
        }, [sortBy]);

        return (
                <View style={{ width: '100%', gap: 12 }}>
                        <CollectibleSpot collectibleKey={CollectibleAt.collectible_at_foodoffers_sort} />
                        <View style={styles.sortingListContainer}>
                                <SettingsListSelectOption
                                        options={sortingOptions.map((option) => ({
                                                ...option,
                                                label: translate(option.label),
                                        }))}
                                        selectedOption={selectedOption}
                                        onSelect={updateSort}
                                        iconBgColor={foods_area_color}
                                />
                        </View>
                </View>
        );
};

export const useFoodofferSortingModal = () => {
        const { show: showScrollViewModal, close: closeScrollViewModal } = useMyScrollViewModal();
        const { translate } = useLanguage();
        const openFoodofferSortingModal = useCallback(() => {
                showScrollViewModal(
                        {
                                title: translate(TranslationKeys.sort),
                                onClose: closeScrollViewModal,
                                children: <SortSheet closeSheet={closeScrollViewModal} />,
                        }
                );
        }, [closeScrollViewModal, showScrollViewModal, translate]);

        return { openFoodofferSortingModal };
};

export default useFoodofferSortingModal;
