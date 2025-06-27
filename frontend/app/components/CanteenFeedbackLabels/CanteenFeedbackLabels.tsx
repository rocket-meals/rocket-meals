import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import styles from './styles';
import {
  CanteenFeedbackLabelProps,
  ModifiedCanteensFeedbacksLabelsEntries,
} from './types';
import { isWeb } from '@/constants/Constants';
import {
  getIconComponent,
  getTextFromTranslation,
} from '@/helper/resourceHelper';
import {
  CanteensFeedbacksLabelsEntries,
  FoodsFeedbacksLabelsEntries,
} from '@/constants/types';
import { useDispatch, useSelector } from 'react-redux';
import {
  DELETE_OWN_CANTEEN_FEEDBACK_LABEL_ENTRIES,
  UPDATE_OWN_CANTEEN_FEEDBACK_LABEL_ENTRIES,
} from '@/redux/Types/types';
import BaseBottomSheet from '../BaseBottomSheet';
import PermissionSheet from '../PermissionSheet/PermissionSheet';
import type BottomSheet from '@gorhom/bottom-sheet';
import { getImageUrl } from '@/constants/HelperFunctions';
import { CanteenFeedbackLabelEntryHelper } from '@/redux/actions/CanteenFeedbackLabelEntries/CanteenFeedbackLabelEntries';
import { isSameDay } from 'date-fns';
import { myContrastColor } from '@/helper/colorHelper';
import { Tooltip, TooltipContent, TooltipText } from '@gluestack-ui/themed';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';

const CanteenFeedbackLabels: React.FC<CanteenFeedbackLabelProps> = ({
  label,
  date,
}) => {
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const { translate } = useLanguage();
  const canteenFeedbackLabelEntryHelper = new CanteenFeedbackLabelEntryHelper();
  const permissionSheetRef = useRef<BottomSheet>(null);
  const openPermissionSheet = () => permissionSheetRef.current?.expand();
  const closePermissionSheet = () => permissionSheetRef.current?.close();
  const [showTooltip, setShowTooltip] = useState(false);
  const {
    primaryColor,
    language,
    appSettings,
    selectedTheme: mode,
  } = useSelector((state: RootState) => state.settings);
  const [count, setCount] = useState({ likes: 0, dislikes: 0 });
  const { user, profile } = useSelector(
    (state: RootState) => state.authReducer
  );
  const { selectedCanteen, ownCanteenFeedBackLabelEntries } = useSelector(
    (state: RootState) => state.canteenReducer
  );
  const foods_area_color = appSettings?.foods_area_color
    ? appSettings?.foods_area_color
    : primaryColor;
  const contrastColor = myContrastColor(
    foods_area_color,
    theme,
    mode === 'dark'
  );

  // Use useMemo to optimize the filtering processs
  const labelData = useMemo(() => {
    return (
      ownCanteenFeedBackLabelEntries?.find(
        (entry: CanteensFeedbacksLabelsEntries) =>
          entry.label === label?.id &&
          entry.canteen === selectedCanteen?.id &&
          isSameDay(entry.date, date)
      ) || ({} as FoodsFeedbacksLabelsEntries)
    );
  }, [ownCanteenFeedBackLabelEntries, date]);

  // Function to handle updating the entry
  const handleUpdateEntry = async (isLike: boolean | null) => {
    if (!user?.id) {
      openPermissionSheet();
      return;
    }
    let likeStats = null;
    if (isLike === true && labelData?.like === true) {
      likeStats = null;
    } else if (isLike === false && labelData?.like === false) {
      likeStats = null;
    } else {
      likeStats = isLike;
    }
    // Update the entry
    const result =
      (await canteenFeedbackLabelEntryHelper.updateCanteenFeedbackLabelEntry(
        profile.id,
        ownCanteenFeedBackLabelEntries,
        label?.id,
        likeStats,
        selectedCanteen.id,
        date
      )) as CanteensFeedbacksLabelsEntries;
    getLabelEntries(label?.id);
    dispatch({
      type: result
        ? UPDATE_OWN_CANTEEN_FEEDBACK_LABEL_ENTRIES
        : DELETE_OWN_CANTEEN_FEEDBACK_LABEL_ENTRIES,
      payload: result ? result : labelData.id,
    });
  };

  const getLabelEntries = async (labelId: string) => {
    const result =
      (await canteenFeedbackLabelEntryHelper.fetchCanteenFeedbackLabelEntries(
        {},
        date,
        selectedCanteen.id,
        labelId
      )) as ModifiedCanteensFeedbacksLabelsEntries[];
    if (result) {
      const likes = result?.find((entry) => entry.like === true)?.count || 0;
      const dislikes =
        result?.find((entry) => entry.like === false)?.count || 0;

      setCount({ likes: Number(likes), dislikes: Number(dislikes) });
    }
  };

  useEffect(() => {
    if (label?.id) {
      getLabelEntries(label?.id);
    }
  }, [label?.id, date]);

  return (
    <View style={styles.row}>
      <Tooltip
        placement='top'
        isOpen={showTooltip}
        trigger={(triggerProps) => (
          <Pressable
            style={{ ...styles.col, cursor: 'default' }}
            {...triggerProps}
            onHoverIn={() => setShowTooltip(true)}
            onHoverOut={() => setShowTooltip(false)}
          >
            {label?.image_remote_url || label?.image ? (
              <Image
                source={{
                  uri: label?.image_remote_url || getImageUrl(label?.image),
                }}
                style={styles.icon}
              />
            ) : (
              label?.icon && getIconComponent(label?.icon, theme.screen.icon)
            )}
            <Text
              style={[
                styles.label,
                {
                  color: theme.screen.text,
                  fontSize: isWeb ? 18 : 14,
                  marginTop: 2,
                },
              ]}
            >
              {getTextFromTranslation(label?.translations, language)}
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
            {getTextFromTranslation(label?.translations, language)}
          </TooltipText>
        </TooltipContent>
      </Tooltip>
      <View style={styles.col2}>
        <Tooltip
          placement='top'
          trigger={(triggerProps) => (
            <Pressable
              {...triggerProps}
              onHoverIn={() => setShowTooltip(true)}
              onHoverOut={() => setShowTooltip(false)}
              style={{
                ...styles.likeButton,
                backgroundColor: labelData?.like && foods_area_color,
              }}
              onPress={() => handleUpdateEntry(true)}
            >
              <MaterialCommunityIcons
                name={labelData?.like ? 'thumb-up' : 'thumb-up-outline'}
                size={isWeb ? 24 : 22}
                color={labelData?.like ? contrastColor : theme.screen.icon}
              />
              {count?.likes > 0 && (
                <Text style={[styles.count, { color: contrastColor }]}>
                  {count.likes}
                </Text>
              )}
            </Pressable>
          )}
        >
          <TooltipContent bg={theme.tooltip.background} py='$1' px='$2'>
            <TooltipText fontSize='$sm' color={theme.tooltip.text}>
              {`${translate(TranslationKeys.i_like_that)}: ${translate(
                labelData?.like
                  ? TranslationKeys.active
                  : TranslationKeys.inactive
              )}: ${getTextFromTranslation(label?.translations, language)}`}
            </TooltipText>
          </TooltipContent>
        </Tooltip>

        <Tooltip
          placement='top'
          trigger={(triggerProps) => (
            <Pressable
              {...triggerProps}
              onHoverIn={() => setShowTooltip(true)}
              onHoverOut={() => setShowTooltip(false)}
              style={{
                ...styles.dislikeButton,
                backgroundColor: labelData?.like === false && foods_area_color,
              }}
              onPress={() => handleUpdateEntry(false)}
            >
              <MaterialCommunityIcons
                name={
                  labelData?.like === false
                    ? 'thumb-down'
                    : 'thumb-down-outline'
                }
                size={isWeb ? 24 : 22}
                color={
                  labelData?.like === false ? contrastColor : theme.screen.icon
                }
              />
              {count?.dislikes > 0 && (
                <Text style={[styles.count, { color: contrastColor }]}>
                  {count.dislikes}
                </Text>
              )}
            </Pressable>
          )}
        >
          <TooltipContent bg={theme.tooltip.background} py='$1' px='$2'>
            <TooltipText fontSize='$sm' color={theme.tooltip.text}>
              {`${translate(TranslationKeys.i_dislike_that)}: ${translate(
                labelData?.like === false
                  ? TranslationKeys.active
                  : TranslationKeys.inactive
              )}: ${getTextFromTranslation(label?.translations, language)}`}
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

export default CanteenFeedbackLabels;
