import { type ClassValue, clsx } from "clsx";
import crypto from "crypto";
import { twMerge } from "tailwind-merge";

//import type { StoreTables } from "@prisma/client";
import Decimal from "decimal.js"; // gets added if installed
import { z } from "zod";
import { getNumOfDaysInTheMonth, getUtcNow } from "./datetime-utils";

export const highlight_css = "border-dashed border-green-500 border-2";

/*
export function getTableName(tables: StoreTables[], tableId: string) {
  return tables.find((table) => table.id === tableId)?.tableName || "";
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

export function getRandomNum(length: number) {
	const randomNum = (
		(10 ** length).toString().slice(length - 1) +
		Math.floor(Math.random() * 10 ** length + 1).toString()
	).slice(-length);

	return randomNum;
}

// recursive function looping deeply throug an object to find Decimals
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
