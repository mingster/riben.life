import { describe, expect, it } from "bun:test";
import { buildMissingLocalizationPlan } from "../template-localization-plan";

describe("template localization backfill planning", () => {
	it("creates missing rows plan using EN as fallback source", () => {
		const plan = buildMissingLocalizationPlan({
			requiredLocales: ["en-US", "zh-TW", "ja-JP"],
			templates: [
				{
					id: "tpl-1",
					localizations: [{ localeId: "en-US" }],
				},
			],
		});

		expect(plan).toEqual([
			{
				templateId: "tpl-1",
				localeId: "zh-TW",
				sourceLocaleId: "en-US",
			},
			{
				templateId: "tpl-1",
				localeId: "ja-JP",
				sourceLocaleId: "en-US",
			},
		]);
	});

	it("is idempotent when no localization is missing", () => {
		const plan = buildMissingLocalizationPlan({
			requiredLocales: ["en-US", "zh-TW"],
			templates: [
				{
					id: "tpl-1",
					localizations: [{ localeId: "en-US" }, { localeId: "zh-TW" }],
				},
			],
		});
		expect(plan).toEqual([]);
	});
});
