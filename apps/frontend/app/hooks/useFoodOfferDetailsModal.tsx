import React, { useCallback } from 'react';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import FoodOfferDetailsContent from '@/components/FoodOfferDetailsContent/FoodOfferDetailsContent';
import { DatabaseTypes } from 'repo-depkit-common';
import { addAppRatingPointsForDetailsOpen } from '@/hooks/useAppRatingScore';

// Every food card uses this hook, so it must not subscribe to anything that changes when a
// modal opens: no app rating score, no modal state. Otherwise opening one card's details
// re-renders all cards inside the tap, before the sheet can paint.
const useFoodOfferDetailsModal = () => {
    const { show, close } = useMyScrollViewModal();

    const openFoodOfferDetailsModal = useCallback((offerId?: string, foodId?: string, initialFoodOffer?: DatabaseTypes.Foodoffers | null) => {
        show(
            {
                children: <FoodOfferDetailsContent offerId={offerId} foodId={foodId} initialFoodOffer={initialFoodOffer} onOfferNoLongerAvailable={close} inModalSheet />,
                disableHorizontalPadding: true,
            },
            {
                // Counted when the details close: the store update writes the persisted state,
                // which would otherwise compete with the opening animation.
                onClosed: addAppRatingPointsForDetailsOpen,
            },
        );
    }, [show, close]);

    return { openFoodOfferDetailsModal, closeFoodOfferDetailsModal: close };
};

export default useFoodOfferDetailsModal;
