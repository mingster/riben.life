import { describe, expect, it } from "bun:test";
import { buildLocaleFallbackCandidates } from "../locale-fallback";

describe("locale fallback policy", () => {
	it("builds deterministic fallback chain", () => {
		const candidates = buildLocaleFallbackCandidates({
			requestedLocale: "ja-JP",
			storeDefaultLocale: "zh-TW",
			systemDefaultLocale: "en-US",
			availableLocales: [
				{ id: "en-US", lng: "en" },
				{ id: "ja-JP", lng: "ja" },
				{ id: "zh-TW", lng: "zh" },
			],
		});

		expect(candidates).toEqual(["ja-JP", "zh-TW", "en-US"]);
	});

	it("normalizes shorthand locale values", () => {
		const candidates = buildLocaleFallbackCandidates({
			requestedLocale: "tw",
			storeDefaultLocale: "jp",
			systemDefaultLocale: "en",
			availableLocales: [
				{ id: "en-US", lng: "en" },
				{ id: "ja-JP", lng: "ja" },
				{ id: "zh-TW", lng: "zh" },
			],
		});

		expect(candidates).toEqual(["zh-TW", "ja-JP", "en-US"]);
	});
});
