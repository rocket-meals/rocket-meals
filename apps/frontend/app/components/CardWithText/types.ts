import { ImageSourcePropType, StyleProp, ViewStyle, ImageStyle, TouchableOpacityProps } from 'react-native';
import React from 'react';

export interface CardWithTextProps extends TouchableOpacityProps {
  imageSource: ImageSourcePropType;
  containerStyle?: StyleProp<ViewStyle>;
  imageContainerStyle?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  imageChildren?: React.ReactNode;
  children?: React.ReactNode;
}
