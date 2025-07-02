import React from 'react';
import { Image } from 'expo-image';
import { useSelector } from 'react-redux';
import { StyleProp, ImageStyle } from 'react-native';
import styles from './styles';
import { getImageUrl } from '@/constants/HelperFunctions';
import { RootState } from '@/redux/reducer';
import { DirectusFiles } from '@/constants/types';

type FoodImageProps = {
  image?: string | DirectusFiles | null;
  imageRemoteUrl?: string | null;
  size?: number;
  style?: StyleProp<ImageStyle>;
};

const FoodImage: React.FC<FoodImageProps> = ({
  image,
  imageRemoteUrl,
  size,
  style,
}) => {
  const { appSettings, serverInfo } = useSelector(
    (state: RootState) => state.settings
  );

  const defaultImage =
    getImageUrl(String(appSettings.foods_placeholder_image)) ||
    appSettings.foods_placeholder_image_remote_url ||
    getImageUrl((serverInfo as any)?.info?.project?.project_logo);

  const imageId = typeof image === 'string' ? image : image?.id || '';

  return (
    <Image
      source={{ uri: imageRemoteUrl || getImageUrl(imageId) || defaultImage }}
      style={[
        styles.image,
        style,
        size ? { width: size, height: size } : null,
      ]}
      contentFit='cover'
    />
  );
};

export default FoodImage;
