import React from 'react';
import { Image, Text, View } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { isWeb } from '@/constants/Constants';
import { useSelector } from 'react-redux';
import { PopupEventSheetProps } from './types';
import { getImageUrl } from '@/constants/HelperFunctions';
import CustomMarkdown from '@/components/CustomMarkdown/CustomMarkdown';
import {
  getTextFromTranslation,
  getTitleFromTranslation,
} from '@/helper/resourceHelper';
import { RootState } from '@/redux/reducer';

const PopupEventSheet: React.FC<PopupEventSheetProps> = ({
  closeSheet,
  eventData,
}) => {
  const { theme } = useTheme();
  const {
    primaryColor,
    language,
    appSettings,
    serverInfo,
    selectedTheme: mode,
  } = useSelector((state: RootState) => state.settings);
  const defaultImage = getImageUrl(serverInfo?.info?.project?.project_logo);
  const title = eventData?.translations
    ? getTitleFromTranslation(eventData?.translations, language)
    : '';
  const description = eventData?.translations
    ? getTextFromTranslation(eventData?.translations, language)
    : '';
  const foods_area_color = appSettings?.foods_area_color
    ? appSettings?.foods_area_color
    : primaryColor;

  return (
    <BottomSheetScrollView
      style={{ ...styles.sheetView, backgroundColor: theme.sheet.sheetBg }}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={{
        ...styles.sheetHeaderClose,
        paddingRight: isWeb ? 10 : 0,
        paddingTop: isWeb ? 10 : 0,
        alignItems: 'flex-end',
      }}>
      </View>
      <View
        style={{
          ...styles.sheetHeaderText,
        }}
      >
        <View />
        <Text
          style={{
            ...styles.sheetHeading,
            fontSize: isWeb ? 40 : 28,
            color: theme.screen.text,
          }}
        >
          {title || eventData?.alias}
        </Text>

      </View>
      <View style={styles.popupContainer}>
        {
            (eventData?.image || eventData?.image_remote_url) && (
                <View style={styles.imageContainer}>
                  <Image
                      style={styles.image}
                      source={{
                        uri:
                            eventData?.image_remote_url ||
                            getImageUrl(String(eventData?.image)),
                      }}
                  />
                </View>
            )
        }
        {description && (
          <CustomMarkdown
            content={description}
            backgroundColor={foods_area_color}
            imageWidth={'100%'}
            imageHeight={400}
          />
        )}
      </View>
    </BottomSheetScrollView>
  );
};

export default PopupEventSheet;
