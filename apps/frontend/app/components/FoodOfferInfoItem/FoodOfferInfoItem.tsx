import React, { memo, useCallback, useMemo } from 'react';
import { Text } from 'react-native';
import { isWeb } from '@/constants/Constants';
import { useTheme } from '@/hooks/useTheme';
import { FoodOfferInfoItemProps } from './types';
import styles from './styles';
import CardWithText from '../CardWithText/CardWithText';
import { getImageUrl } from '@/constants/HelperFunctions';
import useFoodCard from '@/hooks/useFoodCard';
import { CommonSystemActionHelper } from '@/helper/SystemActionHelper';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';
import { View } from 'react-native';

const FoodOfferInfoItem: React.FC<FoodOfferInfoItemProps> = memo(({ item, content, cardWidth }) => {
  const { theme } = useTheme();
  const { appSettings, primaryColor } = useSelector((state: RootState) => state.settings);

  const { containerStyle, imageContainerStyle, contentStyle } = useFoodCard();
  const foods_area_color = appSettings?.foods_area_color || primaryColor;

  const imageUri = useMemo(() => {
    const imageId = typeof item.image === 'string' ? item.image : item.image?.id;
    return item.image_remote_url || (imageId ? getImageUrl(imageId) : undefined);
  }, [item.image, item.image_remote_url]);

  const handlePress = useCallback(() => {
    if (item.link) CommonSystemActionHelper.openExternalURL(item.link, true);
  }, [item.link]);

  return (
    <CardWithText
      onPress={item.link ? handlePress : undefined}
      imageSource={imageUri ? { uri: imageUri } : undefined}
      borderColor={foods_area_color}
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
