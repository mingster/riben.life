import { headers } from "next/headers";

export async function getServerUrl() {
	const headersList = await headers();
	const host = headersList.get("host") || "";
	const protocol = headersList.get("x-forwarded-proto") || "http";
	return `${protocol}://${host}`;
}

export async function getServerHostname() {
	const headersList = await headers();
	const host = headersList.get("host") || "";
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

/** Client IP from request headers (enable XFF in IIS when behind a proxy). */
export async function getClientIPAddress(): Promise<string> {
	const headersList = await headers();
	const ipHeaders = [
		"x-forwarded-for",
		"x-real-ip",
		"x-client-ip",
		"cf-connecting-ip",
		"x-forwarded",
		"forwarded-for",
		"forwarded",
		"X-Forwarded-For",
		"X-Real-IP",
		"X-Client-IP",
		"CF-Connecting-IP",
		"X-Forwarded",
		"Forwarded-For",
		"Forwarded",
	];

	for (const header of ipHeaders) {
		const value = headersList.get(header);
		if (value) {
			return value;
		}
	}
	return "";
}
