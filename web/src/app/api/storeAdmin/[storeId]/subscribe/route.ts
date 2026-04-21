import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import logger from "@/lib/logger";
import { prepareStoreSubscription } from "@/lib/subscription/prepare-store-subscription";
import { CheckStoreAdminApiAccess } from "../../api_helper";

// called when store operator select a package to subscribe.
// here we create db objects needed for payment intent confirmation.
export async function POST(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	try {
		const access = await CheckStoreAdminApiAccess(params.storeId);
		if (access instanceof NextResponse) {
			return access;
		}
		const session = await auth.api.getSession({
			headers: await headers(),
		});
		const userId = session?.user.id;
		if (typeof userId !== "string") {
			return NextResponse.json({ message: "Unauthenticated" }, { status: 400 });
		}

		let stripePriceId = "";
		try {
			const body = (await req.json()) as { stripePriceId?: string };
			stripePriceId =
				typeof body?.stripePriceId === "string"
					? body.stripePriceId.trim()
					: "";
		} catch {
			return NextResponse.json(
				{ message: "Invalid JSON body" },
				{ status: 400 },
			);
		}

		if (!stripePriceId) {
			return NextResponse.json(
				{ message: "stripePriceId is required" },
				{ status: 400 },
			);
		}

		const result = await prepareStoreSubscription({
			storeId: params.storeId,
			userId,
			stripePriceId,
		});

		return NextResponse.json(
			{
				subscriptionPayment: result.subscriptionPayment,
				stripeCustomerId: result.stripeCustomerId,
				amount: result.amount,
				currency: result.currency,
				interval: result.interval,
				productName: result.productName,
				targetStoreLevel: result.targetStoreLevel,
				stripePriceId: result.stripePriceId,
			},
			{ status: 200 },
		);
	} catch (error) {
		logger.error("Subscribe API failed", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				storeId: params.storeId,
			},
			tags: ["api", "subscribe", "error"],
		});

		return NextResponse.json(
			{
				message:
					error instanceof Error ? error.message : "Internal server error",
			},
			{ status: 500 },
		);
	}
}
