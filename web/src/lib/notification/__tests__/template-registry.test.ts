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
