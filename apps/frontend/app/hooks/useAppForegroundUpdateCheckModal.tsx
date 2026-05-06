import React, { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, AppState, AppStateStatus, Text, TouchableOpacity, View } from 'react-native';
import * as Updates from 'expo-updates';
import useDebugMode from '@/hooks/useDebugMode';

import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import usePlatformHelper from '@/helper/platformHelper';
import { isInExpoGo } from '@/helper/DeviceRuntimeHelper';
import { useTheme } from '@/hooks/useTheme';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/redux/hooks';
import { SET_SIMULATE_EXPO_UPDATE_AVAILABLE } from '@/redux/Types/types';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';

const useAppForegroundUpdateCheckModal = () => {
        const appState = useRef<AppStateStatus>(AppState.currentState);
        const debugMode = useDebugMode();
        const { isSmartPhone } = usePlatformHelper();
        const { show, close } = useMyScrollViewModal();
        const { theme } = useTheme();
        const { translate } = useLanguage();
        const dispatch = useDispatch();
        const { simulateExpoUpdateAvailable } = useAppSelector((state) => state.settings);

        const showStatusModal = useCallback(
                (
                        options: {
                                title: string;
                                message: string;
                                loading?: boolean;
                                primaryAction?: { label: string; onPress: () => void };
                                allowClose?: boolean;
                        },
                        { force }: { force?: boolean } = {}
                ) => {
                        if (!debugMode && !force) return;

                        const { title, message, loading, primaryAction, allowClose } = options;

                        const buttonBaseStyle = {
                                flex: 1,
                                padding: 12,
                                borderRadius: 8,
                                alignItems: 'center' as const,
                        };

                        show({
                                title,
                                children: (
                                        <View style={{ padding: 24, gap: 12 }}>
                                                <Text style={{ color: theme.screen.text, textAlign: 'center' }}>{message}</Text>
                                                {loading && <ActivityIndicator color={theme.screen.text} />}
                                                {(primaryAction || allowClose) && (
                                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                                                {allowClose && (
                                                                        <TouchableOpacity
                                                                                onPress={close}
                                                                                style={{
                                                                                        ...buttonBaseStyle,
                                                                                        borderWidth: 1,
                                                                                        borderColor: theme.sheet.text,
                                                                                }}
                                                                        >
                                                                                <Text style={{ color: theme.screen.text }}>{translate(TranslationKeys.close_label)}</Text>
                                                                        </TouchableOpacity>
                                                                )}
                                                                {primaryAction && (
                                                                        <TouchableOpacity
                                                                                onPress={primaryAction.onPress}
                                                                                style={{
                                                                                        ...buttonBaseStyle,
                                                                                        backgroundColor: theme.sheet.text,
                                                                                }}
                                                                        >
                                                                                <Text style={{ color: theme.screen.background, fontWeight: '600' }}>
                                                                                        {primaryAction.label}
                                                                                </Text>
                                                                        </TouchableOpacity>
                                                                )}
                                                        </View>
                                                )}
                                        </View>
                                ),
                        });
                },
                [close, debugMode, show, theme.screen.background, theme.screen.text, theme.sheet.text, translate]
        );

        const handleDownloadUpdate = useCallback(async () => {
                showStatusModal(
                        {
                                title: translate(TranslationKeys.update_downloading),
                                message: translate(TranslationKeys.update_downloading_description),
                                loading: true,
                        },
                        { force: true }
                );

                try {
                        await Updates.fetchUpdateAsync();
                        showStatusModal(
                                {
                                        title: translate(TranslationKeys.update_ready),
                                        message: translate(TranslationKeys.restarting_app),
                                        loading: true,
                                },
                                { force: true }
                        );
                        await Updates.reloadAsync();
                } catch (error) {
                        console.error('Error while fetching Expo updates', error);
                        showStatusModal(
                                {
                                        title: translate(TranslationKeys.update_download_failed),
                                        message: translate(TranslationKeys.update_download_failed_description),
                                        allowClose: true,
                                },
                                { force: true }
                        );
                }
        }, [showStatusModal, translate]);

        const checkForUpdate = useCallback(async () => {
                showStatusModal({ title: translate(TranslationKeys.update_check), message: translate(TranslationKeys.searching_for_update), loading: true });

                if (simulateExpoUpdateAvailable) {
                        dispatch({ type: SET_SIMULATE_EXPO_UPDATE_AVAILABLE, payload: false });
                        showStatusModal(
                                {
                                        title: translate(TranslationKeys.update_found),
                                        message: translate(TranslationKeys.new_update_available),
                                        primaryAction: { label: translate(TranslationKeys.download_and_update), onPress: handleDownloadUpdate },
                                },
                                { force: true }
                        );
                        return true;
                }

                if (!isSmartPhone()) {
                        console.info('Update-Check blockiert: nur auf Smartphones verfügbar.');
                        showStatusModal({
                                title: translate(TranslationKeys.update_check),
                                message: translate(TranslationKeys.update_check_smartphone_only),
                                allowClose: true,
                        });
                        return false;
                }
                if (isInExpoGo()) {
                        console.info('Update-Check blockiert: Expo Go wird nicht unterstützt.');
                        showStatusModal({
                                title: translate(TranslationKeys.update_check),
                                message: translate(TranslationKeys.expo_go_not_supported),
                                allowClose: true,
                        });
                        return false;
                }

                try {
                        const update = await Updates.checkForUpdateAsync();
                        if (update.isAvailable) {
                                showStatusModal(
                                        {
                                                title: translate(TranslationKeys.update_found),
                                                message: translate(TranslationKeys.new_update_available),
                                                primaryAction: { label: translate(TranslationKeys.download_and_update), onPress: handleDownloadUpdate },
                                        },
                                        { force: true }
                                );
                        } else {
                                showStatusModal({
                                        title: translate(TranslationKeys.no_update_found),
                                        message: translate(TranslationKeys.up_to_date_description),
                                        allowClose: true,
                                });
                        }
                        return update.isAvailable;
                } catch (error) {
                        console.error('Error while checking Expo updates', error);
                        showStatusModal({
                                title: translate(TranslationKeys.update_check_failed),
                                message: translate(TranslationKeys.update_check_problem_description),
                                allowClose: true,
                        });
                        return false;
                }
        }, [
                dispatch,
                handleDownloadUpdate,
                isSmartPhone,
                simulateExpoUpdateAvailable,
                showStatusModal,
        ]);

        const handleAppForeground = useCallback(async () => {
                await checkForUpdate();
        }, [checkForUpdate]);

        useEffect(() => {
                const subscription = AppState.addEventListener('change', nextState => {
                        if (appState.current.match(/inactive|background/) && nextState === 'active') {
                                void handleAppForeground();
                        }
                        appState.current = nextState;
                });

                return () => {
                        subscription.remove();
                };
        }, [handleAppForeground]);
};

export default useAppForegroundUpdateCheckModal;
