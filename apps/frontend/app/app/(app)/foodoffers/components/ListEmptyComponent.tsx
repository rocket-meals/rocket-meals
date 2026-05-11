import React, { memo } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import styles from '../styles';
import { TranslationKeys } from '@/locales/keys';
import { SET_SELECTED_DATE } from '@/redux/Types/types';

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
            <View style={styles.loadingContainer}>
                <ActivityIndicator size={'large'} color={theme.screen.icon} />
            </View>
        );
    }
    return (
        <View style={styles.noFoodContainer}>
            <Text style={[styles.noFoodOffer, { color: theme.screen.text }]}>
                {translate(TranslationKeys.no_foodoffers_found_for_selection)}
            </Text>
            <View style={styles.animationContainer}>{renderLottie}</View>
            {nextAvailableDate && (
                <TouchableOpacity
                    onPress={() => dispatch({ type: SET_SELECTED_DATE, payload: nextAvailableDate })}
                    activeOpacity={0.7}
                    style={[styles.jumpButton, { backgroundColor: foods_area_color }]}
                >
                    <Text style={[styles.jumpButtonText, { color: contrastColor }]}>
                        {`${translate(TranslationKeys.show_offers_on)} ${translate(
                            TranslationKeys[getWeekdayKey(nextAvailableDate) as keyof typeof TranslationKeys]
                        )}`}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

export default memo(ListEmptyComponent);
