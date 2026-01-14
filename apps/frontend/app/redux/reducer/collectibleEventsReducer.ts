import {
        CLEAR_COLLECTIBLE_EVENTS,
        RESET_ALL_COLLECTIBLE_EVENT_DICTS,
        RESET_COLLECTIBLE_EVENT_DICT,
        SET_COLLECTIBLE_EVENT_DICT,
        SET_COLLECTIBLE_EVENT_DICT_BULK,
        SET_COLLECTIBLE_EVENTS,
} from '../Types/types';

const initialState = {
        collectibleEvents: [],
        collectibleEventsDict: {},
};

const collectibleEventsReducer = (state = initialState, actions: any) => {
        switch (actions.type) {
                case SET_COLLECTIBLE_EVENTS: {
                        return {
                                ...state,
                                collectibleEvents: actions.payload,
                        };
                }
                case SET_COLLECTIBLE_EVENT_DICT: {
                        const { eventId, key, value } = actions.payload || {};

                        if (!eventId || !key) {
                                return state;
                        }

                        return {
                                ...state,
                                collectibleEventsDict: {
                                        ...state.collectibleEventsDict,
                                        [eventId]: {
                                                ...(state.collectibleEventsDict?.[eventId] || {}),
                                                [key]: value,
                                        },
                                },
                        };
                }
                case SET_COLLECTIBLE_EVENT_DICT_BULK: {
                        const { eventId, data } = actions.payload || {};

                        if (!eventId) {
                                return state;
                        }

                        return {
                                ...state,
                                collectibleEventsDict: {
                                        ...state.collectibleEventsDict,
                                        [eventId]: data || {},
                                },
                        };
                }
                case RESET_COLLECTIBLE_EVENT_DICT: {
                        const { eventId } = actions.payload || {};

                        if (!eventId) {
                                return state;
                        }

                        const updatedDict = { ...state.collectibleEventsDict };
                        delete updatedDict[eventId];

                        return {
                                ...state,
                                collectibleEventsDict: updatedDict,
                        };
                }
                case RESET_ALL_COLLECTIBLE_EVENT_DICTS: {
                        return {
                                ...state,
                                collectibleEventsDict: {},
                        };
                }
                case CLEAR_COLLECTIBLE_EVENTS: {
                        return {
                                ...initialState,
                        };
                }
                default:
                        return state;
        }
};

export default collectibleEventsReducer;
