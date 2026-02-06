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

/** Max length for text in a Flex text component (LINE limit). */
const LINE_FLEX_TEXT_MAX = 2000;

/** Header color for all LINE Flex messages (oklch(0.65 0.15 150.31) as hex). */
const LINE_FLEX_HEADER_COLOR = "#2d9d78";
/** Body background for text Flex (light grey). */
const LINE_TEXT_FLEX_BODY_BG = "#F5F5F5";
type LineMessage = LineTextMessage | LineFlexMessage;

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

/** Card data for reminder Flex (訂位將至提醒 style). */
export type LineReminderCardData = {
	/** Title e.g. 預約將至提醒 */
	title: string;
	/** Greeting + reminder paragraph(s) */
	messageBody: string;
	/** Store/restaurant name (bold) */
	storeName: string;
	/** 訂位人姓名 value */
	reservationName: string;
	/** 訂位日期 value */
	reservationDate: string;
	/** 訂位時間 value */
	reservationTime: string;
	/** 訂位人數 value */
	partySize: string;
	/** 注意事項 value */
	notes: string;
	/** Button label e.g. 查看預約 */
	buttonLabel: string;
};

/**
 * Build a LINE Flex Message that looks like the reservation confirmation card:
 * header (tag + store name/address), hero (image), body (reservation name, date, time, party size, facility?), footer (book again).
 * LINE hero block supports only image/video; store info is in header with dark background.
 * Labels and alt text use i18n via t().
 */
/** Build QR code image URL for check-in (LINE requires public HTTPS URL). */
function getCheckInQrImageUrl(checkInUrl: string): string {
	return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=2&data=${encodeURIComponent(checkInUrl)}`;
}

function buildLineReservationFlexMessage(
	notification: Notification,
	card: LineReservationCardData,
	actionUri: string,
	t: NotificationT,
	options?: { altText?: string; checkInUrl?: string },
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
					backgroundColor: LINE_FLEX_HEADER_COLOR,
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
	const checkInLabel = t("line_flex_btn_check_in");
	const checkInCaption = t("notif_msg_checkin_when_you_arrive");

	const altText =
		options?.altText ??
		notification.subject ??
		t("line_flex_alt_reservation_confirmed");

	// LINE URI actions require HTTPS. Skip check-in block when URL is not HTTPS (e.g. localhost).
	const checkInUrl = options?.checkInUrl?.trim();
	const hasCheckIn = Boolean(checkInUrl && checkInUrl.startsWith("https:"));
	const actionUriHttps = actionUri.startsWith("https:");

	const footerContents: unknown[] = [];
	if (hasCheckIn && checkInUrl) {
		const qrImageUrl = getCheckInQrImageUrl(checkInUrl);
		const checkInLabelTrimmed =
			checkInLabel.length <= LINE_URI_LABEL_MAX
				? checkInLabel
				: `${checkInLabel.slice(0, LINE_URI_LABEL_MAX - 3)}...`;
		const bookAgainLabelTrimmed =
			bookAgainLabel.length <= LINE_URI_LABEL_MAX
				? bookAgainLabel
				: `${bookAgainLabel.slice(0, LINE_URI_LABEL_MAX - 3)}...`;
		footerContents.push(
			{
				type: "text",
				text: checkInCaption,
				size: "xs",
				color: "#555555",
				wrap: true,
				align: "center",
			},
			{
				type: "image",
				url: qrImageUrl,
				size: "md",
				aspectMode: "fit",
			},
			{
				type: "box",
				layout: "horizontal",
				contents: [
					{
						type: "button",
						action: {
							type: "uri",
							label: checkInLabelTrimmed,
							uri: checkInUrl,
						},
						style: "primary",
						height: "sm",
					},
					{
						type: "button",
						action: {
							type: "uri",
							label: `🔔 ${bookAgainLabelTrimmed}`,
							uri: actionUri,
						},
						style: "link",
						height: "sm",
					},
				],
				spacing: "sm",
			},
		);
	} else if (actionUriHttps) {
		footerContents.push({
			type: "button",
			action: {
				type: "uri",
				label: `🔔 ${bookAgainLabel}`,
				uri: actionUri,
			},
			style: "link",
			height: "sm",
		});
	}
	// When actionUri is not HTTPS (e.g. localhost), omit footer so LINE accepts the message (URI actions require HTTPS).

	const contents: LineFlexMessage["contents"] = {
		type: "bubble",
		header: {
			type: "box",
			layout: "vertical",
			contents: headerContents,
			backgroundColor: LINE_FLEX_HEADER_COLOR,
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
	};
	if (footerContents.length > 0) {
		contents.footer = {
			type: "box",
			layout: "vertical",
			contents: footerContents,
			paddingAll: "12px",
		};
	}

	return {
		type: "flex",
		altText,
		contents,
	};
}

/**
 * Build a LINE Flex Message for reservation reminder (預約將至提醒 style):
 * header, title, message body, store name (bold), key-value rows, light beige button.
 */
function buildLineReminderFlexMessage(
	card: LineReminderCardData,
	actionUri: string,
	t: NotificationT,
): LineFlexMessage {
	const header = {
		type: "box" as const,
		layout: "vertical" as const,
		contents: [
			{
				type: "text" as const,
				text: "\u00A0",
				size: "xxs" as const,
				color: LINE_FLEX_HEADER_COLOR,
			},
		],
		backgroundColor: LINE_FLEX_HEADER_COLOR,
		paddingAll: "8px",
	};

	const bodyContents: unknown[] = [
		{
			type: "text",
			text: card.title,
			size: "lg",
			color: "#000000",
			weight: "bold",
			wrap: true,
		},
		{
			type: "text",
			text: card.messageBody,
			size: "sm",
			color: "#000000",
			wrap: true,
			margin: "top" as const,
		},
		{
			type: "text",
			text: card.storeName,
			size: "md",
			color: "#000000",
			weight: "bold",
			wrap: true,
			margin: "top" as const,
		},
	];

	const kvRows: [string, string][] = [
		[t("line_flex_label_reservation_name"), card.reservationName],
		[t("line_flex_label_date"), card.reservationDate],
		[t("line_flex_label_time"), card.reservationTime],
		[t("line_flex_label_party_size"), card.partySize],
		[t("notif_label_message"), card.notes],
	];

	for (const [label, value] of kvRows) {
		bodyContents.push({
			type: "box",
			layout: "horizontal",
			contents: [
				{
					type: "text",
					text: label,
					size: "sm",
					color: "#888888",
					flex: 1,
					wrap: true,
				},
				{
					type: "text",
					text: value || "—",
					size: "sm",
					color: "#000000",
					flex: 2,
					wrap: true,
					align: "end" as const,
				},
			],
			margin: "top" as const,
		});
	}

	const body: Record<string, unknown> = {
		type: "box",
		layout: "vertical",
		contents: bodyContents,
		spacing: "sm",
		paddingAll: "16px",
		backgroundColor: "#FFFFFF",
	};

	const buttonLabel =
		card.buttonLabel.length <= LINE_URI_LABEL_MAX
			? card.buttonLabel
			: `${card.buttonLabel.slice(0, LINE_URI_LABEL_MAX - 3)}...`;

	const contents: LineFlexMessage["contents"] = {
		type: "bubble",
		header,
		body,
		footer: {
			type: "box",
			layout: "vertical",
			contents: [
				{
					type: "button",
					action: {
						type: "uri",
						label: buttonLabel,
						uri: actionUri,
					},
					style: "link",
					height: "sm",
					color: "#000000",
				},
			],
			paddingAll: "12px",
			backgroundColor: "#F0EFE7",
		},
	};

	return {
		type: "flex",
		altText: card.title,
		contents,
	};
}

/**
 * Build a LINE Flex message that displays text with an optional action button.
 * Matches the flex text message design: header bar (oklch 0.65 0.15 150.31), light grey body, optional grey button.
 * Used when no reservation card data is present; always sends Flex for consistency.
 */
function buildLineTextFlexMessage(
	textContent: string,
	actionUri: string | null | undefined,
	actionButtonLabel: string,
): LineFlexMessage {
	const truncated =
		textContent.length <= LINE_FLEX_TEXT_MAX
			? textContent
			: `${textContent.slice(0, LINE_FLEX_TEXT_MAX - 3)}...`;
	const altText =
		textContent.length <= 200 ? textContent : `${textContent.slice(0, 197)}...`;

	const header = {
		type: "box" as const,
		layout: "vertical" as const,
		contents: [
			{
				type: "text" as const,
				text: "\u00A0",
				size: "xxs" as const,
				color: LINE_FLEX_HEADER_COLOR,
			},
		],
		backgroundColor: LINE_FLEX_HEADER_COLOR,
		paddingAll: "8px",
	};

	const body: Record<string, unknown> = {
		type: "box",
		layout: "vertical",
		contents: [
			{
				type: "text",
				text: truncated,
				size: "sm",
				color: "#000000",
				wrap: true,
			},
		],
		spacing: "md",
		paddingAll: "16px",
		backgroundColor: LINE_TEXT_FLEX_BODY_BG,
	};

	const label =
		actionButtonLabel.length <= LINE_URI_LABEL_MAX
			? actionButtonLabel
			: `${actionButtonLabel.slice(0, LINE_URI_LABEL_MAX - 3)}...`;

	const contents: LineFlexMessage["contents"] = {
		type: "bubble",
		header,
		body,
		...(actionUri
			? {
					footer: {
						type: "box",
						layout: "vertical",
						contents: [
							{
								type: "button",
								action: {
									type: "uri",
									label,
									uri: actionUri,
								},
								style: "secondary",
								height: "sm",
							},
						],
						paddingAll: "12px",
					},
				}
			: {}),
	};

	return {
		type: "flex",
		altText,
		contents,
	};
}

/** Parsed lineFlexPayload from MessageQueue. */
type LineFlexPayload =
	| { type: "reminder"; data: LineReminderCardData }
	| {
			type: "reservation";
			data: LineReservationCardData;
			altText?: string;
			/** When set (e.g. ready notification), show check-in QR and button. */
			checkInUrl?: string;
	  };

/**
 * Build LINE message objects from notification content.
 * Always returns Flex messages:
 * 1. When lineFlexPayload type "reminder": single reminder Flex (訂位將至提醒 style).
 * 2. When lineFlexPayload type "reservation": single reservation Flex.
 * 3. Otherwise: single text Flex with optional button when actionUrl is present.
 */
function buildLineMessages(
	notification: Notification & { lineFlexPayload?: string | null },
	actionButtonLabel: string = DEFAULT_ACTION_BUTTON_LABEL,
	t: NotificationT,
): LineMessage[] {
	const messageBody = (notification.message || "").trim() || "(No content)";
	const subject = (notification.subject || "").trim();
	const textContent = subject ? `${subject}\n\n${messageBody}` : messageBody;

	// 1. lineFlexPayload (e.g. reminder) → reminder or reservation Flex
	const payloadRaw = notification.lineFlexPayload;
	if (payloadRaw) {
		try {
			const payload = JSON.parse(payloadRaw) as LineFlexPayload;
			if (payload.type === "reminder" && notification.actionUrl?.trim()) {
				const uri = toAbsoluteActionUrl(notification.actionUrl);
				return [buildLineReminderFlexMessage(payload.data, uri, t)];
			}
			if (payload.type === "reservation" && payload.data) {
				const actionUrlForReservation =
					notification.actionUrl?.trim() ||
					(notification.storeId
						? `/s/${notification.storeId}/reservation/history`
						: "/");
				const uri = toAbsoluteActionUrl(actionUrlForReservation);
				const checkInUri = payload.checkInUrl?.trim()
					? toAbsoluteActionUrl(payload.checkInUrl)
					: undefined;
				return [
					buildLineReservationFlexMessage(notification, payload.data, uri, t, {
						altText: payload.altText,
						checkInUrl: checkInUri,
					}),
				];
			}
		} catch (err) {
			logger.warn("LINE lineFlexPayload parse failed, using text Flex", {
				metadata: {
					notificationId: notification.id,
					error: err instanceof Error ? err.message : String(err),
				},
				tags: ["line", "flex", "parse"],
			});
			// Fall through to text Flex if parse fails
		}
	}

	// 2. No structured payload → text Flex with optional button
	const actionUri = notification.actionUrl?.trim()
		? toAbsoluteActionUrl(notification.actionUrl)
		: null;
	const flexMessage = buildLineTextFlexMessage(
		textContent,
		actionUri,
		actionButtonLabel,
	);
	return [flexMessage];
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
		// One Flex message per notification (text Flex, reminder Flex, or reservation Flex). We never send both a plain text and a buttons template.
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
