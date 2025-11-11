import { type NextRequest, NextResponse } from "next/server";
import logger from "./lib/logger";

export const config = {
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

const CORS_HEADERS = {
	"Access-Control-Allow-Credentials": "true",
	"Access-Control-Allow-Methods": "POST, PUT, PATCH, GET, DELETE, OPTIONS",
	"Content-Type": "application/json",
	Allow: "GET, POST, PATCH, OPTIONS",
	"Access-Control-Allow-Headers":
		"Origin, X-Api-Key, X-Requested-With, Content-Type, Accept, Authorization",
};

const getAllowedOrigins = () => {
	const furls = process.env.FRONTEND_URLS;

	// in production, allow origins from FRONTEND_URLS only
	// return process.env.NODE_ENV === "production"
	// ? (furls?.split(",") as string[])
	// : ["http://localhost:3000", "https://api.stripe.com"];

	// allow only the origins in FRONTEND_URLS
	return (furls?.split(",") as string[]).map((url) => url.trim());
};

const badRequest = new NextResponse(null, {
	status: 400,
	statusText: "Bad Request",
	headers: { "Content-Type": "text/plain" },
});

export function middleware(req: NextRequest) {
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

	if (!/\/api\/*/.test(req.url)) {
		return response;
	}

	//#region cors
	// Skip CORS check for tracker API routes (allow Java clients)
	if (/\/api\/tracker\//.test(req.url)) {
		response.headers.append("Access-Control-Allow-Origin", "*");
		for (const [key, value] of Object.entries(CORS_HEADERS)) {
			response.headers.append(key, value);
		}
		return response;
	}

	const origin = req.headers.get("origin");
	const allowedOrigins = getAllowedOrigins();

	if (origin && !allowedOrigins.includes(origin)) {
		logger.warn("CORS blocked for origin", {
			tags: ["cors"],
			metadata: {
				origin,
				allowedOrigins,
			},
			service: "middleware",
			environment: process.env.NODE_ENV,
			version: process.env.npm_package_version,
			url: req.url || "",
			method: req.method || "",
		});

		return badRequest;
	}

	if (origin && process.env.FRONTEND_URLS) {
		const allowedOrigins = process.env.FRONTEND_URLS.split(",") as string[];
		if (allowedOrigins.includes(origin)) {
			response.headers.append("Access-Control-Allow-Origin", origin);

			for (const [key, value] of Object.entries(CORS_HEADERS)) {
				response.headers.append(key, value);
			}
		}
	}
	//#endregion

	return response;
}
