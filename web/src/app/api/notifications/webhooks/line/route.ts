import { NextRequest, NextResponse } from "next/server";
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { createHmac } from "crypto";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { getChannelAdapter } from "@/lib/notification/channels";

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

/**
 * Find store by LINE Channel ID (destination)
 * Searches through all LINE channel configs to find matching channelId
 */
async function findStoreByChannelId(channelId: string) {
	// Get all LINE channel configs
	const channelConfigs = await sqlClient.notificationChannelConfig.findMany({
		where: {
			channel: "line",
		},
		include: {
			Store: {
				select: {
					id: true,
					name: true,
					ownerId: true,
				},
			},
		},
	});

	// Search for matching channelId in credentials
	for (const config of channelConfigs) {
		if (!config.credentials) continue;

		try {
			const credentials =
				typeof config.credentials === "string"
					? JSON.parse(config.credentials)
					: config.credentials;

			if (credentials.channelId === channelId) {
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
 */
async function handleMessageEvent(
	event: Extract<LineWebhookEvent, { type: "message" }>,
	store: { id: string; name: string | null; ownerId: string },
) {
	const lineUserId = event.source.userId;
	const messagePayload = event.message;

	// Resolve app user (customer who replied)
	const customerUser = await sqlClient.user.findFirst({
		where: { line_userId: lineUserId },
		select: { id: true, name: true },
	});

	if (!customerUser) {
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

	const replyTargetId = await resolveReplyTarget(
		customerUser.id,
		store.id,
		store.ownerId,
	);

	const now = getUtcNowEpoch();
	const customerName = customerUser.name || "Customer";

	const created = await sqlClient.messageQueue.create({
		data: {
			senderId: customerUser.id,
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
					senderId: customerUser.id,
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
				/*
				logger.info("LINE reply sent to notification sender via LINE", {
					metadata: {
						notificationId: created.id,
						replyTargetId,
						storeId: store.id,
					},
					tags: ["webhook", "line", "message", "reply-sent"],
				});
				*/
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
			customerUserId: customerUser.id,
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

		// Get store by channel ID (destination)
		const store = await findStoreByChannelId(webhookData.destination);
		if (!store) {
			logger.warn("LINE webhook: Store not found for channel ID", {
				metadata: {
					channelId: webhookData.destination,
				},
				tags: ["webhook", "line", "warning"],
			});
			// Return 200 so LINE verification succeeds and LINE does not retry
			return NextResponse.json({ ok: true }, { status: 200 });
		}

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
		if (!verifyLineSignature(body, signature, channelSecret)) {
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
			for (const event of webhookData.events) {
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
