import { NextResponse } from "next/server";

import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { stripe } from "@/lib/payment/stripe/config";

import { CheckStoreAdminApiAccess } from "../../api_helper";

function appOrigin(): string {
	return (
		process.env.NEXT_PUBLIC_BASE_URL ||
		process.env.NEXT_PUBLIC_API_URL ||
		process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
		(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
		"http://localhost:3001"
	);
}

/**
 * Creates a Stripe Customer Portal session for the authenticated store operator.
 * Configure the portal in Stripe Dashboard (Customer portal) before using in production.
 */
export async function POST(
	_req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	const access = await CheckStoreAdminApiAccess(params.storeId);
	if (access instanceof NextResponse) {
		return access;
	}

	const user = await sqlClient.user.findUnique({
		where: { id: access.userId },
		select: { stripeCustomerId: true },
	});

	const customerId = user?.stripeCustomerId?.trim();
	if (!customerId) {
		return NextResponse.json(
			{ message: "No billing account on file yet." },
			{ status: 400 },
		);
	}

	try {
		const origin = appOrigin();
		const returnUrl = `${origin}/storeAdmin/${params.storeId}/billing`;

		const portalSession = await stripe.billingPortal.sessions.create({
			customer: customerId,
			return_url: returnUrl,
		});

		if (!portalSession.url) {
			return NextResponse.json(
				{ message: "Stripe did not return a portal URL." },
				{ status: 502 },
			);
		}

		return NextResponse.json({ url: portalSession.url });
	} catch (err: unknown) {
		logger.error("Stripe billing portal session failed", {
			metadata: {
				error: err instanceof Error ? err.message : String(err),
				storeId: params.storeId,
			},
			tags: ["stripe", "billing-portal", "error"],
		});
		return NextResponse.json(
			{
				message:
					err instanceof Error ? err.message : "Could not open billing portal.",
			},
			{ status: 502 },
		);
	}
}
