import React, { useCallback } from 'react';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import FoodOfferDetailsContent from '@/components/FoodOfferDetailsContent/FoodOfferDetailsContent';
import { AppRatingTracker } from '@/helper/AppRatingTracker';

const useFoodOfferDetailsModal = () => {
    const { show, close } = useMyScrollViewModal();

    const openFoodOfferDetailsModal = useCallback((offerId?: string, foodId?: string) => {
        AppRatingTracker.addPoints(10);
        show({
            children: <FoodOfferDetailsContent offerId={offerId} foodId={foodId} />,
            disableHorizontalPadding: true,
        });
    }, [show]);

    return { openFoodOfferDetailsModal, closeFoodOfferDetailsModal: close };
};

export default useFoodOfferDetailsModal;
