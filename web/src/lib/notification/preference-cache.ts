/**
 * Preference Cache
 * In-memory cache for user notification preferences with TTL
 */

import logger from "@/lib/logger";
import type { UserNotificationPreferences } from "./types";

interface CachedPreference {
	data: UserNotificationPreferences;
	expiresAt: number; // Unix timestamp (milliseconds)
}

/**
 * Cache manager for user notification preferences
 */
export class PreferenceCache {
	private cache = new Map<string, CachedPreference>();
	private ttl: number; // milliseconds
	private cleanupInterval: NodeJS.Timeout | null = null;

	constructor(ttlMinutes: number = 5) {
		this.ttl = ttlMinutes * 60 * 1000;

		// Start periodic cleanup every 1 minute
		this.cleanupInterval = setInterval(() => {
			this.cleanup();
		}, 60 * 1000);
	}

	/**
	 * Get cached preference
	 */
	get(key: string): UserNotificationPreferences | null {
		const cached = this.cache.get(key);
		if (!cached) {
			return null;
		}

		// Check if expired
		if (Date.now() > cached.expiresAt) {
			this.cache.delete(key);
			return null;
		}

		return cached.data;
	}

	/**
	 * Set cached preference
	 */
	set(key: string, data: UserNotificationPreferences): void {
		this.cache.set(key, {
			data,
			expiresAt: Date.now() + this.ttl,
		});
	}

	/**
	 * Invalidate a specific cache key
	 */
	invalidate(key: string): void {
		this.cache.delete(key);
	}

	/**
	 * Invalidate all preferences for a user (global + all stores)
	 */
	invalidateUser(userId: string): void {
		let invalidatedCount = 0;
		for (const key of this.cache.keys()) {
			if (key.startsWith(`pref:${userId}:`)) {
				this.cache.delete(key);
				invalidatedCount++;
			}
		}

		if (invalidatedCount > 0) {
			logger.info("Invalidated user preference cache", {
				metadata: {
					userId,
					invalidatedCount,
				},
				tags: ["cache", "preference", "invalidate"],
			});
		}
	}

	/**
	 * Clear all cached preferences
	 */
	clear(): void {
		const size = this.cache.size;
		this.cache.clear();
		logger.info("Cleared preference cache", {
			metadata: { size },
			tags: ["cache", "preference", "clear"],
		});
	}

	/**
	 * Periodic cleanup of expired entries
	 */
	cleanup(): void {
		const now = Date.now();
		let cleanedCount = 0;

		for (const [key, cached] of this.cache.entries()) {
			if (now > cached.expiresAt) {
				this.cache.delete(key);
				cleanedCount++;
			}
		}

		if (cleanedCount > 0) {
			logger.debug("Cleaned up expired preference cache entries", {
				metadata: {
					cleanedCount,
					remaining: this.cache.size,
				},
				tags: ["cache", "preference", "cleanup"],
			});
		}
	}

	/**
	 * Get cache statistics
	 */
	getStats(): {
		size: number;
		ttlMinutes: number;
	} {
		return {
			size: this.cache.size,
			ttlMinutes: this.ttl / (60 * 1000),
		};
	}

	/**
	 * Destroy cache and cleanup interval
	 */
	destroy(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}
		this.cache.clear();
	}
}
