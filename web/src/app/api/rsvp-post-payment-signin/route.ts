import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { verifyRsvpPostPaymentToken } from "@/utils/rsvp-post-payment-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 365;
const SESSION_COOKIE_NAME = "better-auth.session_token";

function getSafeReturnPath(raw: string | null): string {
	if (!raw) {
		return "/";
	}
	if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
		return "/";
	}
	return raw;
}

function getSessionSecret(): string {
	const secret =
		process.env.BETTER_AUTH_SECRET?.trim() || process.env.AUTH_SECRET?.trim();
	if (!secret) {
		throw new Error("BETTER_AUTH_SECRET or AUTH_SECRET is required");
	}
	return secret;
}

function signCookieValue(value: string, secret: string): string {
	const signature = createHmac("sha256", secret)
		.update(value)
		.digest("base64url");
	return `${value}.${signature}`;
}

function getSessionCookieName(): string {
	return process.env.NODE_ENV === "production"
		? `__Secure-${SESSION_COOKIE_NAME}`
		: SESSION_COOKIE_NAME;
}

function getClientIpAddress(request: Request): string | null {
	const forwardedFor = request.headers.get("x-forwarded-for");
	if (forwardedFor) {
		const firstIp = forwardedFor.split(",")[0]?.trim();
		if (firstIp) {
			return firstIp;
		}
	}

	return request.headers.get("x-real-ip")?.trim() || null;
}

export async function GET(request: Request) {
	const requestUrl = new URL(request.url);
	const returnPath = getSafeReturnPath(
		requestUrl.searchParams.get("returnUrl"),
	);
	const token = requestUrl.searchParams.get("token");

	if (!token) {
		logger.warn("Missing post-payment sign-in token", {
			metadata: { path: requestUrl.pathname },
			tags: ["rsvp", "post-payment-signin", "validation"],
		});
		return NextResponse.redirect(new URL(returnPath, request.url));
	}

	const payload = verifyRsvpPostPaymentToken(token);
	if (!payload) {
		logger.warn("Invalid post-payment sign-in token", {
			metadata: { path: requestUrl.pathname },
			tags: ["rsvp", "post-payment-signin", "validation"],
		});
		return NextResponse.redirect(new URL(returnPath, request.url));
	}

	const order = await sqlClient.storeOrder.findUnique({
		where: { id: payload.orderId },
		select: {
			id: true,
			isPaid: true,
			userId: true,
			storeId: true,
		},
	});

	if (
		!order ||
		!order.isPaid ||
		!order.userId ||
		order.userId !== payload.userId
	) {
		logger.warn("Post-payment sign-in order validation failed", {
			metadata: {
				orderId: payload.orderId,
				payloadUserId: payload.userId,
				orderUserId: order?.userId ?? null,
				isPaid: order?.isPaid ?? null,
			},
			tags: ["rsvp", "post-payment-signin", "validation"],
		});
		return NextResponse.redirect(new URL(returnPath, request.url));
	}

	const relatedRsvp = await sqlClient.rsvp.findFirst({
		where: {
			orderId: order.id,
			storeId: order.storeId,
		},
		select: {
			id: true,
			customerId: true,
		},
	});

	if (!relatedRsvp || relatedRsvp.customerId !== order.userId) {
		logger.warn("Post-payment sign-in RSVP validation failed", {
			metadata: {
				orderId: order.id,
				rsvpId: relatedRsvp?.id ?? null,
				rsvpCustomerId: relatedRsvp?.customerId ?? null,
				orderUserId: order.userId,
			},
			tags: ["rsvp", "post-payment-signin", "validation"],
		});
		return NextResponse.redirect(new URL(returnPath, request.url));
	}

	const sessionToken = crypto.randomUUID().replace(/-/g, "");
	const now = new Date();
	const expiresAt = new Date(now.getTime() + SESSION_EXPIRES_IN_SECONDS * 1000);
	const signedSessionToken = signCookieValue(sessionToken, getSessionSecret());
	const cookieName = getSessionCookieName();

	await sqlClient.session.create({
		data: {
			userId: order.userId,
			token: sessionToken,
			expiresAt,
			ipAddress: getClientIpAddress(request),
			userAgent: request.headers.get("user-agent"),
		},
	});

	const response = NextResponse.redirect(new URL(returnPath, request.url));
	response.cookies.set(cookieName, signedSessionToken, {
		httpOnly: true,
		path: "/",
		secure: process.env.NODE_ENV === "production",
		sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
		maxAge: SESSION_EXPIRES_IN_SECONDS,
		expires: expiresAt,
	});

	return response;
}
