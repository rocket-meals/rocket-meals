// CardWithText.tsx (responsive caption height)
import React, { memo, useCallback, useMemo, useState } from 'react';
import { TouchableOpacity, View, StyleSheet, ViewStyle, LayoutChangeEvent } from 'react-native';
import { Image as ExpoImage, ImageProps as ExpoImageProps } from 'expo-image';
import { CardWithTextProps } from './types';

type AnyImageProps = ExpoImageProps & { [k: string]: any };

const DEFAULT_IMAGE_PROPS: AnyImageProps = {
  contentFit: 'cover',
  cachePolicy: 'memory-disk',
  transition: 250,
};

type Props = CardWithTextProps & {
  imageProps?: AnyImageProps;
  imageContainerStyle?: ViewStyle | ViewStyle[];
};

const CardWithText: React.FC<Props> = ({
  imageSource,
  containerStyle,
  imageContainerStyle,
  imageStyle,
  contentStyle,
  topRadius = 0,
  borderColor,
  imageChildren,
  children,
  bottomContent,
  imageProps,
  ...rest
}) => {
  const forwardedImageProps: AnyImageProps = {
    ...DEFAULT_IMAGE_PROPS,
    ...(imageProps || {}),
  };

  const resolvedImageContainerStyle = Array.isArray(imageContainerStyle)
    ? [styles.imageContainer, ...imageContainerStyle]
    : [styles.imageContainer, imageContainerStyle];

  // state to store measured card width, used to dynamically determine caption height
  const [cardWidth, setCardWidth] = useState<number | null>(null);

  // compute min caption height based on measured width
  const captionMinHeight = useMemo(() => {
    if (!cardWidth) return 84; // fallback
    // tune the multiplier to your design — 0.22 (22%) works well in screenshots
    const computed = Math.round(cardWidth * 0.22);
    return Math.max(64, Math.min(130, computed)); // clamp between 64 and 130 px
  }, [cardWidth]);

  const onLayoutCard = useCallback((e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w && w !== cardWidth) {
      setCardWidth(w);
    }
  }, [cardWidth]);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.card, { borderRadius: 12 }, containerStyle]}
      onLayout={onLayoutCard}
      {...rest}
    >
      {/* square wrapper ensures a stable 1:1 image area */}
      <View style={[styles.squareWrapper, { borderTopLeftRadius: topRadius, borderTopRightRadius: topRadius }]}>
        <View style={[{ borderTopLeftRadius: topRadius, borderTopRightRadius: topRadius }, ...resolvedImageContainerStyle as any]}>
          {imageSource ? (
            <ExpoImage {...forwardedImageProps} source={imageSource as any} style={[styles.image, imageStyle]} />
          ) : null}

          {imageChildren}
        </View>
      </View>

      {/* divider is a dedicated element between image and text */}
      {borderColor ? <View style={[styles.divider, { backgroundColor: borderColor }]} /> : null}

      {/* bottom content sits below the square image area; keep a responsive min-height */}
      <View
        style={[
          styles.cardContent,
          { minHeight: captionMinHeight, paddingHorizontal: Math.round((cardWidth ?? 360) * 0.05) }, // padding scales with width
          contentStyle,
        ]}
      >
        {bottomContent ?? children}
      </View>
    </TouchableOpacity>
  );
};

export default memo(CardWithText);

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  squareWrapper: {
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  divider: {
    width: '100%',
    height: 3,
  },
  cardContent: {
    // remove a hard fixed minHeight; we compute it dynamically
    paddingTop: 12,
    paddingBottom: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
});
