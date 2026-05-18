import React, { memo } from 'react';
import { Text, View } from 'react-native';
import styles from '../styles';
import { TranslationKeys } from '@/locales/keys';
import { SET_SELECTED_DATE } from '@/redux/Types/types';
import AppButton from '@/components/AppButton';

import AppLoadingView from '@/components/AppLoadingView';

interface ListEmptyComponentProps {
    loading: boolean;
    theme: any;
    translate: (key: string) => string;
    renderLottie: React.ReactNode;
    nextAvailableDate: string | null;
    dispatch: any;
    foods_area_color: string;
    contrastColor: string;
    getWeekdayKey: (date: string) => string;
}

const ListEmptyComponent: React.FC<ListEmptyComponentProps> = ({
    loading,
    theme,
    translate,
    renderLottie,
    nextAvailableDate,
    dispatch,
    foods_area_color,
    contrastColor,
    getWeekdayKey,
}) => {
    if (loading) {
        return (
            <AppLoadingView color={theme.screen.icon} size="large" />
        );
    }
    return (
        <View style={styles.noFoodContainer}>
            <Text style={[styles.noFoodOffer, { color: theme.screen.text }]}>
                {translate(TranslationKeys.no_foodoffers_found_for_selection)}
            </Text>
            <View style={styles.animationContainer}>{renderLottie}</View>
            {nextAvailableDate && (
                <AppButton
                    variant="ghost"
                    usePlainText
                    text={`${translate(TranslationKeys.show_offers_on)} ${translate(
                        TranslationKeys[getWeekdayKey(nextAvailableDate) as keyof typeof TranslationKeys]
                    )}`}
                    onPress={() => dispatch({ type: SET_SELECTED_DATE, payload: nextAvailableDate })}
                    style={[styles.jumpButton, { backgroundColor: foods_area_color, marginVertical: 0 }]}
                    textStyle={[styles.jumpButtonText, { color: contrastColor }]}
                />
            )}
        </View>
    );
};

export default memo(ListEmptyComponent);
