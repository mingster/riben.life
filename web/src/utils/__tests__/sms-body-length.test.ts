import { describe, expect, test } from "bun:test";
import {
	formatSmsBodyLengthError,
	getSmsBodyCharacterLimit,
	isAsciiOnlySmsText,
	validateSmsBodyLength,
} from "@/utils/sms-body-length";

describe("sms-body-length", () => {
	test("uses 160 for ASCII-only text", () => {
		expect(isAsciiOnlySmsText("Hello {{store.name}}")).toBe(true);
		expect(getSmsBodyCharacterLimit("Hello")).toBe(160);
	});

	test("uses 80 when any character is non-ASCII", () => {
		expect(isAsciiOnlySmsText("【{{store.name}}】")).toBe(false);
		expect(getSmsBodyCharacterLimit("【店】")).toBe(80);
	});

	test("validates code point length", () => {
		const ascii = "a".repeat(160);
		expect(validateSmsBodyLength(ascii).ok).toBe(true);
		expect(validateSmsBodyLength(`${ascii}x`).ok).toBe(false);

		const unicode = "預".repeat(80);
		expect(validateSmsBodyLength(unicode).ok).toBe(true);
		expect(validateSmsBodyLength(`${unicode}約`).ok).toBe(false);
	});

	test("returns a descriptive error when over limit", () => {
		expect(formatSmsBodyLengthError("a".repeat(161))).toContain("160");
		expect(formatSmsBodyLengthError("預".repeat(81))).toContain("80");
	});
});
