import React, { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Text, View } from 'react-native';

import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import { useTheme } from '@/hooks/useTheme';

interface UseAppForegroundScrollViewModalOptions {
        autoRegister?: boolean;
}

const useAppForegroundScrollViewModal = ({ autoRegister = true }: UseAppForegroundScrollViewModalOptions = {}) => {
        const appState = useRef<AppStateStatus>(AppState.currentState);
        const { show } = useMyScrollViewModal();
        const { theme } = useTheme();

        const handleAppForeground = useCallback(() => {
                show({
                        children: (
                                <View style={{ padding: 24 }}>
                                        <Text style={{ color: theme.screen.text, textAlign: 'center' }}>
                                                App in den Vordergrund
                                        </Text>
                                </View>
                        ),
                });
        }, [show, theme.screen.text]);

        useEffect(() => {
                if (!autoRegister) return;

                const subscription = AppState.addEventListener('change', nextState => {
                        if (appState.current.match(/inactive|background/) && nextState === 'active') {
                                handleAppForeground();
                        }
                        appState.current = nextState;
                });

                return () => {
                        subscription.remove();
                };
        }, [autoRegister, handleAppForeground]);

        return handleAppForeground;
};

export default useAppForegroundScrollViewModal;
