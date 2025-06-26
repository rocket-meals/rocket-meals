import {
  Image,
  Linking,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import React from 'react';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import styles from './styles';
import { MenuSheetProps } from './types';
import { isWeb } from '@/constants/Constants';
import { useTheme } from '@/hooks/useTheme';
import { useSelector } from 'react-redux';
import { getImageUrl } from '@/constants/HelperFunctions';
import {
  getDescriptionFromTranslation,
  getTextFromTranslation,
} from '@/helper/resourceHelper';
import RedirectButton from '../RedirectButton';
import useToast from '@/hooks/useToast';
import { RootState } from '@/redux/reducer';

const extractTextAndLink = (description: string) => {
  // Remove unintended spaces between `]` and `(`
  const cleanedDescription = description.replace(/\]\s+\(/g, '](');

  const regex = /\[(.*?)\]\((.*?)\)/g;
  const match = regex.exec(cleanedDescription);

  if (match) {
    const label = match[1]; // The text inside the square brackets
    const link = match[2]; // The URL inside the parentheses
    const textWithoutLinkAndLabel = cleanedDescription
      .replace(match[0], '')
      .trim(); // Remove the entire match
    return { text: textWithoutLinkAndLabel, label, link };
  }

  return { text: description, label: '', link: null };
};

const MenuSheet: React.FC<MenuSheetProps> = ({ closeSheet }) => {
  const { theme } = useTheme();
  const toast = useToast();
  const { markingDetails } = useSelector((state: RootState) => state.food);
  const { language } = useSelector((state: RootState) => state.settings);
  const description = getDescriptionFromTranslation(
    markingDetails?.translations,
    language
  );
  const { text, label, link } = extractTextAndLink(description);

  const handleOpenInBrowser = async () => {
    if (link) {
      try {
        if (Platform.OS === 'web') {
          window.open(link, '_blank');
        } else {
          const supported = await Linking.canOpenURL(link);

          if (supported) {
            await Linking.openURL(link);
          } else {
            toast(`Cannot open URL: ${link}`, 'error');
          }
        }
      } catch (error) {
        console.error('An error occurred:', error);
      }
    }
  };
  return (
    <BottomSheetScrollView
      style={{ ...styles.sheetView, backgroundColor: theme.sheet.sheetBg }}
      contentContainerStyle={styles.contentContainer}
    >
      <View
        style={{
          ...styles.sheetHeader,
          paddingRight: isWeb ? 10 : 0,
          paddingTop: isWeb ? 10 : 0,
        }}
      >
        <View />
        <Text
          style={{
            ...styles.sheetHeading,
            maxWidth: '70%',
            textAlign: 'center',
            color: theme.sheet.text,
          }}
        >
          {getTextFromTranslation(markingDetails?.translations, language)}
          {` (${markingDetails?.external_identifier})`}
        </Text>
      </View>
      <View style={{ ...styles.menuContainer, width: isWeb ? '90%' : '100%' }}>
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri:
                markingDetails?.image_remote_url ||
                getImageUrl(String(markingDetails?.image)),
            }}
            style={{
              ...styles.image,
              backgroundColor: markingDetails?.background_color
                ? markingDetails?.background_color
                : 'transparent',
              borderRadius: markingDetails?.background_color
                ? 8
                : markingDetails.hide_border
                ? 5
                : 0,
            }}
          />
        </View>
        <Text
          style={{
            ...styles.body,
            color: theme.sheet.text,
          }}
        >
          {text}
        </Text>
        {link && (
          <RedirectButton
            label={label}
            type='link'
            backgroundColor=''
            color=''
            onClick={handleOpenInBrowser}
          />
        )}
      </View>
    </BottomSheetScrollView>
  );
};

export default MenuSheet;
