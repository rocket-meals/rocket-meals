/**
 * PerformanceMonitor - Utility for tracking and measuring performance improvements
 * Provides timing, navigation metrics, and cache hit rate monitoring
 */

import React from 'react';

interface PerformanceMetric {
	name: string;
	startTime: number;
	endTime?: number;
	duration?: number;
	metadata?: Record<string, any>;
}

interface NavigationMetric {
	from: string;
	to: string;
	duration: number;
	cacheHit: boolean;
	timestamp: number;
}

class PerformanceMonitor {
	private metrics = new Map<string, PerformanceMetric>();
	private navigationMetrics: NavigationMetric[] = [];
	private maxMetrics = 100; // Keep last 100 metrics

	/**
	 * Start timing a performance metric
	 */
	startTiming(name: string, metadata?: Record<string, any>): void {
		this.metrics.set(name, {
			name,
			startTime: performance.now(),
			metadata,
		});
	}

	/**
	 * End timing a performance metric
	 */
	endTiming(name: string): number | null {
		const metric = this.metrics.get(name);
		if (!metric) {
			console.warn(`Performance metric '${name}' not found`);
			return null;
		}

		const endTime = performance.now();
		const duration = endTime - metric.startTime;

		this.metrics.set(name, {
			...metric,
			endTime,
			duration,
		});

		return duration;
	}

	/**
	 * Get completed metric
	 */
	getMetric(name: string): PerformanceMetric | null {
		return this.metrics.get(name) || null;
	}

	/**
	 * Log navigation timing
	 */
	logNavigation(from: string, to: string, cacheHit: boolean = false): void {
		const metric = this.getMetric('navigation');
		const duration = metric?.duration || 0;

		const navigationMetric: NavigationMetric = {
			from,
			to,
			duration,
			cacheHit,
			timestamp: Date.now(),
		};

		this.navigationMetrics.push(navigationMetric);

		// Keep only recent metrics
		if (this.navigationMetrics.length > this.maxMetrics) {
			this.navigationMetrics = this.navigationMetrics.slice(-this.maxMetrics);
		}

		// Log for debugging
		console.log(`Navigation ${from} -> ${to}: ${duration.toFixed(2)}ms (cache: ${cacheHit})`);
	}

	/**
	 * Get navigation statistics
	 */
	getNavigationStats(): {
		totalNavigations: number;
		averageDuration: number;
		cacheHitRate: number;
		averageCachedDuration: number;
		averageUncachedDuration: number;
	} {
		const total = this.navigationMetrics.length;
		if (total === 0) {
			return {
				totalNavigations: 0,
				averageDuration: 0,
				cacheHitRate: 0,
				averageCachedDuration: 0,
				averageUncachedDuration: 0,
			};
		}

		const cached = this.navigationMetrics.filter(m => m.cacheHit);
		const uncached = this.navigationMetrics.filter(m => !m.cacheHit);

		const averageDuration = this.navigationMetrics.reduce((sum, m) => sum + m.duration, 0) / total;
		const averageCachedDuration = cached.length > 0 
			? cached.reduce((sum, m) => sum + m.duration, 0) / cached.length 
			: 0;
		const averageUncachedDuration = uncached.length > 0 
			? uncached.reduce((sum, m) => sum + m.duration, 0) / uncached.length 
			: 0;

		return {
			totalNavigations: total,
			averageDuration,
			cacheHitRate: cached.length / total,
			averageCachedDuration,
			averageUncachedDuration,
		};
	}

	/**
	 * Get performance summary
	 */
	getPerformanceSummary(): {
		navigationStats: ReturnType<PerformanceMonitor['getNavigationStats']>;
		recentMetrics: PerformanceMetric[];
	} {
		const recentMetrics = Array.from(this.metrics.values())
			.filter(m => m.duration !== undefined)
			.sort((a, b) => (b.endTime || 0) - (a.endTime || 0))
			.slice(0, 10);

		return {
			navigationStats: this.getNavigationStats(),
			recentMetrics,
		};
	}

	/**
	 * Clear all metrics
	 */
	clear(): void {
		this.metrics.clear();
		this.navigationMetrics = [];
	}

	/**
	 * Log performance improvement
	 */
	logImprovement(operation: string, before: number, after: number): void {
		const improvement = ((before - after) / before) * 100;
		console.log(`Performance improvement for ${operation}: ${improvement.toFixed(1)}% (${before.toFixed(2)}ms -> ${after.toFixed(2)}ms)`);
	}
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Hook for measuring React component render times
 */
export const usePerformanceTimer = (componentName: string) => {
	React.useEffect(() => {
		performanceMonitor.startTiming(`render-${componentName}`);
		return () => {
			performanceMonitor.endTiming(`render-${componentName}`);
		};
	});
};

/**
 * Higher-order component for performance monitoring
 */
export const withPerformanceMonitoring = <P extends object>(
	WrappedComponent: React.ComponentType<P>,
	componentName?: string
) => {
	const MemoizedComponent = React.memo(WrappedComponent);
	
	return React.forwardRef<any, P>((props, ref) => {
		const name = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';
		
		React.useEffect(() => {
			performanceMonitor.startTiming(`mount-${name}`);
			return () => {
				performanceMonitor.endTiming(`mount-${name}`);
			};
		}, []);

		return <MemoizedComponent {...props} ref={ref} />;
	});
};

export default PerformanceMonitor;