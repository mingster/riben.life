import { NextRequest, NextResponse } from "next/server";
import { sqlClient } from "@/lib/prismadb";
import { headers } from "next/headers";
import crypto from "crypto";
import logger from "@/lib/logger";

const SESSION_COOKIE_NAME = "better-auth.session_token";
const SESSION_EXPIRY_DAYS = 365;

/**
 * Signs in a user after RSVP payment when their phone matched an existing account.
 * Used for anonymous users who entered a phone number that matches an existing user.
 * GET /api/rsvp-post-payment-signin?orderId=xxx&returnUrl=xxx
 */
export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const orderId = searchParams.get("orderId");
	const returnUrl = searchParams.get("returnUrl");

	if (!orderId || !returnUrl) {
		return NextResponse.redirect(new URL("/", request.url));
	}

	try {
		const order = await sqlClient.storeOrder.findUnique({
			where: { id: orderId },
			select: {
				id: true,
				isPaid: true,
				storeId: true,
				pickupCode: true,
			},
		});

		if (!order || !order.isPaid || !order.pickupCode?.startsWith("RSVP:")) {
			return NextResponse.redirect(new URL(returnUrl, request.url));
		}

		const rsvp = await sqlClient.rsvp.findFirst({
			where: { orderId: order.id },
			select: { id: true, customerId: true },
		});

		if (!rsvp?.customerId) {
			return NextResponse.redirect(new URL(returnUrl, request.url));
		}

		//TODO: this could be buggy
		//
		const token = crypto.randomBytes(32).toString("hex");
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

		const headersList = await headers();
		const ipAddress =
			headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
		const userAgent = headersList.get("user-agent") ?? null;

		await sqlClient.session.create({
			data: {
				id: crypto.randomUUID(),
				userId: rsvp.customerId,
				token,
				expiresAt,
				ipAddress,
				userAgent,
			},
		});

		logger.info("RSVP post-payment sign-in: created session", {
			metadata: {
				orderId,
				userId: rsvp.customerId,
				rsvpId: rsvp.id,
			},
			tags: ["auth", "rsvp", "post-payment-signin"],
		});

		const response = NextResponse.redirect(new URL(returnUrl, request.url));
		response.cookies.set(SESSION_COOKIE_NAME, token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
			maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
			path: "/",
		});

		return response;
	} catch (err) {
		logger.error("RSVP post-payment sign-in failed", {
			metadata: {
				orderId,
				error: err instanceof Error ? err.message : String(err),
			},
			tags: ["auth", "rsvp", "post-payment-signin", "error"],
		});
		return NextResponse.redirect(new URL(returnUrl, request.url));
	}
}
