/**
 * Preference Manager
 * Handles user and store notification preferences
 */

import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import type {
	NotificationType,
	NotificationChannel,
	UserNotificationPreferences,
} from "./types";

export class PreferenceManager {
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

		// 2. Check store-level method enable/disable
		if (storeId) {
			const storeConfigs = await sqlClient.notificationChannelConfig.findMany({
				where: {
					storeId,
					channel: { in: channels },
				},
			});

			const enabledChannels = storeConfigs
				.filter((c) => c.enabled)
				.map((c) => c.channel as NotificationChannel);

			// Filter out channels that are disabled at store level
			const allowedChannels = channels.filter(
				(channel) =>
					!storeId || enabledChannels.includes(channel) || channel === "onsite", // On-site is always allowed
			);

			if (allowedChannels.length === 0) {
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

		// 5. Check channel preferences
		const allowedChannels: NotificationChannel[] = [];
		for (const channel of channels) {
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
	 */
	async getUserPreferences(
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

		// Return defaults
		return {
			userId,
			storeId: storeId || undefined,
			onSiteEnabled: true,
			emailEnabled: true,
			lineEnabled: false,
			whatsappEnabled: false,
			wechatEnabled: false,
			smsEnabled: false,
			telegramEnabled: false,
			pushEnabled: false,
			orderNotifications: true,
			reservationNotifications: true,
			creditNotifications: true,
			paymentNotifications: true,
			systemNotifications: true,
			marketingNotifications: false,
			frequency: "immediate",
		};
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
			lineEnabled: preference.lineEnabled ?? false,
			whatsappEnabled: preference.whatsappEnabled ?? false,
			wechatEnabled: preference.wechatEnabled ?? false,
			smsEnabled: preference.smsEnabled ?? false,
			telegramEnabled: preference.telegramEnabled ?? false,
			pushEnabled: preference.pushEnabled ?? false,
			orderNotifications: preference.orderNotifications ?? true,
			reservationNotifications: preference.reservationNotifications ?? true,
			creditNotifications: preference.creditNotifications ?? true,
			paymentNotifications: preference.paymentNotifications ?? true,
			systemNotifications: preference.systemNotifications ?? true,
			marketingNotifications: preference.marketingNotifications ?? false,
			frequency:
				(preference.frequency as
					| "immediate"
					| "daily_digest"
					| "weekly_digest") || "immediate",
		};
	}
}
