import { useCallback, useMemo } from 'react';
import { useAppSelector } from '@/redux/hooks';
import { DatabaseTypes } from 'repo-depkit-common';


export const getChatTimestamp = (chat: DatabaseTypes.Chats): string | null => {
        return chat?.date_updated || chat?.date_created || null;
};

const useChatUnreadStatus = () => {
        const { chats = [], readStatus = {} } = useAppSelector((state) => state.chats ?? {});

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
