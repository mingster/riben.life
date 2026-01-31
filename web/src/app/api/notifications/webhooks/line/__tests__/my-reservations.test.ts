/**
 * Tests for LINE webhook "我的預約" (my reservations) flow.
 * When a user sends "我的預約", the webhook replies with their RSVP list.
 */

import { test, expect, mock, beforeEach, afterEach } from "bun:test";
import { createHmac } from "crypto";

const CHANNEL_SECRET = "test-channel-secret";
const CHANNEL_ID = "2008960465";
const STORE_ID = "store-1";
const USER_ID = "user-1";
const LINE_USER_ID = "U1234567890";

const mockStore = {
	id: STORE_ID,
	name: "Test Store",
	ownerId: "owner-1",
	organizationId: "org-1",
	defaultTimezone: "Asia/Taipei",
};

const mockUser = {
	id: USER_ID,
	name: "Test User",
};

const mockChannelConfig = {
	storeId: STORE_ID,
	enabled: true,
	credentials: JSON.stringify({
		channelId: CHANNEL_ID,
		channelSecret: CHANNEL_SECRET,
		accessToken: "test-token",
	}),
};

function buildLineWebhookBody(destination: string, messageText: string) {
	return {
		destination,
		events: [
			{
				type: "message",
				source: { type: "user", userId: LINE_USER_ID },
				timestamp: Date.now(),
				webhookEventId: "webhook-event-id",
				replyToken: "reply-token-123",
				message: {
					type: "text",
					id: "msg-1",
					text: messageText,
				},
			},
		],
	};
}

function signLineWebhook(body: string, secret: string): string {
	return createHmac("sha256", secret).update(body).digest("base64");
}

beforeEach(() => {
	mock.clearAllMocks();
});

afterEach(() => {
	mock.restore();
});

test("my-reservations: replies with 目前沒有預約記錄 when user has no RSVPs", async () => {
	const replyMock = mock(() => Promise.resolve({ success: true }));

	mock.module("@/lib/prismadb", () => ({
		sqlClient: {
			notificationChannelConfig: {
				findMany: mock(() =>
					Promise.resolve([
						{
							...mockChannelConfig,
							Store: mockStore,
							credentials: mockChannelConfig.credentials,
						},
					]),
				),
				findUnique: mock(() =>
					Promise.resolve({
						...mockChannelConfig,
						credentials: mockChannelConfig.credentials,
					}),
				),
			},
			user: {
				findFirst: mock(() => Promise.resolve(mockUser)),
			},
			rsvp: {
				findMany: mock(() => Promise.resolve([])),
			},
		},
	}));

	mock.module("@/lib/notification/channels", () => ({
		registerChannelAdapter: mock(() => {}),
		getChannelAdapter: mock(() => ({
			reply: replyMock,
			send: mock(() => Promise.resolve({ success: true })),
		})),
		getAllChannelAdapters: mock(() => []),
	}));

	const { POST } = await import("../route");
	const body = JSON.stringify(buildLineWebhookBody(CHANNEL_ID, "我的預約"));
	const signature = signLineWebhook(body, CHANNEL_SECRET);

	const request = new Request(
		"http://localhost/api/notifications/webhooks/line",
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Line-Signature": signature,
			},
			body,
		},
	);

	const response = await POST(
		request as unknown as import("next/server").NextRequest,
	);
	expect(response.status).toBe(200);

	// Event processing is async; wait for handleMessageEvent to run
	await new Promise((r) => setTimeout(r, 150));

	expect(replyMock).toHaveBeenCalledTimes(1);
	expect(replyMock).toHaveBeenCalledWith(
		"reply-token-123",
		[{ type: "text", text: "目前沒有預約記錄。" }],
		expect.objectContaining({
			storeId: STORE_ID,
			enabled: true,
		}),
	);
});

test("my-reservations: replies with RSVP list when user has RSVPs", async () => {
	const replyMock = mock(() => Promise.resolve({ success: true }));

	// rsvpTime: today noon in store TZ -> epoch
	const today = new Date();
	const noonEpoch = BigInt(
		Date.UTC(
			today.getUTCFullYear(),
			today.getUTCMonth(),
			today.getUTCDate(),
			4,
			0,
			0,
			0,
		),
	); // 12:00 Asia/Taipei = 04:00 UTC

	const mockRsvps = [
		{
			id: "rsvp-1",
			rsvpTime: noonEpoch,
			status: 40, // Ready
			Facility: { facilityName: "會議室A" },
		},
		{
			id: "rsvp-2",
			rsvpTime: noonEpoch + BigInt(3600000),
			status: 10, // ReadyToConfirm
			Facility: null,
		},
	];

	mock.module("@/lib/prismadb", () => ({
		sqlClient: {
			notificationChannelConfig: {
				findMany: mock(() =>
					Promise.resolve([
						{
							...mockChannelConfig,
							Store: mockStore,
							credentials: mockChannelConfig.credentials,
						},
					]),
				),
				findUnique: mock(() =>
					Promise.resolve({
						...mockChannelConfig,
						credentials: mockChannelConfig.credentials,
					}),
				),
			},
			user: {
				findFirst: mock(() => Promise.resolve(mockUser)),
			},
			rsvp: {
				findMany: mock(() => Promise.resolve(mockRsvps)),
			},
		},
	}));

	mock.module("@/lib/notification/channels", () => ({
		registerChannelAdapter: mock(() => {}),
		getChannelAdapter: mock(() => ({
			reply: replyMock,
			send: mock(() => Promise.resolve({ success: true })),
		})),
		getAllChannelAdapters: mock(() => []),
	}));

	const { POST } = await import("../route");
	const body = JSON.stringify(buildLineWebhookBody(CHANNEL_ID, "我的預約"));
	const signature = signLineWebhook(body, CHANNEL_SECRET);

	const request = new Request(
		"http://localhost/api/notifications/webhooks/line",
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Line-Signature": signature,
			},
			body,
		},
	);

	const response = await POST(
		request as unknown as import("next/server").NextRequest,
	);
	expect(response.status).toBe(200);

	await new Promise((r) => setTimeout(r, 150));

	expect(replyMock).toHaveBeenCalledTimes(1);
	const callArgs = replyMock.mock.calls[0];
	expect(callArgs?.[0]).toBe("reply-token-123");
	expect(callArgs?.[1]).toHaveLength(1);
	expect(callArgs?.[1]?.[0]?.type).toBe("text");

	const replyText = (callArgs?.[1]?.[0] as { type: string; text: string })
		?.text;
	expect(replyText).toContain("您的預約：");
	expect(replyText).toContain("會議室A");
	expect(replyText).toContain("預約中");
	expect(replyText).toContain("待確認");
});

test("my-reservations: does not reply when user is not found", async () => {
	const replyMock = mock(() => Promise.resolve({ success: true }));

	mock.module("@/lib/prismadb", () => ({
		sqlClient: {
			notificationChannelConfig: {
				findMany: mock(() =>
					Promise.resolve([
						{
							...mockChannelConfig,
							Store: mockStore,
							credentials: mockChannelConfig.credentials,
						},
					]),
				),
				findUnique: mock(() =>
					Promise.resolve({
						...mockChannelConfig,
						credentials: mockChannelConfig.credentials,
					}),
				),
			},
			user: {
				findFirst: mock(() => Promise.resolve(null)),
			},
		},
	}));

	mock.module("@/lib/notification/channels", () => ({
		registerChannelAdapter: mock(() => {}),
		getChannelAdapter: mock(() => ({
			reply: replyMock,
			send: mock(() => Promise.resolve({ success: true })),
		})),
		getAllChannelAdapters: mock(() => []),
	}));

	const { POST } = await import("../route");
	const body = JSON.stringify(buildLineWebhookBody(CHANNEL_ID, "我的預約"));
	const signature = signLineWebhook(body, CHANNEL_SECRET);

	const request = new Request(
		"http://localhost/api/notifications/webhooks/line",
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Line-Signature": signature,
			},
			body,
		},
	);

	const response = await POST(
		request as unknown as import("next/server").NextRequest,
	);
	expect(response.status).toBe(200);

	await new Promise((r) => setTimeout(r, 150));

	expect(replyMock).not.toHaveBeenCalled();
});
