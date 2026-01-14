import React, { memo, useCallback, useEffect, useMemo } from 'react';
import { Linking, Text, TouchableOpacity, View, Image } from 'react-native';
import MyImage from '@/components/MyImage';
import styles from './styles';
import { isWeb } from '@/constants/Constants';
import { useTheme } from '@/hooks/useTheme';
import { AntDesign, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { FoodItemProps } from './types';
import { excerpt, getImageUrl, getpreviousFeedback, showFormatedPrice, showPrice } from '@/constants/HelperFunctions';
import { getTextFromTranslation } from '@/helper/resourceHelper';
import { DatabaseTypes, RatingHelper } from 'repo-depkit-common';
import { useDispatch, useSelector } from 'react-redux';
import { SET_MARKING_DETAILS, SET_SELECTED_FOOD_MARKINGS } from '@/redux/Types/types';
import { router } from 'expo-router';
import { createSelector } from 'reselect';
import { Tooltip, TooltipContent, TooltipText } from '@gluestack-ui/themed';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import useToast from '@/hooks/useToast';
import { handleFoodRating } from '@/helper/feedback';
import { RootState } from '@/redux/reducer';
import CardWithText from '../CardWithText/CardWithText';
import useFoodCard from '@/hooks/useFoodCard';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import AIGeneratedHintSheet from '../AIGeneratedHintSheet';
import useRatingPermissionModal from '@/hooks/useRatingPermissionModal';


const selectFoodState = (state: RootState) => state.food;
const selectPreviousFeedback = createSelector([selectFoodState, (_: RootState, foodId: string) => foodId], (foodState, foodId) =>
  getpreviousFeedback(foodState.ownFoodFeedbacks, foodId)
);
const selectMarkings = createSelector([selectFoodState], foodState => foodState.markings);

const FoodItem: React.FC<FoodItemProps> = memo(
  ({ item, canteen, handleMenuSheet, handleImageSheet, handleEatingHabitsSheet, cardWidth }) => {
    const toast = useToast();
    const dispatch = useDispatch();
    const { theme } = useTheme();
    const { translate } = useLanguage();
    const { show: showScrollViewModal } = useMyScrollViewModal();

    const { food } = item;
    const foodItem = food as DatabaseTypes.Foods;
    const { language, serverInfo, appSettings, primaryColor } = useSelector((state: RootState) => state.settings);
    const { user, profile, isManagement } = useSelector((state: RootState) => state.authReducer);
    const { openRatingPermissionModal } = useRatingPermissionModal();

    const previousFeedback = useSelector(state => selectPreviousFeedback(state as RootState, foodItem.id));
    const markings = useSelector(selectMarkings);

    const foods_area_color = appSettings?.foods_area_color || primaryColor;
    const defaultImage =
      getImageUrl(String(appSettings.foods_placeholder_image)) ||
      appSettings.foods_placeholder_image_remote_url ||
      getImageUrl(serverInfo?.info?.project?.project_logo);

    const dislikedMarkings = useMemo(
      () =>
        item?.markings?.filter(marking =>
          profile?.markings?.some(
            (profileMarking: DatabaseTypes.ProfilesMarkings) =>
              profileMarking?.markings_id === marking?.markings_id && profileMarking?.like === false
          )
        ) ?? [],
      [item?.markings, profile?.markings]
    );

    const { screenWidth, containerStyle, imageContainerStyle, contentStyle } = useFoodCard(dislikedMarkings.length > 0 ? 3 : 0);

    const markingsData = useMemo(
      () =>
        markings?.filter((m: DatabaseTypes.Markings) =>
          item?.markings?.some(mark => mark.markings_id === m.id)
        ),
      [markings, item?.markings]
    );

    useEffect(() => {
      try {
        markingsData.slice(0, 5).forEach(m => {
          const img = m?.image_remote_url || getImageUrl(m?.image);
          if (img) Image.prefetch(img).catch(() => { });
        });
      } catch (e) { }
    }, [markingsData]);

    const openInBrowser = useCallback(
      async (url: string) => {
        try {
          if (isWeb) {
            window.open(url, '_blank');
          } else {
            const supported = await Linking.canOpenURL(url);
            if (supported) await Linking.openURL(url);
            else toast(`Cannot open URL: ${url}`, 'error');
          }
        } catch (error) {
          console.error('URL open error:', error);
        }
      },
      [toast]
    );

    const handleNavigation = useCallback((id: string, foodId: string) => {
      router.push({ pathname: '/(app)/foodoffers/details', params: { id, foodId } });
    }, []);

    const handleOpenSheet = useCallback(() => {
      dispatch({ type: SET_SELECTED_FOOD_MARKINGS, payload: dislikedMarkings });
      handleEatingHabitsSheet('eatingHabits');
    }, [dispatch, dislikedMarkings, handleEatingHabitsSheet]);

    const updateRating = useCallback(
      async (rating: number | null) => {
        if (!user?.id) {
          openRatingPermissionModal();
          return;
        }
        try {
          await handleFoodRating({
            foodId: foodItem?.id,
            profileId: profile?.id,
            userId: user.id,
            rating,
            canteenId: canteen?.id,
            previousFeedback,
            dispatch,
          });
        } catch (err) {
          if ((err as any).status === 403) {
            openRatingPermissionModal();
          } else {
            console.error('Failed to update rating:', err);
            toast('Could not update rating', 'error');
          }
        }
      },
      [foodItem?.id, profile?.id, canteen?.id, previousFeedback, dispatch, user?.id, toast, openRatingPermissionModal]
    );

    const openMarkingLabel = useCallback(
      (marking: DatabaseTypes.Markings) => {
        dispatch({ type: SET_MARKING_DETAILS, payload: marking });
        handleMenuSheet('menu');
      },
      [dispatch, handleMenuSheet]
    );

    const handlePriceChange = useCallback(() => router.navigate('/price-group'), []);

    const foodName = useMemo(
      () =>
        excerpt(
          getTextFromTranslation(foodItem?.translations, language),
          screenWidth > 1000 ? 120 : screenWidth > 700 ? 80 : screenWidth > 460 ? 60 : 40
        ),
      [foodItem?.translations, language, screenWidth]
    );

    const priceLabel = useMemo(() => showFormatedPrice(showPrice(item, profile)), [item, profile]);

    const imageUri = useMemo(() => {
      return foodItem?.image_remote_url || getImageUrl(foodItem?.image) || defaultImage;
    }, [foodItem?.image_remote_url, foodItem?.image, defaultImage]);

    return (
      <>
        <Tooltip
          placement="top"
          trigger={triggerProps => (
            <CardWithText
              {...triggerProps}
              onPress={() =>
                item.redirect_url
                  ? openInBrowser(item.redirect_url)
                  : handleNavigation(item?.id, foodItem?.id || '')
              }
              imageSource={{
                uri: imageUri as string,
              }}
              containerStyle={[
                containerStyle,
                cardWidth ? { width: '100%' } : { flex: 1 },
              ]}
              imageContainerStyle={[
                imageContainerStyle,
              ]}
              contentStyle={[
                contentStyle,
                { flex: 1, justifyContent: 'center' },
              ]}
              borderColor={foods_area_color}
              imageChildren={
                <>
                  {isManagement && (
                    <TouchableOpacity
                      style={styles.editImageButton}
                      onPress={() => {
                        handleImageSheet(foodItem);
                      }}
                    >
                      <MaterialCommunityIcons name="image-edit" size={20} color="white" />
                    </TouchableOpacity>
                  )}

                  <View style={styles.overlayActionsContainer}>
                    <TouchableOpacity style={styles.favContainer}>
                      {RatingHelper.isMaxRating(previousFeedback?.rating) ? (
                        <TouchableOpacity onPress={() => updateRating(null)}>
                          <AntDesign name="star" size={20} color={foods_area_color} />
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity onPress={() => updateRating(RatingHelper.MAX_RATING)}>
                          <MaterialIcons name="star" size={20} color="white" />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>

                  {foodItem?.image_generated && (
                    <TouchableOpacity
                      style={styles.aiBadgeContainer}
                      onPress={() =>
                        showScrollViewModal(
                          {
                            title: translate(TranslationKeys.ai_generated_image),
                            children: <AIGeneratedHintSheet />,
                          },
                          {}
                        )
                      }
                    >
                      <Text style={styles.aiGeneratedBadgeText}>
                        {translate(TranslationKeys.ai_generated_badge_label)}
                      </Text>
                    </TouchableOpacity>
                  )}

                    {dislikedMarkings.length > 0 && (
                      <TouchableOpacity style={styles.favContainerWarn} onPress={handleOpenSheet}>
                        <MaterialIcons name="warning" size={20} color={foods_area_color} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.categoriesContainer}>
                    {markingsData?.map(mark =>
                      (mark?.image_remote_url || mark?.image) && mark?.show_on_card ? (
                        <TouchableOpacity key={mark.id} onPress={() => openMarkingLabel(mark)}>
                          <MyImage
                            source={{
                              uri: mark?.image_remote_url || getImageUrl(mark?.image),
                            }}
                            style={{
                              ...styles.categoryLogo,
                              backgroundColor: mark?.background_color,
                              borderRadius: mark?.background_color ? 8 : mark.hide_border ? 5 : 0,
                            }}
                          />
                        </TouchableOpacity>
                      ) : null
                    )}
                  </View>

                  <TouchableOpacity style={styles.priceTag} onPress={handlePriceChange}>
                    <Text style={styles.priceText}>{priceLabel}</Text>
                  </TouchableOpacity>
                </>
              }
            >
              <View
                  style={{
                    minHeight: 52,
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{ ...styles.foodName, color: theme.screen.text }}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {foodName}
                  </Text>
                </View>
            </CardWithText>
          )}
        >
          <TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
            <TooltipText fontSize="$sm" color={theme.tooltip.text}>
              {getTextFromTranslation(foodItem?.translations, language)}
            </TooltipText>
          </TooltipContent>
        </Tooltip>
      </>
    );
  },
  (prev, next) => prev.item === next.item
);

export default FoodItem;
