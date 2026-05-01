import { CLEAR_CHATS, MARK_ALL_CHATS_AS_READ, MARK_ALL_CHATS_AS_UNREAD, MARK_CHAT_AS_READ, SET_CHATS, SET_CHAT_READ_STATUS } from '../Types/types';
import { ChatsState } from '../Types/stateTypes';
import { DatabaseTypes } from 'repo-depkit-common';

const initialState: ChatsState = {
        chats: [] as DatabaseTypes.Chats[],
        readStatus: {} as Record<string, string>,
};

const chatsReducer = (state: ChatsState = initialState, actions: { type: string; payload?: any }) => {
        switch (actions.type) {
                case SET_CHATS:
                        return {
                                ...state,
                                chats: actions.payload,
                        };
                case SET_CHAT_READ_STATUS:
                        return {
                                ...state,
                                readStatus: { ...actions.payload },
                        };
                case MARK_CHAT_AS_READ:
                        return {
                                ...state,
                                readStatus: {
                                        ...state.readStatus,
                                        [actions.payload.chatId]: actions.payload.timestamp,
                                },
                        };
                case MARK_ALL_CHATS_AS_READ:
                        return {
                                ...state,
                                readStatus: {
                                        ...state.readStatus,
                                        ...actions.payload,
                                },
                        };
                case MARK_ALL_CHATS_AS_UNREAD: {
                        const nextStatus = { ...state.readStatus };
                        const ids: string[] = Array.isArray(actions.payload) ? actions.payload : [];

                        ids.forEach(id => {
                                if (id in nextStatus) {
                                        delete nextStatus[id];
                                }
                        });

                        return {
                                ...state,
                                readStatus: nextStatus,
                        };
                }
                case CLEAR_CHATS:
                        return {
                                ...initialState,
                        };
                default:
			return state;
	}
};

export default chatsReducer;
