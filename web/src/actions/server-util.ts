"use server";

import { headers } from "next/headers";
import logger from "@/lib/logger";

// Server-side URL utilities
export async function getServerUrl() {
	const headersList = await headers();
	const host = headersList.get("host") || "";
	const protocol = headersList.get("x-forwarded-proto") || "http";
	return `${protocol}://${host}`;
}

export async function getServerHostname() {
	const headersList = await headers();
	const host = headersList.get("host") || "";
	// Remove port if present
	return host.split(":")[0];
}

export async function getServerOrigin() {
	const headersList = await headers();
	const host = headersList.get("host") || "";
	const protocol = headersList.get("x-forwarded-proto") || "http";
	return `${protocol}://${host}`;
}

export async function getServerFullUrl() {
	const headersList = await headers();
	const host = headersList.get("host") || "";
	const protocol = headersList.get("x-forwarded-proto") || "http";
	const pathname = headersList.get("x-current-path") || "";
	return `${protocol}://${host}${pathname}`;
}

export async function getSearchParam(paramName: string) {
	const headersList = await headers();
	const searchParams = headersList.get("x-search-params") || "";
	const params = new URLSearchParams(searchParams);
	return params.get(paramName);
}

// Get client IP address from request headers.
// NOTE: in iisnode environment, enableXFF="true" is required in web.config.
export async function getClientIPAddress(): Promise<string> {
	const headersList = await headers();
	// Common headers for client IP (check both lowercase and original case)
	const ipHeaders = [
		"x-forwarded-for",
		"x-real-ip",
		"x-client-ip",
		"cf-connecting-ip", // Cloudflare
		"x-forwarded",
		"forwarded-for",
		"forwarded",
		// Also check uppercase versions
		"X-Forwarded-For",
		"X-Real-IP",
		"X-Client-IP",
		"CF-Connecting-IP",
		"X-Forwarded",
		"Forwarded-For",
		"Forwarded",
	];

	//logger.info(`Available headers: ${JSON.stringify(headersList)}`);

	for (const header of ipHeaders) {
		const value = headersList.get(header);
		if (value) {
			return value;
		}
	}
	return "";
}
