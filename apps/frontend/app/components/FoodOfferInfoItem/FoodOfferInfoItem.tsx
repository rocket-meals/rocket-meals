import React, { memo, useCallback } from 'react';
import { Text } from 'react-native';
import { isWeb } from '@/constants/Constants';
import { useTheme } from '@/hooks/useTheme';
import { FoodOfferInfoItemProps } from './types';
import styles from './styles';
import CardWithText from '../CardWithText/CardWithText';
import useFoodCard from '@/hooks/useFoodCard';
import { CommonSystemActionHelper } from '@/helper/SystemActionHelper';
import { useAppSelector } from '@/redux/hooks';
import { View } from 'react-native';

const FoodOfferInfoItem: React.FC<FoodOfferInfoItemProps> = memo(({ item, content, cardWidth, screenWidth }) => {
  const { theme } = useTheme();
  const appSettings = useAppSelector((state) => state.settings.appSettings);
  const primaryColor = useAppSelector((state) => state.settings.primaryColor);

  const { containerStyle, imageContainerStyle, contentStyle } = useFoodCard(0, undefined, screenWidth);
  const foods_area_color = appSettings?.foods_area_color || primaryColor;

  const handlePress = useCallback(() => {
    if (item.link) CommonSystemActionHelper.openExternalURL(item.link, true);
  }, [item.link]);

  return (
    <CardWithText
      onPress={item.link ? handlePress : undefined}
      directus_asset_id={item.image}
      remote_image_url={item.image_remote_url}
      borderColor={foods_area_color}
      knownCardWidth={cardWidth}
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
    >
      <View
        style={{
          minHeight: 52,
          justifyContent: 'center',
          alignSelf: 'stretch',
        }}
      >
        <Text
          style={[
            styles.text,
            { color: theme.screen.text },
            { maxWidth: '100%', flexShrink: 1 } as any,
            isWeb ? ({ wordBreak: 'break-word', overflowWrap: 'anywhere' } as any) : null,
          ]}
          numberOfLines={3}
          ellipsizeMode="tail"
        >
          {content}
        </Text>
      </View>
    </CardWithText>
  );
});

export default FoodOfferInfoItem;
