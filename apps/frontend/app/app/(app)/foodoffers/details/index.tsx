import React, { useCallback } from 'react';
import { SafeAreaView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import FoodOfferDetailsContent from '@/components/FoodOfferDetailsContent/FoodOfferDetailsContent';
import styles from './styles';

export default function FoodDetailsScreen() {
    useSetPageTitle(TranslationKeys.food_details);

    const { id, foodId } = useLocalSearchParams();
    const offerId = Array.isArray(id) ? id[0] : id;
    const initialFoodId = Array.isArray(foodId) ? foodId[0] : foodId;

    const { theme } = useTheme();

    // The offer no longer exists (the food import replaced it): leave the outdated details
    const leaveOutdatedDetails = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(app)/foodoffers');
        }
    }, []);

    return (
        <SafeAreaView
            style={[styles.safeArea, { backgroundColor: theme.screen.background }]}
        >
            <FoodOfferDetailsContent
                offerId={offerId}
                foodId={initialFoodId}
                onOfferNoLongerAvailable={leaveOutdatedDetails}
                showFoodWhenOfferMissing
            />
        </SafeAreaView>
    );
}
