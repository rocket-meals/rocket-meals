import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import MyImage from '@/components/MyImage';
import styles from './styles';
import { isWeb } from '@/constants/Constants';
import { useTheme } from '@/hooks/useTheme';
import { AntDesign, Entypo, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { FoodItemProps } from './types';
import { excerpt, getImageUrl, getpreviousFeedback, showFormatedPrice, showPrice } from '@/constants/HelperFunctions';
import { getDescriptionFromTranslation, getTextFromTranslation } from '@/helper/resourceHelper';
import { applyFunModeTransformation, applyPirateTransformation } from '@/hooks/useLanguage';
import { DatabaseTypes, RatingHelper } from 'repo-depkit-common';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/redux/hooks';
import { SET_MARKING_DETAILS } from '@/redux/Types/types';
import { router } from 'expo-router';
import { createSelector } from 'reselect';
import { CustomTooltip, TooltipContent, TooltipText } from '@/components/CustomTooltip';
import translations from '@/locales/translations.json';
import { TranslationKeys } from '@/locales/keys';
import useToast from '@/hooks/useToast';
import { handleFoodRating } from '@/helper/feedback';
import { RootState } from '@/redux/reducer';
import CardWithText from '../CardWithText/CardWithText';
import { useFoodCardBase } from '@/hooks/useFoodCard';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import AIGeneratedHintSheet from '../AIGeneratedHintSheet';
import useAccountRequiredModal from '@/hooks/useAccountRequiredModal';
import { accountRequiredStyles } from '@/helper/accountRequiredStyles';
import useFoodOfferDetailsModal from '@/hooks/useFoodOfferDetailsModal';
import { MarkingContent } from '../MarkingBottomSheet';
import Labels from '@/components/Labels';
import { useMyContrastColor } from '@/helper/ColorHelper';
import MyMarkdown from '@/components/MyMarkdown/MyMarkdown';
import { RateAppSettingsItem } from '@/components/RateAppSettingsItem/RateAppSettingsItem';


const selectFoodState = (state: RootState) => state.food;
const selectMarkings = createSelector([selectFoodState], foodState => foodState.markings);
const selectOwnFoodFeedbacks = createSelector([selectFoodState], foodState => foodState.ownFoodFeedbacks);

export const FoodItemBase: React.FC<FoodItemProps> = memo(
  ({ 
    item, 
    canteen, 
    handleImageSheet, 
    cardWidth, 
    previousFeedback,
    // Opt props
    language,
    pirateLanguage,
    funLanguageMode,
    serverInfo,
    appSettings,
    primaryColor,
    user,
    isManagement,
    profile,
    markings,
    screenWidth: propScreenWidth,
    theme,
    amountColumnsForcard
  }) => {
    const toast = useToast();
    const dispatch = useDispatch();

    // Optimistic state for rating
    const [currentRating, setCurrentRating] = useState<number | null>(previousFeedback?.rating || null);

    // Sync optimistic state with prop when it changes (server response)
    useEffect(() => {
        setCurrentRating(previousFeedback?.rating || null);
    }, [previousFeedback?.rating]);
    
    // Fallback translate function if language prop is provided, to avoid useLanguage hook subscription
    const translate = useCallback((key: string) => {
        if (language) {
            return (translations as any)[key]?.[language] || key;
        }
        // Fallback to hook if language not provided (should not happen in optimized path)
        return key; 
    }, [language]);
    
    // Only call useLanguage if language prop is MISSING (legacy/fallback)
    // But we can't conditionally call hooks.
    // So we assume language IS passed in optimized path.
    // If not passed, we might have issues with translation if we strictly avoid useLanguage.
    // However, since we are in FoodItemBase, we expect props.
    
    // For full safety, if we want to support non-prop usage without hooks, we need to extract useLanguage logic completely.
    // But since we can't conditionally call hooks, we are stuck with either always calling or never calling.
    // To strictly avoid subscription, we MUST NOT call useLanguage().
    // We will assume language is passed. If not, we default to 'en' or similar, or just return key.
    // NOTE: If language prop is undefined, translations will fail. But FoodItemConnected passes it.
    
    const { show: showScrollViewModal } = useMyScrollViewModal();
    const { openFoodOfferDetailsModal } = useFoodOfferDetailsModal();

    const { food } = item;
    const foodItem = food as DatabaseTypes.Foods & { show_description_icon_on_card?: boolean | null };

    const { openAccountRequiredModal } = useAccountRequiredModal();

    const foods_area_color = appSettings?.foods_area_color || primaryColor;
    const contrastColor = useMyContrastColor(foods_area_color, theme, (theme as any)?.mode === 'dark');
    const defaultImage =
      getImageUrl(String(appSettings?.foods_placeholder_image)) ||
      appSettings?.foods_placeholder_image_remote_url ||
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

    const likedMarkings = useMemo(
      () =>
        item?.markings?.filter(marking =>
          profile?.markings?.some(
            (profileMarking: DatabaseTypes.ProfilesMarkings) =>
              profileMarking?.markings_id === marking?.markings_id && profileMarking?.like === true
          )
        ) ?? [],
      [item?.markings, profile?.markings]
    );
    
    const isLiked = useMemo(
      () =>
        RatingHelper.isMaxRating(currentRating) ||
        likedMarkings.length > 0,
      [likedMarkings.length, currentRating]
    );

    const borderWidth = dislikedMarkings.length > 0 ? 3 : isLiked ? 3 : 0;
    const borderColor = dislikedMarkings.length > 0 ? '#FF000095' : '#00B050';

    
    // Use pure useFoodCardBase if optimized props are present
    // If not, we might be in trouble (layout issues).
    // We expect propScreenWidth, theme, amountColumnsForcard to be present.
    // If they are missing, we default to 0/undefined, which is not ideal but prevents crash.
    // Since FoodItemBase is used in FoodOfferListItem which passes these, we are safe.
    
    const { screenWidth, containerStyle, imageContainerStyle, contentStyle } = useFoodCardBase(
        borderWidth, 
        borderColor, 
        propScreenWidth || 0, // Fallback 0, assuming propScreenWidth is passed
        theme, 
        amountColumnsForcard || 0 // Fallback 0
    );

    // If propScreenWidth is missing, useFoodCardBase will return 0 width.
    // This is why we need FoodItemConnected to handle the fallback case properly if we want to support legacy usage without props.
    // But for FoodItemBase, we assume props are passed.

    const markingsData = useMemo(
      () =>
        markings?.filter((m: DatabaseTypes.Markings) =>
          item?.markings?.some(mark => mark.markings_id === m.id)
        ),
      [markings, item?.markings]
    );

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

    const handleOpenSheet = useCallback(() => {
      showScrollViewModal({
        children: (
          <View>
            <Text style={[styles.markingHintText, { color: theme.screen.text }]}>
              {translate(TranslationKeys.food_offer_contains_disliked_markings)}
            </Text>
            <Labels
              foodDetails={foodItem}
              offerId={item?.id}
              foodOfferDetails={item}
              color={foods_area_color}
            />
          </View>
        ),
      });
    }, [showScrollViewModal, foodItem, item, foods_area_color, translate, theme.screen.text]);

    const updateRating = useCallback(
      async (rating: number | null) => {
        if (!user?.id) {
          openAccountRequiredModal();
          return;
        }

        // Optimistic update
        const oldRating = currentRating;
        setCurrentRating(rating);

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
          // Revert on error
          setCurrentRating(oldRating);
          if ((err as any).status === 403) {
            openAccountRequiredModal();
          } else {
            console.error('Failed to update rating:', err);
            toast('Could not update rating', 'error');
          }
        }
      },
      [foodItem?.id, profile?.id, canteen?.id, previousFeedback, dispatch, user?.id, toast, openAccountRequiredModal, currentRating]
    );

    const openMarkingLabel = useCallback(
      (marking: DatabaseTypes.Markings) => {
        dispatch({ type: SET_MARKING_DETAILS, payload: marking });
        showScrollViewModal({
          children: <MarkingContent />,
          disableHorizontalPadding: true,
        });
      },
      [dispatch, showScrollViewModal]
    );

    const handlePriceChange = useCallback(() => router.navigate('/price-group'), []);

    const foodDescription = useMemo(
      () => {
        const desc = getDescriptionFromTranslation(foodItem?.translations, language || 'de');
        if (!desc) return desc;
        let result = desc;
        if (pirateLanguage) result = applyPirateTransformation(result);
        if (funLanguageMode) result = applyFunModeTransformation(result, funLanguageMode);
        return result;
      },
      [foodItem?.translations, language, pirateLanguage, funLanguageMode]
    );

    const foodName = useMemo(
      () => {
        const name = excerpt(
          getTextFromTranslation(foodItem?.translations, language || 'de'),
          screenWidth > 1000 ? 120 : screenWidth > 700 ? 80 : screenWidth > 460 ? 60 : 40
        );
        if (!name) return name;
        let result = name;
        if (pirateLanguage) result = applyPirateTransformation(result);
        if (funLanguageMode) result = applyFunModeTransformation(result, funLanguageMode);
        return result;
      },
      [foodItem?.translations, language, pirateLanguage, funLanguageMode, screenWidth]
    );

    const priceLabel = useMemo(() => showFormatedPrice(showPrice(item, profile)), [item, profile]);

    const imageUri = useMemo(() => {
      return foodItem?.image_remote_url || getImageUrl(foodItem?.image as string) || defaultImage;
    }, [foodItem?.image_remote_url, foodItem?.image, defaultImage]);

    const handleDescriptionModal = useCallback(() => {
      if (!foodDescription) return;
      showScrollViewModal(
        {
          title: translate(TranslationKeys.description),
          children: (
            <View style={{ gap: 20 }}>
              <MyMarkdown content={foodDescription} textColor={theme.screen.text} />
              <RateAppSettingsItem />
            </View>
          ),
        },
        {}
      );
    }, [foodDescription, showScrollViewModal, translate, theme.screen.text]);

    return (
      <>
        <CustomTooltip
          placement="top"
          trigger={triggerProps => (
            <CardWithText
              {...triggerProps}
              onPress={() =>
                item.redirect_url
                  ? openInBrowser(item.redirect_url)
                  : openFoodOfferDetailsModal(item?.id, foodItem?.id || '')
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
              knownCardWidth={cardWidth}
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
                    <TouchableOpacity
                      style={[
                        styles.favContainer,
                        !user?.id && accountRequiredStyles.wrapper,
                        !user?.id && { borderWidth: 2, borderColor: foods_area_color },
                      ]}
                    >
                      {RatingHelper.isMaxRating(currentRating) ? (
                        <TouchableOpacity onPress={() => updateRating(null)}>
                          <AntDesign name="star" size={20} color={foods_area_color} />
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity onPress={() => updateRating(RatingHelper.MAX_RATING)}>
                          <MaterialIcons name="star" size={20} color="white" />
                        </TouchableOpacity>
                      )}
                      {!user?.id && (
                        <View
                          pointerEvents="none"
                          style={[StyleSheet.absoluteFill, accountRequiredStyles.dimOverlay, { borderRadius: 50 }]}
                        />
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

                    {foodItem?.show_description_icon_on_card && (
                      <TouchableOpacity
                        style={[styles.favContainer, { backgroundColor: foods_area_color }]}
                        onPress={handleDescriptionModal}
                      >
                        {foodDescription ? (
                          <MaterialCommunityIcons name="information" size={20} color={contrastColor} />
                        ) : (
                          <Entypo name="megaphone" size={20} color={contrastColor} />
                        )}
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.categoriesContainer}>
                    {markingsData?.map(mark =>
                      (mark?.image_remote_url || mark?.image) && mark?.show_on_card ? (
                        <TouchableOpacity key={mark.id} onPress={() => openMarkingLabel(mark)}>
                          <MyImage
                            remote_image_url={mark?.image_remote_url || getImageUrl(mark?.image as string)}
                            contentFit="cover"
                            style={[
                              styles.categoryLogo,
                              {
                                backgroundColor: mark?.background_color || undefined,
                                borderRadius: mark?.background_color ? 8 : mark.hide_border ? 5 : 0,
                              }
                            ]}
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
              <View style={styles.foodNameContainer}>
                  <Text
                    style={[styles.foodName, { color: theme.screen.text }]}
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
              {(() => {
                const tooltipText = getTextFromTranslation(foodItem?.translations, language || 'de');
                if (!tooltipText) return tooltipText;
                let result = tooltipText;
                if (pirateLanguage) result = applyPirateTransformation(result);
                if (funLanguageMode) result = applyFunModeTransformation(result, funLanguageMode);
                return result;
              })()}
            </TooltipText>
          </TooltipContent>
        </CustomTooltip>
      </>
    );
  },
  (prev, next) => 
    prev.item === next.item && 
    prev.previousFeedback === next.previousFeedback &&
    prev.canteen === next.canteen &&
    prev.cardWidth === next.cardWidth &&
    prev.language === next.language &&
    prev.pirateLanguage === next.pirateLanguage &&
    prev.funLanguageMode === next.funLanguageMode &&
    prev.serverInfo === next.serverInfo &&
    prev.appSettings === next.appSettings &&
    prev.primaryColor === next.primaryColor &&
    prev.user === next.user &&
    prev.isManagement === next.isManagement &&
    prev.profile === next.profile &&
    prev.markings === next.markings &&
    prev.screenWidth === next.screenWidth &&
    prev.theme === next.theme &&
    prev.amountColumnsForcard === next.amountColumnsForcard
);

const FoodItemConnected: React.FC<FoodItemProps> = (props) => {
    const { item } = props;
    // Always call hooks unconditionally; prefer props over store values for backward compatibility
    const languageFromStore = useAppSelector((state) => state.settings.language);
    const pirateLanguageFromStore = useAppSelector((state) => state.settings.pirateLanguage);
    const funLanguageModeFromStore = useAppSelector((state) => state.settings.funLanguageMode);
    const serverInfoFromStore = useAppSelector((state) => state.settings.serverInfo);
    const appSettingsFromStore = useAppSelector((state) => state.settings.appSettings);
    const primaryColorFromStore = useAppSelector((state) => state.settings.primaryColor);
    const amountColumnsForCardFromStore = useAppSelector((state) => state.settings.amountColumnsForcard);
    const userFromStore = useAppSelector((state) => state.authReducer.user);
    const isManagementFromStore = useAppSelector((state) => state.authReducer.isManagement);
    const markingsFromStore = useAppSelector(selectMarkings);

    const language = props.language ?? languageFromStore;
    const pirateLanguage = props.pirateLanguage ?? pirateLanguageFromStore;
    const funLanguageMode = props.funLanguageMode ?? funLanguageModeFromStore;
    const serverInfo = props.serverInfo ?? serverInfoFromStore;
    const appSettings = props.appSettings ?? appSettingsFromStore;
    const primaryColor = props.primaryColor ?? primaryColorFromStore;
    
    const { theme } = useTheme();
    const amountColumnsForcard = props.amountColumnsForcard ?? amountColumnsForCardFromStore;

    const user = props.user ?? userFromStore;
    const isManagement = props.isManagement ?? isManagementFromStore;
    
    // Optimization: Select only necessary profile fields to avoid re-renders on unrelated profile updates (e.g. device info)
    const profileId = useAppSelector((state) => state.authReducer.profile?.id);
    const profileMarkings = useAppSelector((state) => state.authReducer.profile?.markings);
    const priceGroup = useAppSelector((state) => state.authReducer.profile?.price_group);

    const ownFoodFeedbacks = useAppSelector(selectOwnFoodFeedbacks);

    const previousFeedback = useMemo(() => {
        if (props.previousFeedback) return props.previousFeedback;
        const food = item?.food as any;
        const foodId = food ? (typeof food === 'string' ? food : food.id) : undefined;
        if (!foodId) return undefined;
        return getpreviousFeedback(ownFoodFeedbacks as any, foodId);
    }, [props.previousFeedback, item, ownFoodFeedbacks]);
    
    const profile = useMemo(() => {
        if (props.profile) return props.profile;
        return {
            id: profileId,
            markings: profileMarkings,
            price_group: priceGroup
        };
    }, [props.profile, profileId, profileMarkings, priceGroup]);

    const markings = props.markings ?? markingsFromStore;

    return (
        <FoodItemBase
            {...props}
            previousFeedback={previousFeedback}
            language={language}
            pirateLanguage={pirateLanguage}
            funLanguageMode={funLanguageMode}
            serverInfo={serverInfo}
            appSettings={appSettings}
            primaryColor={primaryColor}
            user={user}
            isManagement={isManagement}
            profile={profile}
            markings={markings}
            theme={theme}
            amountColumnsForcard={amountColumnsForcard}
        />
    );
};

export default FoodItemConnected;
