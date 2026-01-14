import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { RootState } from '@/redux/reducer';
import { SET_COLLECTIBLE_EVENT_DICT } from '@/redux/Types/types';

const useCollectibleDict = (eventId?: string) => {
        const dispatch = useDispatch();
        const { collectibleEventsDict = {} } = useSelector((state: RootState) => state.collectibleEvents ?? {});

        const collectibleDict = useMemo(
                () => (eventId && collectibleEventsDict ? collectibleEventsDict[eventId] ?? {} : {}),
                [collectibleEventsDict, eventId]
        );

        const collectedCount = useMemo(
                () => Object.values(collectibleDict || {}).filter(Boolean).length,
                [collectibleDict]
        );

        const setCollectibleKey = useCallback(
                (key: string, value: boolean) => {
                        if (!eventId) {
                                return;
                        }

                        dispatch({
                                type: SET_COLLECTIBLE_EVENT_DICT,
                                payload: { eventId, key, value },
                        });
                },
                [dispatch, eventId]
        );

        return { collectibleDict, setCollectibleKey, collectedCount };
};

export default useCollectibleDict;
