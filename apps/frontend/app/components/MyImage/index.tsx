import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ImageSourcePropType, Platform } from 'react-native';
import { Image, ImageProps as ExpoImageProps } from 'expo-image';

import { getHighResImageUrl } from '@/constants/HelperFunctions';
import { getAppIconInsideExpoLocalSaved } from '@/config';
import { ServerAPI } from '@/redux/actions';

export type MyImageProps = {
        remote_image_url?: string | null;
        directus_asset_id?: string | number | { id?: string | number } | null;
        defaultImage?: ImageSourcePropType;
        defaultImageUrl?: string | null;
        useAccessTokenForWebAsParameter?: boolean;
} & Omit<ExpoImageProps, 'source'>;

const MyImage: React.FC<MyImageProps> = ({
        remote_image_url,
        directus_asset_id,
        defaultImage,
        defaultImageUrl,
        useAccessTokenForWebAsParameter = false,
        ...props
}) => {
        const [authToken, setAuthToken] = useState<string | null>(null);
        const mountedRef = useRef(true);

        useEffect(() => {
                mountedRef.current = true;
                ServerAPI.getClient()
                        .getToken()
                        .then(token => {
                                if (mountedRef.current) setAuthToken(token);
                        })
                        .catch(err => {
                                console.error('MyImage: failed to retrieve auth token', err);
                                if (mountedRef.current) setAuthToken(null);
                        });
                return () => {
                        mountedRef.current = false;
                };
        }, []);

        const directusAssetId = useMemo(() => {
                if (typeof directus_asset_id === 'object' && directus_asset_id !== null) {
                        return (directus_asset_id as any).id ?? directus_asset_id;
                }

                return directus_asset_id;
        }, [directus_asset_id]);

        const fallbackImage = defaultImage ?? getAppIconInsideExpoLocalSaved();

        const source = useMemo(() => {
                if (remote_image_url) {
                        const isLocalhostUrl = remote_image_url.startsWith('http://localhost');
                        if (Platform.OS === 'web' && authToken && (useAccessTokenForWebAsParameter || isLocalhostUrl)) {
                                const isRemoteUrl = remote_image_url.startsWith('http://') || remote_image_url.startsWith('https://');
                                if (isRemoteUrl) {
                                        const separator = remote_image_url.includes('?') ? '&' : '?';
                                        return { uri: `${remote_image_url}${separator}access_token=${encodeURIComponent(authToken)}` };
                                }
                        }
                        return { uri: remote_image_url };
                }

                if (directusAssetId) {
                        const baseUrl = getHighResImageUrl(String(directusAssetId));
                        if (!baseUrl) return { uri: undefined };
                        if (authToken) {
                                if (Platform.OS === 'web') {
                                        const isLocalhostUrl = baseUrl.startsWith('http://localhost');
                                        if (useAccessTokenForWebAsParameter || isLocalhostUrl) {
                                                // On web, <img> tags cannot send custom headers in cross-origin requests,
                                                // so we include the token as a query parameter. This is the standard Directus approach.
                                                // For localhost (development), token is added automatically since the connection is insecure (HTTP).
                                                const separator = baseUrl.includes('?') ? '&' : '?';
                                                return { uri: `${baseUrl}${separator}access_token=${encodeURIComponent(authToken)}` };
                                        }
                                        return { uri: baseUrl };
                                }
                                return { uri: baseUrl, headers: { Authorization: `Bearer ${authToken}` } };
                        }
                        return { uri: baseUrl };
                }

                if (defaultImageUrl) {
                        return { uri: defaultImageUrl };
                }

                // fallbackImage is usually a require() number or object. expo-image handles it.
                return fallbackImage;
        }, [authToken, defaultImageUrl, directusAssetId, fallbackImage, remote_image_url, useAccessTokenForWebAsParameter]);

        if (!source) {
                return null;
        }

        // Map resizeMode to contentFit if present in props (compatibility)
        const { resizeMode, ...rest } = props as any;
        let contentFit = props.contentFit;
        if (resizeMode && !contentFit) {
             if (resizeMode === 'cover') contentFit = 'cover';
             else if (resizeMode === 'contain') contentFit = 'contain';
             else if (resizeMode === 'stretch') contentFit = 'fill';
             else if (resizeMode === 'center') contentFit = 'none';
        }

        return <Image source={source} contentFit={contentFit} cachePolicy="memory-disk" {...rest} />;
};

export default React.memo(MyImage);
