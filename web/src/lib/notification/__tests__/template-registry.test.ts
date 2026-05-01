import { describe, expect, it } from "bun:test";
import {
	buildLifecycleTemplateKey,
	getLifecycleTemplateCatalog,
	parseLifecycleTemplateKey,
	validateLifecycleTemplateCoverage,
} from "../template-registry";

describe("template-registry", () => {
	it("builds and parses lifecycle keys", () => {
		const key = buildLifecycleTemplateKey({
			domain: "reservation",
			event: "created",
			recipient: "customer",
			channel: "email",
		});
		expect(key).toBe("reservation.created.customer.email");
		expect(parseLifecycleTemplateKey(key)).toEqual({
			domain: "reservation",
			event: "created",
			recipient: "customer",
			channel: "email",
		});
	});

	it("builds and parses subscription lifecycle keys", () => {
		const key = buildLifecycleTemplateKey({
			domain: "subscription",
			event: "cancelled",
			recipient: "customer",
			channel: "email",
		});
		expect(key).toBe("subscription.cancelled.customer.email");
		expect(parseLifecycleTemplateKey(key)).toEqual({
			domain: "subscription",
			event: "cancelled",
			recipient: "customer",
			channel: "email",
		});
	});

	it("builds and parses subscription created lifecycle keys", () => {
		const key = buildLifecycleTemplateKey({
			domain: "subscription",
			event: "created",
			recipient: "customer",
			channel: "email",
		});
		expect(key).toBe("subscription.created.customer.email");
		expect(parseLifecycleTemplateKey(key)).toEqual({
			domain: "subscription",
			event: "created",
			recipient: "customer",
			channel: "email",
		});
	});

	it("does not treat subscription staff keys as lifecycle descriptors", () => {
		expect(
			parseLifecycleTemplateKey("subscription.cancelled.staff.email"),
		).toBeNull();
	});

	it("catalog lists subscription cancelled for customer channels only", () => {
		const catalog = getLifecycleTemplateCatalog();
		const subscriptionStaff = catalog.filter(
			(e) => e.domain === "subscription" && e.recipient === "staff",
		);
		expect(subscriptionStaff.length).toBe(0);
	});

	it("contains a non-empty lifecycle catalog", () => {
		expect(getLifecycleTemplateCatalog().length).toBeGreaterThan(100);
	});

	it("reports missing coverage", () => {
		const missing = validateLifecycleTemplateCoverage({
			requiredLocales: ["en-US"],
			records: [],
		});
		expect(missing.length).toBeGreaterThan(0);
	});
});
