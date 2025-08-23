/**
 * ImageCache - Optimized image loading and caching utility for food images
 * Provides lazy loading, caching, and placeholder management
 */

import { Image } from 'expo-image';
import React, { useState, useEffect, memo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface CachedImageProps {
	source: { uri: string } | any;
	style?: any;
	defaultSource?: { uri: string } | any;
	placeholder?: React.ReactNode;
	onLoad?: () => void;
	onError?: () => void;
	cacheKey?: string;
}

// Simple in-memory cache for loaded images
const imageLoadCache = new Map<string, boolean>();

const CachedImage: React.FC<CachedImageProps> = memo(({
	source,
	style,
	defaultSource,
	placeholder,
	onLoad,
	onError,
	cacheKey
}) => {
	const { theme } = useTheme();
	const [isLoading, setIsLoading] = useState(true);
	const [hasError, setHasError] = useState(false);
	const [showDefault, setShowDefault] = useState(false);

	const imageUri = source?.uri;
	const cacheId = cacheKey || imageUri;

	useEffect(() => {
		// Check if image is already cached as loaded
		if (cacheId && imageLoadCache.has(cacheId)) {
			setIsLoading(false);
		}
	}, [cacheId]);

	const handleLoad = () => {
		setIsLoading(false);
		setHasError(false);
		
		// Cache the successful load
		if (cacheId) {
			imageLoadCache.set(cacheId, true);
		}
		
		onLoad?.();
	};

	const handleError = () => {
		setIsLoading(false);
		setHasError(true);
		setShowDefault(true);
		onError?.();
	};

	const renderPlaceholder = () => {
		if (placeholder) {
			return placeholder;
		}
		
		return (
			<View style={[
				style,
				{
					backgroundColor: theme.screen.iconBg,
					justifyContent: 'center',
					alignItems: 'center',
				}
			]}>
				<ActivityIndicator size="small" color={theme.screen.icon} />
			</View>
		);
	};

	if (hasError && defaultSource) {
		return (
			<Image
				source={defaultSource}
				style={style}
				onLoad={handleLoad}
				contentFit="cover"
				transition={200}
			/>
		);
	}

	return (
		<>
			{isLoading && renderPlaceholder()}
			<Image
				source={source}
				style={[
					style,
					isLoading && { position: 'absolute', opacity: 0 }
				]}
				onLoad={handleLoad}
				onError={handleError}
				contentFit="cover"
				transition={200}
				cachePolicy="memory-disk"
			/>
		</>
	);
});

CachedImage.displayName = 'CachedImage';

// Utility for preloading images
export const preloadImages = async (imageUris: string[]): Promise<void> => {
	const preloadPromises = imageUris.map(async (uri) => {
		if (imageLoadCache.has(uri)) {
			return Promise.resolve();
		}

		try {
			await Image.prefetch(uri);
			imageLoadCache.set(uri, true);
		} catch (error) {
			console.warn('Failed to preload image:', uri, error);
		}
	});

	await Promise.allSettled(preloadPromises);
};

// Clear image cache when memory is low
export const clearImageCache = (): void => {
	imageLoadCache.clear();
	Image.clearMemoryCache();
	Image.clearDiskCache();
};

// Get cache statistics
export const getImageCacheStats = (): { size: number } => {
	return {
		size: imageLoadCache.size,
	};
};

export default CachedImage;