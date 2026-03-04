import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, ScrollView, Text, View, useWindowDimensions, type DimensionValue } from 'react-native';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { runAfterInteractions } from '@/helper/interactionHelper';
import { isWeb } from '@/constants/Constants';
import Feedbacks from '@/components/Feedbacks';
import Details from '@/components/Details';
import Labels from '@/components/Labels';
import { getImageUrl, getpreviousFeedback } from '@/constants/HelperFunctions';
import { CollectibleAt, DatabaseTypes } from 'repo-depkit-common';
import { FoodFeedbackHelper } from '@/redux/actions/FoodFeedbacks/FoodFeedbacks';
import { useDispatch, shallowEqual } from 'react-redux';
import { useAppSelector } from '@/redux/hooks';
import useSelectedCanteen from '@/hooks/useSelectedCanteen';
import { DELETE_FOOD_FEEDBACK_LOCAL, UPDATE_FOOD_FEEDBACK_LOCAL, UPDATE_PROFILE } from '@/redux/Types/types';
import MarkingBottomSheet from '@/components/MarkingBottomSheet';
import BaseBottomSheet from '@/components/BaseBottomSheet';
import type BottomSheet from '@gorhom/bottom-sheet';
import NotificationSheet from '@/components/NotificationSheet/NotificationSheet';
import usePlatformHelper from '@/helper/platformHelper';
import { NotificationHelper } from '@/helper/NotificationHelper';
import { getCurrentDevice, getDeviceIdentifier, getDeviceInformationWithoutPushToken } from '@/helper/DeviceHelper';
import { ProfileHelper } from '@/redux/actions/Profile/Profile';
import { createSelector } from 'reselect';
import { useLanguage } from '@/hooks/useLanguage';
import { myContrastColor } from '@/helper/ColorHelper';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { handleFoodRating } from '@/helper/feedback';
import { RootState } from '@/redux/reducer';
import CollectibleSpot from '@/components/CollectibleItem/CollectibleSpot';
import useRatingPermissionModal from '@/hooks/useRatingPermissionModal';
import DebugView from '@/components/DebugView';
import FoodHeader from './components/FoodHeader';
import NotificationSection from './components/NotificationSection';
import TabController from './components/TabController';
import { useFoodDetails } from './hooks/useFoodDetails';
import { useFoodAttributes } from './hooks/useFoodAttributes';
import {fetchFoodDetailsById, fetchFoodOffersDetailsById} from "@/redux/actions/FoodOffers/FoodOffers";
import { FoodsTranslations } from 'repo-depkit-common/src/databaseTypes/types';

const selectFoodState = (state: RootState) => state.food;
const selectOwnFoodFeedbacks = createSelector([selectFoodState], foodState => foodState.ownFoodFeedbacks);

export default function FoodDetailsScreen() {
    useSetPageTitle(TranslationKeys.food_details);

    const { id, foodId } = useLocalSearchParams();
    const offerId = Array.isArray(id) ? id[0] : id;
    const initialFoodId = Array.isArray(foodId) ? foodId[0] : foodId;

    const { theme } = useTheme();
    const { translate } = useLanguage();
    const dispatch = useDispatch();
    const { width: screenWidth } = useWindowDimensions();

    const menuSheetRef = useRef<BottomSheet>(null);
    const notificationSheetRef = useRef<BottomSheet>(null);

    const { isSmartPhone, isAndroid, isIOS } = usePlatformHelper();
    const user = useAppSelector((state) => state.authReducer.user, shallowEqual);
    const profile = useAppSelector((state) => state.authReducer.profile, shallowEqual);

    const primaryColor = useAppSelector((state) => state.settings.primaryColor);
    const appSettings = useAppSelector((state) => state.settings.appSettings, shallowEqual);
    const serverInfo = useAppSelector((state) => state.settings.serverInfo, shallowEqual);
    const mode = useAppSelector((state) => state.settings.selectedTheme);
    const languageCode = useAppSelector((state) => state.settings.language);
    const isDevMode = useAppSelector((state) => state.authReducer.isDevMode);

    const ownFoodFeedbacks = useAppSelector(selectOwnFoodFeedbacks);
    const previousFeedback = useMemo(() => {
        const result = initialFoodId ? getpreviousFeedback(ownFoodFeedbacks, initialFoodId.toString()) : undefined;
        return result;
    }, [ownFoodFeedbacks, initialFoodId]);

    // Hooks
    const profileHelper = useMemo(() => new ProfileHelper(), []);
    const foodfeedbackHelper = useMemo(() => new FoodFeedbackHelper(), []);
    const [notificationGranted, pushTokenObj, _, requestDeviceNotificationPermission] = NotificationHelper.useNotificationPermission(profile);

    const { foodDetails, foodAttributes, loading: foodAttributesLoading } = useFoodDetails({ offerId, initialFoodId });
    const { groupedAttributes } = useFoodAttributes({ foodAttributes, foodDetails });

    const foods_area_color = appSettings?.foods_area_color ? appSettings?.foods_area_color : primaryColor;
    const contrastColor = myContrastColor(foods_area_color, theme, mode === 'dark');
    const defaultImage = getImageUrl(String(appSettings.foods_placeholder_image)) || appSettings.foods_placeholder_image_remote_url || getImageUrl(serverInfo?.info?.project?.project_logo);
    const [foodOfferDetails, setFoodOfferDetails] = useState<any>(null);

    const selectedCanteen = useSelectedCanteen();
    const foodOfferCanteenId = selectedCanteen?.id as string | undefined;
    const { openRatingPermissionModal } = useRatingPermissionModal();

    const getFoodDetails = async () => {
        try {
            if (offerId) {
                const foodData = await fetchFoodOffersDetailsById(offerId.toString());
                if (foodData && foodData.data) {
                    setFoodOfferDetails(foodData.data);
                } else {
                    console.log('No food data found');
                }
            } else if (initialFoodId) {
                const foodData = await fetchFoodDetailsById(initialFoodId.toString());
                if (foodData && foodData.data) {
                    const food = foodData.data;
                    setFoodOfferDetails(null);
                    const translation = food?.translations?.find((val: FoodsTranslations) => String(val?.languages_code)?.split('-')[0] === languageCode);
                } else {
                    console.log('No food data found');
                }
            }
        } catch (e) {
            console.error('Error fetching food details: ', e);
        }
    };

    const [activeTab, setActiveTab] = useState('feedbacks');
    const [isActive, setIsActive] = useState(false);

    const openNotificationSheet = useCallback(() => {
        notificationSheetRef?.current?.expand();
    }, []);

    const closeNotificationSheet = useCallback(() => {
        notificationSheetRef?.current?.close();
    }, []);

    const openMenuSheet = useCallback(() => {
        menuSheetRef?.current?.expand();
    }, []);

    const closeMenuSheet = useCallback(() => {
        menuSheetRef?.current?.close();
    }, []);

    const openFullScreenImage = useCallback(() => {
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
    }, [foodDetails, defaultImage]);

    // Memoized content renderers to prevent unnecessary re-renders of inactive tabs
    const FeedbacksContent = useMemo(() => (
        <Feedbacks
            foodDetails={foodDetails}
            offerId={offerId ? offerId.toString() : undefined}
            canteenId={foodOfferCanteenId}
        />
    ), [foodDetails, offerId, foodOfferCanteenId]);

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
    }, [offerId, initialFoodId]);


    const renderContent = useCallback(
        () => {
            let result = null;
            switch (activeTab) {
                case 'feedbacks':
                    result = FeedbacksContent;
                    break;
                case 'details':
                    result = DetailsContent;
                    break;
                case 'labels':
                    result = LabelsContent;
                    break;
                default:
                    result = null;
            }
            return result;
        },
        [activeTab, FeedbacksContent, DetailsContent, LabelsContent]
    );

    const rateFood = useCallback((rating: number) => {
        if (!user?.id) {
            openRatingPermissionModal();
            return;
        }
        const newRating = previousFeedback?.rating === rating ? null : rating;

        handleFoodRating({
            foodId: foodDetails?.id,
            profileId: profile?.id,
            userId: user?.id || '',
            rating: newRating,
            canteenId: foodOfferCanteenId,
            previousFeedback,
            dispatch,
        });
    }, [user, previousFeedback, foodDetails, profile, foodOfferCanteenId, dispatch, openRatingPermissionModal]);

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
        } else {
            containerWidth = '100%';
        }

        return containerWidth;
    }, [screenWidth]);

    useFocusEffect(
        useCallback(() => {
            runAfterInteractions(() => {
                setIsActive(true);
            });
            return () => {
                setIsActive(false);
            };
        }, [])
    );

    const updateDeviceInfo = useCallback(async () => {
        try {
            const deviceInformationsWithoutPushToken = getDeviceInformationWithoutPushToken();
            const deviceInformationsId = getDeviceIdentifier(deviceInformationsWithoutPushToken);
            const pushTokenObj = await NotificationHelper.loadDeviceNotificationPermission();
            let deviceInformationsWithPushToken = {
                ...deviceInformationsWithoutPushToken,
                pushTokenObj: pushTokenObj,
                display_group: '',
            };

            let newDevices = profile?.devices ? [...profile.devices] : [];
            let foundDevice = getCurrentDevice(deviceInformationsId, newDevices);
            if (!foundDevice) {
                newDevices.push(deviceInformationsWithPushToken as any);
            } else {
                const deviceInformationsForUpdate = {
                    ...foundDevice,
                    ...deviceInformationsWithPushToken,
                }; // we want to keep id or createdAt

                // Optimization: Check if update is needed
                if (JSON.stringify(foundDevice) === JSON.stringify(deviceInformationsForUpdate)) {
                    return;
                }

                const index = newDevices.indexOf(foundDevice);
                newDevices[index] = deviceInformationsForUpdate;
            }
            const result = (await profileHelper.updateProfile({
                ...profile,
                devices: newDevices,
            })) as DatabaseTypes.Profiles;
            if (result) {
                dispatch({
                    type: UPDATE_PROFILE,
                    payload: result,
                });
            }
        } catch (e) {
            console.error('Error updating device information:', e);
        }
    }, [profile, dispatch, profileHelper]);

    // Optimize updateDeviceInfo to run less frequently
    const deviceInfoUpdatedRef = useRef(false);

    useFocusEffect(
        useCallback(() => {
            if (profile?.id && !deviceInfoUpdatedRef.current) {
                runAfterInteractions(() => {
                    updateDeviceInfo();
                    deviceInfoUpdatedRef.current = true;
                });
            }
        }, [profile?.id, updateDeviceInfo])
    );

    const updateNotification = useCallback(async () => {
        if (!user?.id) {
            openRatingPermissionModal();
            return;
        }
        if (isSmartPhone()) {
            const result = await NotificationHelper.getDeviceNotificationPermission();
            if (isAndroid()) {
                if (result?.granted) {
                    updateFoodFeedbackNotification();
                } else {
                    if (NotificationHelper.isDeviceNotificationPermissionUndetermined(pushTokenObj)) {
                        requestDeviceNotificationPermission();
                    }
                }
            }
            if (isIOS()) {
                const result = await NotificationHelper.requestDeviceNotificationPermission();
                if (result?.granted) {
                    updateFoodFeedbackNotification();
                } else {
                    if (NotificationHelper.isDeviceNotificationPermissionUndetermined(pushTokenObj)) {
                        requestDeviceNotificationPermission();
                    }
                }
            }
        } else {
            openNotificationSheet();
        }
    }, [user, isSmartPhone, isAndroid, isIOS, pushTokenObj, requestDeviceNotificationPermission, updateFoodFeedbackNotification, openNotificationSheet, openRatingPermissionModal]);


    // Memoize container style to prevent re-calculations on every render
    const pagerViewStyle = useMemo(() => [
        styles.pagerView,
        isWeb ? styles.pagerViewWeb : styles.pagerViewMobile,
        isWeb && (screenWidth > 1000 ? styles.pagerViewWebLarge : styles.pagerViewWebSmall),
        { width: getContainerWidth as DimensionValue }
    ], [isWeb, screenWidth, getContainerWidth]);

    return (
        <SafeAreaView
            style={[styles.safeArea, { backgroundColor: theme.screen.background }]}
        >
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
                removeClippedSubviews={true} // Optimization for large lists
                scrollEventThrottle={16}
            >
                <View style={styles.mainWrapper}>
                    <FoodHeader
                        foodDetails={foodDetails}
                        screenWidth={screenWidth}
                        openFullScreenImage={openFullScreenImage}
                        rateFood={rateFood}
                        previousFeedback={previousFeedback}
                        appSettings={appSettings}
                        foodsAreaColor={foods_area_color}
                        theme={theme}
                        translate={translate}
                        defaultImage={defaultImage}
                    />

                    <NotificationSection
                        theme={theme}
                        containerWidth={getContainerWidth}
                        translate={translate}
                        previousFeedback={previousFeedback}
                        updateNotification={updateNotification}
                        foodsAreaColor={foods_area_color}
                        foodDetails={foodDetails}
                    />

                    <TabController
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        theme={theme}
                        contrastColor={contrastColor}
                        translate={translate}
                        containerWidth={getContainerWidth}
                        foodsAreaColor={foods_area_color}
                    />

                    <View style={pagerViewStyle}>
                        {foodDetails?.id && renderContent()}
                    </View>
                </View>
                <CollectibleSpot collectibleKey={CollectibleAt.collectible_at_foodoffers_details} />
                <DebugView title="Foodoffer Details" isVisible={isDevMode}>
                    <Text style={[styles.debugText, { color: theme.screen.text }]}>
                        {JSON.stringify(foodOfferDetails, null, 2)}
                    </Text>
                </DebugView>
            </ScrollView>

            {isActive && (
                <BaseBottomSheet
                    ref={notificationSheetRef}
                    index={-1}
                    backgroundStyle={{
                        ...styles.sheetBackground,
                        backgroundColor: theme.sheet.sheetBg,
                    }}
                    enablePanDownToClose
                    handleComponent={null}
                    onClose={closeNotificationSheet}
                >
                    <NotificationSheet closeSheet={closeNotificationSheet} previousFeedback={previousFeedback} foodDetails={foodDetails} />
                </BaseBottomSheet>
            )}

            {isActive && <MarkingBottomSheet ref={menuSheetRef} onClose={closeMenuSheet} />}
        </SafeAreaView>
    );
}
