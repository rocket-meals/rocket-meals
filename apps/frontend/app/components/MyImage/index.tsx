import React from 'react';
import { Image as RNImage, ImageProps as RNImageProps } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';

const MyImage: React.FC<RNImageProps> = (props) => {
  const useWebp = useSelector((state: RootState) => state.settings.useWebpForAssets);
  const ImageComponent = useWebp ? ExpoImage : RNImage;
  return <ImageComponent {...props} />;
};

export default MyImage;
