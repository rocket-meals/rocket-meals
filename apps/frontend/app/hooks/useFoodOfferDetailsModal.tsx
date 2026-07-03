import React, { useCallback, useEffect, useRef } from 'react';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import FoodOfferDetailsContent from '@/components/FoodOfferDetailsContent/FoodOfferDetailsContent';
import useCheckAppRateAsking from '@/hooks/useCheckAppRateAsking';
import useRatingEngagement, { RatingEngagementPoints } from '@/hooks/useRatingEngagement';

const useFoodOfferDetailsModal = () => {
    const { show, close, debug } = useMyScrollViewModal();
    const { shouldShowRating, showAppRating } = useCheckAppRateAsking();
    const { addPoints } = useRatingEngagement();
    const foodDetailsOpenRef = useRef(false);
    const prevContentSetRef = useRef(debug.contentSet);

    // Watch for the modal system becoming empty after food details was shown.
    // When debug.contentSet transitions from true→false while food details was open,
    // it means the user closed the food details modal (swipe-down or programmatic close).
    useEffect(() => {
        const wasContentSet = prevContentSetRef.current;
        prevContentSetRef.current = debug.contentSet;

        if (wasContentSet && !debug.contentSet && foodDetailsOpenRef.current) {
            foodDetailsOpenRef.current = false;
            // Modal is now fully closed – check if we should show rating
            if (shouldShowRating()) {
                showAppRating();
            }
        }
    }, [debug.contentSet, shouldShowRating, showAppRating]);

    const openFoodOfferDetailsModal = useCallback((offerId?: string, foodId?: string, initialImageAssetId?: string | number | null, initialImageRemoteUrl?: string | null) => {
        foodDetailsOpenRef.current = true;
        addPoints(RatingEngagementPoints.FOOD_DETAILS_OPENED);
        show({
            children: <FoodOfferDetailsContent offerId={offerId} foodId={foodId} initialImageAssetId={initialImageAssetId} initialImageRemoteUrl={initialImageRemoteUrl} />,
            disableHorizontalPadding: true,
        });
    }, [show, addPoints]);

    return { openFoodOfferDetailsModal, closeFoodOfferDetailsModal: close };
};

export default useFoodOfferDetailsModal;
