import { createCipheriv, createDecipheriv, createHash } from "node:crypto";
import type { NewebPayCredentials } from "./types";

function toQueryString(data: Record<string, string | number | undefined>): string {
	const params = new URLSearchParams();
	for (const [key, rawValue] of Object.entries(data)) {
		if (rawValue === undefined) {
			continue;
		}
		params.append(key, String(rawValue));
	}
	return params.toString();
}

export function encryptTradeInfo(
	payload: Record<string, string | number | undefined>,
	credentials: NewebPayCredentials,
): string {
	const query = toQueryString(payload);
	const cipher = createCipheriv(
		"aes-256-cbc",
		Buffer.from(credentials.hashKey, "utf8"),
		Buffer.from(credentials.hashIV, "utf8"),
	);
	cipher.setAutoPadding(true);
	const encrypted = Buffer.concat([
		cipher.update(Buffer.from(query, "utf8")),
		cipher.final(),
	]);
	return encrypted.toString("hex");
}

export function decryptTradeInfo(
	tradeInfoHex: string,
	credentials: NewebPayCredentials,
): Record<string, string> {
	const decipher = createDecipheriv(
		"aes-256-cbc",
		Buffer.from(credentials.hashKey, "utf8"),
		Buffer.from(credentials.hashIV, "utf8"),
	);
	decipher.setAutoPadding(true);
	const decrypted = Buffer.concat([
		decipher.update(Buffer.from(tradeInfoHex, "hex")),
		decipher.final(),
	]);
	const params = new URLSearchParams(decrypted.toString("utf8"));
	const result: Record<string, string> = {};
	for (const [key, value] of params.entries()) {
		result[key] = value;
	}
	return result;
}

export function createTradeSha(
	tradeInfoHex: string,
	credentials: NewebPayCredentials,
): string {
	const source = `HashKey=${credentials.hashKey}&${tradeInfoHex}&HashIV=${credentials.hashIV}`;
	return createHash("sha256").update(source).digest("hex").toUpperCase();
}

export function verifyTradeSha(args: {
	tradeInfoHex: string;
	tradeSha: string;
	credentials: NewebPayCredentials;
}): boolean {
	const expected = createTradeSha(args.tradeInfoHex, args.credentials);
	return expected === args.tradeSha.trim().toUpperCase();
}
