/**
 * LINE Channel Adapter
 * LINE Messaging API: Push and Reply (section 6.1)
 * - Push: POST https://api.line.me/v2/bot/message/push
 * - Reply: POST https://api.line.me/v2/bot/message/reply (webhook only)
 */

import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import type {
	NotificationChannel,
	ChannelConfig,
	ValidationResult,
	DeliveryStatusInfo,
} from "../types";
import type { Notification } from "../types";
import type { NotificationChannelAdapter } from "./index";

const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";
const LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply";
const LINE_TEXT_MAX_LENGTH = 5000;

function getAccessToken(
	credentials: Record<string, string> | undefined,
): string | null {
	if (!credentials) return null;
	return credentials.accessToken ?? credentials.channelAccessToken ?? null;
}

/**
 * Build LINE text message objects from notification content.
 * Each text message is capped at 5000 chars.
 */
function buildTextMessages(
	notification: Notification,
): Array<{ type: "text"; text: string }> {
	const parts: string[] = [];
	if (notification.subject) parts.push(notification.subject);
	parts.push(notification.message);
	if (notification.actionUrl) parts.push(notification.actionUrl);
	const combined = parts.filter(Boolean).join("\n\n");
	if (!combined) return [{ type: "text" as const, text: "(No content)" }];
	if (combined.length <= LINE_TEXT_MAX_LENGTH) {
		return [{ type: "text" as const, text: combined }];
	}
	const messages: Array<{ type: "text"; text: string }> = [];
	let rest = combined;
	while (rest.length > 0) {
		const chunk = rest.slice(0, LINE_TEXT_MAX_LENGTH);
		messages.push({ type: "text", text: chunk });
		rest = rest.slice(LINE_TEXT_MAX_LENGTH);
	}
	return messages;
}

export class LineChannel implements NotificationChannelAdapter {
	name: NotificationChannel = "line";

	async send(
		notification: Notification,
		config: ChannelConfig,
	): Promise<{
		success: boolean;
		channel: NotificationChannel;
		messageId?: string;
		error?: string;
		deliveredAt?: bigint;
	}> {
		logger.info("Sending LINE notification (push)", {
			metadata: { notificationId: notification.id, storeId: config.storeId },
			tags: ["channel", "line"],
		});

		const accessToken = getAccessToken(config.credentials);
		if (!accessToken) {
			return {
				success: false,
				channel: this.name,
				error: "LINE channel access token is required",
			};
		}
		if (!config.enabled) {
			return {
				success: false,
				channel: this.name,
				error: "LINE is not enabled for this store",
			};
		}

		const user = await sqlClient.user.findUnique({
			where: { id: notification.recipientId },
			select: { line_userId: true },
		});
		if (!user?.line_userId) {
			return {
				success: false,
				channel: this.name,
				error: "Recipient has no LINE user ID",
			};
		}

		const messages = buildTextMessages(notification);

		//LINE Messaging API push only supports line_userId; sending by phone would require LINE Notification Messages
		// (different product), which is not implemented yet.
		try {
			const res = await fetch(LINE_PUSH_URL, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${accessToken}`,
				},
				body: JSON.stringify({ to: user.line_userId, messages }),
			});

			if (res.ok) {
				return {
					success: true,
					channel: this.name,
					deliveredAt: getUtcNowEpoch(),
				};
			}

			const body = await res.text();
			let errMsg: string;
			try {
				const j = JSON.parse(body) as { message?: string };
				errMsg = (j.message ?? body) || `HTTP ${res.status}`;
			} catch {
				errMsg = body || `HTTP ${res.status}`;
			}

			logger.error("LINE push failed", {
				metadata: {
					notificationId: notification.id,
					storeId: config.storeId,
					status: res.status,
					error: errMsg,
				},
				tags: ["channel", "line", "error"],
			});

			return {
				success: false,
				channel: this.name,
				error: errMsg,
			};
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			logger.error("LINE push request failed", {
				metadata: {
					notificationId: notification.id,
					storeId: config.storeId,
					error: msg,
				},
				tags: ["channel", "line", "error"],
			});
			return {
				success: false,
				channel: this.name,
				error: msg,
			};
		}
	}

	/**
	 * Reply to a webhook event within the reply-token window.
	 * Use from POST /api/notifications/webhooks/line only.
	 */
	async reply(
		replyToken: string,
		messages: Array<{ type: "text"; text: string }>,
		config: ChannelConfig,
	): Promise<{ success: boolean; error?: string }> {
		const accessToken = getAccessToken(config.credentials);
		if (!accessToken) {
			return { success: false, error: "LINE channel access token is required" };
		}

		const texts = messages.map((m) =>
			m.text.length > LINE_TEXT_MAX_LENGTH
				? m.text.slice(0, LINE_TEXT_MAX_LENGTH - 3) + "..."
				: m.text,
		);
		const normalized = texts.map((t) => ({ type: "text" as const, text: t }));

		try {
			const res = await fetch(LINE_REPLY_URL, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${accessToken}`,
				},
				body: JSON.stringify({ replyToken, messages: normalized }),
			});

			if (res.ok) return { success: true };

			const body = await res.text();
			let errMsg: string;
			try {
				const j = JSON.parse(body) as { message?: string };
				errMsg = (j.message ?? body) || `HTTP ${res.status}`;
			} catch {
				errMsg = body || `HTTP ${res.status}`;
			}
			logger.error("LINE reply failed", {
				metadata: {
					storeId: config.storeId,
					status: res.status,
					error: errMsg,
				},
				tags: ["channel", "line", "error"],
			});
			return { success: false, error: errMsg };
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			logger.error("LINE reply request failed", {
				metadata: { storeId: config.storeId, error: msg },
				tags: ["channel", "line", "error"],
			});
			return { success: false, error: msg };
		}
	}

	validateConfig(config: ChannelConfig): ValidationResult {
		const token = getAccessToken(config?.credentials);
		if (!token) {
			return {
				valid: false,
				errors: ["LINE access token or channel access token is required"],
			};
		}
		return { valid: true };
	}

	async getDeliveryStatus(messageId: string): Promise<DeliveryStatusInfo> {
		// LINE Push API does not return a messageId; no REST endpoint to query status.
		return { status: "sent", messageId };
	}

	async isEnabled(storeId: string): Promise<boolean> {
		if (!storeId) return false;

		const sys = await sqlClient.systemNotificationSettings.findFirst();
		if (!sys?.notificationsEnabled || !sys.lineEnabled) return false;

		const cfg = await sqlClient.notificationChannelConfig.findUnique({
			where: { storeId_channel: { storeId, channel: "line" } },
		});
		return cfg?.enabled === true;
	}
}
