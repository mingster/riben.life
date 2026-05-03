import { describe, expect, it } from "bun:test";
import {
	authEmailUrlMustachePlaceholders,
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
	});
});
