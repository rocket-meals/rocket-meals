import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { DatabaseTypes } from 'repo-depkit-common';

import { RootState } from '@/redux/reducer';

export const isCollectibleEventActive = (
        event?: DatabaseTypes.CollectibleEvents,
        referenceDate: Date = new Date()
): boolean => {
        if (!event) {
                return false;
        }

        if (event.status && event.status !== 'published') {
                return false;
        }

        const start = event.date_start ? new Date(event.date_start) : null;
        const end = event.date_end ? new Date(event.date_end) : null;

        if (start && end) {
                return referenceDate >= start && referenceDate <= end;
        }

        if (start && !end) {
                return referenceDate >= start;
        }

        if (!start && end) {
                return referenceDate <= end;
        }

        return true;
};

const useActiveCollectibleEvent = () => {
        const { collectibleEvents = [] } = useSelector((state: RootState) => state.collectibleEvents ?? {});

        const activeCollectibleEvent = useMemo(
                () => collectibleEvents.find(event => isCollectibleEventActive(event)),
                [collectibleEvents]
        );

        return { activeCollectibleEvent, hasActiveCollectibleEvent: Boolean(activeCollectibleEvent) };
};

export default useActiveCollectibleEvent;
