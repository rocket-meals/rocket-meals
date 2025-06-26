import React from 'react';
import { Image, Linking, Text, TouchableOpacity, View } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { isWeb } from '@/constants/Constants';
import { useSelector } from 'react-redux';
import { PopupEventSheetProps } from './types';
import { getImageUrl } from '@/constants/HelperFunctions';
import CustomCollapsible from '../CustomCollapsible/CustomCollapsible';
import { myContrastColor } from '@/helper/colorHelper';
import {
  getTextFromTranslation,
  getTitleFromTranslation,
} from '@/helper/resourceHelper';
import RedirectButton from '../RedirectButton';
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
  const foods_area_color = appSettings?.foods_area_color
    ? appSettings?.foods_area_color
    : primaryColor;
  const contrastColor = myContrastColor(
    foods_area_color,
    theme,
    mode === 'dark'
  );

  const getContent = () => {
    // Regex patterns for different content types
    const contentPatterns = {
      email: /\[([^\]]+)]\((mailto:[^\)]+)\)/,
      link: /\[([^\]]+)]\((https?:\/\/[^\)]+)\)/,
      image: /!\[([^\]]*)]\(([^)]+)\)/,
      heading: /^#{1,3}\s*(.*)$/,
    };

    if (eventData?.translations) {
      const rawText = getTextFromTranslation(eventData?.translations, language);
      const lines = rawText.split('\n').filter((line) => line.trim() !== '');

      // Process content into a structured format
      const processContent = (lines: string[]) => {
        const result: any[] = [];
        let stack = [{ level: 0, items: result }];
        let currentText = '';

        const flushTextContent = () => {
          if (currentText.trim()) {
            stack[stack.length - 1].items.push({
              type: 'text',
              content: currentText.trim(),
            });
            currentText = '';
          }
        };

        lines.forEach((line) => {
          // Check for headings first
          const headingMatch = line.match(contentPatterns.heading);
          if (headingMatch) {
            flushTextContent();

            const level = headingMatch[0].match(/#/g)?.length || 1;
            const headerText = headingMatch[1].trim();

            // Close previous sections at this level or higher
            while (stack.length > 1 && stack[stack.length - 1].level >= level) {
              stack.pop();
            }

            const newSection = {
              type: 'collapsible',
              header: headerText,
              items: [],
              level,
            };

            stack[stack.length - 1].items.push(newSection);
            stack.push({ level, items: newSection.items });
            return;
          }

          // Check for other content types
          if (contentPatterns.image.test(line)) {
            flushTextContent();
            const match = line.match(contentPatterns.image);
            stack[stack.length - 1].items.push({
              type: 'image',
              altText: match?.[1] || '',
              url: match?.[2] || '',
            });
          } else if (contentPatterns.email.test(line)) {
            flushTextContent();
            const match = line.match(contentPatterns.email);
            stack[stack.length - 1].items.push({
              type: 'email',
              displayText: match?.[1],
              email: match?.[2],
            });
          } else if (contentPatterns.link.test(line)) {
            flushTextContent();
            const match = line.match(contentPatterns.link);
            stack[stack.length - 1].items.push({
              type: 'link',
              displayText: match?.[1],
              url: match?.[2],
            });
          } else {
            currentText += `${line}\n`;
          }
        });

        flushTextContent();
        return result;
      };

      // Component for rendering text with proper formatting
      const TextContent = ({
        text,
        level,
      }: {
        text: string;
        level: number;
      }) => (
        <Text
          style={{
            fontSize: 16,
            fontFamily: 'Poppins_400Regular',
            color: theme.screen.text,
            marginLeft: level * 16,
            marginBottom: 10,
            lineHeight: 24,
            textAlign: 'center',
          }}
        >
          {text}
        </Text>
      );

      // Component for rendering images
      const ImageContent = ({
        url,
        altText,
        level,
      }: {
        url: string;
        altText: string;
        level: number;
      }) => (
        <View
          style={{
            marginLeft: level * 16,
            marginVertical: 10,
            backgroundColor: theme.screen.iconBg,
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          <Image
            source={{ uri: url }}
            style={{
              width: '100%',
              height: 400,
              resizeMode: 'cover',
            }}
            alt={altText}
          />
          {altText && (
            <Text
              style={{
                padding: 8,
                fontSize: 12,
                color: theme.screen.text,
                fontFamily: 'Poppins_400Regular',
              }}
            >
              {altText}
            </Text>
          )}
        </View>
      );

      // Main renderer for content items
      const renderContentItem = (item: any, level: number, index: number) => {
        switch (item.type) {
          case 'text':
            return (
              <TextContent
                key={`text-${level}-${index}`}
                text={item.content}
                level={level}
              />
            );

          case 'email':
            return (
              <View
                key={`email-${level}-${index}`}
                style={{ marginLeft: level * 16, marginBottom: 10 }}
              >
                <RedirectButton
                  type='email'
                  label={item.displayText}
                  onClick={() => Linking.openURL(`mailto:${item.email}`)}
                  backgroundColor={foods_area_color}
                  color={contrastColor}
                />
              </View>
            );

          case 'link':
            return (
              <View
                key={`link-${level}-${index}`}
                style={{ marginLeft: level * 16, marginBottom: 10 }}
              >
                <RedirectButton
                  type='link'
                  label={item.displayText}
                  onClick={() => Linking.openURL(item.url)}
                  backgroundColor={foods_area_color}
                  color={contrastColor}
                />
              </View>
            );

          case 'image':
            return (
              <ImageContent
                key={`image-${level}-${index}`}
                url={item.url}
                altText={item.altText}
                level={level}
              />
            );

          case 'collapsible':
            return (
              <View
                key={`collapsible-${level}-${index}`}
                style={{ marginTop: level > 0 ? 5 : 10 }}
              >
                <CustomCollapsible
                  headerText={item.header}
                  customColor={foods_area_color}
                >
                  {renderContent(item.items, level + 1)}
                </CustomCollapsible>
              </View>
            );

          default:
            return null;
        }
      };

      // Recursive content renderer
      const renderContent = (items: any[], level = 0) => {
        return items.map((item, index) =>
          renderContentItem(item, level, index)
        );
      };

      const hierarchicalContent = processContent(lines);
      return (
        <View style={{ paddingBottom: 20 }}>
          {renderContent(hierarchicalContent)}
        </View>
      );
    }

    return null;
  };

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
        {getContent()}
      </View>
    </BottomSheetScrollView>
  );
};

export default PopupEventSheet;
