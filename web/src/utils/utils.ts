import { type ClassValue, clsx } from "clsx";
import crypto from "crypto";
import Decimal from "decimal.js"; // gets added if installed
import { twMerge } from "tailwind-merge";
import { z } from "zod/v4";

export const highlight_css = "border-dashed border-green-500 border-2";

/*
export function getTableName(tables: StoreTables[], tableId: string) {
  return tables.find((table) => table.id === tableId)?.tableName || "";
}
*/
export function isValidEmail(email: string) {
	const emailRegex: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

/**
 * Converts error codes from SNAKE_CASE to camelCase
 * Example: INVALID_TWO_FACTOR_COOKIE -> invalidTwoFactorCookie
 */
export function errorCodeToCamelCase(errorCode: string): string {
	return errorCode
		.toLowerCase()
		.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
}

export function getAbsoluteUrl() {
	const origin =
		typeof window !== "undefined" && window.location.origin
			? window.location.origin
			: "";

	return origin;
}

export function getHostname() {
	const origin =
		typeof window !== "undefined" && window.location.hostname
			? window.location.hostname
			: "";

	return origin;
}

// Inspired from https://github.com/microsoft/TypeScript/issues/30611#issuecomment-570773496
export function getEnumKeys<
	T extends string,
	TEnumValue extends string | number,
>(enumVariable: { [key in T]: TEnumValue }) {
	//return Object.keys(enumVariable) as Array<T>;
	return Object.keys(enumVariable).filter((key) =>
		Number.isNaN(Number(key)),
	) as T[];
}

export function getKeyByValue<T extends Record<string, unknown>>(
	object: T,
	value?: T[keyof T],
): keyof T | undefined {
	return (Object.keys(object) as Array<keyof T>).find(
		(key) => object[key] === value,
	);
}

export function getRandomNum(length: number = 5) {
	const randomNum = (
		(10 ** length).toString().slice(length - 1) +
		Math.floor(Math.random() * 10 ** length + 1).toString()
	).slice(-length);

	return randomNum;
}

// generate a random string. default length is 16.
export function generateRandom(length: number = 16) {
	return crypto.randomBytes(length).toString("hex");
}

// Helper to generate a random 5-character string
export function generateRandomString(length: number = 5) {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	let result = "";
	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

// convert incoming object, if field type is big int, convert it to number
export const transformBigIntToNumbers = (obj: any): any => {
	if (obj === null || obj === undefined) return;

	if (Array.isArray(obj)) {
		return obj.map(transformBigIntToNumbers);
	}
	if (typeof obj === "object") {
		for (const key of Object.keys(obj)) {
			if (typeof obj[key] === "bigint") {
				obj[key] = Number(obj[key]);
			} else if (typeof obj[key] === "object" && obj[key] !== null) {
				obj[key] = transformBigIntToNumbers(obj[key]);
			}
		}
	}
	return obj;
};

// recursive function looping deeply through an object to find Decimals
export const transformDecimalsToNumbers = (obj: any) => {
	if (!obj) {
		return;
	}

	for (const key of Object.keys(obj)) {
		if (Decimal.isDecimal(obj[key])) {
			obj[key] = obj[key].toNumber();
		} else if (typeof obj[key] === "object") {
			transformDecimalsToNumbers(obj[key]);
		}
	}
};

function nullable<TSchema extends z.ZodObject<any>>(schema: TSchema) {
	const entries = Object.entries(schema.shape) as [
		keyof TSchema["shape"],
		z.ZodTypeAny,
	][];

	const newProps = entries.reduce(
		(acc, [key, value]) => {
			acc[key] = value.nullable();

			return acc;
		},
		{} as {
			[key in keyof TSchema["shape"]]: z.ZodNullable<TSchema["shape"][key]>;
		},
	);

	return z.object(newProps);
}

export const formatter = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
});

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const isMobileUserAgent = (userAgent: string | null) => {
	if (!userAgent) return false;

	return /iPhone|iPad|iPod|Android/i.test(userAgent);
};

export function isIOS() {
	return (
		[
			"iPad Simulator",
			"iPhone Simulator",
			"iPod Simulator",
			"iPad",
			"iPhone",
			"iPod",
		].includes(navigator.platform) ||
		// iPad on iOS 13 detection
		(navigator.userAgent.includes("Mac") && "ontouchend" in document)
	);
}

export const generateSHA1 = (data: crypto.BinaryLike) => {
	const hash = crypto.createHash("sha1");
	hash.update(data);

	return hash.digest("hex");
};

export const generateSignature = (publicId: string, apiSecret: string) => {
	const timestamp = new Date().getTime();

	return `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
};
