import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View, useWindowDimensions, type DimensionValue } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { runAfterInteractions } from '@/helper/interactionHelper';
import { isWeb } from '@/constants/Constants';
import Feedbacks from '@/components/Feedbacks';
import Details from '@/components/Details';
import Labels from '@/components/Labels';
import { getImageUrl, getpreviousFeedback } from '@/constants/HelperFunctions';
import { CollectibleAt, DatabaseTypes, RatingHelper } from 'repo-depkit-common';
import { FoodFeedbackHelper } from '@/redux/actions/FoodFeedbacks/FoodFeedbacks';
import { useDispatch, shallowEqual } from 'react-redux';
import { useAppSelector } from '@/redux/hooks';
import useSelectedCanteen from '@/hooks/useSelectedCanteen';
import { DELETE_FOOD_FEEDBACK_LOCAL, SET_FOOD_DETAILS_LAST_TAB, UPDATE_FOOD_FEEDBACK_LOCAL } from '@/redux/Types/types';
import { FoodOfferDetailTab } from '@/constants/TabEnums';
import { MarkingContent } from '@/components/MarkingBottomSheet';
import usePlatformHelper from '@/helper/platformHelper';
import { syncCurrentDevicePushNotificationState } from '@/helper/PushNotificationDeviceSync';
import { createSelector } from 'reselect';
import { useLanguage } from '@/hooks/useLanguage';
import { myContrastColor } from '@/helper/ColorHelper';
import { handleFoodRating } from '@/helper/feedback';
import { RootState } from '@/redux/reducer';
import CollectibleSpot from '@/components/CollectibleItem/CollectibleSpot';
import useAccountRequiredModal from '@/hooks/useAccountRequiredModal';
import useFoodFeedbackPermissions from '@/hooks/useFoodFeedbackPermissions';
import useFoodNotificationModal from '@/hooks/useFoodNotificationModal';
import usePushNotificationOptInPrompt from '@/hooks/usePushNotificationOptInPrompt';
import FoodHeader from '@/app/(app)/foodoffers/details/components/FoodHeader';
import NotificationSection from '@/app/(app)/foodoffers/details/components/NotificationSection';
import TabController from '@/app/(app)/foodoffers/details/components/TabController';
import { useFoodDetails } from '@/app/(app)/foodoffers/details/hooks/useFoodDetails';
import { useFoodAttributes } from '@/app/(app)/foodoffers/details/hooks/useFoodAttributes';
import { fetchFoodDetailsById, fetchFoodOffersDetailsById } from '@/redux/actions/FoodOffers/FoodOffers';
import styles from '@/app/(app)/foodoffers/details/styles';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import { useModalSheetOpened } from '@/components/GlobalModal/ModalProvider';
import useAppRatingScore from '@/hooks/useAppRatingScore';

export interface FoodOfferDetailsContentProps {
    offerId?: string;
    foodId?: string;
    /**
     * The food offer as the caller (e.g. the list) already has it. Shown right away while the
     * full details load in the background, so the details do not open empty.
     */
    initialFoodOffer?: DatabaseTypes.Foodoffers | null;
    /** Closes these details when the offer no longer exists (the food import replaced it) */
    onOfferNoLongerAvailable?: () => void;
    /** Shows the food's details when the offer no longer exists but a food id is known */
    showFoodWhenOfferMissing?: boolean;
    /** Rendered inside the modal sheet: on web the tabs wait until the sheet has slid in */
    inModalSheet?: boolean;
}

const selectFoodState = (state: RootState) => state.food;
const selectOwnFoodFeedbacks = createSelector([selectFoodState], foodState => foodState.ownFoodFeedbacks);

const VALID_FOOD_TABS = Object.values(FoodOfferDetailTab);

// Upper bound for waiting on the sheet's "opened" signal, in case it never arrives
const SHEET_OPENED_FALLBACK_MS = 700;

/**
 * Whether the parts below the header (notification, tabs, tab content) may render yet.
 *
 * Opening the details happens inside a tap, and React renders everything of a tap
 * synchronously before the device can paint. So the first pass renders only the header
 * (image, name, rating), which lets the sheet start moving at once. The rest follows:
 * - on native right after the first painted frame (the sheet animates on the UI thread),
 * - on web once the sheet has finished sliding in, because there the animation runs on the
 *   JS thread and rendering the tabs meanwhile made the sheet appear late.
 */
const useRenderBelowHeader = (inModalSheet: boolean) => {
    const sheetOpened = useModalSheetOpened();
    const [painted, setPainted] = useState(false);
    const [fallbackElapsed, setFallbackElapsed] = useState(false);
    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout> | undefined;
        const frame = requestAnimationFrame(() => {
            // rAF runs before the paint, the timeout after it
            timeout = setTimeout(() => setPainted(true), 0);
        });
        const fallback = isWeb && inModalSheet ? setTimeout(() => setFallbackElapsed(true), SHEET_OPENED_FALLBACK_MS) : undefined;
        return () => {
            cancelAnimationFrame(frame);
            if (timeout) clearTimeout(timeout);
            if (fallback) clearTimeout(fallback);
        };
    }, [inModalSheet]);
    if (!painted) return false;
    return isWeb && inModalSheet ? sheetOpened || fallbackElapsed : true;
};

const FoodOfferDetailsContent: React.FC<FoodOfferDetailsContentProps> = ({ offerId, foodId: initialFoodId, initialFoodOffer, onOfferNoLongerAvailable, showFoodWhenOfferMissing, inModalSheet = false }) => {
    const { theme } = useTheme();
    const { translate, language } = useLanguage();
    const dispatch = useDispatch();
    const { width: screenWidth } = useWindowDimensions();
    const showBelowHeader = useRenderBelowHeader(inModalSheet);

    const { show: showModal, close: closeModal } = useMyScrollViewModal();
    const { addPointsForTabSwitch, addPointsForFoodRating5Stars } = useAppRatingScore();

    const { isSmartPhone } = usePlatformHelper();
    const user = useAppSelector((state) => state.authReducer.user, shallowEqual);
    const profile = useAppSelector((state) => state.authReducer.profile, shallowEqual);
    const isManagement = useAppSelector((state) => state.authReducer.isManagement);

    const primaryColor = useAppSelector((state) => state.settings.primaryColor);
    const appSettings = useAppSelector((state) => state.settings.appSettings, shallowEqual);
    const serverInfo = useAppSelector((state) => state.settings.serverInfo, shallowEqual);
    const mode = useAppSelector((state) => state.settings.selectedTheme);
    // Zuletzt ausgewählte Reiter-Gruppe aus dem dauerhaften Settings-Store lesen
    const foodDetailsLastTab = useAppSelector((state) => state.settings.foodDetailsLastTab);

    const ownFoodFeedbacks = useAppSelector(selectOwnFoodFeedbacks);
    const previousFeedback = useMemo(() => {
        const result = initialFoodId ? getpreviousFeedback(ownFoodFeedbacks, initialFoodId.toString()) : undefined;
        return result;
    }, [ownFoodFeedbacks, initialFoodId]);

    const foodfeedbackHelper = useMemo(() => new FoodFeedbackHelper(), []);

    const { foodDetails, foodAttributes, loading: foodAttributesLoading } = useFoodDetails({ offerId, initialFoodId, initialFoodOffer, onOfferNoLongerAvailable, showFoodWhenOfferMissing });
    const { groupedAttributes } = useFoodAttributes({ foodAttributes, foodDetails });

    const foods_area_color = appSettings?.foods_area_color ? appSettings?.foods_area_color : primaryColor;
    const contrastColor = myContrastColor(foods_area_color, theme, mode === 'dark');
    const defaultImage = getImageUrl(String(appSettings.foods_placeholder_image)) || appSettings.foods_placeholder_image_remote_url || getImageUrl(serverInfo?.info?.project?.project_logo);
    const [foodOfferDetails, setFoodOfferDetails] = useState<any>(initialFoodOffer ?? null);

    const selectedCanteen = useSelectedCanteen();
    const foodOfferCanteenId = selectedCanteen?.id as string | undefined;
    const { openAccountRequiredModal } = useAccountRequiredModal();
    const { canRate, showRating, ratingRequiresVerifiedAccount } = useFoodFeedbackPermissions();
    // Anonymous users and, when only verified accounts may rate, unverified profiles (guests)
    // see the rating locked; the modal tells them whether a guest account is enough.
    const isRatingLocked = !user?.id || !canRate;
    const openRatingLockedModal = useCallback(() => {
        openAccountRequiredModal({ verifiedAccountRequired: ratingRequiresVerifiedAccount });
    }, [openAccountRequiredModal, ratingRequiresVerifiedAccount]);
    const { openNotificationConfirmModal } = useFoodNotificationModal();
    const { ensurePushNotificationPermission } = usePushNotificationOptInPrompt();

    // Initialisierung mit dem zuletzt gespeicherten Reiter.
    // Ist der gespeicherte Wert kein gültiger Tab (z. B. null, undefined oder ein veralteter Wert),
    // wird automatisch der erste Reiter (feedbacks) als Standard verwendet.
    const initialFoodTab = foodDetailsLastTab && VALID_FOOD_TABS.includes(foodDetailsLastTab)
        ? foodDetailsLastTab
        : FoodOfferDetailTab.FEEDBACKS;
    const [activeTab, setActiveTab] = useState<FoodOfferDetailTab>(initialFoodTab);

    // Beim Wechsel des Reiters den neuen Wert dauerhaft im Settings-Store speichern,
    // damit beim nächsten Öffnen der Food Details automatisch der richtige Reiter aktiv ist.
    const handleSetActiveTab = useCallback((tab: FoodOfferDetailTab) => {
        setActiveTab(tab);
        dispatch({ type: SET_FOOD_DETAILS_LAST_TAB, payload: tab });
        addPointsForTabSwitch();
    }, [dispatch, addPointsForTabSwitch]);

    const getFoodDetails = useCallback(async () => {
        try {
            if (offerId) {
                const foodData = await fetchFoodOffersDetailsById(offerId.toString(), language);
                if (foodData?.data) {
                    setFoodOfferDetails(foodData.data);
                } else {
                    console.log('No food data found');
                }
            } else if (initialFoodId) {
                const foodData = await fetchFoodDetailsById(initialFoodId.toString());
                if (foodData?.data) {
                    setFoodOfferDetails(null);
                } else {
                    console.log('No food data found');
                }
            }
        } catch (e) {
            console.error('Error fetching food details: ', e);
        }
    }, [offerId, initialFoodId, language]);

    const openMenuSheet = useCallback(() => {
        showModal({
            children: <MarkingContent />,
            disableHorizontalPadding: true,
        });
    }, [showModal]);

    const openFullScreenImage = useCallback(() => {
        closeModal();
        if (foodDetails?.image_remote_url) {
            router.push({
                pathname: '/(app)/image-full-screen',
                params: { uri: foodDetails.image_remote_url },
            });
        } else if (foodDetails?.image) {
            router.push({
                pathname: '/(app)/image-full-screen',
                params: { assetId: String(foodDetails.image) },
            });
        } else {
            router.push({
                pathname: '/(app)/image-full-screen',
                params: { uri: defaultImage },
            });
        }
    }, [foodDetails, defaultImage, closeModal]);

    const FeedbacksContent = useMemo(() => (
        <Feedbacks
            foodDetails={foodDetails}
            offerId={offerId ? offerId.toString() : undefined}
            canteenId={foodOfferCanteenId}
            isManagement={isManagement}
        />
    ), [foodDetails, offerId, foodOfferCanteenId, isManagement]);

    const DetailsContent = useMemo(() => (
        <Details groupedAttributes={groupedAttributes} loading={foodAttributesLoading} />
    ), [groupedAttributes, foodAttributesLoading]);

    const LabelsContent = useMemo(() => (
        <Labels
            foodDetails={foodDetails}
            offerId={offerId ? offerId.toString() : undefined}
            foodOfferDetails={foodOfferDetails}
            handleMenuSheet={openMenuSheet}
            color={foods_area_color}
        />
    ), [foodDetails, offerId, foodOfferDetails, openMenuSheet, foods_area_color]);

    useEffect(() => {
        getFoodDetails();
    }, [getFoodDetails]);

    const renderContent = useCallback(() => {
        switch (activeTab) {
            case FoodOfferDetailTab.FEEDBACKS:
                return FeedbacksContent;
            case FoodOfferDetailTab.DETAILS:
                return DetailsContent;
            case FoodOfferDetailTab.LABELS:
                return LabelsContent;
            default:
                return FeedbacksContent;
        }
    }, [activeTab, FeedbacksContent, DetailsContent, LabelsContent]);

    const rateFood = useCallback((rating: number) => {
        if (isRatingLocked) {
            openRatingLockedModal();
            return;
        }
        const newRating = previousFeedback?.rating === rating ? null : rating;
        if (newRating === RatingHelper.MAX_RATING) {
            addPointsForFoodRating5Stars();
        }
        void handleFoodRating({
            foodId: foodDetails?.id,
            profileId: profile?.id,
            userId: user?.id || '',
            rating: newRating,
            canteenId: foodOfferCanteenId,
            previousFeedback,
            dispatch,
        });
    }, [user, previousFeedback, foodDetails, profile, foodOfferCanteenId, dispatch, isRatingLocked, openRatingLockedModal, addPointsForFoodRating5Stars]);

    const updateFoodFeedbackNotification = useCallback(async () => {
        try {
            const payload = {
                ...previousFeedback,
                canteen: foodOfferCanteenId,
                notify: !previousFeedback?.notify,
            };
            const updateFeedbackResult = (await foodfeedbackHelper.updateFoodFeedback(foodDetails?.id, profile?.id, payload)) as DatabaseTypes.FoodsFeedbacks;
            if (updateFeedbackResult?.id) {
                dispatch({
                    type: UPDATE_FOOD_FEEDBACK_LOCAL,
                    payload: updateFeedbackResult,
                });
            } else {
                dispatch({
                    type: DELETE_FOOD_FEEDBACK_LOCAL,
                    payload: previousFeedback?.id,
                });
            }
        } catch (e) {
            console.error('Error creating feedback:', e);
        }
    }, [previousFeedback, foodOfferCanteenId, foodDetails, profile, dispatch, foodfeedbackHelper]);

    const getContainerWidth = useMemo(() => {
        let containerWidth = '100%';
        if (isWeb) {
            if (screenWidth < 600) {
                containerWidth = '95%';
            } else {
                containerWidth = '80%';
            }
        }
        return containerWidth;
    }, [screenWidth]);

    const updateDeviceInfo = useCallback(async () => {
        await syncCurrentDevicePushNotificationState({ profile, dispatch });
    }, [profile, dispatch]);

    const deviceInfoUpdatedRef = useRef(false);

    useEffect(() => {
        if (profile?.id && !deviceInfoUpdatedRef.current) {
            runAfterInteractions(() => {
                updateDeviceInfo();
                deviceInfoUpdatedRef.current = true;
            });
        }
    }, [profile?.id, updateDeviceInfo]);

    const updateNotification = useCallback(async () => {
        if (!user?.id) {
            openAccountRequiredModal();
            return;
        }
        if (!isSmartPhone()) {
            openNotificationConfirmModal(updateFoodFeedbackNotification);
            return;
        }
        // Switching a reminder off must always work, even when the system permission is gone.
        if (previousFeedback?.notify) {
            await updateFoodFeedbackNotification();
            return;
        }
        // Explains first and only then shows the system dialog (shown only once on iOS). Without the
        // permission the reminder would never arrive, so it is not switched on then.
        if (await ensurePushNotificationPermission()) {
            await updateFoodFeedbackNotification();
        }
    }, [user, isSmartPhone, previousFeedback, updateFoodFeedbackNotification, ensurePushNotificationPermission, openNotificationConfirmModal, openAccountRequiredModal]);

    const pagerViewStyle = useMemo(() => [
        styles.pagerView,
        isWeb ? styles.pagerViewWeb : styles.pagerViewMobile,
        isWeb && (screenWidth > 1000 ? styles.pagerViewWebLarge : styles.pagerViewWebSmall),
        { width: getContainerWidth as DimensionValue }
    ], [isWeb, screenWidth, getContainerWidth]);

    return (
        <View style={{ flex: 1 }}>
            <ScrollView
                style={[
                    isWeb ? styles.scrollViewWeb : styles.scrollView,
                    { backgroundColor: theme.screen.background }
                ]}
                contentContainerStyle={[
                    styles.contentContainer,
                    styles.scrollViewContent,
                    { backgroundColor: theme.screen.background }
                ]}
                removeClippedSubviews={true}
                scrollEventThrottle={16}
            >
                <View style={styles.mainWrapper}>
                    <FoodHeader
                        foodDetails={foodDetails}
                        screenWidth={screenWidth}
                        openFullScreenImage={openFullScreenImage}
                        rateFood={rateFood}
                        showRating={showRating}
                        previousFeedback={previousFeedback}
                        appSettings={appSettings}
                        foodsAreaColor={foods_area_color}
                        theme={theme}
                        translate={translate}
                        defaultImage={defaultImage}
                        isAccountRequired={isRatingLocked}
                        onAccountRequired={openRatingLockedModal}
                        containerWidth={getContainerWidth}
                    />

                    {showBelowHeader && (
                    <>
                    <NotificationSection
                        theme={theme}
                        containerWidth={getContainerWidth}
                        translate={translate}
                        previousFeedback={previousFeedback}
                        updateNotification={updateNotification}
                        isGroupedWithRating={showRating}
                        foodsAreaColor={foods_area_color}
                        isAccountRequired={!user?.id}
                        onAccountRequired={openAccountRequiredModal}
                    />

                    <TabController
                        activeTab={activeTab}
                        setActiveTab={handleSetActiveTab}
                        theme={theme}
                        contrastColor={contrastColor}
                        translate={translate}
                        containerWidth={getContainerWidth}
                        foodsAreaColor={foods_area_color}
                    />

                    <View style={pagerViewStyle}>
                        {foodDetails?.id && renderContent()}
                    </View>
                    </>
                    )}
                </View>
                {showBelowHeader && <CollectibleSpot collectibleKey={CollectibleAt.collectible_at_foodoffers_details} />}
            </ScrollView>
        </View>
    );
};

export default FoodOfferDetailsContent;
