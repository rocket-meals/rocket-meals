import React, { useMemo } from 'react';
import { Image, ImageProps, ImageSourcePropType } from 'react-native';

import { getHighResImageUrl } from '@/constants/HelperFunctions';
import { getAppIconInsideExpoLocalSaved } from '@/config';

export type MyImageProps = {
        remote_image_url?: string | null;
        directus_asset_id?: string | number | { id?: string | number } | null;
        defaultImage?: ImageSourcePropType;
        defaultImageUrl?: string | null;
} & Omit<ImageProps, 'source'>;

const MyImage: React.FC<MyImageProps> = ({
        remote_image_url,
        directus_asset_id,
        defaultImage,
        defaultImageUrl,
        ...props
}) => {
        const directusAssetId = useMemo(() => {
                if (typeof directus_asset_id === 'object' && directus_asset_id !== null) {
                        return (directus_asset_id as any).id ?? directus_asset_id;
                }

                return directus_asset_id;
        }, [directus_asset_id]);

        const fallbackImage = defaultImage ?? getAppIconInsideExpoLocalSaved();

        const source: ImageSourcePropType | undefined = useMemo(() => {
                if (remote_image_url) {
                        return { uri: remote_image_url };
                }

                if (directusAssetId) {
                        return { uri: getHighResImageUrl(String(directusAssetId)) };
                }

                if (defaultImageUrl) {
                        return { uri: defaultImageUrl };
                }

                return fallbackImage;
        }, [defaultImageUrl, directusAssetId, fallbackImage, remote_image_url]);

        if (!source) {
                return null;
        }

        return <Image source={source} {...props} />;
};

export default MyImage;
