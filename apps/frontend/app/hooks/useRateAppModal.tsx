import React, { useCallback, useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import * as StoreReview from 'expo-store-review';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';

import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import { TranslationKeys } from '@/locales/keys';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { myContrastColor } from '@/helper/ColorHelper';
import { RootState } from '@/redux/reducer';
import { CommonSystemActionHelper } from '@/helper/SystemActionHelper';
import styles from '@/app/(app)/collectible-event/styles';

const useRateAppModal = (buttonColorOverride?: string) => {
        const { show, close } = useMyScrollViewModal();
        const { translate } = useLanguage();
        const { theme } = useTheme();
        const { appSettings, selectedTheme: mode } = useSelector((state: RootState) => state.settings);

        const rateButtonColor = buttonColorOverride || theme.primary;
        const rateButtonTextColor = useMemo(
                () => myContrastColor(rateButtonColor, theme, mode === 'dark'),
                [mode, rateButtonColor, theme]
        );

        const handleRateApp = useCallback(async () => {
                try {
                        const isAvailable = await StoreReview.isAvailableAsync();
                        if (isAvailable) {
                                await StoreReview.requestReview();
                        }
                } catch (error) {
                        console.log('Error requesting review', error);
                } finally {
                        close();
                }
        }, [close]);

        const openRateAppModal = useCallback(async () => {
                let canRate = false;

                try {
                        const [isAvailable, hasAction] = await Promise.all([
                                StoreReview.isAvailableAsync(),
                                typeof StoreReview.hasAction === 'function' ? StoreReview.hasAction() : Promise.resolve(false),
                        ]);

                        canRate = isAvailable && !hasAction;
                } catch (error) {
                        console.log('Error checking review availability', error);
                }

                show(
                        {
                                children: (
                                        <View style={{ padding: 24, gap: 12 }}>
                                                <Text
                                                        style={{
                                                                ...styles.title,
                                                                color: theme.screen.text,
                                                                textAlign: 'center',
                                                        }}
                                                >
                                                        {translate(TranslationKeys.collectible_event_congratulations_title)}
                                                </Text>

                                                <Text
                                                        style={{
                                                                ...styles.label,
                                                                color: theme.screen.text,
                                                                textAlign: 'center',
                                                        }}
                                                >
                                                        {translate(TranslationKeys.collectible_event_rate_app_prompt)}
                                                </Text>

                                                {canRate && (
                                                        <TouchableOpacity
                                                                style={{
                                                                        ...styles.button,
                                                                        backgroundColor: rateButtonColor,
                                                                }}
                                                                onPress={handleRateApp}
                                                        >
                                                                <Text style={{ ...styles.buttonText, color: rateButtonTextColor }}>
                                                                        {translate(TranslationKeys.rate_now)}
                                                                </Text>
                                                        </TouchableOpacity>
                                                )}

                                                <TouchableOpacity
                                                        style={{ ...styles.button, backgroundColor: theme.drawerBg }}
                                                        onPress={close}
                                                >
                                                        <Text style={{ ...styles.buttonText, color: theme.screen.text }}>
                                                                {translate(TranslationKeys.rate_later)}
                                                        </Text>
                                                </TouchableOpacity>

                                                <View style={{ gap: 12 }}>
                                                        <TouchableOpacity
                                                                style={{
                                                                        ...styles.button,
                                                                        marginTop: 0,
                                                                        flexDirection: 'row',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        backgroundColor: rateButtonColor,
                                                                }}
                                                                onPress={() => {
                                                                        if (appSettings?.app_stores_url_to_google) {
                                                                                CommonSystemActionHelper.openExternalURL(
                                                                                        appSettings?.app_stores_url_to_google,
                                                                                        true
                                                                                );
                                                                        }
                                                                }}
                                                        >
                                                                <Ionicons
                                                                        name="logo-google-playstore"
                                                                        size={20}
                                                                        color={rateButtonTextColor}
                                                                        style={{ marginRight: 8 }}
                                                                />
                                                                <Text style={{ ...styles.buttonText, color: rateButtonTextColor }}>
                                                                        Google Play Store
                                                                </Text>
                                                        </TouchableOpacity>

                                                        <TouchableOpacity
                                                                style={{
                                                                        ...styles.button,
                                                                        marginTop: 0,
                                                                        flexDirection: 'row',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        backgroundColor: rateButtonColor,
                                                                }}
                                                                onPress={() => {
                                                                        if (appSettings?.app_stores_url_to_apple) {
                                                                                CommonSystemActionHelper.openExternalURL(
                                                                                        appSettings?.app_stores_url_to_apple,
                                                                                        true
                                                                                );
                                                                        }
                                                                }}
                                                        >
                                                                <Ionicons
                                                                        name="logo-apple"
                                                                        size={20}
                                                                        color={rateButtonTextColor}
                                                                        style={{ marginRight: 8 }}
                                                                />
                                                                <Text style={{ ...styles.buttonText, color: rateButtonTextColor }}>
                                                                        App Store
                                                                </Text>
                                                        </TouchableOpacity>
                                                </View>
                                        </View>
                                ),
                        },
                        {}
                );
        }, [
                appSettings?.app_stores_url_to_apple,
                appSettings?.app_stores_url_to_google,
                close,
                handleRateApp,
                rateButtonColor,
                rateButtonTextColor,
                show,
                theme.drawerBg,
                theme.screen.text,
                translate,
        ]);

        return { openRateAppModal };
};

export default useRateAppModal;
