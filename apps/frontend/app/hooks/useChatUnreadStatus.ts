import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { DatabaseTypes } from 'repo-depkit-common';

import { RootState } from '@/redux/reducer';

export const getChatTimestamp = (chat: DatabaseTypes.Chats): string | null => {
        return chat?.date_updated || chat?.date_created || null;
};

const useChatUnreadStatus = () => {
        const { chats = [], readStatus = {} } = useSelector((state: RootState) => state.chats ?? {});

        const readStatusMap = readStatus ?? {};

        const hasUnreadChats = useMemo(() => {
                return chats.some(chat => {
                        if (!chat?.id) {
                                return false;
                        }

                        const latestTimestamp = getChatTimestamp(chat);
                        if (!latestTimestamp) {
                                return false;
                        }

                        const lastRead = readStatusMap[chat.id];
                        if (!lastRead) {
                                return true;
                        }

                        return new Date(latestTimestamp).getTime() > new Date(lastRead).getTime();
                });
        }, [chats, readStatus]);

        const isChatUnread = useCallback(
                (chat: DatabaseTypes.Chats) => {
                        if (!chat?.id) {
                                return false;
                        }

                        const latestTimestamp = getChatTimestamp(chat);
                        if (!latestTimestamp) {
                                return false;
                        }

                        const lastRead = readStatusMap[chat.id];
                        if (!lastRead) {
                                return true;
                        }

                        return new Date(latestTimestamp).getTime() > new Date(lastRead).getTime();
                },
                [readStatus],
        );

        return { chats, readStatus: readStatusMap, hasUnreadChats, isChatUnread };
};

export default useChatUnreadStatus;
