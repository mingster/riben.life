import {
	createCipheriv,
	createDecipheriv,
	randomBytes,
	scryptSync,
	timingSafeEqual,
} from "node:crypto";

const SALT = "riben-google-cal-v1";
const ALGO = "aes-256-gcm" as const;
const IV_LEN = 16;
const AUTH_TAG_LEN = 16;

function getEncryptionKey(): Buffer {
	const secret =
		process.env.GOOGLE_CALENDAR_TOKEN_SECRET || process.env.BETTER_AUTH_SECRET;
	if (!secret || secret.length < 8) {
		throw new Error(
			"GOOGLE_CALENDAR_TOKEN_SECRET or BETTER_AUTH_SECRET must be set for calendar token encryption",
		);
	}
	return scryptSync(secret, SALT, 32);
}

/**
 * Encrypts a refresh token for storage in the database (AES-256-GCM).
 */
export function encryptGoogleRefreshToken(plain: string): string {
	const key = getEncryptionKey();
	const iv = randomBytes(IV_LEN);
	const cipher = createCipheriv(ALGO, key, iv);
	const enc = Buffer.concat([
		cipher.update(plain, "utf8"),
		cipher.final(),
	]);
	const tag = cipher.getAuthTag();
	return Buffer.concat([iv, tag, enc]).toString("base64url");
}

/**
 * Decrypts a stored refresh token.
 */
export function decryptGoogleRefreshToken(encB64: string): string {
	const key = getEncryptionKey();
	const buf = Buffer.from(encB64, "base64url");
	if (buf.length < IV_LEN + AUTH_TAG_LEN + 1) {
		throw new Error("Invalid encrypted token payload");
	}
	const iv = buf.subarray(0, IV_LEN);
	const tag = buf.subarray(IV_LEN, IV_LEN + AUTH_TAG_LEN);
	const data = buf.subarray(IV_LEN + AUTH_TAG_LEN);
	const decipher = createDecipheriv(ALGO, key, iv);
	decipher.setAuthTag(tag);
	const out = Buffer.concat([decipher.update(data), decipher.final()]);
	return out.toString("utf8");
}

/**
 * Constant-time compare for OAuth state HMAC (hex strings, same length).
 */
export function safeEqualHex(a: string, b: string): boolean {
	try {
		const ba = Buffer.from(a, "hex");
		const bb = Buffer.from(b, "hex");
		if (ba.length !== bb.length) {
			return false;
		}
		return timingSafeEqual(ba, bb);
	} catch {
		return false;
	}
}
