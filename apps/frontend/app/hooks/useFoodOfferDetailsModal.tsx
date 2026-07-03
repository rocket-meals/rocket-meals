import React, { useCallback } from 'react';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import FoodOfferDetailsContent from '@/components/FoodOfferDetailsContent/FoodOfferDetailsContent';
import useRatingEngagement, { RatingEngagementPoints } from '@/hooks/useRatingEngagement';

const useFoodOfferDetailsModal = () => {
    const { show, close } = useMyScrollViewModal();
    const { addPoints } = useRatingEngagement();

    const openFoodOfferDetailsModal = useCallback((offerId?: string, foodId?: string, initialImageAssetId?: string | number | null, initialImageRemoteUrl?: string | null) => {
        addPoints(RatingEngagementPoints.FOOD_DETAILS_OPENED);
        show({
            children: <FoodOfferDetailsContent offerId={offerId} foodId={foodId} initialImageAssetId={initialImageAssetId} initialImageRemoteUrl={initialImageRemoteUrl} />,
            disableHorizontalPadding: true,
        });
    }, [show, addPoints]);

    return { openFoodOfferDetailsModal, closeFoodOfferDetailsModal: close };
};

export default useFoodOfferDetailsModal;
