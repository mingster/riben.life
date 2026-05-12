import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";
import { buildSubscriptionLifecyclePayload } from "../payload-mappers/subscription-lifecycle-payload";
import { TemplateEngine } from "../template-engine";

const SUBSCRIPTION_BACKUP_PATH = join(
	process.cwd(),
	"public/backup/message-template-subscription.json",
);

interface SubscriptionBackupLocalized {
	subject: string;
	body: string;
}

interface SubscriptionBackupTemplate {
	MessageTemplateLocalized: SubscriptionBackupLocalized[];
}

function collectMustacheTags(text: string): string[] {
	const tags = new Set<string>();
	const pattern = /\{\{(\w+(?:\.\w+)*)\}\}/g;
	for (const match of text.matchAll(pattern)) {
		tags.add(match[1]);
	}
	return [...tags].sort();
}

function buildSampleSubscriptionPayload() {
	return {
		...buildSubscriptionLifecyclePayload({
			user: {
				id: "user_test",
				name: "Jane Doe",
				email: "jane@example.com",
				phoneNumber: "+886912345678",
			} as Parameters<typeof buildSubscriptionLifecyclePayload>[0]["user"],
			storeId: "store_test",
			storeName: "Sample Store",
			subscriptionUrl: "https://example.com/storeAdmin/store_test/subscribe",
			platformName: "riben.life",
		}),
		support: {
			email: "support@example.com",
		},
	};
}

describe("subscription lifecycle payload", () => {
	it("substitutes every tag from subscription backup templates", async () => {
		const raw = readFileSync(SUBSCRIPTION_BACKUP_PATH, "utf8");
		const templates = JSON.parse(raw) as SubscriptionBackupTemplate[];
		const payload = buildSampleSubscriptionPayload();
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

		expect(expectedTags).toContain("store.name");
		expect(expectedTags).toContain("subscription.url");
		expect(expectedTags).toContain("support.email");
		expect(expectedTags).toContain("platform.name");
	});
});
