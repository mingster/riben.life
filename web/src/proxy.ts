import { type NextRequest, NextResponse } from "next/server";
import logger from "./lib/logger";

export const config = {
	//matcher: ["/((>!api|?!_next/static|_next/image|favicon.ico).*)"],
	matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

const CORS_HEADERS = {
	"Access-Control-Allow-Credentials": "true",
	"Access-Control-Allow-Methods": "POST, PUT, PATCH, GET, DELETE, OPTIONS",
	"Content-Type": "application/json",
	Allow: "GET, POST, PATCH, OPTIONS",
	"Access-Control-Allow-Headers":
		"Origin, X-Api-Key, X-Requested-With, Content-Type, Accept, Authorization",
};

// Pre-compile regex patterns for better performance
const API_PATH_REGEX = /\/api\//;
const TRACKER_PATH_REGEX = /\/api\/tracker\//;

// Cache allowed origins to avoid parsing on every request
let cachedAllowedOrigins: Set<string> | null = null;
let cachedFrontendUrls: string | null = null;

/**
 * Get allowed origins as a Set for O(1) lookup performance
 * Cached to avoid parsing environment variable on every request
 */
const getAllowedOrigins = (): Set<string> => {
	const furls = process.env.FRONTEND_URLS;

	// Return cached result if environment variable hasn't changed
	if (cachedAllowedOrigins && cachedFrontendUrls === furls) {
		return cachedAllowedOrigins;
	}

	// Parse and cache the result
	const origins = furls
		? (furls.split(",") as string[]).map((url) => url.trim()).filter(Boolean)
		: [];

	cachedAllowedOrigins = new Set(origins);
	cachedFrontendUrls = furls ?? null;

	return cachedAllowedOrigins;
};

const badRequest = new NextResponse(null, {
	status: 400,
	statusText: "Bad Request",
	headers: { "Content-Type": "text/plain" },
});

/**
 * Apply CORS headers to response in a single batch operation
 * More efficient than multiple append() calls
 */
function applyCorsHeaders(response: NextResponse, origin: string | null): void {
	if (origin) {
		response.headers.set("Access-Control-Allow-Origin", origin);
	}

	// Batch set all CORS headers at once
	for (const [key, value] of Object.entries(CORS_HEADERS)) {
		response.headers.set(key, value);
	}
}

export function proxy(req: NextRequest) {
	//#region csp - https://nextjs.org/docs/pages/guides/content-security-policy
	/*
	const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
	const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'nonce-${nonce}';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
`
	// Replace newline characters and spaces
	const contentSecurityPolicyHeaderValue = cspHeader
		.replace(/\s{2,}/g, ' ')
		.trim()

	const requestHeaders = new Headers(req.headers)
	requestHeaders.set('x-nonce', nonce)

	requestHeaders.set(
		'Content-Security-Policy',
		contentSecurityPolicyHeaderValue
	)

	const response = NextResponse.next({
		request: {
			headers: requestHeaders,
		},
	})
	response.headers.set(
		'Content-Security-Policy',
		contentSecurityPolicyHeaderValue
	)
	*/
	//#endregion

	const response = NextResponse.next();

	response.headers.set("x-current-path", req.nextUrl.pathname);

	// Early return for non-API routes using pre-compiled regex
	if (!API_PATH_REGEX.test(req.url)) {
		return response;
	}

	//#region cors
	// Skip CORS check for tracker API routes (allow Java clients)
	if (TRACKER_PATH_REGEX.test(req.url)) {
		applyCorsHeaders(response, "*");
		return response;
	}

	const origin = req.headers.get("origin");

	// Only process CORS if origin is present
	if (origin) {
		const allowedOrigins = getAllowedOrigins();

		// Use Set.has() for O(1) lookup instead of array.includes() O(n)
		if (!allowedOrigins.has(origin)) {
			logger.warn("CORS blocked for origin", {
				tags: ["cors"],
				metadata: {
					origin,
					allowedOrigins: Array.from(allowedOrigins),
				},
				service: "proxy",
				environment: process.env.NODE_ENV,
				version: process.env.npm_package_version,
				url: req.url || "",
				method: req.method || "",
			});

			return badRequest;
		}

		// Apply CORS headers for allowed origin
		applyCorsHeaders(response, origin);
	}
	//#endregion

	return response;
}
