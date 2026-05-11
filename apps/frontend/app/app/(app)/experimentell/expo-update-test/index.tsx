import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Entypo, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import styles from '../styles';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import usePlatformHelper from '@/helper/platformHelper';
import { isInExpoGo } from '@/helper/DeviceRuntimeHelper';

type StepKey = TranslationKeys.CHECK_FOR_APP_UPDATES | TranslationKeys.DOWNLOAD_NEW_APP_UPDATE | TranslationKeys.RELOAD_APP;

interface StepConfig {
        key: StepKey;
        icon: keyof typeof MaterialCommunityIcons.glyphMap;
        action: () => Promise<void>;
}

const ExpoUpdateTest = () => {
        useSetPageTitle(TranslationKeys.EXPO_UPDATE_TEST);
        const { theme } = useTheme();
        const { translate } = useLanguage();
        const { isSmartPhone } = usePlatformHelper();

        const [logs, setLogs] = useState<string[]>([]);
        const [running, setRunning] = useState<StepKey | null>(null);

        const appendLog = useCallback((message: string) => {
                setLogs(prev => [`${new Date().toLocaleTimeString()} – ${message}`, ...prev]);
        }, []);

        const guardMobileRuntime = useCallback(() => {
                if (!isSmartPhone()) {
                        appendLog('Skipped: not running on a smartphone.');
                        return false;
                }

                if (isInExpoGo()) {
                        appendLog('Skipped: not available inside Expo Go.');
                        return false;
                }

                return true;
        }, [appendLog, isSmartPhone]);

        const runCheckForUpdates = useCallback(async () => {
                if (!guardMobileRuntime()) return;
                setRunning(TranslationKeys.CHECK_FOR_APP_UPDATES);
                try {
                        appendLog('Checking for updates…');
                        const update = await Updates.checkForUpdateAsync();
                        appendLog(update.isAvailable ? 'Update available' : 'No update available');
                } catch (error) {
                        appendLog(`Check failed: ${(error as Error).message}`);
                } finally {
                        setRunning(null);
                }
        }, [appendLog, guardMobileRuntime]);

        const runDownloadUpdate = useCallback(async () => {
                if (!guardMobileRuntime()) return;
                setRunning(TranslationKeys.DOWNLOAD_NEW_APP_UPDATE);
                try {
                        appendLog('Downloading available update…');
                        const result = await Updates.fetchUpdateAsync();
                        if (result?.isNew) {
                                appendLog('Download finished: new update fetched');
                        } else {
                                appendLog('No update downloaded');
                        }
                } catch (error) {
                        appendLog(`Download failed: ${(error as Error).message}`);
                } finally {
                        setRunning(null);
                }
        }, [appendLog, guardMobileRuntime]);

        const runReloadApp = useCallback(async () => {
                if (!guardMobileRuntime()) return;
                setRunning(TranslationKeys.RELOAD_APP);
                try {
                        appendLog('Reloading app with newest update…');
                        await Updates.reloadAsync();
                } catch (error) {
                        appendLog(`Reload failed: ${(error as Error).message}`);
                } finally {
                        setRunning(null);
                }
        }, [appendLog, guardMobileRuntime]);

        const steps: StepConfig[] = useMemo(
                () => [
                        {
                                key: TranslationKeys.CHECK_FOR_APP_UPDATES,
                                icon: 'cloud-search-outline',
                                action: runCheckForUpdates,
                        },
                        {
                                key: TranslationKeys.DOWNLOAD_NEW_APP_UPDATE,
                                icon: 'cloud-download-outline',
                                action: runDownloadUpdate,
                        },
                        {
                                key: TranslationKeys.RELOAD_APP,
                                icon: 'reload',
                                action: runReloadApp,
                        },
                ],
                [runCheckForUpdates, runDownloadUpdate, runReloadApp],
        );

        const runAllSteps = async () => {
                for (const step of steps) {
                        await step.action();
                }
        };

        return (
                <ScrollView
                        style={{ ...styles.container, backgroundColor: theme.screen.background }}
                        contentContainerStyle={{
                                ...styles.contentContainer,
                                backgroundColor: theme.screen.background,
                        }}
                >
                        <View style={{ ...styles.content }}>
                                <Text style={{ ...styles.heading, color: theme.screen.text }}>{translate(TranslationKeys.EXPO_UPDATE_TEST)}</Text>
                                <TouchableOpacity
                                        style={{ ...styles.listItem, backgroundColor: theme.screen.iconBg }}
                                        onPress={runAllSteps}
                                        disabled={!!running}
                                >
                                        <View style={styles.col}>
                                                <MaterialCommunityIcons name="playlist-check" color={theme.screen.icon} size={24} />
                                                <Text style={{ ...styles.body, color: theme.screen.text }}>{translate(TranslationKeys.RUN_ALL_STEPS)}</Text>
                                        </View>
                                        <Entypo name="chevron-small-right" color={theme.screen.icon} size={24} />
                                </TouchableOpacity>

                                <View style={styles.section}>
                                        {steps.map(step => (
                                                <TouchableOpacity
                                                        key={step.key}
                                                        style={{
                                                                ...styles.listItem,
                                                                backgroundColor: theme.screen.iconBg,
                                                                opacity: running && running !== step.key ? 0.6 : 1,
                                                        }}
                                                        onPress={step.action}
                                                        disabled={!!running && running !== step.key}
                                                >
                                                        <View style={styles.col}>
                                                                <MaterialCommunityIcons name={step.icon} color={theme.screen.icon} size={24} />
                                                                <Text style={{ ...styles.body, color: theme.screen.text }}>{translate(step.key)}</Text>
                                                        </View>
                                                        <Entypo name="chevron-small-right" color={theme.screen.icon} size={24} />
                                                </TouchableOpacity>
                                        ))}
                                </View>

                                <View
                                        style={{
                                                ...styles.logsContainer,
                                                backgroundColor: theme.screen.iconBg,
                                                borderColor: theme.screen.icon,
                                                borderWidth: 1,
                                        }}
                                >
                                        <View style={styles.col}>
                                                <MaterialCommunityIcons name="bug" color={theme.screen.icon} size={20} />
                                                <Text style={{ ...styles.body, color: theme.screen.text }}>
                                                        {translate(TranslationKeys.EXPO_UPDATE_LOGS)}
                                                </Text>
                                        </View>
                                        {logs.length === 0 ? (
                                                <Text style={{ ...styles.logEntry, color: theme.screen.text }}>No logs yet</Text>
                                        ) : (
                                                logs.map((log, index) => (
                                                        <Text key={index} style={{ ...styles.logEntry, color: theme.screen.text }}>
                                                                {log}
                                                        </Text>
                                                ))
                                        )}
                                </View>
                        </View>
                </ScrollView>
        );
};

export default ExpoUpdateTest;
