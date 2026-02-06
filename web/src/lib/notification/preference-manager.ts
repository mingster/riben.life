/**
 * Preference Manager
 * Handles user and store notification preferences
 */

import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { PreferenceCache } from "./preference-cache";
import type {
	NotificationChannel,
	NotificationType,
	UserNotificationPreferences,
} from "./types";

// Shared cache instance across all PreferenceManager instances
// This ensures cache is shared even when multiple instances are created
let sharedCache: PreferenceCache | null = null;

function getSharedCache(): PreferenceCache {
	if (!sharedCache) {
		// Get TTL from environment variable (default: 5 minutes)
		const ttlMinutes = parseInt(
			process.env.NOTIFICATION_PREF_CACHE_TTL || "5",
			10,
		);
		sharedCache = new PreferenceCache(ttlMinutes);
	}
	return sharedCache;
}

export class PreferenceManager {
	private cache: PreferenceCache;

	constructor() {
		// Use shared cache instance
		this.cache = getSharedCache();
	}
	/**
	 * Check if notification should be sent based on preferences
	 */
	async shouldSendNotification(
		userId: string,
		storeId: string | null,
		notificationType: NotificationType | null,
		channels: NotificationChannel[],
	): Promise<{
		allowed: boolean;
		reason?: string;
		allowedChannels?: NotificationChannel[];
	}> {
		// 1. Check system-wide disable (highest priority)
		const systemSettings =
			await sqlClient.systemNotificationSettings.findFirst();
		if (systemSettings && !systemSettings.notificationsEnabled) {
			return {
				allowed: false,
				reason: "Notifications are disabled system-wide",
			};
		}

		// 2. Check system, store channel config, and store default preferences
		// Onsite: always allowed. Email: system + store channel config + store default prefs (emailEnabled). Others: store config.
		let channelsAfterStoreFilter = channels;
		if (storeId) {
			const [storeConfigs, storeDefaultPrefs] = await Promise.all([
				sqlClient.notificationChannelConfig.findMany({
					where: {
						storeId,
						channel: { in: channels },
					},
				}),
				sqlClient.notificationPreferences.findFirst({
					where: { storeId, userId: null },
					select: { emailEnabled: true },
				}),
			]);

			channelsAfterStoreFilter = channels.filter((channel) => {
				if (channel === "onsite") return true;
				if (channel === "email") {
					if (systemSettings && systemSettings.emailEnabled === false)
						return false;
					const config = storeConfigs.find((c) => c.channel === channel);
					if (config && !config.enabled) return false;
					// Store default preferences: include email only if store has no default or emailEnabled !== false
					if (storeDefaultPrefs && storeDefaultPrefs.emailEnabled === false)
						return false;
					return true;
				}
				const config = storeConfigs.find((c) => c.channel === channel);
				if (!config) return true;
				return config.enabled;
			});

			if (channelsAfterStoreFilter.length === 0) {
				return {
					allowed: false,
					reason: "All requested channels are disabled for this store",
				};
			}
		}

		// 3. Get user preferences
		const userPreferences = await this.getUserPreferences(userId, storeId);

		// 4. Check notification type preferences
		if (notificationType) {
			const typeKey =
				`${notificationType}Notifications` as keyof UserNotificationPreferences;
			if (userPreferences[typeKey] === false) {
				return {
					allowed: false,
					reason: `User has disabled ${notificationType} notifications`,
				};
			}
		}

		// 5. Check channel preferences (use store-filtered channels so final list respects both store and user)
		const allowedChannels: NotificationChannel[] = [];
		for (const channel of channelsAfterStoreFilter) {
			const channelKey =
				`${channel}Enabled` as keyof UserNotificationPreferences;
			if (userPreferences[channelKey] !== false) {
				allowedChannels.push(channel);
			}
		}

		if (allowedChannels.length === 0) {
			return {
				allowed: false,
				reason: "User has disabled all requested channels",
			};
		}

		return {
			allowed: true,
			allowedChannels,
		};
	}

	/**
	 * Get user notification preferences
	 * Uses cache to reduce database queries
	 */
	async getUserPreferences(
		userId: string,
		storeId: string | null,
	): Promise<UserNotificationPreferences> {
		const cacheKey = `pref:${userId}:${storeId || "global"}`;

		// Try cache first
		const cached = this.cache.get(cacheKey);
		if (cached) {
			/*
			logger.debug("Preference cache hit", {
				metadata: { userId, storeId: storeId || "global", cacheKey },
				tags: ["cache", "preference", "hit"],
			});
			*/
			return cached;
		}

		// Cache miss - fetch from database
		/*
		logger.debug("Preference cache miss, fetching from database", {
			metadata: { userId, storeId: storeId || "global", cacheKey },
			tags: ["cache", "preference", "miss"],
		});
		*/
		const preferences = await this.fetchFromDatabase(userId, storeId);

		// Store in cache
		this.cache.set(cacheKey, preferences);

		return preferences;
	}

	/**
	 * Fetch preferences from database
	 */
	private async fetchFromDatabase(
		userId: string,
		storeId: string | null,
	): Promise<UserNotificationPreferences> {
		// Try to get user-store specific preferences first
		if (storeId) {
			const preference = await sqlClient.notificationPreferences.findUnique({
				where: {
					userId_storeId: {
						userId,
						storeId,
					},
				},
			});

			if (preference) {
				return this.mapPreferenceToUserPreferences(preference);
			}
		}

		// Fall back to user global preferences
		const globalPreference = await sqlClient.notificationPreferences.findFirst({
			where: {
				userId,
				storeId: null,
			},
		});

		if (globalPreference) {
			return this.mapPreferenceToUserPreferences(globalPreference);
		}

		// Return defaults (all enabled when user has no preference record)
		return {
			userId,
			storeId: storeId || undefined,
			onSiteEnabled: true,
			emailEnabled: true,
			lineEnabled: true,
			whatsappEnabled: true,
			wechatEnabled: true,
			smsEnabled: true,
			telegramEnabled: true,
			pushEnabled: true,
			orderNotifications: true,
			reservationNotifications: true,
			creditNotifications: true,
			paymentNotifications: true,
			systemNotifications: true,
			marketingNotifications: true,
			frequency: "immediate",
		};
	}

	/**
	 * Invalidate cache when preferences are updated
	 */
	invalidateCache(userId: string, storeId: string | null = null): void {
		const cacheKey = `pref:${userId}:${storeId || "global"}`;
		this.cache.invalidate(cacheKey);

		// Also invalidate global if store-specific was updated
		// (since global is used as fallback)
		if (storeId) {
			this.cache.invalidate(`pref:${userId}:global`);
		}

		logger.info("Invalidated preference cache", {
			metadata: { userId, storeId: storeId || "global", cacheKey },
			tags: ["cache", "preference", "invalidate"],
		});
	}

	/**
	 * Get cache statistics (for monitoring)
	 */
	getCacheStats() {
		return this.cache.getStats();
	}

	/**
	 * Map database preference to UserNotificationPreferences
	 */
	private mapPreferenceToUserPreferences(
		preference: any,
	): UserNotificationPreferences {
		return {
			userId: preference.userId || undefined,
			storeId: preference.storeId || undefined,
			onSiteEnabled: preference.onSiteEnabled ?? true,
			emailEnabled: preference.emailEnabled ?? true,
			lineEnabled: preference.lineEnabled ?? true,
			whatsappEnabled: preference.whatsappEnabled ?? true,
			wechatEnabled: preference.wechatEnabled ?? true,
			smsEnabled: preference.smsEnabled ?? true,
			telegramEnabled: preference.telegramEnabled ?? true,
			pushEnabled: preference.pushEnabled ?? true,
			orderNotifications: preference.orderNotifications ?? true,
			reservationNotifications: preference.reservationNotifications ?? true,
			creditNotifications: preference.creditNotifications ?? true,
			paymentNotifications: preference.paymentNotifications ?? true,
			systemNotifications: preference.systemNotifications ?? true,
			marketingNotifications: preference.marketingNotifications ?? true,
			frequency:
				(preference.frequency as
					| "immediate"
					| "daily_digest"
					| "weekly_digest") || "immediate",
		};
	}
}
