import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { downgradeStoreToFreeWithStripe } from "@/lib/store-subscription/downgrade-store-to-free";
import { CheckStoreAdminApiAccess } from "../../api_helper";

export async function GET(
	_req: Request,
	_props: { params: Promise<{ storeId: string }> },
) {
	return new NextResponse("Subscription not found", { status: 404 });
}

// Called when store operator selects the free package (StoreLevel.Free)
// or from admin store mgmt page.
// Cancels Stripe subscription/schedule with proration, then updates DB.
export async function POST(
	_req: Request,
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
			return new NextResponse("Unauthenticated", { status: 400 });
		}

		const store = await sqlClient.store.findFirst({
			where: { id: params.storeId },
		});
		if (!store) {
			return new NextResponse("store not found", { status: 402 });
		}

		try {
			await downgradeStoreToFreeWithStripe({
				storeId: params.storeId,
				userId,
			});
		} catch (error: unknown) {
			logger.error("Unsubscribe: Stripe cancel failed", {
				metadata: {
					error: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined,
					storeId: params.storeId,
				},
				tags: ["api", "unsubscribe", "error"],
			});
			return new NextResponse(
				error instanceof Error
					? error.message
					: "Failed to cancel subscription",
				{ status: 500 },
			);
		}

		return NextResponse.json("ok", { status: 200 });
	} catch (error: unknown) {
		logger.error("Unsubscribe API failed", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				storeId: params.storeId,
			},
			tags: ["api", "unsubscribe", "error"],
		});
		return new NextResponse(
			error instanceof Error ? error.message : "Internal server error",
			{ status: 500 },
		);
	}
}
