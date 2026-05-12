import { describe, expect, it } from "bun:test";
import {
	authEmailMustachePlaceholders,
	authEmailUrlMustachePlaceholders,
	applyAuthEmailMustacheValues,
	convertLegacyPercentSyntaxToMustache,
	replaceMustacheToken,
} from "../template-migration-compat";

describe("template-migration-compat", () => {
	it("converts legacy percent placeholders", () => {
		const converted = convertLegacyPercentSyntaxToMustache(
			"Hello %Customer.FullName%, order %Order.OrderNumber%",
		);
		expect(converted).toBe(
			"Hello {{customer.fullName}}, order {{order.orderNumber}}",
		);
	});

	it("replaceMustacheToken replaces literal tokens case-insensitively", () => {
		const out = replaceMustacheToken(
			"Link: {{customer.magicLinkURL}}",
			"{{customer.magicLinkURL}}",
			"https://example.com/ml",
		);
		expect(out).toBe("Link: https://example.com/ml");
	});

	it("authEmailUrlMustachePlaceholders uses expected mustache paths", () => {
		expect(authEmailUrlMustachePlaceholders.magicLinkURL).toBe(
			"{{customer.magicLinkURL}}",
		);
		expect(authEmailUrlMustachePlaceholders.passwordRecoveryURL).toBe(
			"{{customer.passwordRecoveryURL}}",
		);
		expect(authEmailUrlMustachePlaceholders.accountActivationURL).toBe(
			"{{customer.accountActivationURL}}",
		);
		expect(authEmailMustachePlaceholders.newPassword).toBe(
			"{{customer.newPassword}}",
		);
	});

	it("applyAuthEmailMustacheValues replaces all auth backup placeholders", () => {
		const template =
			"{{store.name}} {{support.email}} {{customer.username}} {{customer.accountActivationURL}} {{customer.magicLinkURL}} {{customer.passwordRecoveryURL}} {{customer.newPassword}}";
		const out = applyAuthEmailMustacheValues(template, {
			accountActivationURL: "https://example.com/activate",
			magicLinkURL: "https://example.com/magic",
			passwordRecoveryURL: "https://example.com/reset",
			newPassword: "secret-pass",
		});
		expect(out).toBe(
			"{{store.name}} {{support.email}} {{customer.username}} https://example.com/activate https://example.com/magic https://example.com/reset secret-pass",
		);
	});
});
