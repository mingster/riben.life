/**
 * LINE Channel Adapter
 * LINE Messaging API: Push and Reply (section 6.1)
 * - Push: POST https://api.line.me/v2/bot/message/push
 * - Reply: POST https://api.line.me/v2/bot/message/reply (webhook only)
 */

import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { getBaseUrlForMail } from "@/lib/notification/email-template";
import {
	getNotificationT,
	type NotificationT,
} from "@/lib/notification/notification-i18n";
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
/**
 * LINE buttons template body text max (non-Japanese).
 * Proof: LINE Messaging API counts Buttons template `text` in grapheme clusters.
 * Limits: 40 (non-Japanese), 60 (Japanese). See:
 * - https://developers.line.biz/en/docs/messaging-api/text-character-count/ (Buttons template: text, title)
 * - Messaging API reference → Template messages → Buttons (exact numeric limits).
 */
const LINE_BUTTONS_TEXT_MAX = 40;
/**
 * LINE URI action button label max (grapheme clusters).
 * Proof: All action objects' `label` counted in grapheme clusters per text-character-count doc.
 * Limit: 20 characters. See Messaging API reference → URI action.
 */
const LINE_URI_LABEL_MAX = 20;
/** Fallback for action button label when i18n key view_details is missing. */
const DEFAULT_ACTION_BUTTON_LABEL = "View details";

/** Normalize User.locale to notification locale (en, tw, jp). */
function normalizeLocale(
	locale: string | null | undefined,
): "en" | "tw" | "jp" {
	if (!locale) return "en";
	const lower = locale.toLowerCase();
	if (lower === "tw" || lower === "zh" || lower.startsWith("zh")) return "tw";
	if (lower === "jp" || lower === "ja" || lower.startsWith("ja")) return "jp";
	return "en";
}

/**
 * LINE URI actions require absolute HTTPS URLs. Convert relative paths to absolute.
 */
function toAbsoluteActionUrl(pathOrUrl: string): string {
	const trimmed = pathOrUrl.trim();
	if (/^https:\/\//i.test(trimmed)) return trimmed;
	const base = getBaseUrlForMail().replace(/\/$/, "");
	const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
	return `${base}${path}`;
}

function getAccessToken(
	credentials: Record<string, string> | undefined,
): string | null {
	if (!credentials) return null;
	return credentials.accessToken ?? credentials.channelAccessToken ?? null;
}

type LineTextMessage = { type: "text"; text: string };

type LineTemplateMessage = {
	type: "template";
	altText: string;
	template: {
		type: "buttons";
		text: string;
		actions: Array<{ type: "uri"; label: string; uri: string }>;
	};
};

/** LINE Flex Message (reservation confirmation card style). */
type LineFlexMessage = {
	type: "flex";
	altText: string;
	contents: {
		type: "bubble";
		header?: Record<string, unknown>;
		hero?: {
			type: "image";
			url: string;
			size: "full";
			aspectRatio: string;
			aspectMode?: string;
		};
		body: Record<string, unknown>;
		footer?: Record<string, unknown>;
	};
};

type LineMessage = LineTextMessage | LineTemplateMessage | LineFlexMessage;

/** Optional card data for reservation-style Flex message (store = restaurant). */
export type LineReservationCardData = {
	storeName: string;
	storeAddress?: string;
	heroImageUrl?: string;
	tagLabel?: string;
	/** RSVP user's name (訂位人姓名). */
	reservationName: string;
	/** RSVP date (日期). */
	diningDate: string;
	/** RSVP time (時間). */
	diningTime: string;
	/** Party size, e.g. adult + children (人數). */
	partySize: string;
	/** Facility name when RSVP has facility selected (設施). */
	facilityName?: string;
	bookAgainLabel?: string;
};

/**
 * Build a LINE Flex Message that looks like the reservation confirmation card:
 * header (tag + store name/address), hero (image), body (reservation name, date, time, party size, facility?), footer (book again).
 * LINE hero block supports only image/video; store info is in header with dark background.
 * Labels and alt text use i18n via t().
 */
function buildLineReservationFlexMessage(
	notification: Notification,
	card: LineReservationCardData,
	actionUri: string,
	t: NotificationT,
): LineFlexMessage {
	const baseUrl = getBaseUrlForMail().replace(/\/$/, "");
	const heroImageUrl =
		card.heroImageUrl?.startsWith("http") === true
			? card.heroImageUrl
			: card.heroImageUrl
				? `${baseUrl}${card.heroImageUrl.startsWith("/") ? "" : "/"}${card.heroImageUrl}`
				: `${baseUrl}/img/placeholder-reservation-hero.jpg`;

	const headerContents: unknown[] = [];
	if (card.tagLabel) {
		headerContents.push({
			type: "box",
			layout: "horizontal",
			contents: [
				{
					type: "box",
					layout: "vertical",
					backgroundColor: "#FF6B35",
					paddingAll: "6px",
					cornerRadius: "20px",
					contents: [
						{
							type: "text",
							text: card.tagLabel,
							size: "xs",
							color: "#FFFFFF",
							weight: "bold",
						},
					],
				},
			],
		});
	}
	headerContents.push(
		{
			type: "text",
			text: card.storeName,
			size: "xl",
			color: "#FFFFFF",
			weight: "bold",
			wrap: true,
		},
		...(card.storeAddress
			? [
					{
						type: "text",
						text: card.storeAddress,
						size: "sm",
						color: "#FFFFFF",
						wrap: true,
						margin: "top" as const,
					},
				]
			: []),
	);

	const bodyContents: unknown[] = [
		{
			type: "box",
			layout: "horizontal",
			contents: [
				{
					type: "text",
					text: t("line_flex_label_reservation_name"),
					size: "sm",
					color: "#AAAAAA",
					flex: 1,
				},
				{
					type: "text",
					text: card.reservationName,
					size: "sm",
					color: "#000000",
					weight: "bold",
					flex: 1,
					align: "end" as const,
				},
			],
		},
		{
			type: "box",
			layout: "horizontal",
			contents: [
				{
					type: "text",
					text: t("line_flex_label_date"),
					size: "sm",
					color: "#AAAAAA",
					flex: 1,
				},
				{
					type: "text",
					text: card.diningDate,
					size: "sm",
					color: "#000000",
					weight: "bold",
					flex: 1,
					align: "end" as const,
				},
			],
		},
		{
			type: "box",
			layout: "horizontal",
			contents: [
				{
					type: "text",
					text: t("line_flex_label_time"),
					size: "sm",
					color: "#AAAAAA",
					flex: 1,
				},
				{
					type: "text",
					text: card.diningTime,
					size: "sm",
					color: "#000000",
					weight: "bold",
					flex: 1,
					align: "end" as const,
				},
			],
		},
		{
			type: "box",
			layout: "horizontal",
			contents: [
				{
					type: "text",
					text: t("line_flex_label_party_size"),
					size: "sm",
					color: "#AAAAAA",
					flex: 1,
				},
				{
					type: "text",
					text: card.partySize,
					size: "sm",
					color: "#000000",
					weight: "bold",
					flex: 1,
					align: "end" as const,
				},
			],
		},
		...(card.facilityName
			? [
					{
						type: "box",
						layout: "horizontal",
						contents: [
							{
								type: "text",
								text: t("line_flex_label_facility"),
								size: "sm",
								color: "#AAAAAA",
								flex: 1,
							},
							{
								type: "text",
								text: card.facilityName,
								size: "sm",
								color: "#000000",
								weight: "bold",
								flex: 1,
								align: "end" as const,
							},
						],
					},
				]
			: []),
	];

	const bookAgainLabel = card.bookAgainLabel ?? t("line_flex_btn_book_again");

	return {
		type: "flex",
		altText: notification.subject || t("line_flex_alt_reservation_confirmed"),
		contents: {
			type: "bubble",
			header: {
				type: "box",
				layout: "vertical",
				contents: headerContents,
				backgroundColor: "#333333",
				paddingAll: "12px",
			},
			hero: {
				type: "image",
				url: heroImageUrl,
				size: "full",
				aspectRatio: "20:13",
				aspectMode: "cover",
			},
			body: {
				type: "box",
				layout: "vertical",
				contents: bodyContents,
				spacing: "md",
				paddingAll: "16px",
			},
			footer: {
				type: "box",
				layout: "vertical",
				contents: [
					{
						type: "button",
						action: {
							type: "uri",
							label: `🔔 ${bookAgainLabel}`,
							uri: actionUri,
						},
						style: "link",
						height: "sm",
						backgroundColor: "#F0EFE7",
						color: "#555555",
					},
				],
				paddingAll: "12px",
			},
		},
	};
}

/**
 * Build LINE message objects from notification content.
 *
 * 1. When actionUrl is present and reservation card data exists: return a single LineFlexMessage.
 * 2. When actionUrl is present and no card: use buttons template; if message body length <= LINE_BUTTONS_TEXT_MAX return only the buttons template, else return text message(s) (chunked) plus the buttons template.
 * 3. When actionUrl is absent: return one or more LineTextMessage(s) (subject + body, chunked if over LINE_TEXT_MAX_LENGTH).
 *
 * Uses t() for localized Flex card labels and alt text.
 */
function buildLineMessages(
	notification: Notification & {
		lineReservationCard?: LineReservationCardData | null;
		lineFlexData?: LineReservationCardData | null;
	},
	actionButtonLabel: string = DEFAULT_ACTION_BUTTON_LABEL,
	t: NotificationT,
): LineMessage[] {
	const messageBody = (notification.message || "").trim() || "(No content)";
	const subject = (notification.subject || "").trim();

	// 1. actionUrl present + card data → single LineFlexMessage
	if (notification.actionUrl?.trim()) {
		const uri = toAbsoluteActionUrl(notification.actionUrl);
		const card =
			notification.lineReservationCard ??
			(notification as { lineFlexData?: LineReservationCardData }).lineFlexData;

		if (card) {
			return [buildLineReservationFlexMessage(notification, card, uri, t)];
		}

		// 2. actionUrl present, no card → buttons template; if body short then only buttons, else text (chunked) + buttons
		const label =
			actionButtonLabel.length <= LINE_URI_LABEL_MAX
				? actionButtonLabel
				: `${actionButtonLabel.slice(0, LINE_URI_LABEL_MAX - 3)}...`;
		const bodyText =
			messageBody.length <= LINE_BUTTONS_TEXT_MAX
				? messageBody
				: `${messageBody.slice(0, LINE_BUTTONS_TEXT_MAX - 3)}...`;

		const buttonsTemplate: LineTemplateMessage = {
			type: "template",
			altText: bodyText,
			template: {
				type: "buttons",
				text: bodyText,
				actions: [{ type: "uri", label, uri }],
			},
		};

		if (messageBody.length <= LINE_BUTTONS_TEXT_MAX) {
			return [buttonsTemplate];
		}

		const textContent = subject ? `${subject}\n\n${messageBody}` : messageBody;
		const messages: LineMessage[] = [];
		if (textContent.length <= LINE_TEXT_MAX_LENGTH) {
			messages.push({ type: "text", text: textContent });
		} else {
			let rest = textContent;
			while (rest.length > 0) {
				messages.push({
					type: "text",
					text: rest.slice(0, LINE_TEXT_MAX_LENGTH),
				});
				rest = rest.slice(LINE_TEXT_MAX_LENGTH);
			}
		}
		messages.push(buttonsTemplate);
		return messages;
	}

	// 3. actionUrl absent → one or more LineTextMessage(s), chunked if over limit
	const textContent = subject ? `${subject}\n\n${messageBody}` : messageBody;
	const messages: LineMessage[] = [];
	if (textContent.length <= LINE_TEXT_MAX_LENGTH) {
		messages.push({ type: "text", text: textContent });
	} else {
		let rest = textContent;
		while (rest.length > 0) {
			messages.push({
				type: "text",
				text: rest.slice(0, LINE_TEXT_MAX_LENGTH),
			});
			rest = rest.slice(LINE_TEXT_MAX_LENGTH);
		}
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
			select: { line_userId: true, locale: true },
		});
		if (!user?.line_userId) {
			return {
				success: false,
				channel: this.name,
				error: "Recipient has no LINE user ID",
			};
		}

		const locale = normalizeLocale(user.locale);
		const t = getNotificationT(locale);
		const actionButtonLabel = t("view_details") || DEFAULT_ACTION_BUTTON_LABEL;
		const messages = buildLineMessages(notification, actionButtonLabel, t);

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
