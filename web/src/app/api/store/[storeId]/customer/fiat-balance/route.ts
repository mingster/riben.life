import { sqlClient } from "@/lib/prismadb";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { transformPrismaDataForJson } from "@/utils/utils";
import logger from "@/lib/logger";

/**
 * Get customer's fiat balance for a store
 * Customer-facing API endpoint (requires authentication)
 */
export async function GET(
	_req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;

	try {
		// Get authenticated user
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		if (!session?.user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const userId = session.user.id;

		// Get customer fiat balance
		const customerCredit = await sqlClient.customerCredit.findUnique({
			where: {
				storeId_userId: {
					storeId: params.storeId,
					userId,
				},
			},
			select: {
				fiat: true,
			},
		});

		// Get store for currency
		const store = await sqlClient.store.findUnique({
			where: { id: params.storeId },
			select: {
				defaultCurrency: true,
			},
		});

		if (!store) {
			return NextResponse.json({ error: "Store not found" }, { status: 404 });
		}

		const fiatBalance = customerCredit ? Number(customerCredit.fiat) : 0;
		const currency = store.defaultCurrency || "twd";

		return NextResponse.json({
			fiat: fiatBalance,
			currency: currency.toLowerCase(),
		});
	} catch (error) {
		logger.error("Failed to get customer fiat balance", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
				storeId: params.storeId,
			},
			tags: ["api", "customer", "fiat", "error"],
		});

		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
