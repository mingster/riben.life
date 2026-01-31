import { NextRequest, NextResponse } from "next/server";
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { createHmac } from "crypto";
import { Role } from "@prisma/client";
import {
	getUtcNowEpoch,
	getDateInTz,
	getTimezoneOffsetForDate,
	dateToEpoch,
	epochToDate,
	formatDateTime,
} from "@/utils/datetime-utils";
import { getChannelAdapter } from "@/lib/notification/channels";
import { LineChannel } from "@/lib/notification/channels/line-channel";
import { completeRsvpById } from "@/actions/storeAdmin/rsvp/complete-rsvp";
import { RsvpStatus } from "@/types/enum";

/**
 * LINE Webhook Event Types
 */
type LineWebhookEvent =
	| {
			type: "follow";
			source: { type: "user"; userId: string };
			timestamp: number;
			replyToken?: string;
			webhookEventId: string;
	  }
	| {
			type: "unfollow";
			source: { type: "user"; userId: string };
			timestamp: number;
			webhookEventId: string;
	  }
	| {
			type: "message";
			source: { type: "user"; userId: string };
			timestamp: number;
			replyToken?: string;
			webhookEventId: string;
			message: {
				type: string;
				id: string;
				text?: string;
			};
	  }
	| {
			type: string;
			source: { type: string; userId?: string };
			timestamp: number;
			webhookEventId: string;
	  };

interface LineWebhookBody {
	destination: string; // Channel ID
	events: LineWebhookEvent[];
}

/**
 * Verify LINE webhook signature
 * @param body - Raw request body as string
 * @param signature - X-Line-Signature header value
 * @param channelSecret - LINE Channel Secret
 * @returns true if signature is valid
 */
function verifyLineSignature(
	body: string,
	signature: string | null,
	channelSecret: string,
): boolean {
	if (!signature) return false;

	try {
		const hash = createHmac("sha256", channelSecret)
			.update(body)
			.digest("base64");

		return hash === signature;
	} catch (error) {
		logger.error("Failed to verify LINE webhook signature", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["webhook", "line", "security", "error"],
		});
		return false;
	}
}

/** Store shape returned by findStoreByDestination (includes fields needed for confirm flow) */
type StoreForWebhook = {
	id: string;
	name: string | null;
	ownerId: string;
	organizationId: string;
	defaultTimezone: string;
};

const STORE_STAFF_ROLES = [
	Role.owner,
	Role.staff,
	Role.storeAdmin,
	Role.admin,
] as const;

/**
 * Find store by LINE webhook destination.
 * The webhook "destination" can be:
 * - Numeric Channel ID (from LINE Developer Console)
 * - Bot user ID (U-prefixed) in 1:1 chat
 *
 * Searches credentials for: channelId, botUserId, destination.
 */
async function findStoreByDestination(
	destination: string,
): Promise<StoreForWebhook | null> {
	const channelConfigs = await sqlClient.notificationChannelConfig.findMany({
		where: { channel: "line" },
		include: {
			Store: {
				select: {
					id: true,
					name: true,
					ownerId: true,
					organizationId: true,
					defaultTimezone: true,
				},
			},
		},
	});

	for (const config of channelConfigs) {
		if (!config.credentials) continue;

		try {
			const credentials =
				typeof config.credentials === "string"
					? JSON.parse(config.credentials)
					: config.credentials;

			if (
				credentials.channelId === destination ||
				credentials.botUserId === destination ||
				credentials.destination === destination
			) {
				return config.Store;
			}
		} catch (error) {
			logger.warn("Failed to parse LINE channel credentials", {
				metadata: {
					storeId: config.storeId,
					error: error instanceof Error ? error.message : String(error),
				},
				tags: ["webhook", "line", "warning"],
			});
		}
	}

	return null;
}

/**
 * Fallback: find store by LINE user ID (source.userId from webhook event).
 * Used when destination does not match any channel config.
 * Resolves store from: most recent MessageQueue, or stores where user is staff.
 */
async function findStoreByLineUserId(
	lineUserId: string,
): Promise<StoreForWebhook | null> {
	const user = await sqlClient.user.findFirst({
		where: { line_userId: lineUserId },
		select: { id: true },
	});
	if (!user) return null;

	// 1) Most recent MessageQueue where user was sender (customer reply context)
	const recentMsg = await sqlClient.messageQueue.findFirst({
		where: { senderId: user.id },
		orderBy: { createdAt: "desc" },
		select: { storeId: true },
	});
	if (recentMsg?.storeId) {
		const store = await sqlClient.store.findUnique({
			where: { id: recentMsg.storeId },
			select: {
				id: true,
				name: true,
				ownerId: true,
				organizationId: true,
				defaultTimezone: true,
			},
		});
		if (store) return store as StoreForWebhook;
	}

	// 2) User is staff: get first store from their organization membership
	const member = await sqlClient.member.findFirst({
		where: {
			userId: user.id,
			role: { in: [...STORE_STAFF_ROLES] },
		},
		select: { organizationId: true },
	});
	if (member) {
		const store = await sqlClient.store.findFirst({
			where: { organizationId: member.organizationId },
			select: {
				id: true,
				name: true,
				ownerId: true,
				organizationId: true,
				defaultTimezone: true,
			},
		});
		if (store) return store as StoreForWebhook;
	}

	return null;
}

/**
 * Check if a user is store staff (owner or member with staff/storeAdmin/owner/admin role for the store's organization).
 */
async function isStoreStaff(
	userId: string,
	store: StoreForWebhook,
): Promise<boolean> {
	if (store.ownerId === userId) return true;

	const member = await sqlClient.member.findFirst({
		where: {
			userId,
			organizationId: store.organizationId,
			role: { in: [...STORE_STAFF_ROLES] },
		},
		select: { id: true },
	});

	return member != null;
}

/**
 * Get start and end of "today" in store timezone as UTC epoch (BigInt milliseconds).
 */
function getTodayStartEndEpoch(storeTimezone: string): {
	startEpoch: bigint;
	endEpoch: bigint;
} {
	const now = new Date(Date.now());
	const offsetHours = getTimezoneOffsetForDate(now, storeTimezone);
	const todayInStoreTz = getDateInTz(now, offsetHours);
	const y = todayInStoreTz.getUTCFullYear();
	const m = todayInStoreTz.getUTCMonth();
	const d = todayInStoreTz.getUTCDate();

	const startUtc = new Date(Date.UTC(y, m, d, -offsetHours, 0, 0, 0));
	const endUtc = new Date(Date.UTC(y, m, d, 24 - offsetHours, 0, 0, 0) - 1);

	const startEpoch = dateToEpoch(startUtc) ?? BigInt(0);
	const endEpoch = dateToEpoch(endUtc) ?? BigInt(0);
	return { startEpoch, endEpoch };
}

/** Confirmed RSVP row for reply message (id, rsvpTime, facility name) */
type ConfirmedRsvpRow = {
	id: string;
	rsvpTime: bigint;
	facilityName: string | null;
};

/**
 * Confirm all RSVPs for today (store timezone) with status ReadyToConfirm.
 * Updates them to Ready and sets arriveTime. Returns list of confirmed RSVPs.
 */
async function confirmTodayRsvps(
	storeId: string,
	storeTimezone: string,
): Promise<ConfirmedRsvpRow[]> {
	const { startEpoch, endEpoch } = getTodayStartEndEpoch(storeTimezone);

	const toConfirm = await sqlClient.rsvp.findMany({
		where: {
			storeId,
			rsvpTime: { gte: startEpoch, lte: endEpoch },
			status: RsvpStatus.ReadyToConfirm,
		},
		include: {
			Facility: { select: { facilityName: true } },
		},
	});

	if (toConfirm.length === 0) return [];

	const now = getUtcNowEpoch();

	await sqlClient.rsvp.updateMany({
		where: {
			id: { in: toConfirm.map((r) => r.id) },
		},
		data: {
			status: RsvpStatus.Ready,
			arriveTime: now,
			updatedAt: now,
		},
	});

	return toConfirm.map((r) => ({
		id: r.id,
		rsvpTime: r.rsvpTime,
		facilityName: r.Facility?.facilityName ?? null,
	}));
}

/**
 * Complete all RSVPs for today (store timezone) with status Ready.
 * Uses completeRsvpById (same flow as completeRsvpAction: ledger, notification).
 * Returns list of completed RSVPs for the reply message.
 */
async function completeTodayRsvps(
	storeId: string,
	storeTimezone: string,
): Promise<ConfirmedRsvpRow[]> {
	const { startEpoch, endEpoch } = getTodayStartEndEpoch(storeTimezone);

	const toComplete = await sqlClient.rsvp.findMany({
		where: {
			storeId,
			rsvpTime: { gte: startEpoch, lte: endEpoch },
			status: RsvpStatus.Ready,
		},
		include: {
			Facility: { select: { facilityName: true } },
		},
	});

	if (toComplete.length === 0) return [];

	const completed: ConfirmedRsvpRow[] = [];
	for (const r of toComplete) {
		try {
			await completeRsvpById(storeId, r.id);
			completed.push({
				id: r.id,
				rsvpTime: r.rsvpTime,
				facilityName: r.Facility?.facilityName ?? null,
			});
		} catch (err: unknown) {
			logger.warn("LINE complete: failed to complete one RSVP", {
				metadata: {
					rsvpId: r.id,
					storeId,
					error: err instanceof Error ? err.message : String(err),
				},
				tags: ["webhook", "line", "complete", "warning"],
			});
		}
	}
	return completed;
}

/** RSVP status labels for LINE reply (Chinese) */
const RSVP_STATUS_LABELS: Record<number, string> = {
	[RsvpStatus.Pending]: "尚未付款",
	[RsvpStatus.ReadyToConfirm]: "待確認",
	[RsvpStatus.Ready]: "預約中",
	[RsvpStatus.Completed]: "已完成",
	[RsvpStatus.Cancelled]: "已取消",
	[RsvpStatus.NoShow]: "未到",
};

/** Row for "我的預約" reply message */
type MyRsvpRow = {
	timeStr: string;
	facilityName: string;
	statusLabel: string;
};

/**
 * Get customer's RSVPs for this store (from today onwards, not cancelled).
 * Used for "我的預約" LINE reply.
 */
async function getMyRsvpsForReply(
	storeId: string,
	customerId: string,
	storeTimezone: string,
): Promise<MyRsvpRow[]> {
	const { startEpoch } = getTodayStartEndEpoch(storeTimezone);
	const offsetHours = getTimezoneOffsetForDate(new Date(), storeTimezone);

	const rsvps = await sqlClient.rsvp.findMany({
		where: {
			storeId,
			customerId,
			rsvpTime: { gte: startEpoch },
			status: { not: RsvpStatus.Cancelled },
		},
		orderBy: { rsvpTime: "asc" },
		take: 20,
		include: {
			Facility: { select: { facilityName: true } },
		},
	});

	return rsvps.map((r) => {
		const rsvpDate = epochToDate(r.rsvpTime);
		const inTz = rsvpDate ? getDateInTz(rsvpDate, offsetHours) : null;
		const timeStr = inTz ? formatDateTime(inTz) : "";
		const facilityName = r.Facility?.facilityName ?? "-";
		const statusLabel = RSVP_STATUS_LABELS[r.status] ?? String(r.status);
		return { timeStr, facilityName, statusLabel };
	});
}

/**
 * Handle LINE Follow event (user added Official Account as friend)
 */
async function handleFollowEvent(
	event: Extract<LineWebhookEvent, { type: "follow" }>,
	storeId: string,
) {
	const lineUserId = event.source.userId;

	logger.info("LINE Follow event received", {
		metadata: {
			lineUserId,
			storeId,
			webhookEventId: event.webhookEventId,
			timestamp: event.timestamp,
		},
		tags: ["webhook", "line", "follow"],
	});

	// Find user by LINE user ID
	const user = await sqlClient.user.findFirst({
		where: { line_userId: lineUserId },
		select: { id: true, name: true, line_userId: true },
	});

	if (!user) {
		logger.warn("LINE Follow event: User not found for LINE user ID", {
			metadata: {
				lineUserId,
				storeId,
			},
			tags: ["webhook", "line", "follow", "warning"],
		});
		return;
	}

	// Update user to mark that they've added the Official Account
	await sqlClient.user.update({
		where: { id: user.id },
		data: {
			lineOfficialAccountAdded: true,
			lineOfficialAccountAddedAt: getUtcNowEpoch(),
		},
	});

	logger.info("User added LINE Official Account as friend", {
		metadata: {
			userId: user.id,
			lineUserId: user.line_userId,
			storeId,
		},
		tags: ["webhook", "line", "follow", "success"],
	});
}

/**
 * Handle LINE Unfollow event (user blocked Official Account)
 */
async function handleUnfollowEvent(
	event: Extract<LineWebhookEvent, { type: "unfollow" }>,
	storeId: string,
) {
	const lineUserId = event.source.userId;

	logger.info("LINE Unfollow event received", {
		metadata: {
			lineUserId,
			storeId,
			webhookEventId: event.webhookEventId,
			timestamp: event.timestamp,
		},
		tags: ["webhook", "line", "unfollow"],
	});

	// Find user by LINE user ID
	const user = await sqlClient.user.findFirst({
		where: { line_userId: lineUserId },
		select: { id: true, name: true },
	});

	if (!user) {
		return;
	}

	// Update user to mark that they've removed the Official Account
	await sqlClient.user.update({
		where: { id: user.id },
		data: {
			lineOfficialAccountAdded: false,
			lineOfficialAccountAddedAt: null,
		},
	});

	logger.info("User blocked LINE Official Account", {
		metadata: {
			userId: user.id,
			lineUserId,
			storeId,
		},
		tags: ["webhook", "line", "unfollow", "success"],
	});
}

/**
 * Resolve reply target: the user who should receive the customer's reply.
 * Prefer the sender of the most recent notification to this customer for this store;
 * otherwise fall back to the store owner.
 */
async function resolveReplyTarget(
	customerUserId: string,
	storeId: string,
	storeOwnerId: string,
): Promise<string> {
	const lastNotification = await sqlClient.messageQueue.findFirst({
		where: {
			recipientId: customerUserId,
			storeId,
		},
		orderBy: { createdAt: "desc" },
		select: { senderId: true },
	});

	return lastNotification?.senderId ?? storeOwnerId;
}

/**
 * Build LINE channel config for a store (for sending push messages).
 */
async function getLineChannelConfig(storeId: string) {
	const config = await sqlClient.notificationChannelConfig.findUnique({
		where: {
			storeId_channel: { storeId, channel: "line" },
		},
	});

	if (!config) return null;

	const credentials = config.credentials
		? ((typeof config.credentials === "string"
				? JSON.parse(config.credentials)
				: config.credentials) as Record<string, string>)
		: {};
	const settings = config.settings
		? ((typeof config.settings === "string"
				? JSON.parse(config.settings)
				: config.settings) as Record<string, unknown>)
		: {};

	return {
		storeId: config.storeId,
		enabled: config.enabled,
		credentials,
		settings,
	};
}

/**
 * Handle LINE Message event: when a customer replies,
 * 1) create an on-site notification for the original sender (or store owner),
 * 2) send the reply as a LINE message to that user if they have LINE linked.
 * When customer sends "我的預約", replies with their RSVP list for this store.
 * When store staff sends "confirm", confirms today's RSVPs and replies with the list.
 * When store staff sends "complete", marks today's RSVPs as completed and replies with the list.
 */
async function handleMessageEvent(
	event: Extract<LineWebhookEvent, { type: "message" }>,
	store: StoreForWebhook,
) {
	const lineUserId = event.source.userId;
	const messagePayload = event.message;

	// Resolve app user (sender: may be customer or staff)
	const senderUser = await sqlClient.user.findFirst({
		where: { line_userId: lineUserId },
		select: { id: true, name: true },
	});

	if (!senderUser) {
		logger.warn("LINE message event: User not found for LINE user ID", {
			metadata: { lineUserId, storeId: store.id },
			tags: ["webhook", "line", "message", "warning"],
		});
		return;
	}

	// Extract reply text (only text messages; others get a short placeholder)
	let replyText: string;
	if (messagePayload.type === "text" && messagePayload.text) {
		replyText = messagePayload.text.trim();
	} else {
		// Image, sticker, etc. – notify that customer sent non-text content
		replyText = `[Customer sent a ${messagePayload.type || "message"}]`;
	}

	if (!replyText) {
		return;
	}

	// Customer command: "我的預約" – reply with the user's RSVPs for this store
	if (
		messagePayload.type === "text" &&
		replyText === "我的預約" &&
		event.replyToken
	) {
		const myRsvps = await getMyRsvpsForReply(
			store.id,
			senderUser.id,
			store.defaultTimezone,
		);
		const lineConfig = await getLineChannelConfig(store.id);
		const lineAdapter = getChannelAdapter("line");

		let message: string;
		if (myRsvps.length === 0) {
			message = "目前沒有預約記錄。";
		} else {
			const lines = myRsvps.map(
				(r) => `• ${r.timeStr} ${r.facilityName} (${r.statusLabel})`,
			);
			message = `您的預約：\n${lines.join("\n")}`;
		}

		if (lineConfig?.enabled && lineAdapter) {
			try {
				const result = await (lineAdapter as LineChannel).reply(
					event.replyToken,
					[{ type: "text", text: message }],
					lineConfig,
				);
				if (result.success) {
					logger.info("LINE my-reservations reply sent", {
						metadata: {
							storeId: store.id,
							userId: senderUser.id,
							rsvpCount: myRsvps.length,
						},
						tags: ["webhook", "line", "message", "my-reservations"],
					});
				}
			} catch (err: unknown) {
				logger.error("LINE my-reservations reply failed", {
					metadata: {
						storeId: store.id,
						error: err instanceof Error ? err.message : String(err),
					},
					tags: ["webhook", "line", "message", "my-reservations", "error"],
				});
			}
		}
		return;
	}

	// Staff command: "confirm" – confirm today's RSVPs and reply with list
	if (
		messagePayload.type === "text" &&
		replyText.toLowerCase() === "confirm" &&
		event.replyToken
	) {
		const staff = await isStoreStaff(senderUser.id, store);
		if (staff) {
			// #region confirm today's RSVPs
			const confirmed = await confirmTodayRsvps(
				store.id,
				store.defaultTimezone,
			);
			const lineConfig = await getLineChannelConfig(store.id);
			const lineAdapter = getChannelAdapter("line");

			let message: string;
			if (confirmed.length === 0) {
				message = "No RSVPs to confirm today (or none in 待確認 status).";
			} else {
				const offsetHours = getTimezoneOffsetForDate(
					new Date(),
					store.defaultTimezone,
				);
				const lines = confirmed.map((r) => {
					const rsvpDate = epochToDate(r.rsvpTime);
					const inTz = rsvpDate ? getDateInTz(rsvpDate, offsetHours) : null;
					const timeStr = inTz ? formatDateTime(inTz) : "";
					const facility = r.facilityName ? ` @ ${r.facilityName}` : "";
					return `• ${timeStr}${facility}`;
				});
				message = `Confirmed ${confirmed.length} RSVP(s) today:\n${lines.join("\n")}`;
			}
			// #endregion

			if (lineConfig?.enabled && lineAdapter) {
				try {
					const result = await (lineAdapter as LineChannel).reply(
						event.replyToken,
						[{ type: "text", text: message }],
						lineConfig,
					);
					if (result.success) {
						logger.info("LINE confirm reply sent to staff", {
							metadata: {
								storeId: store.id,
								confirmedCount: confirmed.length,
							},
							tags: ["webhook", "line", "message", "confirm"],
						});
					} else {
						logger.warn("LINE confirm reply failed", {
							metadata: {
								storeId: store.id,
								error: result.error,
							},
							tags: ["webhook", "line", "message", "confirm"],
						});
					}
				} catch (err: unknown) {
					logger.error("LINE confirm reply request failed", {
						metadata: {
							storeId: store.id,
							error: err instanceof Error ? err.message : String(err),
						},
						tags: ["webhook", "line", "message", "confirm", "error"],
					});
				}
			}
			return;
		}

		// Not staff: fall through to customer-reply flow (treat "confirm" as normal message)
	}

	// Staff command: "complete" – mark today's RSVPs as completed and reply with list
	if (
		messagePayload.type === "text" &&
		replyText.toLowerCase() === "complete" &&
		event.replyToken
	) {
		const staff = await isStoreStaff(senderUser.id, store);
		if (staff) {
			// #region complete today's RSVPs
			const completed = await completeTodayRsvps(
				store.id,
				store.defaultTimezone,
			);
			const lineConfig = await getLineChannelConfig(store.id);
			const lineAdapter = getChannelAdapter("line");

			let message: string;
			if (completed.length === 0) {
				message = "No RSVPs to complete today (or none in 預約中 status).";
			} else {
				const offsetHours = getTimezoneOffsetForDate(
					new Date(),
					store.defaultTimezone,
				);
				const lines = completed.map((r) => {
					const rsvpDate = epochToDate(r.rsvpTime);
					const inTz = rsvpDate ? getDateInTz(rsvpDate, offsetHours) : null;
					const timeStr = inTz ? formatDateTime(inTz) : "";
					const facility = r.facilityName ? ` @ ${r.facilityName}` : "";
					return `• ${timeStr}${facility}`;
				});
				message = `Completed ${completed.length} RSVP(s) today:\n${lines.join("\n")}`;
			}
			// #endregion

			if (lineConfig?.enabled && lineAdapter) {
				try {
					const result = await (lineAdapter as LineChannel).reply(
						event.replyToken,
						[{ type: "text", text: message }],
						lineConfig,
					);
					if (result.success) {
						logger.info("LINE complete reply sent to staff", {
							metadata: {
								storeId: store.id,
								completedCount: completed.length,
							},
							tags: ["webhook", "line", "message", "complete"],
						});
					} else {
						logger.warn("LINE complete reply failed", {
							metadata: {
								storeId: store.id,
								error: result.error,
							},
							tags: ["webhook", "line", "message", "complete"],
						});
					}
				} catch (err: unknown) {
					logger.error("LINE complete reply request failed", {
						metadata: {
							storeId: store.id,
							error: err instanceof Error ? err.message : String(err),
						},
						tags: ["webhook", "line", "message", "complete", "error"],
					});
				}
			}
			return;
		}
	}

	const replyTargetId = await resolveReplyTarget(
		senderUser.id,
		store.id,
		store.ownerId,
	);

	const now = getUtcNowEpoch();
	const customerName = senderUser.name || "Customer";

	const created = await sqlClient.messageQueue.create({
		data: {
			senderId: senderUser.id,
			recipientId: replyTargetId,
			storeId: store.id,
			subject: `LINE reply from ${customerName}`,
			message: replyText,
			notificationType: "system",
			priority: 0,
			createdAt: now,
			updatedAt: now,
			isRead: false,
			isDeletedByAuthor: false,
			isDeletedByRecipient: false,
		},
	});

	// Send the reply as a LINE message to the notification sender (or store owner)
	const lineConfig = await getLineChannelConfig(store.id);
	const lineAdapter = getChannelAdapter("line");

	if (lineConfig?.enabled && lineAdapter) {
		try {
			const result = await lineAdapter.send(
				{
					id: created.id,
					senderId: senderUser.id,
					recipientId: replyTargetId,
					storeId: store.id,
					subject: created.subject,
					message: created.message,
					notificationType: created.notificationType,
					actionUrl: created.actionUrl,
					priority: created.priority as 0 | 1 | 2,
					createdAt: created.createdAt,
					updatedAt: created.updatedAt,
					isRead: created.isRead,
					isDeletedByAuthor: created.isDeletedByAuthor,
					isDeletedByRecipient: created.isDeletedByRecipient,
				},
				lineConfig,
			);

			if (result.success) {
				logger.info("LINE reply sent to notification sender via LINE", {
					metadata: {
						notificationId: created.id,
						replyTargetId,
						storeId: store.id,
					},
					tags: ["webhook", "line", "message", "reply-sent"],
				});
			} else {
				// e.g. recipient has no LINE user ID – on-site notification already created
				logger.debug("LINE reply not sent via LINE (on-site only)", {
					metadata: {
						replyTargetId,
						storeId: store.id,
						error: result.error,
					},
					tags: ["webhook", "line", "message"],
				});
			}
		} catch (err: unknown) {
			logger.error("Failed to send LINE reply to notification sender", {
				metadata: {
					notificationId: created.id,
					replyTargetId,
					storeId: store.id,
					error: err instanceof Error ? err.message : String(err),
				},
				tags: ["webhook", "line", "message", "error"],
			});
		}
	}

	/*
	logger.info("LINE reply routed to notification sender", {
		metadata: {
			lineUserId,
			customerUserId: senderUser.id,
			replyTargetId,
			storeId: store.id,
			messageType: messagePayload.type,
		},
		tags: ["webhook", "line", "message", "reply-routed"],
	});
	*/
}

/**
 * LINE Webhook Handler
 * POST /api/notifications/webhooks/line
 *
 * Handles webhook events from LINE Messaging API:
 * - follow: User added Official Account as friend
 * - unfollow: User blocked Official Account
 * - message: User sent a message (optional handling)
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.text();
		const signature = request.headers.get("x-line-signature");

		logger.info("LINE webhook request received", {
			metadata: {
				bodyLength: body?.length ?? 0,
				hasSignature: Boolean(signature),
			},
			tags: ["webhook", "line"],
		});

		// Parse webhook body
		let webhookData: LineWebhookBody;
		try {
			webhookData = JSON.parse(body) as LineWebhookBody;
		} catch (error) {
			logger.error("Failed to parse LINE webhook body", {
				metadata: {
					error: error instanceof Error ? error.message : String(error),
				},
				tags: ["webhook", "line", "error"],
			});

			// Return 200 so LINE verification succeeds and LINE does not retry
			return NextResponse.json({ ok: true }, { status: 200 });

			/*
			return NextResponse.json(
				{ error: "Invalid webhook body" },
				{ status: 400 },
			);*/
		}

		// Detailed debug log: parsed webhook payload
		const eventSummaries = webhookData.events?.map((evt) => {
			const base: Record<string, unknown> = {
				type: evt.type,
				webhookEventId: evt.webhookEventId,
				timestamp: evt.timestamp,
				replyToken: "replyToken" in evt ? (evt.replyToken ?? null) : null,
				sourceType: evt.source?.type,
				sourceUserId: evt.source?.userId ?? null,
			};
			if (evt.type === "message" && "message" in evt) {
				base.messageType = evt.message?.type;
				base.messageId = evt.message?.id;
				base.messageText =
					evt.message?.type === "text"
						? (evt.message as { text?: string }).text
						: `[${evt.message?.type ?? "unknown"}]`;
			}
			return base;
		});
		logger.info("LINE webhook payload parsed", {
			metadata: {
				destination: webhookData.destination,
				eventCount: webhookData.events?.length ?? 0,
				events: eventSummaries,
			},
			tags: ["webhook", "line", "debug"],
		});

		// Get store: first by destination, then fallback by sender's LINE user ID
		let store = await findStoreByDestination(webhookData.destination);
		const sourceUserId = webhookData.events?.[0]?.source?.userId;

		if (!store && sourceUserId) {
			logger.info("LINE webhook: Store not found by destination, trying LINE user ID", {
				metadata: {
					destination: webhookData.destination,
					sourceUserId,
				},
				tags: ["webhook", "line", "debug"],
			});
			store = await findStoreByLineUserId(sourceUserId);
		}

		if (!store) {
			logger.warn("LINE webhook: Store not found", {
				metadata: {
					destination: webhookData.destination,
					sourceUserId: sourceUserId ?? null,
					hint: "Add destination (U-prefixed bot user ID) to channel credentials as botUserId or destination",
				},
				tags: ["webhook", "line", "warning"],
			});
			return NextResponse.json({ ok: true }, { status: 200 });
		}
		logger.info("LINE webhook: Store resolved", {
			metadata: {
				storeId: store.id,
				storeName: store.name,
				destination: webhookData.destination,
				sourceUserId: sourceUserId ?? null,
			},
			tags: ["webhook", "line", "debug"],
		});

		// Get channel secret for signature verification
		const channelConfig = await sqlClient.notificationChannelConfig.findUnique({
			where: {
				storeId_channel: {
					storeId: store.id,
					channel: "line",
				},
			},
			select: {
				credentials: true,
			},
		});

		if (!channelConfig?.credentials) {
			logger.error("LINE webhook: Channel config not found", {
				metadata: {
					storeId: store.id,
				},
				tags: ["webhook", "line", "error"],
			});
			// Return 200 so LINE verification succeeds; events are not processed
			return NextResponse.json({ ok: true }, { status: 200 });
		}

		const credentials =
			typeof channelConfig.credentials === "string"
				? JSON.parse(channelConfig.credentials)
				: channelConfig.credentials;
		const channelSecret =
			credentials.channelSecret ?? credentials.secret ?? null;

		if (!channelSecret) {
			logger.error("LINE webhook: Channel secret not found", {
				metadata: {
					storeId: store.id,
				},
				tags: ["webhook", "line", "error"],
			});
			return NextResponse.json(
				{ error: "Channel secret not found" },
				{ status: 500 },
			);
		}

		// Verify signature
		const signatureValid = verifyLineSignature(body, signature, channelSecret);
		logger.info("LINE webhook: Signature verified", {
			metadata: {
				storeId: store.id,
				signatureValid,
			},
			tags: ["webhook", "line", "debug"],
		});
		if (!signatureValid) {
			logger.warn("LINE webhook: Invalid signature", {
				metadata: {
					storeId: store.id,
					hasSignature: Boolean(signature),
				},
				tags: ["webhook", "line", "security", "warning"],
			});
			return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
		}

		// Process events asynchronously (respond quickly)
		const processEvents = async () => {
			for (let i = 0; i < (webhookData.events?.length ?? 0); i++) {
				const event = webhookData.events![i];
				const sourceUserId = event.source?.userId ?? null;
				let msgText: string | null = null;
				if (event.type === "message" && "message" in event) {
					const msg = event.message;
					msgText =
						msg?.type === "text"
							? ((msg as { text?: string }).text ?? null)
							: msg?.type != null
								? `[${msg.type}]`
								: null;
				}
				const replyToken = "replyToken" in event ? event.replyToken : undefined;
				logger.info("LINE webhook: Processing event", {
					metadata: {
						eventIndex: i + 1,
						totalEvents: webhookData.events!.length,
						eventType: event.type,
						webhookEventId: event.webhookEventId,
						sourceUserId,
						messageText: msgText,
						hasReplyToken: Boolean(replyToken),
					},
					tags: ["webhook", "line", "debug"],
				});
				try {
					if (event.type === "follow" && event.source.type === "user") {
						await handleFollowEvent(
							event as Extract<LineWebhookEvent, { type: "follow" }>,
							store.id,
						);
					} else if (
						event.type === "unfollow" &&
						event.source.type === "user"
					) {
						await handleUnfollowEvent(
							event as Extract<LineWebhookEvent, { type: "unfollow" }>,
							store.id,
						);
					} else if (event.type === "message") {
						await handleMessageEvent(
							event as Extract<LineWebhookEvent, { type: "message" }>,
							store,
						);
					} else {
						logger.info("LINE webhook: Unhandled event type", {
							metadata: {
								eventType: event.type,
								webhookEventId: event.webhookEventId,
								storeId: store.id,
							},
							tags: ["webhook", "line", "debug"],
						});
					}
				} catch (error) {
					logger.error("Failed to process LINE webhook event", {
						metadata: {
							eventType: event.type,
							storeId: store.id,
							webhookEventId: event.webhookEventId,
							error: error instanceof Error ? error.message : String(error),
						},
						tags: ["webhook", "line", "error"],
					});
				}
			}
		};

		// Process events asynchronously (don't await)
		processEvents().catch((error) => {
			logger.error("LINE webhook event processing failed", {
				metadata: {
					storeId: store.id,
					error: error instanceof Error ? error.message : String(error),
				},
				tags: ["webhook", "line", "error"],
			});
		});

		// Respond quickly (200 OK)
		return NextResponse.json({ ok: true }, { status: 200 });
	} catch (error) {
		logger.error("LINE webhook handler error", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			},
			tags: ["webhook", "line", "error"],
		});

		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
