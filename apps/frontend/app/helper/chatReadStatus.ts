import { ChatHelper, DatabaseTypes } from 'repo-depkit-common';
import { sqliteKeyValueStorage } from '@/redux/storage/sqliteStorage';
import { ChatParticipantsHelper } from '@/redux/actions/Chats/ChatParticipants';

const STORAGE_KEY = 'chat_read_status';

export const loadChatReadStatus = async (): Promise<Record<string, string>> => {
        try {
                const stored = await sqliteKeyValueStorage.getItem(STORAGE_KEY);
                if (!stored) {
                        return {};
                }

                const parsed = JSON.parse(stored);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                        return parsed as Record<string, string>;
                }
        } catch (error) {
                console.error('Failed to load chat read status', error);
        }

        return {};
};

export const persistChatReadStatus = async (status: Record<string, string>) => {
        try {
                if (!status || Object.keys(status).length === 0) {
                        await sqliteKeyValueStorage.removeItem(STORAGE_KEY);
                        return;
                }

                await sqliteKeyValueStorage.setItem(STORAGE_KEY, JSON.stringify(status));
        } catch (error) {
                console.error('Failed to persist chat read status', error);
        }
};

export const clearChatReadStatus = async () => {
        try {
                await sqliteKeyValueStorage.removeItem(STORAGE_KEY);
        } catch (error) {
                console.error('Failed to clear chat read status', error);
        }
};

/** The own `chats_participants` row of a chat, when the chat was fetched with its participants. */
const getOwnParticipant = (chat: DatabaseTypes.Chats | undefined, profileId: string | null | undefined) => {
        return ChatHelper.findParticipant<DatabaseTypes.ChatsParticipants>(chat?.participants, profileId);
};

/**
 * The read status of this device merged with `read_until` from the server: per chat the later date
 * wins, so a chat read on another device is read here too.
 */
export const mergeServerChatReadStatus = (
        stored: Record<string, string>,
        chats: DatabaseTypes.Chats[],
        profileId: string | null | undefined,
): Record<string, string> => {
        const merged = { ...stored };
        chats.forEach(chat => {
                if (!chat?.id) {
                        return;
                }
                const later = ChatHelper.getLaterDate(merged[chat.id], getOwnParticipant(chat, profileId)?.read_until);
                if (later) {
                        merged[chat.id] = later;
                }
        });
        return merged;
};

/**
 * Writes the read status of the given chats to the own `chats_participants` rows (`null` marks a
 * chat unread). Best effort: a chat without own participant row, or an older server, keeps the
 * status of this device only.
 */
export const syncChatReadUntilToServer = async (
        chats: DatabaseTypes.Chats[],
        profileId: string | null | undefined,
        updates: Record<string, string | null>,
) => {
        const helper = new ChatParticipantsHelper();
        for (const [chatId, readUntil] of Object.entries(updates)) {
                const participant = getOwnParticipant(chats.find(chat => chat?.id === chatId), profileId);
                if (!participant?.id) {
                        continue;
                }
                try {
                        await helper.updateReadUntil(participant.id, readUntil);
                } catch (error) {
                        console.error('Failed to sync chat read status', error);
                }
        }
};
