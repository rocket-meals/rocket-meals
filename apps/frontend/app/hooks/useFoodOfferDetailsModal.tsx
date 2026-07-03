import React, { useCallback, useRef } from 'react';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import FoodOfferDetailsContent from '@/components/FoodOfferDetailsContent/FoodOfferDetailsContent';
import useCheckAppRateAsking from '@/hooks/useCheckAppRateAsking';

/** Delay after modal close animation to ensure modal system is ready for a new modal */
const POST_CLOSE_DELAY_MS = 400;

const useFoodOfferDetailsModal = () => {
    const { show, close, debug } = useMyScrollViewModal();
    const { checkAndShowAppRating } = useCheckAppRateAsking();
    const debugRef = useRef(debug);
    debugRef.current = debug;

    const openFoodOfferDetailsModal = useCallback((offerId?: string, foodId?: string, initialImageAssetId?: string | number | null, initialImageRemoteUrl?: string | null) => {
        show({
            children: <FoodOfferDetailsContent offerId={offerId} foodId={foodId} initialImageAssetId={initialImageAssetId} initialImageRemoteUrl={initialImageRemoteUrl} />,
            disableHorizontalPadding: true,
            onClose: () => {
                setTimeout(() => {
                    // Only show rating if no other modal is currently open
                    // (avoids triggering when a sub-modal replaces the food details)
                    if (!debugRef.current.contentSet) {
                        checkAndShowAppRating();
                    }
                }, POST_CLOSE_DELAY_MS);
            },
        });
    }, [show, checkAndShowAppRating]);

    return { openFoodOfferDetailsModal, closeFoodOfferDetailsModal: close };
};

export default useFoodOfferDetailsModal;
