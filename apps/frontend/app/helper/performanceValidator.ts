/**
 * Performance Validator - Utility to test and validate performance improvements
 * Provides automated testing of navigation times, cache hit rates, and rendering performance
 */

import { performanceMonitor } from './performanceMonitor';
import { prefetchCache } from './prefetchCache';

interface PerformanceTestResult {
	testName: string;
	passed: boolean;
	actualValue: number;
	expectedValue: number;
	improvement?: number;
	details?: string;
}

interface PerformanceTestSuite {
	name: string;
	results: PerformanceTestResult[];
	overallPass: boolean;
	summary: string;
}

class PerformanceValidator {
	private testResults: PerformanceTestSuite[] = [];

	/**
	 * Test navigation performance improvements
	 */
	async testNavigationPerformance(): Promise<PerformanceTestSuite> {
		const results: PerformanceTestResult[] = [];
		const stats = performanceMonitor.getNavigationStats();

		// Test 1: Average navigation time should be under 500ms
		results.push({
			testName: 'Average Navigation Time',
			passed: stats.averageDuration < 500,
			actualValue: stats.averageDuration,
			expectedValue: 500,
			details: 'Navigation should complete within 500ms on average',
		});

		// Test 2: Cache hit rate should be above 60%
		results.push({
			testName: 'Cache Hit Rate',
			passed: stats.cacheHitRate > 0.6,
			actualValue: stats.cacheHitRate * 100,
			expectedValue: 60,
			details: 'Cache should improve navigation performance for repeated visits',
		});

		// Test 3: Cached navigation should be significantly faster
		if (stats.averageCachedDuration > 0 && stats.averageUncachedDuration > 0) {
			const improvement = ((stats.averageUncachedDuration - stats.averageCachedDuration) / stats.averageUncachedDuration) * 100;
			results.push({
				testName: 'Cache Performance Improvement',
				passed: improvement > 50,
				actualValue: improvement,
				expectedValue: 50,
				improvement,
				details: 'Cached navigation should be at least 50% faster',
			});
		}

		const suite: PerformanceTestSuite = {
			name: 'Navigation Performance',
			results,
			overallPass: results.every(r => r.passed),
			summary: this.generateSummary('Navigation Performance', results),
		};

		this.testResults.push(suite);
		return suite;
	}

	/**
	 * Test cache effectiveness
	 */
	async testCacheEffectiveness(): Promise<PerformanceTestSuite> {
		const results: PerformanceTestResult[] = [];
		const cacheStats = prefetchCache.getStats();

		// Test 1: Cache should be utilized (not empty)
		results.push({
			testName: 'Cache Utilization',
			passed: cacheStats.size > 0,
			actualValue: cacheStats.size,
			expectedValue: 1,
			details: 'Cache should contain prefetched data',
		});

		// Test 2: Cache hit rate should be reasonable
		if (cacheStats.hitRate !== undefined) {
			results.push({
				testName: 'Cache Hit Rate',
				passed: cacheStats.hitRate > 0.4,
				actualValue: cacheStats.hitRate * 100,
				expectedValue: 40,
				details: 'Cache should have reasonable hit rate',
			});
		}

		// Test 3: Cache should not be overflowing
		results.push({
			testName: 'Cache Size Management',
			passed: cacheStats.size <= cacheStats.maxSize,
			actualValue: cacheStats.size,
			expectedValue: cacheStats.maxSize,
			details: 'Cache should respect size limits',
		});

		const suite: PerformanceTestSuite = {
			name: 'Cache Effectiveness',
			results,
			overallPass: results.every(r => r.passed),
			summary: this.generateSummary('Cache Effectiveness', results),
		};

		this.testResults.push(suite);
		return suite;
	}

	/**
	 * Test render performance
	 */
	async testRenderPerformance(): Promise<PerformanceTestSuite> {
		const results: PerformanceTestResult[] = [];
		const { recentMetrics } = performanceMonitor.getPerformanceSummary();

		// Find render metrics
		const renderMetrics = recentMetrics.filter(m => m.name.startsWith('render-'));
		
		if (renderMetrics.length > 0) {
			const avgRenderTime = renderMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / renderMetrics.length;
			
			// Test 1: Average render time should be under 16ms (60fps)
			results.push({
				testName: 'Render Performance',
				passed: avgRenderTime < 16,
				actualValue: avgRenderTime,
				expectedValue: 16,
				details: 'Component renders should complete within 16ms for 60fps',
			});
		}

		const suite: PerformanceTestSuite = {
			name: 'Render Performance',
			results,
			overallPass: results.every(r => r.passed),
			summary: this.generateSummary('Render Performance', results),
		};

		this.testResults.push(suite);
		return suite;
	}

	/**
	 * Run all performance tests
	 */
	async runAllTests(): Promise<{
		suites: PerformanceTestSuite[];
		overallPass: boolean;
		totalTests: number;
		passedTests: number;
	}> {
		this.testResults = [];

		await this.testNavigationPerformance();
		await this.testCacheEffectiveness();
		await this.testRenderPerformance();

		const totalTests = this.testResults.reduce((sum, suite) => sum + suite.results.length, 0);
		const passedTests = this.testResults.reduce((sum, suite) => sum + suite.results.filter(r => r.passed).length, 0);

		return {
			suites: this.testResults,
			overallPass: this.testResults.every(suite => suite.overallPass),
			totalTests,
			passedTests,
		};
	}

	/**
	 * Generate test summary
	 */
	private generateSummary(suiteName: string, results: PerformanceTestResult[]): string {
		const passed = results.filter(r => r.passed).length;
		const total = results.length;
		const passRate = total > 0 ? (passed / total) * 100 : 0;

		return `${suiteName}: ${passed}/${total} tests passed (${passRate.toFixed(1)}%)`;
	}

	/**
	 * Log test results to console
	 */
	logResults(): void {
		console.group('🔍 Performance Test Results');
		
		this.testResults.forEach(suite => {
			console.group(`📊 ${suite.name}`);
			console.log(`Summary: ${suite.summary}`);
			
			suite.results.forEach(result => {
				const icon = result.passed ? '✅' : '❌';
				const improvement = result.improvement 
					? ` (${result.improvement.toFixed(1)}% improvement)`
					: '';
				
				console.log(`${icon} ${result.testName}: ${result.actualValue.toFixed(2)} (expected: ${result.expectedValue})${improvement}`);
				if (result.details) {
					console.log(`   ${result.details}`);
				}
			});
			
			console.groupEnd();
		});
		
		console.groupEnd();
	}

	/**
	 * Get performance report
	 */
	getReport(): string {
		const report = this.testResults.map(suite => {
			const header = `=== ${suite.name} ===\n${suite.summary}\n`;
			const details = suite.results.map(result => {
				const status = result.passed ? 'PASS' : 'FAIL';
				const improvement = result.improvement 
					? ` (${result.improvement.toFixed(1)}% improvement)`
					: '';
				return `[${status}] ${result.testName}: ${result.actualValue.toFixed(2)}${improvement}`;
			}).join('\n');
			return header + details;
		}).join('\n\n');

		return report;
	}
}

// Export singleton instance
export const performanceValidator = new PerformanceValidator();
export default PerformanceValidator;