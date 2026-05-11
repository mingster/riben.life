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

	it("does not treat reservation deleted staff keys as lifecycle descriptors", () => {
		expect(
			parseLifecycleTemplateKey("reservation.deleted.staff.email"),
		).toBeNull();
	});

	it("does not treat reservation confirmed_by_store staff keys as lifecycle descriptors", () => {
		expect(
			parseLifecycleTemplateKey(
				"reservation.confirmed_by_store.staff.email",
			),
		).toBeNull();
	});

	it("catalog lists subscription cancelled for customer channels only", () => {
		const catalog = getLifecycleTemplateCatalog();
		const subscriptionStaff = catalog.filter(
			(e) => e.domain === "subscription" && e.recipient === "staff",
		);
		expect(subscriptionStaff.length).toBe(0);
	});

	it("catalog omits reservation deleted staff templates", () => {
		const catalog = getLifecycleTemplateCatalog();
		const deletedStaff = catalog.filter(
			(e) =>
				e.domain === "reservation" &&
				e.event === "deleted" &&
				e.recipient === "staff",
		);
		expect(deletedStaff.length).toBe(0);
	});

	it("catalog omits reservation confirmed_by_store staff templates", () => {
		const catalog = getLifecycleTemplateCatalog();
		const confirmedByStoreStaff = catalog.filter(
			(e) =>
				e.domain === "reservation" &&
				e.event === "confirmed_by_store" &&
				e.recipient === "staff",
		);
		expect(confirmedByStoreStaff.length).toBe(0);
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
