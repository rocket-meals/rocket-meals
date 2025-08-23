/**
 * PrefetchCache - A utility for managing prefetched food offer data
 * Implements LRU cache to prevent memory bloat and provides efficient data retrieval
 */

import { DatabaseTypes } from 'repo-depkit-common';
import { fetchFoodOffersDetailsById } from '@/redux/actions/FoodOffers/FoodOffers';

export interface CacheEntry {
	data: any;
	timestamp: number;
	hits: number;
}

export interface PrefetchCacheOptions {
	maxSize?: number;
	maxAge?: number; // in milliseconds
}

class PrefetchCache {
	private cache = new Map<string, CacheEntry>();
	private maxSize: number;
	private maxAge: number;

	constructor(options: PrefetchCacheOptions = {}) {
		this.maxSize = options.maxSize || 50; // Max 50 entries
		this.maxAge = options.maxAge || 5 * 60 * 1000; // 5 minutes default
	}

	/**
	 * Generate cache key for food offers
	 */
	private generateFoodOffersKey(canteenId: string, date: string): string {
		return `food_offers_${canteenId}_${date}`;
	}

	/**
	 * Generate cache key for food details
	 */
	private generateFoodDetailsKey(offerId: string): string {
		return `food_details_${offerId}`;
	}

	/**
	 * Check if cache entry is expired
	 */
	private isExpired(entry: CacheEntry): boolean {
		return Date.now() - entry.timestamp > this.maxAge;
	}

	/**
	 * Cleanup expired entries
	 */
	private cleanup(): void {
		const now = Date.now();
		for (const [key, entry] of this.cache.entries()) {
			if (now - entry.timestamp > this.maxAge) {
				this.cache.delete(key);
			}
		}
	}

	/**
	 * Evict least recently used entry when cache is full
	 */
	private evictLRU(): void {
		if (this.cache.size >= this.maxSize) {
			// Find entry with lowest hits and oldest timestamp
			let lruKey = '';
			let minHits = Infinity;
			let oldestTime = Date.now();

			for (const [key, entry] of this.cache.entries()) {
				if (entry.hits < minHits || (entry.hits === minHits && entry.timestamp < oldestTime)) {
					lruKey = key;
					minHits = entry.hits;
					oldestTime = entry.timestamp;
				}
			}

			if (lruKey) {
				this.cache.delete(lruKey);
			}
		}
	}

	/**
	 * Set cache entry
	 */
	private set(key: string, data: any): void {
		this.cleanup();
		this.evictLRU();

		this.cache.set(key, {
			data,
			timestamp: Date.now(),
			hits: 0,
		});
	}

	/**
	 * Get cache entry
	 */
	private get(key: string): any | null {
		const entry = this.cache.get(key);
		if (!entry || this.isExpired(entry)) {
			if (entry) {
				this.cache.delete(key);
			}
			return null;
		}

		// Update hit count for LRU
		entry.hits++;
		return entry.data;
	}

	/**
	 * Cache food offers for a specific canteen and date
	 */
	cacheFoodOffers(canteenId: string, date: string, data: DatabaseTypes.Foodoffers[]): void {
		const key = this.generateFoodOffersKey(canteenId, date);
		this.set(key, data);
	}

	/**
	 * Get cached food offers
	 */
	getCachedFoodOffers(canteenId: string, date: string): DatabaseTypes.Foodoffers[] | null {
		const key = this.generateFoodOffersKey(canteenId, date);
		return this.get(key);
	}

	/**
	 * Cache food details
	 */
	cacheFoodDetails(offerId: string, data: any): void {
		const key = this.generateFoodDetailsKey(offerId);
		this.set(key, data);
	}

	/**
	 * Get cached food details
	 */
	getCachedFoodDetails(offerId: string): any | null {
		const key = this.generateFoodDetailsKey(offerId);
		return this.get(key);
	}

	/**
	 * Prefetch food details for an offer
	 */
	async prefetchFoodDetails(offerId: string): Promise<void> {
		const key = this.generateFoodDetailsKey(offerId);
		
		// Don't prefetch if already cached and not expired
		if (this.get(key)) {
			return;
		}

		try {
			const foodData = await fetchFoodOffersDetailsById(offerId);
			if (foodData && foodData.data) {
				this.cacheFoodDetails(offerId, foodData.data);
			}
		} catch (error) {
			console.error('Error prefetching food details:', error);
		}
	}

	/**
	 * Prefetch multiple food details
	 */
	async prefetchMultipleFoodDetails(offerIds: string[]): Promise<void> {
		// Limit concurrent requests to prevent overwhelming the server
		const batchSize = 3;
		for (let i = 0; i < offerIds.length; i += batchSize) {
			const batch = offerIds.slice(i, i + batchSize);
			await Promise.allSettled(batch.map(id => this.prefetchFoodDetails(id)));
		}
	}

	/**
	 * Clear all cached data
	 */
	clear(): void {
		this.cache.clear();
	}

	/**
	 * Get cache statistics
	 */
	getStats(): { size: number; maxSize: number; hitRate?: number } {
		const entries = Array.from(this.cache.values());
		const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);
		const totalAccesses = entries.length > 0 ? totalHits / entries.length : 0;

		return {
			size: this.cache.size,
			maxSize: this.maxSize,
			hitRate: totalAccesses > 0 ? totalHits / (totalHits + entries.length) : undefined,
		};
	}
}

// Export singleton instance
export const prefetchCache = new PrefetchCache();
export default PrefetchCache;