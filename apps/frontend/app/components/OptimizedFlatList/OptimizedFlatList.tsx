/**
 * OptimizedFlatList - Enhanced FlatList with performance optimizations
 * Provides intelligent re-rendering, item caching, and scroll optimizations
 */

import React, { memo, useCallback, useMemo } from 'react';
import { FlatList, FlatListProps } from 'react-native';

interface OptimizedFlatListProps<T> extends Omit<FlatListProps<T>, 'renderItem'> {
	renderItem: (info: { item: T; index: number }) => React.ReactElement;
	itemHeight?: number;
	enableVirtualization?: boolean;
	cacheKeyExtractor?: (item: T, index: number) => string;
}

// Item wrapper with memoization
const MemoizedItem = memo<{
	item: any;
	index: number;
	renderItem: (info: { item: any; index: number }) => React.ReactElement;
	cacheKey: string;
}>(({ item, index, renderItem, cacheKey }) => {
	return renderItem({ item, index });
}, (prevProps, nextProps) => {
	// Only re-render if cache key changes
	return prevProps.cacheKey === nextProps.cacheKey;
});

function OptimizedFlatList<T>({
	data,
	renderItem,
	itemHeight,
	enableVirtualization = true,
	cacheKeyExtractor,
	...flatListProps
}: OptimizedFlatListProps<T>) {
	
	// Optimized render function
	const optimizedRenderItem = useCallback(({ item, index }: { item: T; index: number }) => {
		const cacheKey = cacheKeyExtractor 
			? cacheKeyExtractor(item, index)
			: `${index}-${JSON.stringify(item)}`;

		return (
			<MemoizedItem
				item={item}
				index={index}
				renderItem={renderItem}
				cacheKey={cacheKey}
			/>
		);
	}, [renderItem, cacheKeyExtractor]);

	// Performance optimizations
	const flatListOptions = useMemo(() => ({
		// Enable efficient re-rendering
		removeClippedSubviews: enableVirtualization,
		maxToRenderPerBatch: 5,
		updateCellsBatchingPeriod: 30,
		initialNumToRender: 8,
		windowSize: 10,
		
		// Item height optimization
		getItemLayout: itemHeight ? (data: any, index: number) => ({
			length: itemHeight,
			offset: itemHeight * index,
			index,
		}) : undefined,
		
		// Scroll optimizations
		scrollEventThrottle: 16,
		keyboardShouldPersistTaps: 'handled',
		
		...flatListProps,
	}), [itemHeight, enableVirtualization, flatListProps]);

	return (
		<FlatList
			{...flatListOptions}
			data={data}
			renderItem={optimizedRenderItem}
		/>
	);
}

export default memo(OptimizedFlatList) as <T>(props: OptimizedFlatListProps<T>) => React.ReactElement;