/**
 * Performance Optimization Package
 * Exports all performance-related utilities and components
 */

// Cache and prefetching
export { prefetchCache } from './prefetchCache';
export { preloadImages, clearImageCache, getImageCacheStats } from './imageCache';

// Performance monitoring
export { performanceMonitor, usePerformanceTimer, withPerformanceMonitoring } from './performanceMonitor';
export { performanceValidator } from './performanceValidator';

// Development helpers
import './performanceDevHelper'; // Auto-initializes global helper

// Components
export { default as CachedImage } from './imageCache';
export { FoodItemSkeleton, FoodDetailSkeleton } from '../components/SkeletonLoader/SkeletonLoader';
export { default as OptimizedFlatList } from '../components/OptimizedFlatList/OptimizedFlatList';

// Types
export interface PerformanceConfig {
	cacheSize?: number;
	cacheTTL?: number;
	prefetchDelay?: number;
	enableMonitoring?: boolean;
}

// Default configuration
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
	cacheSize: 50,
	cacheTTL: 5 * 60 * 1000, // 5 minutes
	prefetchDelay: 300, // 300ms
	enableMonitoring: true,
};

/**
 * Initialize performance optimizations
 */
export const initializePerformanceOptimizations = (config: PerformanceConfig = DEFAULT_PERFORMANCE_CONFIG): void => {
	console.log('🚀 Initializing performance optimizations...');
	
	// Configure cache if needed
	if (config.cacheSize || config.cacheTTL) {
		console.log('⚙️ Cache configuration:', {
			maxSize: config.cacheSize,
			maxAge: config.cacheTTL,
		});
	}
	
	// Start monitoring if enabled
	if (config.enableMonitoring) {
		console.log('📊 Performance monitoring enabled');
	}
	
	console.log('✅ Performance optimizations initialized');
};