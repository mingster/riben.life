import { describe, expect, it } from "bun:test";
import {
	FALLBACK_PLATFORM_SUPPORT_EMAIL,
	resolveSupportEmailFromPlatformSettingsJson,
} from "../resolve-support-email-from-platform-settings-json";

describe("resolveSupportEmailFromPlatformSettingsJson", () => {
	it("reads Support.Email from platform settings JSON", () => {
		const json = JSON.stringify([
			{ label: "Support.Email", value: "help@example.com" },
		]);
		expect(resolveSupportEmailFromPlatformSettingsJson(json)).toBe(
			"help@example.com",
		);
	});

	it("falls back when missing or empty", () => {
		expect(resolveSupportEmailFromPlatformSettingsJson(undefined)).toBe(
			FALLBACK_PLATFORM_SUPPORT_EMAIL,
		);
		expect(
			resolveSupportEmailFromPlatformSettingsJson(
				JSON.stringify([{ label: "Other", value: "x" }]),
			),
		).toBe(FALLBACK_PLATFORM_SUPPORT_EMAIL);
	});
});
