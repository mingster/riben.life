/**
 * Notification Rate Limiter
 * Per-channel in-memory rate limiting for outbound notifications.
 *
 * NOTE:
 * - This implementation is process-local (per Node.js instance).
 * - For multi-instance deployments, a distributed store (e.g. Redis) should be used instead.
 */

import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import type { NotificationChannel } from "./types";

export interface RateLimitConfig {
	maxRequests: number; // Maximum requests allowed in window
	windowMs: number; // Time window in milliseconds
	burst?: number; // Optional: Allow burst of N requests (not used yet)
}

export interface RateLimitResult {
	allowed: boolean;
	retryAfter?: number; // Seconds until next request allowed
	remaining?: number; // Remaining requests in current window
}

interface RateLimitEntry {
	timestamps: number[]; // Array of request timestamps
	lastCleanup: number; // Last cleanup time
}

interface CachedGlobalRateLimit {
	value: number | null; // rateLimitPerMinute from SystemNotificationSettings
	expiresAt: number; // Unix timestamp in ms
}

// Cache SystemNotificationSettings.rateLimitPerMinute for a short TTL
const GLOBAL_RATE_LIMIT_TTL_MS = 60_000;
let cachedGlobalRateLimit: CachedGlobalRateLimit | null = null;

async function getGlobalRateLimitPerMinute(): Promise<number | null> {
	const now = Date.now();
	if (cachedGlobalRateLimit && now < cachedGlobalRateLimit.expiresAt) {
		return cachedGlobalRateLimit.value;
	}

	try {
		const settings = await sqlClient.systemNotificationSettings.findFirst();
		const value = settings?.rateLimitPerMinute ?? null;

		cachedGlobalRateLimit = {
			value,
			expiresAt: now + GLOBAL_RATE_LIMIT_TTL_MS,
		};

		return value;
	} catch (err: unknown) {
		logger.error(
			"Failed to load SystemNotificationSettings for rate limiting",
			{
				metadata: {
					error: err instanceof Error ? err.message : String(err),
				},
				tags: ["rate-limit", "notification", "system-settings", "error"],
			},
		);

		// Cache null briefly to avoid hammering DB on repeated failures
		cachedGlobalRateLimit = {
			value: null,
			expiresAt: now + GLOBAL_RATE_LIMIT_TTL_MS,
		};

		return null;
	}
}

export class NotificationRateLimiter {
	private readonly limits = new Map<string, RateLimitConfig>();
	private readonly buckets = new Map<string, RateLimitEntry>();

	// Default rate limits per channel (requests per window)
	// These are conservative defaults and can be tuned or loaded from DB later.
	private readonly defaultLimits: Record<NotificationChannel, RateLimitConfig> =
		{
			onsite: { maxRequests: 10000, windowMs: 60_000 }, // Effectively unlimited
			email: { maxRequests: 100, windowMs: 60_000 }, // 100 emails / minute
			line: { maxRequests: 1000, windowMs: 1_000 }, // 1000 messages / second
			whatsapp: { maxRequests: 1000, windowMs: 1_000 }, // 1000 messages / second
			wechat: { maxRequests: 200, windowMs: 60_000 }, // 200 messages / minute
			sms: { maxRequests: 60, windowMs: 60_000 }, // 60 SMS / minute
			telegram: { maxRequests: 30, windowMs: 1_000 }, // 30 messages / second
			push: { maxRequests: 1000, windowMs: 1_000 }, // 1000 pushes / second
		};

	/**
	 * Check if a request is allowed for a channel (and optional store).
	 * Uses a simple sliding-window style counter based on timestamps.
	 */
	async checkRateLimit(
		channel: NotificationChannel,
		storeId?: string | null,
	): Promise<RateLimitResult> {
		const key = storeId ? `${channel}:${storeId}` : channel;
		const config = await this.getConfig(channel, storeId ?? undefined);
		const now = Date.now();

		// Get or create bucket
		let bucket = this.buckets.get(key);
		if (!bucket) {
			bucket = { timestamps: [], lastCleanup: now };
			this.buckets.set(key, bucket);
		}

		// Cleanup old timestamps before checking
		this.cleanupBucket(bucket, config, now);

		// Check if limit exceeded
		if (bucket.timestamps.length >= config.maxRequests) {
			const oldestTimestamp = bucket.timestamps[0] ?? now;
			const retryAfter = Math.max(
				1,
				Math.ceil((oldestTimestamp + config.windowMs - now) / 1_000),
			);

			logger.warn("Notification rate limit exceeded", {
				metadata: {
					channel,
					storeId: storeId ?? undefined,
					current: bucket.timestamps.length,
					max: config.maxRequests,
					windowMs: config.windowMs,
					retryAfter,
				},
				tags: ["rate-limit", "notification"],
			});

			return {
				allowed: false,
				retryAfter,
				remaining: 0,
			};
		}

		// Add current request
		bucket.timestamps.push(now);

		return {
			allowed: true,
			remaining: config.maxRequests - bucket.timestamps.length,
		};
	}

	/**
	 * Get rate limit configuration for a channel.
	 * Uses defaults, clamped by SystemNotificationSettings.rateLimitPerMinute.
	 * Future: extend with per-channel overrides from NotificationChannelConfig.
	 */
	private async getConfig(
		channel: NotificationChannel,
		storeId?: string,
	): Promise<RateLimitConfig> {
		const key = storeId ? `${channel}:${storeId}` : channel;

		const existing = this.limits.get(key);
		if (existing) {
			return existing;
		}

		// Base: per-channel defaults
		const base: RateLimitConfig =
			this.defaultLimits[channel] ??
			({
				maxRequests: 100,
				windowMs: 60_000,
			} satisfies RateLimitConfig);

		// Global clamp: SystemNotificationSettings.rateLimitPerMinute (if present)
		const globalPerMinute = await getGlobalRateLimitPerMinute();

		if (!globalPerMinute || globalPerMinute <= 0) {
			this.limits.set(key, base);
			return base;
		}

		// Convert global per-minute limit to this channel's window
		const perWindow = Math.max(
			1,
			Math.floor((globalPerMinute * base.windowMs) / 60_000),
		);

		// Use the stricter of (per-window-converted, channel default)
		const effective: RateLimitConfig = {
			...base,
			maxRequests: Math.min(base.maxRequests, perWindow),
		};

		this.limits.set(key, effective);
		return effective;
	}

	/**
	 * Cleanup old timestamps from bucket (sliding window).
	 */
	private cleanupBucket(
		bucket: RateLimitEntry,
		config: RateLimitConfig,
		now: number,
	): void {
		// Only cleanup every 10 seconds to avoid excessive work
		if (now - bucket.lastCleanup < 10_000) {
			return;
		}

		bucket.timestamps = bucket.timestamps.filter(
			(timestamp) => now - timestamp < config.windowMs,
		);
		bucket.lastCleanup = now;
	}

	/**
	 * Reset rate limit for a channel (for testing/admin).
	 */
	reset(channel: NotificationChannel, storeId?: string | null): void {
		const key = storeId ? `${channel}:${storeId}` : channel;
		this.buckets.delete(key);
		this.limits.delete(key);
	}
}
