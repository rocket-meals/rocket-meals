import React, { useCallback } from 'react';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import FoodOfferDetailsContent from '@/components/FoodOfferDetailsContent/FoodOfferDetailsContent';
import useAppRatingScore from '@/hooks/useAppRatingScore';

const useFoodOfferDetailsModal = () => {
    const { show, close } = useMyScrollViewModal();
    const { addPointsForDetailsOpen } = useAppRatingScore();

    const openFoodOfferDetailsModal = useCallback((offerId?: string, foodId?: string, initialImageAssetId?: string | number | null, initialImageRemoteUrl?: string | null) => {
        addPointsForDetailsOpen();
        show({
            children: <FoodOfferDetailsContent offerId={offerId} foodId={foodId} initialImageAssetId={initialImageAssetId} initialImageRemoteUrl={initialImageRemoteUrl} />,
            disableHorizontalPadding: true,
        });
    }, [show, addPointsForDetailsOpen]);

    return { openFoodOfferDetailsModal, closeFoodOfferDetailsModal: close };
};

export default useFoodOfferDetailsModal;
