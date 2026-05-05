import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'chat_read_status';

export const loadChatReadStatus = async (): Promise<Record<string, string>> => {
        try {
                const stored = await AsyncStorage.getItem(STORAGE_KEY);
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
                        await AsyncStorage.removeItem(STORAGE_KEY);
                        return;
                }

                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(status));
        } catch (error) {
                console.error('Failed to persist chat read status', error);
        }
};

export const clearChatReadStatus = async () => {
        try {
                await AsyncStorage.removeItem(STORAGE_KEY);
        } catch (error) {
                console.error('Failed to clear chat read status', error);
        }
};
