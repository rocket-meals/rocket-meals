import React from 'react';
import { Image } from 'react-native';
import { useSelector } from 'react-redux';
import styles from './styles';
import { getImageUrl } from '@/constants/HelperFunctions';
import { RootState } from '@/redux/reducer';
import { DirectusFiles } from '@/constants/types';

type FoodImageProps = {
  image?: string | DirectusFiles | null;
  imageRemoteUrl?: string | null;
  size: number;
};

const FoodImage: React.FC<FoodImageProps> = ({ image, imageRemoteUrl, size }) => {
  const { appSettings, serverInfo, primaryColor } = useSelector(
    (state: RootState) => state.settings
  );

  const foods_area_color = appSettings?.foods_area_color
    ? appSettings?.foods_area_color
    : primaryColor;

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
        { width: size, height: size, borderColor: foods_area_color },
      ]}
    />
  );
};

export default FoodImage;
