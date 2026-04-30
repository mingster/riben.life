import { describe, expect, it } from "bun:test";
import { convertLegacyPercentSyntaxToMustache } from "../template-migration-compat";

describe("template-migration-compat", () => {
	it("converts legacy percent placeholders", () => {
		const converted = convertLegacyPercentSyntaxToMustache(
			"Hello %Customer.FullName%, order %Order.OrderNumber%",
		);
		expect(converted).toBe(
			"Hello {{customer.fullName}}, order {{order.orderNumber}}",
		);
	});
});
