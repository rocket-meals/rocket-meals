import React, { useMemo } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { router } from 'expo-router';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { TranslationKeys } from '@/locales/keys';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';
import SettingsList from '@/components/SettingsList';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DatabaseTypes } from 'repo-depkit-common';
import { myContrastColor } from '@/helper/ColorHelper';
import { MARK_ALL_CHATS_AS_READ, MARK_ALL_CHATS_AS_UNREAD } from '@/redux/Types/types';
import { persistChatReadStatus } from '@/helper/chatReadStatus';
import styles from './styles';
import useChatUnreadStatus, { getChatTimestamp } from '@/hooks/useChatUnreadStatus';

const ChatsScreen = () => {
        useSetPageTitle(TranslationKeys.chats);
        const { theme } = useTheme();
        const { translate } = useLanguage();
        const dispatch = useDispatch();

        const { chats, readStatus, hasUnreadChats, isChatUnread } = useChatUnreadStatus();
        const { primaryColor, selectedTheme } = useSelector((state: RootState) => state.settings);

        const sortedChats = useMemo(() => {
                return [...chats].sort((a, b) => {
                        const da = a.date_updated || a.date_created || '';
                        const db = b.date_updated || b.date_created || '';
                        return da < db ? 1 : -1;
                });
        }, [chats]);

        const markAllAsRead = async () => {
                const updates = sortedChats.reduce((acc, chat) => {
                        if (!chat?.id) {
                                return acc;
                        }
                        const latestTimestamp = getChatTimestamp(chat) || new Date().toISOString();
                        acc[chat.id] = latestTimestamp;
                        return acc;
                }, {} as Record<string, string>);

                if (Object.keys(updates).length > 0) {
                        const nextStatus = {
                                ...readStatus,
                                ...updates,
                        };
                        dispatch({
                                type: MARK_ALL_CHATS_AS_READ,
                                payload: updates,
                        });
                        await persistChatReadStatus(nextStatus);
                }
        };

        const markAllAsUnread = async () => {
                const updatedStatus = { ...readStatus };
                let hasChanges = false;

                sortedChats.forEach(chat => {
                        if (!chat?.id) {
                                return;
                        }

                        if (updatedStatus[chat.id]) {
                                delete updatedStatus[chat.id];
                                hasChanges = true;
                        }
                });

                if (hasChanges) {
                        dispatch({
                                type: MARK_ALL_CHATS_AS_UNREAD,
                                payload: sortedChats
                                        .map(chat => chat.id)
                                        .filter((id): id is string => Boolean(id)),
                        });
                        await persistChatReadStatus(updatedStatus);
                }
        };

        const renderHeader = () => {
                if (!sortedChats.length) {
                        return null;
                }

                const buttonTextColor = myContrastColor(primaryColor, theme, selectedTheme === 'dark');

                return (
                        <View style={styles.headerActions}>
                                <TouchableOpacity
                                        onPress={() => {
                                                void markAllAsRead();
                                        }}
                                        style={[
                                                styles.actionButton,
                                                { backgroundColor: primaryColor },
                                                !hasUnreadChats && styles.actionButtonDisabled,
                                        ]}
                                        disabled={!hasUnreadChats}
                                >
                                        <Text style={[styles.actionButtonText, { color: buttonTextColor }]}>
                                                {translate(TranslationKeys.mark_all_chats_as_read)}
                                        </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                        onPress={() => {
                                                void markAllAsUnread();
                                        }}
                                        style={[styles.actionButton, styles.secondaryActionButton, { borderColor: theme.screen.icon }]}
                                >
                                        <Text style={[styles.actionButtonText, { color: theme.screen.text }]}>
                                                {translate(TranslationKeys.mark_all_chats_as_unread)}
                                        </Text>
                                </TouchableOpacity>
                        </View>
                );
        };

        const renderItem = ({ item, index }: { item: DatabaseTypes.Chats; index: number }) => {
                const last = index === sortedChats.length - 1;
                const first = index === 0;
                const groupPosition = sortedChats.length === 1 ? 'single' : first ? 'top' : last ? 'bottom' : 'middle';
                const isUnread = isChatUnread(item);

                const rightElement = (
                        <View style={styles.rightIconWrapper}>
                                <MaterialCommunityIcons name="chevron-right" size={24} color={theme.screen.icon} />
                                {isUnread ? (
                                        <View
                                                style={[
                                                        styles.itemNotificationDot,
                                                        {
                                                                backgroundColor: theme.accent,
                                                                borderColor: theme.screen.background,
                                                        },
                                                ]}
                                        />
                                ) : null}
                        </View>
                );

                return (
                        <SettingsList
                                leftIcon={<MaterialCommunityIcons name="chat" size={24} color={theme.screen.icon} />}
                                title={item.alias || item.id}
                                rightElement={rightElement}
                                onPress={() => router.push({ pathname: '/chats/details', params: { chat_id: item.id } })}
                                groupPosition={groupPosition as any}
                        />
                );
        };

        return (
                <View style={[styles.container, { backgroundColor: theme.screen.background }]}>
                        <FlatList
                                data={sortedChats}
                                keyExtractor={item => item.id}
                                renderItem={renderItem}
                                contentContainerStyle={styles.list}
                                extraData={readStatus}
                                ListHeaderComponent={renderHeader}
                        />
                </View>
        );
};

export default ChatsScreen;
