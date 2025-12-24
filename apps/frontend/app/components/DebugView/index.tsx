import React, { ReactNode, useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/hooks/useTheme';
import styles from './styles';

export type DebugLog = string | { message: string; timestamp?: string | Date };

export type DebugAction = {
        label: string;
        onPress?: () => void;
        icon?: keyof typeof MaterialCommunityIcons.glyphMap;
        backgroundColor?: string;
        borderColor?: string;
        textColor?: string;
        disabled?: boolean;
};

interface DebugViewProps {
        title?: string;
        logs?: DebugLog[];
        actions?: DebugAction[];
        isVisible?: boolean;
        children?: ReactNode;
}

const DebugView: React.FC<DebugViewProps> = ({
        title = 'Debug',
        logs = [],
        actions = [],
        isVisible = true,
        children,
}) => {
        const { theme } = useTheme();

        const formattedLogs = useMemo(() => {
                return logs
                        ?.map(log => {
                                if (typeof log === 'string') return log;

                                const timestamp = log.timestamp
                                        ? typeof log.timestamp === 'string'
                                                ? log.timestamp
                                                : log.timestamp.toLocaleString()
                                        : null;

                                return timestamp ? `${timestamp} - ${log.message}` : log.message;
                        })
                        .filter(Boolean);
        }, [logs]);

        if (!isVisible) return null;

        return (
                <View
                        style={[
                                styles.container,
                        ]}
                >
                        <View style={styles.header}>
                                <MaterialCommunityIcons name="bug-outline" size={18} color={theme.screen.icon} />
                                <Text style={{ ...styles.title, color: theme.screen.text }}>{title}</Text>
                        </View>

                        {actions.length ? (
                                <View style={styles.actionsContainer}>
                                        {actions.map((action, index) => (
                                                <TouchableOpacity
                                                        key={`${action.label}-${index}`}
                                                        onPress={action.onPress}
                                                        disabled={action.disabled}
                                                        style={[
                                                                styles.actionButton,
                                                                {
                                                                        backgroundColor:
                                                                                action.backgroundColor ?? theme.drawerHeading,
                                                                        borderColor: action.borderColor ?? theme.screen.iconBg,
                                                                        opacity: action.disabled ? 0.6 : 1,
                                                                },
                                                        ]}
                                                >
                                                        {action.icon ? (
                                                                <MaterialCommunityIcons
                                                                        name={action.icon}
                                                                        size={18}
                                                                        color={action.textColor ?? theme.screen.icon}
                                                                        style={styles.actionIcon}
                                                                />
                                                        ) : null}
                                                        <Text
                                                                style={{
                                                                        ...styles.actionLabel,
                                                                        color: action.textColor ?? theme.screen.text,
                                                                }}
                                                        >
                                                                {action.label}
                                                        </Text>
                                                </TouchableOpacity>
                                        ))}
                                </View>
                        ) : null}

                        {children}

                        {formattedLogs?.length ? (
                                <View style={styles.logsContainer}>
                                        {formattedLogs.map((log, index) => (
                                                <Text
                                                        // eslint-disable-next-line react/no-array-index-key
                                                        key={`${log}-${index}`}
                                                        style={{ ...styles.logText, color: theme.inactiveText }}
                                                >
                                                        {log}
                                                </Text>
                                        ))}
                                </View>
                        ) : null}

                        <View style={styles.themeBackgroundRow}>
                                <Text style={[styles.themeBackgroundLabel, { color: theme.screen.text }]}>
                                        {theme.screen.background}
                                </Text>
                                <View
                                        style={[
                                                styles.themeBackgroundSwatch,
                                                { backgroundColor: theme.screen.background },
                                        ]}
                                />
                        </View>
                </View>
        );
};

export default DebugView;
