import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ImageSourcePropType, Platform } from 'react-native';
import { Image, ImageProps as ExpoImageProps } from 'expo-image';

import { getHighResImageUrl } from '@/constants/HelperFunctions';
import { getAppIconInsideExpoLocalSaved, getCustomerConfigsDict } from '@/config';
import { useAppSelector } from '@/redux/hooks';
import { ServerAPI } from '@/redux/actions';

export type MyImageProps = {
        remote_image_url?: string | null;
        directus_asset_id?: string | number | { id?: string | number } | null;
        defaultImage?: ImageSourcePropType;
        defaultImageUrl?: string | null;
        useAccessTokenForWebAsParameter?: boolean;
} & Omit<ExpoImageProps, 'source'>;

function resolveRemoteUrlSource(
	remote_image_url: string,
	authToken: string | null,
	useAccessTokenForWebAsParameter: boolean
): { uri: string } {
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

function resolveDirectusAssetSource(
	directusAssetId: string | number,
	authToken: string | null,
	useAccessTokenForWebAsParameter: boolean
): { uri?: string; headers?: { Authorization: string } } {
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

        // Icon of the tenant chosen in the settings (store variable), the build's icon otherwise.
        const selectedCustomer = useAppSelector(state => state.settings.selectedCustomer);
        const selectedCustomerConfig = selectedCustomer ? getCustomerConfigsDict()[selectedCustomer] : undefined;
        const fallbackImage = defaultImage ?? selectedCustomerConfig?.images.icon_logo_source_get_for_react_native() ?? getAppIconInsideExpoLocalSaved();

        const source = useMemo(() => {
                if (remote_image_url) {
                        return resolveRemoteUrlSource(remote_image_url, authToken, useAccessTokenForWebAsParameter);
                }

                if (directusAssetId) {
                        return resolveDirectusAssetSource(directusAssetId, authToken, useAccessTokenForWebAsParameter);
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
        const { resizeMode, alt, accessibilityLabel, ...rest } = props as any;
        let contentFit = props.contentFit;
        if (resizeMode && !contentFit) {
             if (resizeMode === 'cover') contentFit = 'cover';
             else if (resizeMode === 'contain') contentFit = 'contain';
             else if (resizeMode === 'stretch') contentFit = 'fill';
             else if (resizeMode === 'center') contentFit = 'none';
        }

        // Images without a provided description get an empty alt, which marks them
        // as decorative for assistive technology instead of leaving the alt missing
        // entirely (a critical axe-core "image-alt" violation on web). Note that
        // expo-image's web renderer only turns accessibilityLabel (not the alt
        // prop) into the img alt attribute, so the label must always be a string.
        const resolvedAlt = accessibilityLabel ?? alt ?? '';

        return <Image source={source} contentFit={contentFit} alt={resolvedAlt} accessibilityLabel={resolvedAlt} {...rest} />;
};

export default React.memo(MyImage);
