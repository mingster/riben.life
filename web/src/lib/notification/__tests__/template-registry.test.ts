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
			parseLifecycleTemplateKey("reservation.confirmed_by_store.staff.email"),
		).toBeNull();
	});

	it("does not treat reservation payment_received staff keys as lifecycle descriptors", () => {
		expect(
			parseLifecycleTemplateKey("reservation.payment_received.staff.email"),
		).toBeNull();
	});

	it("does not treat order payment_received staff keys as lifecycle descriptors", () => {
		expect(
			parseLifecycleTemplateKey("order.payment_received.staff.email"),
		).toBeNull();
		expect(
			parseLifecycleTemplateKey("order.payment_received.staff.line"),
		).toBeNull();
	});

	it("does not treat reservation ready_to_confirm customer keys as lifecycle descriptors", () => {
		expect(
			parseLifecycleTemplateKey("reservation.ready_to_confirm.customer.email"),
		).toBeNull();
	});

	it("does not treat reservation ready staff keys as lifecycle descriptors", () => {
		expect(
			parseLifecycleTemplateKey("reservation.ready.staff.email"),
		).toBeNull();
	});

	it("does not treat reservation checked_in customer keys as lifecycle descriptors", () => {
		expect(
			parseLifecycleTemplateKey("reservation.checked_in.customer.email"),
		).toBeNull();
	});

	it("does not treat reservation completed staff keys as lifecycle descriptors", () => {
		expect(
			parseLifecycleTemplateKey("reservation.completed.staff.email"),
		).toBeNull();
	});

	it("does not treat order completed staff keys as lifecycle descriptors", () => {
		expect(parseLifecycleTemplateKey("order.completed.staff.email")).toBeNull();
	});

	it("does not treat order credit_topup_completed staff keys as lifecycle descriptors", () => {
		expect(
			parseLifecycleTemplateKey("order.credit_topup_completed.staff.email"),
		).toBeNull();
		expect(
			parseLifecycleTemplateKey("order.credit_topup_completed.staff.sms"),
		).toBeNull();
	});

	it("does not treat reservation no_show staff keys as lifecycle descriptors", () => {
		expect(
			parseLifecycleTemplateKey("reservation.no_show.staff.email"),
		).toBeNull();
	});

	it("does not treat reservation customer_confirm_required customer keys as lifecycle descriptors", () => {
		expect(
			parseLifecycleTemplateKey(
				"reservation.customer_confirm_required.customer.email",
			),
		).toBeNull();
	});

	it("does not treat reservation customer_confirm_required staff keys as lifecycle descriptors", () => {
		expect(
			parseLifecycleTemplateKey(
				"reservation.customer_confirm_required.staff.email",
			),
		).toBeNull();
	});

	it("does not treat order payment_received customer keys as lifecycle descriptors", () => {
		expect(
			parseLifecycleTemplateKey("order.payment_received.customer.email"),
		).toBeNull();
		expect(
			parseLifecycleTemplateKey("order.payment_received.customer.line"),
		).toBeNull();
	});

	it("catalog omits order payment_received customer templates", () => {
		const catalog = getLifecycleTemplateCatalog();
		const paymentReceivedCustomer = catalog.filter(
			(e) =>
				e.domain === "order" &&
				e.event === "payment_received" &&
				e.recipient === "customer",
		);
		expect(paymentReceivedCustomer.length).toBe(0);
	});

	it("catalog omits order payment_received staff templates", () => {
		const catalog = getLifecycleTemplateCatalog();
		const paymentReceivedStaff = catalog.filter(
			(e) =>
				e.domain === "order" &&
				e.event === "payment_received" &&
				e.recipient === "staff",
		);
		expect(paymentReceivedStaff.length).toBe(0);
	});

	it("catalog omits order created templates", () => {
		const catalog = getLifecycleTemplateCatalog();
		const orderCreated = catalog.filter(
			(e) => e.domain === "order" && e.event === "created",
		);
		expect(orderCreated.length).toBe(0);
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

	it("catalog omits reservation payment_received staff templates", () => {
		const catalog = getLifecycleTemplateCatalog();
		const paymentReceivedStaff = catalog.filter(
			(e) =>
				e.domain === "reservation" &&
				e.event === "payment_received" &&
				e.recipient === "staff",
		);
		expect(paymentReceivedStaff.length).toBe(0);
	});

	it("catalog omits reservation ready_to_confirm customer templates", () => {
		const catalog = getLifecycleTemplateCatalog();
		const readyToConfirmCustomer = catalog.filter(
			(e) =>
				e.domain === "reservation" &&
				e.event === "ready_to_confirm" &&
				e.recipient === "customer",
		);
		expect(readyToConfirmCustomer.length).toBe(0);
	});

	it("catalog omits reservation ready staff templates", () => {
		const catalog = getLifecycleTemplateCatalog();
		const readyStaff = catalog.filter(
			(e) =>
				e.domain === "reservation" &&
				e.event === "ready" &&
				e.recipient === "staff",
		);
		expect(readyStaff.length).toBe(0);
	});

	it("catalog omits reservation checked_in customer templates", () => {
		const catalog = getLifecycleTemplateCatalog();
		const checkedInCustomer = catalog.filter(
			(e) =>
				e.domain === "reservation" &&
				e.event === "checked_in" &&
				e.recipient === "customer",
		);
		expect(checkedInCustomer.length).toBe(0);
	});

	it("catalog omits reservation completed staff templates", () => {
		const catalog = getLifecycleTemplateCatalog();
		const completedStaff = catalog.filter(
			(e) =>
				e.domain === "reservation" &&
				e.event === "completed" &&
				e.recipient === "staff",
		);
		expect(completedStaff.length).toBe(0);
	});

	it("catalog omits order completed staff templates", () => {
		const catalog = getLifecycleTemplateCatalog();
		const completedStaff = catalog.filter(
			(e) =>
				e.domain === "order" &&
				e.event === "completed" &&
				e.recipient === "staff",
		);
		expect(completedStaff.length).toBe(0);
	});

	it("catalog omits order credit_topup_completed staff templates", () => {
		const catalog = getLifecycleTemplateCatalog();
		const creditTopUpStaff = catalog.filter(
			(e) =>
				e.domain === "order" &&
				e.event === "credit_topup_completed" &&
				e.recipient === "staff",
		);
		expect(creditTopUpStaff.length).toBe(0);
	});

	it("catalog omits reservation no_show staff templates", () => {
		const catalog = getLifecycleTemplateCatalog();
		const noShowStaff = catalog.filter(
			(e) =>
				e.domain === "reservation" &&
				e.event === "no_show" &&
				e.recipient === "staff",
		);
		expect(noShowStaff.length).toBe(0);
	});

	it("catalog omits reservation customer_confirm_required customer templates", () => {
		const catalog = getLifecycleTemplateCatalog();
		const customerConfirmRequiredCustomer = catalog.filter(
			(e) =>
				e.domain === "reservation" &&
				e.event === "customer_confirm_required" &&
				e.recipient === "customer",
		);
		expect(customerConfirmRequiredCustomer.length).toBe(0);
	});

	it("catalog omits reservation customer_confirm_required staff templates", () => {
		const catalog = getLifecycleTemplateCatalog();
		const customerConfirmRequiredStaff = catalog.filter(
			(e) =>
				e.domain === "reservation" &&
				e.event === "customer_confirm_required" &&
				e.recipient === "staff",
		);
		expect(customerConfirmRequiredStaff.length).toBe(0);
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
