import React, { memo, useCallback, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MyImage from '@/components/MyImage';
import { getImageUrl } from '@/constants/HelperFunctions';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { TranslationKeys } from '@/locales/keys';

// In landscape the image may take this share of the window height, so the text stays visible below it
const LANDSCAPE_MAX_HEIGHT_SHARE = 0.38;
const LANDSCAPE_MIN_HEIGHT = 180;
const IMAGE_RADIUS = 25;

/**
 * Height of the header image for a given width.
 * Portrait (window higher than wide): square.
 * Landscape (window wider than high: phone turned, tablet, desktop): capped by the window height,
 * so the image becomes wider than high and the photo is zoomed in (contentFit cover).
 */
export function computeDetailsHeaderImageHeight(width: number, windowWidth: number, windowHeight: number) {
	if (windowWidth <= windowHeight) {
		return width;
	}
	return Math.min(width, Math.max(LANDSCAPE_MIN_HEIGHT, windowHeight * LANDSCAPE_MAX_HEIGHT_SHARE));
}

export type DetailsHeaderImageProps = {
	remoteImageUrl?: string | null;
	/** Directus asset id; the 512px version the lists load (usually cached) is shown until the high resolution one is there */
	assetId?: string | number | null;
	defaultImageUrl?: string | null;
	/** Opens the image in full screen. Default: closes an open modal and opens the full screen route. */
	onOpenFullScreen?: () => void;
	/** Rendered on top of the image, e.g. a rating badge */
	children?: ReactNode;
};

/**
 * Header image of the details views (food, building, apartment): full width, square in portrait,
 * wider than high in landscape. The top right corner shows a spinner while the high resolution
 * image loads and afterwards an expand icon that opens the image in full screen.
 */
const DetailsHeaderImage: React.FC<DetailsHeaderImageProps> = ({ remoteImageUrl, assetId, defaultImageUrl, onOpenFullScreen, children }) => {
	const { translate } = useLanguage();
	const { theme } = useTheme();
	const { close: closeModal } = useMyScrollViewModal();
	const { width: windowWidth, height: windowHeight } = useWindowDimensions();

	// Real width, measured, because the parents size it in percent. Starts with an estimate so the
	// first frame already has a sensible height (on a phone the content is nearly the window width).
	const [width, setWidth] = useState(() => Math.max(0, windowWidth - 40));
	const onLayout = useCallback((event: LayoutChangeEvent) => {
		const measured = Math.round(event.nativeEvent.layout.width);
		if (measured > 0) setWidth(measured);
	}, []);
	const height = computeDetailsHeaderImageHeight(width, windowWidth, windowHeight);

	// The lists load the asset at 512px, so that URL is usually cached and shows at once.
	// A remote URL is the same in both places anyway.
	const placeholder = useMemo(() => {
		if (remoteImageUrl || !assetId) return undefined;
		const previewUrl = getImageUrl(String(assetId));
		return previewUrl ? { uri: previewUrl } : undefined;
	}, [remoteImageUrl, assetId]);

	// Which image has finished loading, keyed so that a different image starts loading again
	const imageKey = remoteImageUrl || (assetId ? String(assetId) : null);
	const [loadedImageKey, setLoadedImageKey] = useState<string | null>(null);
	const markLoaded = useCallback(() => setLoadedImageKey(imageKey), [imageKey]);
	const isLoading = !!imageKey && loadedImageKey !== imageKey;

	const openFullScreen = useCallback(() => {
		if (onOpenFullScreen) {
			onOpenFullScreen();
			return;
		}
		closeModal();
		const params = remoteImageUrl ? { uri: remoteImageUrl } : assetId ? { assetId: String(assetId) } : { uri: defaultImageUrl ?? '' };
		router.push({ pathname: '/(app)/image-full-screen', params });
	}, [onOpenFullScreen, closeModal, remoteImageUrl, assetId, defaultImageUrl]);

	return (
		<View onLayout={onLayout} style={[styles.frame, { height, backgroundColor: theme.screen.iconBg }]}>
			<TouchableOpacity onPress={openFullScreen} activeOpacity={0.9} style={StyleSheet.absoluteFill} accessibilityRole="imagebutton" accessibilityLabel={translate(TranslationKeys.image_enlarge)}>
				<MyImage style={styles.image} remote_image_url={remoteImageUrl} directus_asset_id={assetId} defaultImageUrl={defaultImageUrl} contentFit="cover" placeholder={placeholder} placeholderContentFit="cover" onLoad={markLoaded} onError={markLoaded} />
			</TouchableOpacity>
			{children}
			<TouchableOpacity style={styles.cornerButton} onPress={openFullScreen} accessibilityRole="button" accessibilityLabel={translate(isLoading ? TranslationKeys.image_loading_high_resolution : TranslationKeys.image_enlarge)}>
				{isLoading ? <ActivityIndicator size="small" color="#ffffff" /> : <MaterialCommunityIcons name="arrow-expand" size={20} color="#ffffff" />}
			</TouchableOpacity>
		</View>
	);
};

const styles = StyleSheet.create({
	frame: {
		width: '100%',
		borderRadius: IMAGE_RADIUS,
		overflow: 'hidden',
	},
	image: {
		width: '100%',
		height: '100%',
	},
	cornerButton: {
		position: 'absolute',
		top: 10,
		right: 10,
		width: 38,
		height: 38,
		borderRadius: 19,
		backgroundColor: 'rgba(0,0,0,0.5)',
		alignItems: 'center',
		justifyContent: 'center',
	},
});

export default memo(DetailsHeaderImage);
