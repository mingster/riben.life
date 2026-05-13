import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";
import { buildOrderLifecyclePayload } from "../payload-mappers/order-lifecycle-payload";

const ORDER_BACKUP_PATH = join(
	process.cwd(),
	"public/backup/message-template-backup-order.json",
);

interface OrderBackupLocalized {
	subject: string;
	body: string;
}

interface OrderBackupTemplate {
	MessageTemplateLocalized: OrderBackupLocalized[];
}

function collectMustacheTags(text: string): string[] {
	const tags = new Set<string>();
	const pattern = /\{\{(\w+(?:\.\w+)*)\}\}/g;
	for (const match of text.matchAll(pattern)) {
		tags.add(match[1]);
	}
	return [...tags].sort();
}

function buildSampleOrderPayload() {
	const epochMs = 1_704_067_200_000n;

	return buildOrderLifecyclePayload({
		order: {
			id: "order_test",
			storeId: "store_test",
			createdAt: epochMs,
			total: 500,
			currency: "TWD",
			OrderItemView: [
				{
					name: "Sample item",
					quantity: 2,
					unitPrice: 250,
					variants: "Size: M",
				},
			],
		} as Parameters<typeof buildOrderLifecyclePayload>[0]["order"],
		user: {
			id: "user_test",
			name: "Jane Doe",
			email: "jane@example.com",
			phoneNumber: "+886912345678",
		} as Parameters<typeof buildOrderLifecyclePayload>[0]["user"],
		storeName: "Sample Store",
		orderUrl: "https://example.com/account/orders/order_test",
		accountBalanceBefore: 100,
		accountBalanceAfter: 600,
		reservation: {
			id: "rsvp_test",
			status: "Confirmed",
			previousStatus: "Pending",
			dateTime: "2024-01-01 10:00",
			arriveTime: "2024-01-01 10:15",
			facilityName: "Meeting Room A",
			serviceStaffName: "Alex",
			numOfAdult: 2,
			numOfChild: 1,
			message: "Window seat",
			checkInCode: "ABC123",
			actionUrl: "https://example.com/reservation",
			orderId: "order_test",
			paymentAmount: 500,
			paymentCurrency: "TWD",
			refundAmount: 100,
			refundCurrency: "TWD",
		},
	});
}

describe("order lifecycle payload", () => {
	it("substitutes every tag from order backup templates", async () => {
		if (!process.env.DATABASE_URL) {
			process.env.DATABASE_URL =
				"postgresql://postgres:postgres@127.0.0.1:5432/postgres";
		}
		const { TemplateEngine } = await import("../template-engine");
		const raw = readFileSync(ORDER_BACKUP_PATH, "utf8");
		const templates = JSON.parse(raw) as OrderBackupTemplate[];
		const payload = buildSampleOrderPayload();
		const engine = new TemplateEngine();

		const expectedTags = new Set<string>();
		for (const template of templates) {
			for (const localized of template.MessageTemplateLocalized) {
				for (const tag of collectMustacheTags(localized.subject)) {
					expectedTags.add(tag);
				}
				for (const tag of collectMustacheTags(localized.body)) {
					expectedTags.add(tag);
				}
			}
		}

		for (const template of templates) {
			for (const localized of template.MessageTemplateLocalized) {
				const subjectResult = await engine.renderContent(
					localized.subject,
					payload,
				);
				expect(subjectResult.unresolvedTokens).toEqual([]);

				const bodyResult = await engine.renderContent(localized.body, payload);
				expect(bodyResult.unresolvedTokens).toEqual([]);
			}
		}

		expect(expectedTags).toContain("order.url");
		expect(expectedTags).toContain("accountBalance.before");
		expect(expectedTags).toContain("reservation.id");
	});

	it("localizes reservation statuses when locale is set (English labels)", () => {
		const payload = buildOrderLifecyclePayload({
			order: {
				id: "order_test",
				storeId: "store_test",
				createdAt: 1_704_067_200_000n,
				total: 500,
				currency: "TWD",
				OrderItemView: [],
			} as Parameters<typeof buildOrderLifecyclePayload>[0]["order"],
			user: {
				id: "user_test",
				name: "Jane Doe",
				email: "jane@example.com",
			} as Parameters<typeof buildOrderLifecyclePayload>[0]["user"],
			storeName: "Sample Store",
			locale: "tw",
			reservation: {
				id: "rsvp_test",
				status: "Confirmed by Customer",
				previousStatus: "Ready",
			},
		});
		const r = payload.reservation as {
			status: string;
			previousStatus: string;
		};
		expect(r.status).toBe("客戶已確認");
		expect(r.previousStatus).toBe("預約中");
	});
});
