import React, { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Text, TouchableOpacity, View } from 'react-native';
import LoadingIndicator from '@/components/LoadingIndicator/LoadingIndicator';
import * as Updates from 'expo-updates';

import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import usePlatformHelper from '@/helper/platformHelper';
import { isExpoUpdatesUnavailableError } from 'repo-depkit-common-ui';
import { areExpoUpdatesAvailable } from '@/helper/DeviceRuntimeHelper';
import { useTheme } from '@/hooks/useTheme';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/redux/hooks';
import { SET_SIMULATE_EXPO_UPDATE_AVAILABLE } from '@/redux/Types/types';

const useAppForegroundUpdateCheckModal = () => {
        const appState = useRef<AppStateStatus>(AppState.currentState);
        const { isSmartPhone } = usePlatformHelper();
        const { show, close } = useMyScrollViewModal();
        const { theme } = useTheme();
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
                        // Only show the intermediate check/status modal (searching, blocked, no update
                        // found, ...) when the user has explicitly turned on "simulate update available"
                        // in debug settings. It used to be gated on debug mode itself, which meant it
                        // popped up on every single app foreground while debug mode was on. Forced
                        // modals (e.g. a real update being found) always show regardless.
                        if (!simulateExpoUpdateAvailable && !force) return;

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
                                                {loading && <LoadingIndicator color={theme.screen.text} />}
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
                                                                                <Text style={{ color: theme.screen.text }}>Schließen</Text>
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
                [close, simulateExpoUpdateAvailable, show, theme.screen.background, theme.screen.text, theme.sheet.text]
        );

        const handleDownloadUpdate = useCallback(async () => {
                showStatusModal(
                        {
                                title: 'Update wird geladen',
                                message: 'Update wird heruntergeladen ...',
                                loading: true,
                        },
                        { force: true }
                );

                try {
                        await Updates.fetchUpdateAsync();
                        showStatusModal(
                                {
                                        title: 'Update bereit',
                                        message: 'App wird neu gestartet ...',
                                        loading: true,
                                },
                                { force: true }
                        );
                        await Updates.reloadAsync();
                } catch (error) {
                        if (isExpoUpdatesUnavailableError(error)) {
                                console.info('Update-Download übersprungen: OTA-Updates in dieser Runtime nicht verfügbar.', error);
                        } else {
                                console.error('Error while fetching Expo updates', error);
                        }
                        showStatusModal(
                                {
                                        title: 'Update-Download fehlgeschlagen',
                                        message: 'Das Update konnte nicht heruntergeladen werden.',
                                        allowClose: true,
                                },
                                { force: true }
                        );
                }
        }, [showStatusModal]);

        const checkForUpdate = useCallback(async () => {
                showStatusModal({ title: 'Update-Check', message: 'Suche nach Update ...', loading: true });

                if (simulateExpoUpdateAvailable) {
                        dispatch({ type: SET_SIMULATE_EXPO_UPDATE_AVAILABLE, payload: false });
                        showStatusModal(
                                {
                                        title: 'Update gefunden',
                                        message: 'Ein neues Update ist verfügbar.',
                                        primaryAction: { label: 'Herunterladen und aktualisieren', onPress: handleDownloadUpdate },
                                },
                                { force: true }
                        );
                        return true;
                }

                if (!isSmartPhone()) {
                        console.info('Update-Check blockiert: nur auf Smartphones verfügbar.');
                        showStatusModal({
                                title: 'Update-Check',
                                message: 'Update-Check ist nur auf Smartphones verfügbar.',
                                allowClose: true,
                        });
                        return false;
                }
                if (!areExpoUpdatesAvailable()) {
                        console.info('Update-Check blockiert: Diese Runtime unterstützt keine OTA-Updates.');
                        showStatusModal({
                                title: 'Update-Check',
                                message: 'Expo Go und Development Builds werden nicht unterstützt.',
                                allowClose: true,
                        });
                        return false;
                }

                try {
                        const update = await Updates.checkForUpdateAsync();
                        if (update.isAvailable) {
                                showStatusModal(
                                        {
                                                title: 'Update gefunden',
                                                message: 'Ein neues Update ist verfügbar.',
                                                primaryAction: { label: 'Herunterladen und aktualisieren', onPress: handleDownloadUpdate },
                                        },
                                        { force: true }
                                );
                        } else {
                                showStatusModal({
                                        title: 'Kein Update gefunden',
                                        message: 'Du verwendest bereits die aktuelle Version.',
                                        allowClose: true,
                                });
                        }
                        return update.isAvailable;
                } catch (error) {
                        if (isExpoUpdatesUnavailableError(error)) {
                                console.info('Update-Check übersprungen: OTA-Updates in dieser Runtime nicht verfügbar.', error);
                        } else {
                                console.error('Error while checking Expo updates', error);
                        }
                        showStatusModal({
                                title: 'Update-Check fehlgeschlagen',
                                message: 'Es gab ein Problem bei der Update-Prüfung.',
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
