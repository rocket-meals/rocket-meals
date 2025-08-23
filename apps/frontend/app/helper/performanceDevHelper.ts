/**
 * Performance Development Helper
 * Provides easy-to-use functions for testing performance in development
 */

import { performanceValidator } from './performanceValidator';
import { performanceMonitor } from './performanceMonitor';
import { prefetchCache } from './prefetchCache';

// Global helper for easy access in development
declare global {
	interface Window {
		performanceHelper: typeof PerformanceDevHelper;
	}
}

class PerformanceDevHelper {
	/**
	 * Run performance tests and log results
	 */
	static async test(): Promise<void> {
		console.log('🚀 Running performance tests...');
		
		const results = await performanceValidator.runAllTests();
		performanceValidator.logResults();
		
		if (results.overallPass) {
			console.log('🎉 All performance tests passed!');
		} else {
			console.warn('⚠️ Some performance tests failed. Check the results above.');
		}
	}

	/**
	 * Get navigation statistics
	 */
	static getNavStats(): void {
		const stats = performanceMonitor.getNavigationStats();
		console.table({
			'Total Navigations': stats.totalNavigations,
			'Average Duration (ms)': stats.averageDuration.toFixed(2),
			'Cache Hit Rate (%)': (stats.cacheHitRate * 100).toFixed(1),
			'Cached Avg (ms)': stats.averageCachedDuration.toFixed(2),
			'Uncached Avg (ms)': stats.averageUncachedDuration.toFixed(2),
		});
	}

	/**
	 * Get cache statistics
	 */
	static getCacheStats(): void {
		const stats = prefetchCache.getStats();
		console.table({
			'Cache Size': stats.size,
			'Max Size': stats.maxSize,
			'Hit Rate (%)': stats.hitRate ? (stats.hitRate * 100).toFixed(1) : 'N/A',
		});
	}

	/**
	 * Clear all performance data
	 */
	static clear(): void {
		performanceMonitor.clear();
		prefetchCache.clear();
		console.log('🧹 Performance data cleared');
	}

	/**
	 * Simulate navigation performance test
	 */
	static async simulateNavigation(iterations: number = 10): Promise<void> {
		console.log(`🔄 Simulating ${iterations} navigation cycles...`);
		
		for (let i = 0; i < iterations; i++) {
			performanceMonitor.startTiming('navigation');
			
			// Simulate network delay
			await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 50));
			
			performanceMonitor.endTiming('navigation');
			performanceMonitor.logNavigation('test-list', 'test-details', Math.random() > 0.5);
		}
		
		console.log('✅ Navigation simulation complete');
		this.getNavStats();
	}

	/**
	 * Test cache efficiency
	 */
	static testCache(): void {
		console.log('🧪 Testing cache efficiency...');
		
		// Simulate some cache operations
		prefetchCache.cacheFoodOffers('test-canteen', '2024-01-01', []);
		prefetchCache.cacheFoodDetails('test-offer', { test: 'data' });
		
		// Test retrieval
		const offers = prefetchCache.getCachedFoodOffers('test-canteen', '2024-01-01');
		const details = prefetchCache.getCachedFoodDetails('test-offer');
		
		console.log('Cache test results:', {
			offersRetrieved: offers !== null,
			detailsRetrieved: details !== null,
		});
		
		this.getCacheStats();
	}

	/**
	 * Monitor performance in real-time
	 */
	static startMonitoring(): void {
		console.log('📊 Starting real-time performance monitoring...');
		
		const interval = setInterval(() => {
			const summary = performanceMonitor.getPerformanceSummary();
			if (summary.navigationStats.totalNavigations > 0) {
				console.log('📈 Performance Update:', {
					navigations: summary.navigationStats.totalNavigations,
					avgDuration: summary.navigationStats.averageDuration.toFixed(2) + 'ms',
					cacheHitRate: (summary.navigationStats.cacheHitRate * 100).toFixed(1) + '%',
				});
			}
		}, 5000);

		// Store interval for cleanup
		(this as any)._monitoringInterval = interval;
	}

	/**
	 * Stop real-time monitoring
	 */
	static stopMonitoring(): void {
		if ((this as any)._monitoringInterval) {
			clearInterval((this as any)._monitoringInterval);
			(this as any)._monitoringInterval = null;
			console.log('⏹️ Performance monitoring stopped');
		}
	}

	/**
	 * Generate performance report
	 */
	static async generateReport(): Promise<void> {
		console.log('📋 Generating performance report...');
		
		await this.test();
		const report = performanceValidator.getReport();
		
		console.log('\n' + '='.repeat(50));
		console.log('PERFORMANCE REPORT');
		console.log('='.repeat(50));
		console.log(report);
		console.log('='.repeat(50));
	}

	/**
	 * Get help information
	 */
	static help(): void {
		console.log(`
🔧 Performance Helper Commands:

window.performanceHelper.test()              - Run all performance tests
window.performanceHelper.getNavStats()      - Show navigation statistics
window.performanceHelper.getCacheStats()    - Show cache statistics
window.performanceHelper.clear()            - Clear all performance data
window.performanceHelper.simulateNavigation(10) - Simulate navigation cycles
window.performanceHelper.testCache()        - Test cache functionality
window.performanceHelper.startMonitoring()  - Start real-time monitoring
window.performanceHelper.stopMonitoring()   - Stop real-time monitoring
window.performanceHelper.generateReport()   - Generate full performance report
window.performanceHelper.help()             - Show this help

Example usage:
  await window.performanceHelper.test()
  window.performanceHelper.getNavStats()
		`);
	}
}

// Make available globally in development
if (__DEV__ || process.env.NODE_ENV === 'development') {
	if (typeof window !== 'undefined') {
		window.performanceHelper = PerformanceDevHelper;
		console.log('🛠️ Performance helper available at window.performanceHelper');
		console.log('💡 Type window.performanceHelper.help() for available commands');
	}
}

export default PerformanceDevHelper;