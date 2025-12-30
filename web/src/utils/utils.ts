import { type ClassValue, clsx } from "clsx";
import crypto from "crypto";
import { twMerge } from "tailwind-merge";

//import type { StoreFacility } from "@prisma/client";
import Decimal from "decimal.js"; // gets added if installed
import { z } from "zod";
import { getNumOfDaysInTheMonth, getUtcNow } from "./datetime-utils";

export const highlight_css = "border-dashed border-green-500 border-2";

/*
export function getTableName(tables: StoreFacility[], facilityId: string) {
  return tables.find((table) => table.id === facilityId)?.facilityName || "";
}
*/

export function GetSubscriptionLength(totalCycles: number) {
	const now = getUtcNow();

	if (totalCycles === 1) return getNumOfDaysInTheMonth(now);
	if (totalCycles === 12) return 365;

	// for quarterly and semi-annual, we need to calculate the number of days in the month
	let days = 0;
	let date = new Date(now);
	for (let i = 1; i <= totalCycles; i++) {
		const mo = date.getMonth() + 1; // JS months are 0-based
		const yr = date.getFullYear();
		days += getNumOfDaysInTheMonth(date);
		// Move to next month
		date = new Date(yr, date.getMonth() + 1, 1);
	}
	return days;
}

export function maskPhoneNumber(phoneNumber: string): string {
	// Mask phone number for logging: +886****5678
	if (phoneNumber.length <= 4) return "****";
	return phoneNumber.slice(0, -4) + "****";
}

export function generateOTPCode(): string {
	// Generate 6-digit OTP code
	return Math.floor(100000 + Math.random() * 900000).toString();
}

export function getRandomNum(length: number): string {
	const min = 10 ** (length - 1);
	const max = 10 ** length - 1;
	return Math.floor(min + Math.random() * (max - min + 1))
		.toString()
		.padStart(length, "0");
}

// recursive function looping deeply through an object to find Decimals and convert to numbers
export const transformDecimalsToNumbers = (obj: any) => {
	if (!obj) {
		return;
	}

	for (const key of Object.keys(obj)) {
		if (Decimal.isDecimal(obj[key])) {
			obj[key] = obj[key].toNumber();
		} else if (Array.isArray(obj[key])) {
			obj[key].forEach((item: any) => transformDecimalsToNumbers(item));
		} else if (typeof obj[key] === "object" && obj[key] !== null) {
			transformDecimalsToNumbers(obj[key]);
		}
	}
};

// recursive function looping deeply through an object to find BigInt values and convert to numbers
// This is needed because JSON.stringify() doesn't support BigInt natively
export const transformBigIntToNumbers = (obj: any) => {
	if (!obj) {
		return;
	}

	for (const key of Object.keys(obj)) {
		if (typeof obj[key] === "bigint") {
			obj[key] = Number(obj[key]);
		} else if (Array.isArray(obj[key])) {
			obj[key].forEach((item: any) => transformBigIntToNumbers(item));
		} else if (typeof obj[key] === "object" && obj[key] !== null) {
			transformBigIntToNumbers(obj[key]);
		}
	}
};

// Transform both Decimals and BigInts to numbers (useful for API responses)
export const transformPrismaDataForJson = (obj: any) => {
	if (!obj) {
		return;
	}

	transformDecimalsToNumbers(obj);
	transformBigIntToNumbers(obj);
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

// Inspired from https://github.com/microsoft/TypeScript/issues/30611#issuecomment-570773496
export function getEnumKeys<
	T extends string,
	TEnumValue extends string | number,
>(enumVariable: { [key in T]: TEnumValue }) {
	return Object.keys(enumVariable) as Array<T>;
}
