import React, { useMemo, useState } from 'react';
import { Image, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import styles from './styles';
import { FeedbackLabelProps } from './types';
import { isWeb } from '@/constants/Constants';
import {
  getIconComponent,
  getTextFromTranslation,
} from '@/helper/resourceHelper';
import { DatabaseTypes } from 'repo-depkit-common';
import { FoodFeedbackLabelEntryHelper } from '@/redux/actions/FoodFeeedbackLabelEntries/FoodFeedbackLabelEntries';
import { useDispatch, useSelector } from 'react-redux';
import useSelectedCanteen from '@/hooks/useSelectedCanteen';
import {
  DELETE_OWN_FOOD_FEEDBACK_LABEL_ENTRIES_LOCAL,
  UPDATE_OWN_FOOD_FEEDBACK_LABEL_ENTRIES_LOCAL,
} from '@/redux/Types/types';
import PermissionModal from '../PermissionModal/PermissionModal';
import { myContrastColor } from '@/helper/colorHelper';
import { Tooltip, TooltipContent, TooltipText } from '@gluestack-ui/themed';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';
const FeedbackLabel: React.FC<FeedbackLabelProps> = ({
  label,
  icon,
  imageUrl,
  labelEntries,
  foodId,
  offerId,
}) => {
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const { translate } = useLanguage();
  const {
    primaryColor,
    language,
    appSettings,
    selectedTheme: mode,
  } = useSelector((state: RootState) => state.settings);
  const [warning, setWarning] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const { user, profile } = useSelector(
    (state: RootState) => state.authReducer
  );
  const selectedCanteen = useSelectedCanteen();
  const foodFeedbackLabelEntryHelper = new FoodFeedbackLabelEntryHelper();
  const foods_area_color = appSettings?.foods_area_color
    ? appSettings?.foods_area_color
    : primaryColor;
  const contrastColor = myContrastColor(
    foods_area_color,
    theme,
    mode === 'dark'
  );

  // Use useMemo to optimize the filtering process
  const labelData = useMemo(() => {
    return (
      labelEntries?.find(
        (entry: DatabaseTypes.FoodsFeedbacksLabelsEntries) =>
          entry.label === label[0]?.foods_feedbacks_labels_id &&
          entry.food === foodId
      ) || ({} as DatabaseTypes.FoodsFeedbacksLabelsEntries)
    );
  }, [label, labelEntries]);

  // Function to handle updating the entry
  const handleUpdateEntry = async (isLike: boolean | null) => {
    if (!user?.id) {
      setWarning(true);
      return;
    }
    let likeStats = null;
    if (isLike === true && like === true) {
      likeStats = null;
    } else if (isLike === false && like === false) {
      likeStats = null;
    } else {
      likeStats = isLike;
    }
    // Update the entry
    const result =
      (await foodFeedbackLabelEntryHelper.updateFoodFeedbackLabelEntry(
        foodId,
        profile.id,
        labelEntries,
        String(label[0]?.foods_feedbacks_labels_id),
        likeStats,
        selectedCanteen?.id,
        offerId
      )) as DatabaseTypes.FoodsFeedbacksLabelsEntries;
    dispatch({
      type: result
        ? UPDATE_OWN_FOOD_FEEDBACK_LABEL_ENTRIES_LOCAL
        : DELETE_OWN_FOOD_FEEDBACK_LABEL_ENTRIES_LOCAL,
      payload: result ? result : labelData.id,
    });
  };

  const { like, dislike } = labelData;

  return (
    <View style={styles.row}>
      <Tooltip
        placement='top'
        isOpen={showTooltip}
        trigger={(triggerProps) => (
          <Pressable
            {...triggerProps}
            onHoverIn={() => setShowTooltip(true)}
            onHoverOut={() => setShowTooltip(false)}
            style={{ ...styles.col, cursor: 'default' }}
          >
            {/* <View > */}
            {imageUrl && (
              <Image source={{ uri: imageUrl }} style={styles.icon} />
            )}
            {icon && getIconComponent(icon, theme.screen.icon)}
            <Text
              style={[
                styles.label,
                {
                  color: theme.screen.text,
                  fontSize: isWeb ? 18 : 14,
                },
              ]}
            >
              {getTextFromTranslation(label, language)}
            </Text>
            {/* </View> */}
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
            {getTextFromTranslation(label, language)}
          </TooltipText>
        </TooltipContent>
      </Tooltip>

      <View style={styles.col2}>
        <Tooltip
          placement='top'
          trigger={(triggerProps) => (
            <Pressable
              style={{
                ...styles.likeButton,
                backgroundColor: like && foods_area_color,
              }}
              {...triggerProps}
              onPress={() => handleUpdateEntry(true)}
              onHoverIn={() => setShowTooltip(true)}
              onHoverOut={() => setShowTooltip(false)}
            >
              <MaterialCommunityIcons
                name={like ? 'thumb-up' : 'thumb-up-outline'}
                size={isWeb ? 24 : 22}
                color={like ? contrastColor : theme.screen.icon}
              />
            </Pressable>
          )}
        >
          <TooltipContent bg={theme.tooltip.background} py='$1' px='$2'>
            <TooltipText fontSize='$sm' color={theme.tooltip.text}>
              {`${translate(TranslationKeys.i_like_that)}: ${translate(
                like ? TranslationKeys.active : TranslationKeys.inactive
              )}: ${getTextFromTranslation(label, language)}`}
            </TooltipText>
          </TooltipContent>
        </Tooltip>
        <Tooltip
          placement='top'
          trigger={(triggerProps) => (
            <Pressable
              style={{
                ...styles.dislikeButton,
                backgroundColor: like === false && foods_area_color,
              }}
              {...triggerProps}
              onHoverIn={() => setShowTooltip(true)}
              onHoverOut={() => setShowTooltip(false)}
              onPress={() => handleUpdateEntry(false)}
            >
              <MaterialCommunityIcons
                name={like === false ? 'thumb-down' : 'thumb-down-outline'}
                size={isWeb ? 24 : 22}
                color={like === false ? contrastColor : theme.screen.icon}
              />
            </Pressable>
          )}
        >
          <TooltipContent bg={theme.tooltip.background} py='$1' px='$2'>
            <TooltipText fontSize='$sm' color={theme.tooltip.text}>
              {`${translate(TranslationKeys.i_dislike_that)}: ${translate(
                like === false
                  ? TranslationKeys.active
                  : TranslationKeys.inactive
              )}: ${getTextFromTranslation(label, language)}`}
            </TooltipText>
          </TooltipContent>
        </Tooltip>
      </View>
      <PermissionModal isVisible={warning} setIsVisible={setWarning} />
    </View>
  );
};

export default FeedbackLabel;
