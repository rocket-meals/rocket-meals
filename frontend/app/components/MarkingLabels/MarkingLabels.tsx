import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { MarkingLabelProps } from './types';
import { getImageUrl } from '@/constants/HelperFunctions';

import { ProfileHelper } from '@/redux/actions/Profile/Profile';
import { SET_MARKING_DETAILS, UPDATE_PROFILE } from '@/redux/Types/types';
import BaseBottomSheet from '../BaseBottomSheet';
import PermissionSheet from '../PermissionSheet/PermissionSheet';
import type BottomSheet from '@gorhom/bottom-sheet';
import { useTheme } from '@/hooks/useTheme';
import { isWeb } from '@/constants/Constants';
import styles from './styles';
import { getTextFromTranslation } from '@/helper/resourceHelper';
import { Markings, Profiles } from '@/constants/types';
import { useMyContrastColor } from '@/helper/colorHelper';
import { iconLibraries } from '../Drawer/CustomDrawerContent';
import { Tooltip, TooltipContent, TooltipText } from '@gluestack-ui/themed';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';
const MarkingLabels: React.FC<MarkingLabelProps> = ({
  markingId,
  handleMenuSheet,
}) => {
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const { translate } = useLanguage();
  const profileHelper = new ProfileHelper();
  const permissionSheetRef = useRef<BottomSheet>(null);
  const openPermissionSheet = () => permissionSheetRef.current?.expand();
  const closePermissionSheet = () => permissionSheetRef.current?.close();
  const [showTooltip, setShowTooltip] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [dislikeLoading, setDislikeLoading] = useState(false);
  const {
    primaryColor,
    language,
    appSettings,
    selectedTheme: mode,
  } = useSelector((state: RootState) => state.settings);

  const { user, profile } = useSelector(
    (state: RootState) => state.authReducer
  );
  const foods_area_color = appSettings?.foods_area_color
    ? appSettings?.foods_area_color
    : primaryColor;
  const { markings } = useSelector((state: RootState) => state.food);
  const marking = markings?.find((mark: any) => mark.id === markingId);
  const ownMarking = profile?.markings?.find(
    (mark: any) => mark.markings_id === markingId
  );

  const openMarkingLabel = (marking: Markings) => {
    if (handleMenuSheet) {
      dispatch({
        type: SET_MARKING_DETAILS,
        payload: marking,
      });
      handleMenuSheet();
    }
  };

  // Fetch profile function
  const fetchProfile = async () => {
    try {
      const profile = (await profileHelper.fetchProfileById(
        user?.profile,
        {}
      )) as Profiles;
      if (profile) {
        dispatch({ type: UPDATE_PROFILE, payload: profile });
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const handleAnonymousMarking = (like: boolean) => {
    const profileData = { ...profile };
    let markingFound = false;

    // Update or remove marking in the profile
    profileData?.markings?.forEach((profileMarkings: any, index: number) => {
      if (profileMarkings?.markings_id === markingId) {
        const likeStats = profileMarkings?.like === like ? null : like;
        markingFound = true;
        if (likeStats === null) {
          profileData?.markings.splice(index, 1); // Remove if unliked
        } else {
          profileData.markings[index] = { ...ownMarking, like: like }; // Update like status
        }
      }
    });

    // If the marking doesn't exist, add it
    if (!markingFound) {
      profileData?.markings?.push({
        ...ownMarking,
        like: like,
        markings_id: markingId,
        profiles_id: profileData?.id,
      });
    }

    dispatch({ type: UPDATE_PROFILE, payload: profileData });
  };

  // Handle update for liking/unliking the marking
  const handleUpdateMarking = useCallback(
    async (like: boolean) => {
      if (like) {
        setLikeLoading(true);
      } else {
        setDislikeLoading(true);
      }
      if (!user?.id) {
        handleAnonymousMarking(like);
        if (like) {
          setLikeLoading(false);
        } else {
          setDislikeLoading(false);
        }
        return;
      }

      try {
        const likeStats = ownMarking?.like === like ? null : like;
        const updatedMarking = { ...ownMarking, like: likeStats };

        const profileData = { ...profile };
        let markingFound = false;

        // Update or remove marking in the profile
        profileData?.markings.forEach((profileMarkings: any, index: number) => {
          if (profileMarkings.markings_id === updatedMarking?.markings_id) {
            markingFound = true;
            if (updatedMarking?.like === null) {
              profileData.markings.splice(index, 1); // Remove if unliked
            } else {
              profileData.markings[index] = updatedMarking; // Update like status
            }
          }
        });

        // If the marking doesn't exist, add it
        if (!markingFound) {
          profileData.markings.push({
            ...updatedMarking,
            markings_id: markingId,
            profiles_id: profileData?.id,
          });
        }

        dispatch({ type: UPDATE_PROFILE, payload: profileData });

        // Update profile on the server
        const result = (await profileHelper.updateProfile(
          profileData
        )) as Profiles;
        if (result) {
          fetchProfile();
          if (like) {
            setLikeLoading(false);
          } else {
            setDislikeLoading(false);
          }
        }
      } catch (error) {
        console.error('Error updating marking:', error);
      } finally {
        if (like) {
          setLikeLoading(false);
        } else {
          setDislikeLoading(false);
        }
      }
    },
    [
      user?.id,
      profile,
      ownMarking,
      markingId,
      dispatch,
      profileHelper,
      fetchProfile,
    ]
  );

  if (!marking) return null; // Early return if the marking doesn't exist

  const markingImage = marking?.image_remote_url
    ? { uri: marking?.image_remote_url }
    : { uri: getImageUrl(String(marking?.image)) };

  const markingText = getTextFromTranslation(marking?.translations, language);
  const iconSize = isWeb ? 24 : 22;

  const MarkingBackgroundColor = marking?.background_color;
  const MarkingColor = useMyContrastColor(
    marking?.background_color,
    theme,
    mode === 'dark'
  );

  const iconParts = marking?.icon?.split(':') || [];
  const [library, name] = iconParts;

  const Icon = library && iconLibraries[library];
  return (
    <View style={styles.row}>
      <View style={styles.col}>
        {marking?.icon && !markingImage?.uri ? (
          handleMenuSheet ? (
            <Tooltip
              placement='top'
              trigger={(triggerProps) => (
                <Pressable
                  {...triggerProps}
                  onPress={() => openMarkingLabel(marking)}
                  onHoverIn={() => setShowTooltip(true)}
                  onHoverOut={() => setShowTooltip(false)}
                >
                  <View
                    style={{
                      ...styles.shortCode,
                      backgroundColor: MarkingBackgroundColor || 'transparent',
                      borderWidth: marking?.hide_border ? 0 : 1,
                      borderColor: MarkingColor,
                    }}
                  >
                    <Icon name={name} size={20} color={MarkingColor} />
                  </View>
                </Pressable>
              )}
            >
              <TooltipContent bg={theme.tooltip.background} py='$1' px='$2'>
                <TooltipText fontSize='$sm' color={theme.tooltip.text}>
                  {`${markingText}`}
                </TooltipText>
              </TooltipContent>
            </Tooltip>
          ) : (
            <View
              style={{
                ...styles.shortCode,
                backgroundColor: MarkingBackgroundColor || 'transparent',
                borderWidth: marking?.hide_border ? 0 : 1,
                borderColor: MarkingColor,
              }}
            >
              <Icon name={name} size={20} color={MarkingColor} />
            </View>
          )
        ) : marking?.short_code && !markingImage?.uri ? (
          handleMenuSheet ? (
            <Tooltip
              placement='top'
              trigger={(triggerProps) => (
                <Pressable
                  {...triggerProps}
                  onPress={() => openMarkingLabel(marking)}
                  onHoverIn={() => setShowTooltip(true)}
                  onHoverOut={() => setShowTooltip(false)}
                >
                  <View
                    style={{
                      ...styles.shortCode,
                      backgroundColor: MarkingBackgroundColor || 'transparent',
                      borderWidth: marking?.hide_border ? 0 : 1,
                      borderColor: MarkingColor,
                    }}
                  >
                    <Text
                      style={{
                        color: MarkingColor,
                        fontSize: 16,
                        lineHeight: 18,
                      }}
                    >
                      {marking?.short_code}
                    </Text>
                  </View>
                </Pressable>
              )}
            >
              <TooltipContent bg={theme.tooltip.background} py='$1' px='$2'>
                <TooltipText fontSize='$sm' color={theme.tooltip.text}>
                  {`${markingText}`}
                </TooltipText>
              </TooltipContent>
            </Tooltip>
          ) : (
            <View
              style={{
                ...styles.shortCode,
                backgroundColor: MarkingBackgroundColor || 'transparent',
                borderWidth: marking?.hide_border ? 0 : 1,
                borderColor: MarkingColor,
              }}
            >
              <Text
                style={{ color: MarkingColor, fontSize: 16, lineHeight: 18 }}
              >
                {marking?.short_code}
              </Text>
            </View>
          )
        ) : handleMenuSheet ? (
          <Tooltip
            placement='top'
            trigger={(triggerProps) => (
              <Pressable
                {...triggerProps}
                onPress={() => openMarkingLabel(marking)}
                onHoverIn={() => setShowTooltip(true)}
                onHoverOut={() => setShowTooltip(false)}
              >
                <Image
                  source={markingImage}
                  style={[
                    styles.icon,
                    markingImage.uri && {
                      backgroundColor: marking?.background_color
                        ? marking?.background_color
                        : 'transparent',
                      borderRadius: marking?.background_color ? 8 : 0,
                    },
                  ]}
                />
              </Pressable>
            )}
          >
            <TooltipContent bg={theme.tooltip.background} py='$1' px='$2'>
              <TooltipText fontSize='$sm' color={theme.tooltip.text}>
                {`${markingText}`}
              </TooltipText>
            </TooltipContent>
          </Tooltip>
        ) : (
          <Image
            source={markingImage}
            style={[
              styles.icon,
              markingImage.uri && {
                backgroundColor:
                  marking?.background_color && marking?.background_color,
                borderRadius: marking?.background_color ? 8 : 0,
              },
            ]}
          />
        )}
        <Tooltip
          placement='top'
          isOpen={showTooltip}
          trigger={(triggerProps) => (
            <Pressable
              {...triggerProps}
              onHoverIn={() => setShowTooltip(true)}
              onHoverOut={() => setShowTooltip(false)}
            >
              <Text
                style={{
                  ...styles.label,
                  color: theme.screen.text,
                  fontSize: isWeb ? 18 : 14,
                  marginTop: 2,
                }}
              >
                {markingText}
              </Text>
            </Pressable>
          )}
        >
          <TooltipContent
            bg={theme.tooltip.background}
            py='$1'
            px='$2'
            left='100%'
            transform={[{ translateX: -50 }]} // Adjust to truly center it
          >
            <TooltipText fontSize='$sm' color={theme.tooltip.text}>
              {`${translate(TranslationKeys.markings)}: ${markingText}`}
            </TooltipText>
          </TooltipContent>
        </Tooltip>
      </View>
      {/* REACTION SIDE */}

      <View style={styles.col2}>
        <Tooltip
          placement='top'
          trigger={(triggerProps) => (
            <Pressable
              onHoverIn={() => setShowTooltip(true)}
              onHoverOut={() => setShowTooltip(false)}
              style={styles.likeButton}
              {...triggerProps}
              onPress={() => handleUpdateMarking(true)}
            >
              {likeLoading ? (
                <ActivityIndicator size={25} color={foods_area_color} />
              ) : (
                <MaterialCommunityIcons
                  name={ownMarking?.like ? 'thumb-up' : 'thumb-up-outline'}
                  size={iconSize}
                  color={
                    ownMarking?.like ? foods_area_color : theme.screen.icon
                  }
                />
              )}
            </Pressable>
          )}
        >
          <TooltipContent bg={theme.tooltip.background} py='$1' px='$2'>
            <TooltipText fontSize='$sm' color={theme.tooltip.text}>
              {`${translate(TranslationKeys.i_like_that)}: ${translate(
                ownMarking?.like
                  ? TranslationKeys.active
                  : TranslationKeys.inactive
              )}: ${translate(TranslationKeys.markings)}: ${markingText}`}
            </TooltipText>
          </TooltipContent>
        </Tooltip>
        <Tooltip
          placement='top'
          trigger={(triggerProps) => (
            <Pressable
              onHoverIn={() => setShowTooltip(true)}
              onHoverOut={() => setShowTooltip(false)}
              {...triggerProps}
              style={styles.dislikeButton}
              {...triggerProps}
              onPress={() => handleUpdateMarking(false)}
            >
              {dislikeLoading ? (
                <ActivityIndicator size={25} color={foods_area_color} />
              ) : (
                <MaterialCommunityIcons
                  name={
                    ownMarking?.like === false
                      ? 'thumb-down'
                      : 'thumb-down-outline'
                  }
                  size={iconSize}
                  color={
                    ownMarking?.like === false
                      ? foods_area_color
                      : theme.screen.icon
                  }
                />
              )}
            </Pressable>
          )}
        >
          <TooltipContent bg={theme.tooltip.background} py='$1' px='$2'>
            <TooltipText fontSize='$sm' color={theme.tooltip.text}>
              {`${translate(TranslationKeys.i_dislike_that)}: ${translate(
                ownMarking?.like === false
                  ? TranslationKeys.active
                  : TranslationKeys.inactive
              )}: ${translate(TranslationKeys.markings)}: ${markingText}`}
            </TooltipText>
          </TooltipContent>
        </Tooltip>
      </View>
      <BaseBottomSheet
        ref={permissionSheetRef}
        index={-1}
        backgroundStyle={{ backgroundColor: theme.sheet.sheetBg }}
        enablePanDownToClose
        handleComponent={null}
        onClose={closePermissionSheet}
      >
        <PermissionSheet closeSheet={closePermissionSheet} />
      </BaseBottomSheet>
    </View>
  );
};

export default MarkingLabels;
