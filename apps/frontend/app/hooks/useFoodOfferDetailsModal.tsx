import React, { useCallback } from 'react';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import FoodOfferDetailsContent from '@/components/FoodOfferDetailsContent/FoodOfferDetailsContent';
import { DatabaseTypes } from 'repo-depkit-common';
import useAppRatingScore from '@/hooks/useAppRatingScore';

const useFoodOfferDetailsModal = () => {
    const { show, close } = useMyScrollViewModal();
    const { addPointsForDetailsOpen } = useAppRatingScore();

    const openFoodOfferDetailsModal = useCallback((offerId?: string, foodId?: string, initialFoodOffer?: DatabaseTypes.Foodoffers | null) => {
        addPointsForDetailsOpen();
        show({
            children: <FoodOfferDetailsContent offerId={offerId} foodId={foodId} initialFoodOffer={initialFoodOffer} onOfferNoLongerAvailable={close} />,
            disableHorizontalPadding: true,
        });
    }, [show, close, addPointsForDetailsOpen]);

    return { openFoodOfferDetailsModal, closeFoodOfferDetailsModal: close };
};

export default useFoodOfferDetailsModal;
