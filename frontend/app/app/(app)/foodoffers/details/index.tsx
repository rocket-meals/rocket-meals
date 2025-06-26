import React, {useCallback, useEffect, useMemo, useRef, useState,} from 'react';
import {useFocusEffect, useLocalSearchParams} from 'expo-router';
import {Dimensions, Image, SafeAreaView, ScrollView, Text, TouchableOpacity, View,} from 'react-native';
import styles from './styles';
import {useTheme} from '@/hooks/useTheme';
import {AntDesign, MaterialCommunityIcons, MaterialIcons,} from '@expo/vector-icons';
import {isWeb} from '@/constants/Constants';
import Feedbacks from '@/components/Feedbacks';
import Details from '@/components/Details';
import Labels from '@/components/Labels';
import { fetchFoodOffersDetailsById } from '@/redux/actions/FoodOffers/FoodOffers';
import {
  excerpt,
  getImageUrl,
  getpreviousFeedback,
  numToOneDecimal,
} from '@/constants/HelperFunctions';
import {
  Foods,
  FoodsFeedbacks,
  FoodsTranslations,
  Profiles,
} from '@/constants/types';
import { FoodFeedbackHelper } from '@/redux/actions/FoodFeedbacks/FoodFeedbacks';
import { useDispatch, useSelector } from 'react-redux';
import {
  DELETE_FOOD_FEEDBACK_LOCAL,
  UPDATE_FOOD_FEEDBACK_LOCAL,
  UPDATE_PROFILE,
} from '@/redux/Types/types';
import MenuSheet from '@/components/MenuSheet/MenuSheet';
import PermissionModal from '@/components/PermissionModal/PermissionModal';
import BaseBottomSheet from '@/components/BaseBottomSheet';
import type BottomSheet from '@gorhom/bottom-sheet';
import NotificationSheet from '@/components/NotificationSheet/NotificationSheet';
import usePlatformHelper from '@/helper/platformHelper';
import { NotificationHelper } from '@/helper/NotificationHelper';
import {
  getCurrentDevice,
  getDeviceIdentifier,
  getDeviceInformationWithoutPushToken,
} from '@/helper/DeviceHelper';
import { ProfileHelper } from '@/redux/actions/Profile/Profile';
import { createSelector } from 'reselect';
import { useLanguage } from '@/hooks/useLanguage';
import { myContrastColor } from '@/helper/colorHelper';
import { Tooltip, TooltipContent, TooltipText } from '@gluestack-ui/themed';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { handleFoodRating } from '@/helper/feedback';
import { RootState } from '@/redux/reducer';

const selectFoodState = (state: RootState) => state.food;

const selectPreviousFeedback = createSelector(
  [selectFoodState, (_, foodId) => foodId],
  (foodState, foodId) =>
    getpreviousFeedback(foodState.ownFoodFeedbacks, foodId.toString())
);

export default function FoodDetailsScreen() {
  useSetPageTitle(TranslationKeys.food_details);

  const { id, foodId } = useLocalSearchParams();

  const { theme } = useTheme();
  const { translate } = useLanguage();
  const dispatch = useDispatch();
  const menuSheetRef = useRef<BottomSheet>(null);
  const { isSmartPhone, isAndroid, isIOS } = usePlatformHelper();
  const { user, profile } = useSelector(
    (state: RootState) => state.authReducer
  );
  const {
    primaryColor,
    language: languageCode,
    appSettings,
    serverInfo,
    selectedTheme: mode,
  } = useSelector((state: RootState) => state.settings);
  const previousFeedback = useSelector((state) =>
    selectPreviousFeedback(state, foodId)
  );
  const profileHelper = useMemo(() => new ProfileHelper(), []);
  const foodfeedbackHelper = useMemo(() => new FoodFeedbackHelper(), []);
  const { foodAttributeGroups } = useSelector(
    (state: RootState) => state.foodAttributes
  );
  const [pushTokenObj, requestDeviceNotificationPermission] =
    NotificationHelper.useNotificationPermission(profile);
  const foods_area_color = appSettings?.foods_area_color
    ? appSettings?.foods_area_color
    : primaryColor;
  const contrastColor = myContrastColor(
    foods_area_color,
    theme,
    mode === 'dark'
  );
  const defaultImage =
    getImageUrl(String(appSettings.foods_placeholder_image)) ||
    appSettings.foods_placeholder_image_remote_url ||
    getImageUrl(serverInfo?.info?.project?.project_logo);

  const [warning, setWarning] = useState(false);
  const { selectedCanteen } = useSelector(
    (state: RootState) => state.canteenReducer
  );
  const foodOfferCanteenId = selectedCanteen?.id as string | undefined;
  const [foodDetails, setFoodDetails] = useState<any>(null);

  const [activeTab, setActiveTab] = useState('feedbacks');
  const [isActive, setIsActive] = useState(false);
  const [foodAttributes, setFoodAttributes] = useState<any>([]);
  const [groupedAttributes, setGroupedAttributes] = useState<any>([]);
  const [foodAttributesLoading, setFoodAttributesLoading] = useState(false);
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get('window').width
  );
  const notificationSheetRef = useRef<BottomSheet>(null);

  const openNotificationSheet = () => {
    notificationSheetRef?.current?.expand();
  };

  const closeNotificationSheet = () => {
    notificationSheetRef?.current?.close();
  };

  const openMenuSheet = () => {
    menuSheetRef?.current?.expand();
  };

  const closeMenuSheet = () => {
    menuSheetRef?.current?.close();
  };

  const filterAttributes = () => {
    const groupedAttributes = foodAttributeGroups?.map((group: any) => {
      const attributes = foodAttributes
        ?.filter((attr: any) => attr?.food_attribute?.group === group?.id)
        ?.sort((a: any, b: any) => {
          const sortA = a?.food_attribute?.sort || 0;
          const sortB = b?.food_attribute?.sort || 0;
          return sortA - sortB;
        });

      return {
        ...group,
        attributes: attributes || [],
      };
    });
    setGroupedAttributes(groupedAttributes);
    setFoodAttributesLoading(false);
  };

  useEffect(() => {
    if (foodAttributeGroups && foodAttributes) {
      filterAttributes();
    }
  }, [foodAttributes, foodAttributeGroups]);

  const renderContent = useCallback(
    (foodDetails: Foods) => {
      switch (activeTab) {
        case 'feedbacks':
          return (
            <Feedbacks
              foodDetails={foodDetails}
              offerId={id.toString()}
              canteenId={foodOfferCanteenId}
            />
          );
        case 'details':
          return (
            <Details
              groupedAttributes={groupedAttributes}
              loading={foodAttributesLoading}
            />
          );
        case 'labels':
          return (
            <Labels
              foodDetails={foodDetails}
              offerId={id.toString()}
              handleMenuSheet={openMenuSheet}
              color={foods_area_color}
            />
          );
        default:
          return null;
      }
    },
    [activeTab, id, foodOfferCanteenId]
  );

  const rateFood = (rating: number) => {
    const newRating = previousFeedback?.rating === rating ? null : rating;

    handleFoodRating({
      foodId: foodDetails?.id,
      profileId: profile?.id,
      userId: user?.id || '',
      rating: newRating,
      canteenId: foodOfferCanteenId,
      previousFeedback,
      dispatch,
      setWarning,
    });
  };

  const updateFoodFeedbackNotification = async () => {
    try {
      const payload = {
        ...previousFeedback,
        canteen: foodOfferCanteenId,
        notify: !previousFeedback?.notify,
      };
      const updateFeedbackResult = (await foodfeedbackHelper.updateFoodFeedback(
        foodDetails?.id,
        profile?.id,
        payload
      )) as FoodsFeedbacks;
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
  };

  const getFoodDetails = async () => {
    try {
      const foodData = await fetchFoodOffersDetailsById(id.toString());
      if (foodData && foodData.data) {
        const { food, attribute_values } = foodData?.data;

        const translation = food?.translations?.find(
          (val: FoodsTranslations) =>
            String(val?.languages_code)?.split('-')[0] === languageCode
        );
        setFoodDetails({
          ...food,
          name: translation ? translation.name : null,
        });
        if (attribute_values) {
          setFoodAttributesLoading(true);
          setFoodAttributes(attribute_values);
        }
      } else {
        console.log('No food data found');
      }
    } catch (e) {
      console.error('Error fetching food details: ', e);
    }
  };

  useEffect(() => {
    getFoodDetails();
  }, []);

  const getContainerWidth = () => {
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
  };

  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(Dimensions.get('window').width);
    };

    const subscription = Dimensions.addEventListener('change', handleResize);

    return () => subscription?.remove();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsActive(true);
      return () => {
        setIsActive(false);
      };
    }, [])
  );

  const updateDeviceInfo = async () => {
    try {
      const deviceInformationsWithoutPushToken =
        getDeviceInformationWithoutPushToken();
      const deviceInformationsId = getDeviceIdentifier(
        deviceInformationsWithoutPushToken
      );
      const pushTokenObj =
        await NotificationHelper.loadDeviceNotificationPermission();
      let deviceInformationsWithPushToken = {
        ...deviceInformationsWithoutPushToken,
        pushTokenObj: pushTokenObj,
      };

      let newDevices = profile?.devices || [];
      let foundDevice = getCurrentDevice(deviceInformationsId, newDevices);
      if (!foundDevice) {
        newDevices.push(deviceInformationsWithPushToken);
      } else {
        const deviceInformationsForUpdate = {
          ...foundDevice,
          ...deviceInformationsWithPushToken,
        }; // we want to keep id or createdAt
        const index = newDevices.indexOf(foundDevice);
        newDevices = [...newDevices];
        newDevices[index] = deviceInformationsForUpdate;
      }
      const result = (await profileHelper.updateProfile({
        ...profile,
        devices: newDevices,
      })) as Profiles;
      if (result) {
        dispatch({
          type: UPDATE_PROFILE,
          payload: result,
        });
      }
    } catch (e) {
      console.error('Error updating device information:', e);
    }
  };

  useEffect(() => {
    if (profile?.id) {
      updateDeviceInfo();
    }
  }, []);

  const updateNotification = async () => {
    if (!user?.id) {
      setWarning(true);
      return;
    }
    if (isSmartPhone()) {
      const result = await NotificationHelper.getDeviceNotificationPermission();
      if (isAndroid()) {
        console.log('Result.granted', result?.granted);
        if (result?.granted) {
          updateFoodFeedbackNotification();
        } else {
          if (
            NotificationHelper.isDeviceNotificationPermissionUndetermined(
              pushTokenObj
            )
          ) {
            requestDeviceNotificationPermission();
          }
        }
      }
      if (isIOS()) {
        const result =
          await NotificationHelper.requestDeviceNotificationPermission();
        console.log('Result.grantedios', result);
        if (result?.granted) {
          updateFoodFeedbackNotification();
        } else {
          if (
            NotificationHelper.isDeviceNotificationPermissionUndetermined(
              pushTokenObj
            )
          ) {
            requestDeviceNotificationPermission();
          }
        }
      }
    } else {
      openNotificationSheet();
    }
  };

  const themeStyles = {
    backgroundColor: foods_area_color,
    borderColor: foods_area_color,
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: theme.screen.background,
      }}
    >
      <ScrollView
        style={{
          backgroundColor: theme.screen.background,
          padding: isWeb ? 20 : 10,
        }}
        contentContainerStyle={{
          ...styles.contentContainer,
          width: '100%',
          backgroundColor: theme.screen.background,
        }}
      >
        <View
          style={{
            width: '100%',
            height: '100%',
            alignItems: 'center',
          }}
        >
          {isWeb ? (
            <>
              <View
                style={{
                  ...styles.featuredContainer,
                  width: screenWidth > 1000 ? '80%' : '100%',
                  flexDirection: screenWidth > 1000 ? 'row' : 'column',
                }}
              >
                <View
                  style={{
                    ...styles.foodDetail,
                    width: screenWidth > 1000 ? '50%' : '100%',
                    alignItems: screenWidth > 1000 ? 'flex-start' : 'center',
                  }}
                >
                  <View
                    style={{
                      ...styles.imageContainer,
                      width:
                        screenWidth > 1000
                          ? 400
                          : Dimensions.get('window').width - 40,
                      height:
                        screenWidth > 1000
                          ? 400
                          : Dimensions.get('window').width - 40,
                    }}
                  >
                    <Image
                      style={styles.featuredImage}
                      source={
                        foodDetails?.image_remote_url || foodDetails?.image
                          ? {
                              uri:
                                foodDetails?.image_remote_url ||
                                getImageUrl(foodDetails?.image),
                            }
                          : { uri: defaultImage }
                      }
                    />
                  </View>
                </View>
                <View
                  style={{
                    ...styles.detailsContainer,
                    width: screenWidth > 1000 ? '50%' : '100%',
                    justifyContent:
                      screenWidth > 1000 ? 'space-between' : 'flex-start',
                    height: screenWidth > 1000 ? 400 : 'auto',
                    paddingHorizontal: screenWidth > 800 ? 20 : 0,
                  }}
                >
                  <View style={{ width: '100%', alignItems: 'flex-end' }}>
                    {appSettings?.foods_ratings_average_display && (
                      <View
                        style={{
                          ...styles.ratingView,
                          borderColor: theme.screen.text,
                        }}
                      >
                        <AntDesign
                          name='star'
                          size={22}
                          color={foods_area_color}
                        />
                        <Text
                          style={{
                            ...styles.totalRating,
                            color: theme.screen.text,
                          }}
                        >
                          {(foodDetails?.rating_average ||
                            foodDetails?.rating_average_legacy) &&
                            numToOneDecimal(
                              foodDetails.rating_average ||
                                foodDetails?.rating_average_legacy
                            )}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View
                    style={{
                      ...styles.ratingContainer,
                      backgroundColor: theme.screen.iconBg,
                      marginTop: screenWidth > 1000 ? 0 : 20,
                    }}
                  >
                    <Text
                      style={{ ...styles.rateUs, color: theme.screen.text }}
                    >
                      {translate(TranslationKeys.RATE_FOOD)}
                    </Text>
                    <View style={styles.stars}>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Tooltip
                          placement='top'
                          trigger={(triggerProps) => (
                            <TouchableOpacity
                              key={index}
                              {...triggerProps}
                              onPress={() => rateFood(index + 1)}
                              style={{ padding: 5 }}
                            >
                              <AntDesign
                                name={
                                  previousFeedback?.rating > index
                                    ? 'star'
                                    : 'staro'
                                }
                                size={22}
                                color={foods_area_color}
                              />
                            </TouchableOpacity>
                          )}
                        >
                          <TooltipContent
                            bg={theme.tooltip.background}
                            py='$1'
                            px='$2'
                          >
                            <TooltipText
                              fontSize='$sm'
                              color={theme.tooltip.text}
                            >
                              {`${translate(TranslationKeys.set_rating_to)} ${
                                index + 1
                              }`}
                            </TooltipText>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
              <View
                style={{
                  ...styles.featuredContainer,
                  width: screenWidth > 1000 ? '80%' : '100%',
                }}
              >
                <Text
                  style={{
                    ...styles.foodHeading,
                    width: '100%',
                    color: theme.screen.text,
                    textAlign: screenWidth > 1000 ? 'left' : 'center',
                    flexDirection: 'column',
                    fontSize: screenWidth > 800 ? 24 : 20,
                  }}
                >
                  {foodDetails?.name}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.mobileImageContainer}>
              <Image
                source={
                  foodDetails?.image_remote_url || foodDetails?.image
                    ? {
                        uri:
                          foodDetails?.image_remote_url ||
                          getImageUrl(foodDetails?.image),
                      }
                    : { uri: defaultImage }
                }
                style={styles.mobileFeaturedImage}
              />
              <View style={styles.overlay}>
                <View style={styles.mobileDetailsHeader}>
                  <View style={styles.row}>
                    <View />
                    {appSettings?.foods_ratings_average_display && (
                      <View
                        style={{
                          ...styles.mobileRatingView,
                          borderColor: theme.screen.text,
                        }}
                      >
                        <AntDesign
                          name='star'
                          size={18}
                          color={foods_area_color}
                        />
                        <Text
                          style={{
                            ...styles.mobileTotalRating,
                            color: theme.screen.text,
                          }}
                        >
                          {(foodDetails?.rating_average ||
                            foodDetails?.rating_average_legacy) &&
                            numToOneDecimal(
                              foodDetails.rating_average ||
                                foodDetails?.rating_average_legacy
                            )}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.mobileDetailsFooter}></View>
              </View>
              <Text
                style={{
                  ...styles.mobileFoodHeading,
                  color: theme.screen.text,
                }}
              >
                {foodDetails?.name}
              </Text>
              <View
                style={{
                  ...styles.mobileRatingContainer,
                  backgroundColor: theme.screen.iconBg,
                }}
              >
                <Text
                  style={{
                    ...styles.mobileRateUs,
                    color: theme.screen.text,
                  }}
                >
                  {translate(TranslationKeys.RATE_FOOD)}
                </Text>
                <View style={styles.mobileStars}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => rateFood(index + 1)}
                    >
                      <AntDesign
                        name={
                          previousFeedback?.rating > index ? 'star' : 'staro'
                        }
                        size={20}
                        color={foods_area_color}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}
          <View
            style={{
              ...styles.notificationContainer,
              backgroundColor: theme.drawerBg,
              width: getContainerWidth() || '100%',
            }}
          >
            <Text
              style={{
                ...styles.notificationBody,
                color: theme.screen.text,
                maxWidth: '80%',
                fontSize: isWeb ? 18 : 12,
              }}
            >
              {translate(TranslationKeys.GET_NOTIFICATION_ON_AVAILABILITY)}
            </Text>
            {previousFeedback?.notify ? (
              <Tooltip
                placement='top'
                trigger={(triggerProps) => (
                  <TouchableOpacity
                    {...triggerProps}
                    style={{
                      ...styles.bellIconAtiveContainer,
                      backgroundColor: foods_area_color,
                      padding: isWeb ? 12 : 8,
                    }}
                    onPress={updateNotification}
                  >
                    <MaterialIcons
                      name='notifications-active'
                      size={32}
                      color={theme.screen.text}
                    />
                  </TouchableOpacity>
                )}
              >
                <TooltipContent bg={theme.tooltip.background} py='$1' px='$2'>
                  <TooltipText fontSize='$sm' color={theme.tooltip.text}>
                    {`${translate(TranslationKeys.notification)}: ${translate(
                      TranslationKeys.active
                    )}: ${excerpt(foodDetails?.name, 90)}`}
                  </TooltipText>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip
                placement='top'
                trigger={(triggerProps) => (
                  <TouchableOpacity
                    style={{
                      ...styles.bellIconContainer,
                      borderColor: foods_area_color,
                      padding: isWeb ? 12 : 8,
                    }}
                    {...triggerProps}
                    onPress={updateNotification}
                  >
                    <MaterialIcons
                      name='notifications'
                      size={32}
                      color={theme.screen.text}
                    />
                  </TouchableOpacity>
                )}
              >
                <TooltipContent bg={theme.tooltip.background} py='$1' px='$2'>
                  <TooltipText fontSize='$sm' color={theme.tooltip.text}>
                    {`${translate(TranslationKeys.notification)}: ${translate(
                      TranslationKeys.inactive
                    )}: ${excerpt(foodDetails?.name, 90)}`}
                  </TooltipText>
                </TooltipContent>
              </Tooltip>
            )}
          </View>
          <View
            style={{
              ...styles.tabViewContainer,
              width: getContainerWidth(),
            }}
          >
            <View
              style={{
                ...styles.tabs,
                width: isWeb ? '95%' : '100%',
                gap: isWeb ? 20 : 0,
              }}
            >
              <Tooltip
                placement='top'
                trigger={(triggerProps) => (
                  <TouchableOpacity
                    {...triggerProps}
                    style={[
                      styles.tab,
                      activeTab === 'feedbacks'
                        ? themeStyles
                        : { backgroundColor: theme.screen.iconBg },
                    ]}
                    onPress={() => setActiveTab('feedbacks')}
                  >
                    <MaterialCommunityIcons
                      name='chat'
                      size={26}
                      color={
                        activeTab === 'feedbacks'
                          ? contrastColor
                          : theme.screen.icon
                      }
                    />
                  </TouchableOpacity>
                )}
              >
                <TooltipContent bg={theme.tooltip.background} py='$1' px='$2'>
                  <TooltipText fontSize='$sm' color={theme.tooltip.text}>
                    {`${translate(TranslationKeys.food_feedbacks)}`}
                  </TooltipText>
                </TooltipContent>
              </Tooltip>
              <Tooltip
                placement='top'
                trigger={(triggerProps) => (
                  <TouchableOpacity
                    style={[
                      styles.tab,
                      activeTab === 'details'
                        ? themeStyles
                        : { backgroundColor: theme.screen.iconBg },
                    ]}
                    {...triggerProps}
                    onPress={() => setActiveTab('details')}
                  >
                    <MaterialCommunityIcons
                      name='nutrition'
                      size={26}
                      color={
                        activeTab === 'details'
                          ? contrastColor
                          : theme.screen.icon
                      }
                    />
                  </TouchableOpacity>
                )}
              >
                <TooltipContent bg={theme.tooltip.background} py='$1' px='$2'>
                  <TooltipText fontSize='$sm' color={theme.tooltip.text}>
                    {`${translate(TranslationKeys.food_data)}`}
                  </TooltipText>
                </TooltipContent>
              </Tooltip>

              <Tooltip
                placement='top'
                trigger={(triggerProps) => (
                  <TouchableOpacity
                    style={[
                      styles.tab,
                      activeTab === 'labels'
                        ? themeStyles
                        : { backgroundColor: theme.screen.iconBg },
                    ]}
                    {...triggerProps}
                    onPress={() => setActiveTab('labels')}
                  >
                    <MaterialCommunityIcons
                      name='medical-bag'
                      size={26}
                      color={
                        activeTab === 'labels'
                          ? contrastColor
                          : theme.screen.icon
                      }
                    />
                  </TouchableOpacity>
                )}
              >
                <TooltipContent bg={theme.tooltip.background} py='$1' px='$2'>
                  <TooltipText fontSize='$sm' color={theme.tooltip.text}>
                    {`${translate(TranslationKeys.markings)}`}
                  </TooltipText>
                </TooltipContent>
              </Tooltip>
            </View>
            <View
              style={{
                ...styles.pagerView,
                width: isWeb ? '95%' : '100%',
                paddingHorizontal: isWeb ? (screenWidth > 1000 ? 20 : 0) : 10,
              }}
            >
              {foodDetails?.id && renderContent(foodDetails)}
            </View>
          </View>
          <PermissionModal isVisible={warning} setIsVisible={setWarning} />
        </View>
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
          <NotificationSheet
            closeSheet={closeNotificationSheet}
            previousFeedback={previousFeedback}
            foodDetails={foodDetails}
          />
        </BaseBottomSheet>
      )}
      {/* Menu sheet */}

      {isActive && (
        <BaseBottomSheet
          ref={menuSheetRef}
          index={-1}
          backgroundStyle={{
            ...styles.sheetBackground,
            backgroundColor: theme.sheet.sheetBg,
          }}
          enablePanDownToClose
          handleComponent={null}
          enableHandlePanningGesture={false}
          enableContentPanningGesture={false}
          onClose={closeMenuSheet}
        >
          <MenuSheet closeSheet={closeMenuSheet} />
        </BaseBottomSheet>
      )}
    </SafeAreaView>
  );
}
