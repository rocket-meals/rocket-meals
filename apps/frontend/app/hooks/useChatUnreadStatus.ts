import { useCallback, useMemo } from 'react';
import { useAppSelector } from '@/redux/hooks';
import { ChatHelper, DatabaseTypes } from 'repo-depkit-common';


/** Date of the newest message; older servers without `date_last_message` fall back to the chat dates. */
export const getChatTimestamp = (chat: DatabaseTypes.Chats): string | null => {
        return chat?.date_last_message || chat?.date_updated || chat?.date_created || null;
};

const useChatUnreadStatus = () => {
        const { chats = [], readStatus = {} } = useAppSelector((state) => state.chats ?? {});

        const readStatusMap = readStatus ?? {};

        const hasUnreadChats = useMemo(() => {
                return chats.some(chat => Boolean(chat?.id) && ChatHelper.isUnread(getChatTimestamp(chat), readStatusMap[chat.id]));
        }, [chats, readStatus]);

        const isChatUnread = useCallback(
                (chat: DatabaseTypes.Chats) => {
                        if (!chat?.id) {
                                return false;
                        }
                        return ChatHelper.isUnread(getChatTimestamp(chat), readStatusMap[chat.id]);
                },
                [readStatus],
        );

        return { chats, readStatus: readStatusMap, hasUnreadChats, isChatUnread };
};

export default useChatUnreadStatus;
