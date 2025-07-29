import { Dimensions, Linking, Text } from 'react-native';
import React, { memo } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';
import { getImageUrl } from '@/constants/HelperFunctions';
import CardDimensionHelper from '@/helper/CardDimensionHelper';
import CardWithText from '../CardWithText/CardWithText';
import { FoodofferInfoItemProps } from './types';
import styles from './styles';
import { getTextFromTranslation } from '@/helper/resourceHelper';
import { isWeb } from '@/constants/Constants';

const FoodofferInfoItem: React.FC<FoodofferInfoItemProps> = memo(({ item }) => {
  const { theme } = useTheme();
  const { language, appSettings, primaryColor, amountColumnsForcard } = useSelector(
    (state: RootState) => state.settings,
  );
  const { width: screenWidth } = Dimensions.get('window');

  const defaultImage =
    getImageUrl(String(appSettings.foods_placeholder_image)) ||
    appSettings.foods_placeholder_image_remote_url ||
    getImageUrl(appSettings?.company_image as any);

  const openLink = async () => {
    if (!item.link) return;
    try {
      if (isWeb) {
        window.open(item.link, '_blank');
      } else {
        const supported = await Linking.canOpenURL(item.link);
        if (supported) {
          await Linking.openURL(item.link);
        }
      }
    } catch (e) {
      console.error('Failed to open link:', e);
    }
  };

  const label = getTextFromTranslation((item.name as any)?.translations || [], language);

  const imageSource =
    (item as any).image_remote_url || item.image
      ? { uri: (item as any).image_remote_url || getImageUrl(item.image as any) }
      : { uri: defaultImage };

  return (
    <CardWithText
      onPress={openLink}
      imageSource={imageSource}
      containerStyle={{
        width:
          amountColumnsForcard === 0
            ? CardDimensionHelper.getCardDimension(screenWidth)
            : CardDimensionHelper.getCardWidth(screenWidth, amountColumnsForcard),
        backgroundColor: theme.card.background,
      }}
      imageContainerStyle={{
        height:
          amountColumnsForcard === 0
            ? CardDimensionHelper.getCardDimension(screenWidth)
            : CardDimensionHelper.getCardWidth(screenWidth, amountColumnsForcard),
      }}
      contentStyle={{ paddingHorizontal: 5 }}
      borderColor={primaryColor}
      bottomContent={<Text style={{ ...styles.label, color: theme.screen.text }}>{label}</Text>}
    />
  );
});

export default FoodofferInfoItem;
