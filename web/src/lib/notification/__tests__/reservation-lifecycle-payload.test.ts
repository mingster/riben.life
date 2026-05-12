import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";
import { buildReservationLifecyclePayload } from "../payload-mappers/reservation-lifecycle-payload";
import type { RsvpNotificationContext } from "../rsvp-notification-router";
import { TemplateEngine } from "../template-engine";
import { RsvpStatus } from "@/types/enum";

const RESERVATION_BACKUP_PATH = join(
	process.cwd(),
	"public/backup/message-template-backup-reservation.json",
);

interface ReservationBackupLocalized {
	subject: string;
	body: string;
}

interface ReservationBackupTemplate {
	MessageTemplateLocalized: ReservationBackupLocalized[];
}

function collectMustacheTags(text: string): string[] {
	const tags = new Set<string>();
	const pattern = /\{\{(\w+(?:\.\w+)*)\}\}/g;
	for (const match of text.matchAll(pattern)) {
		tags.add(match[1]);
	}
	return [...tags].sort();
}

function buildSampleReservationPayload() {
	const epochMs = 1_704_067_200_000n;
	const context: RsvpNotificationContext = {
		rsvpId: "rsvp_test",
		storeId: "store_test",
		eventType: "created",
		customerId: "user_test",
		customerName: "Jane Doe",
		customerEmail: "jane@example.com",
		customerPhone: "+886912345678",
		storeName: "Sample Store",
		rsvpTime: epochMs,
		arriveTime: epochMs,
		status: RsvpStatus.Ready,
		previousStatus: RsvpStatus.Pending,
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
	};

	return buildReservationLifecyclePayload({
		context,
		locale: "en",
		storeName: "Sample Store",
		order: {
			orderNumber: 42,
			createdOn: epochMs,
			updatedAt: epochMs + 60_000n,
			total: "500 TWD",
		},
	});
}

describe("reservation lifecycle payload", () => {
	it("substitutes every tag from reservation backup templates", async () => {
		const raw = readFileSync(RESERVATION_BACKUP_PATH, "utf8");
		const templates = JSON.parse(raw) as ReservationBackupTemplate[];
		const payload = buildSampleReservationPayload();
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

		expect(expectedTags).toContain("order.updatedAt");
	});
});
