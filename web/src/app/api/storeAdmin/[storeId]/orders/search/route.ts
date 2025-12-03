import { sqlClient } from "@/lib/prismadb";
import type { StoreOrder } from "@prisma/client";
import { format } from "date-fns";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import { getUtcNow } from "@/utils/datetime-utils";
import { type NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";
export const dynamic = "force-dynamic"; // defaults to force-static

// returns orders in a store
export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ storeId: string }> },
) {
	try {
		const { storeId } = await params;
		CheckStoreAdminApiAccess(storeId);

		const { searchParams } = new URL(req.url);
		const dateVal = searchParams.get("date") || undefined;
		//const date = searchParams.get("date");

		if (!dateVal) return NextResponse.json({});

		// Use UTC for date calculations
		const now = getUtcNowEpoch();
		// set time to 23:59:59 UTC
		const today = new Date(
			Date.UTC(
				now.getUTCFullYear(),
				now.getUTCMonth(),
				now.getUTCDate(),
				23,
				59,
				59,
				999,
			),
		);

		const tmp = new Date(Number.parseInt(dateVal));
		// set time to 00:00:00 UTC
		const date = new Date(
			Date.UTC(
				tmp.getUTCFullYear(),
				tmp.getUTCMonth(),
				tmp.getUTCDate(),
				0,
				0,
				0,
				0,
			),
		);

		console.log(
			`${format(date, "yyyy-MM-dd HH:mm:ss")}至${format(today, "yyyy-MM-dd HH:mm:ss")}`,
		);

		const result = (await sqlClient.storeOrder.findMany({
			where: {
				storeId: storeId,
				updatedAt: {
					gte: date,
					lte: today,
				},
			},
			include: {
				OrderNotes: true,
				OrderItemView: {
					include: {
						Product: true,
					},
				},
				User: true,
				ShippingMethod: true,
				PaymentMethod: true,
			},
			orderBy: {
				updatedAt: "desc",
			},
		})) as StoreOrder[];

		return NextResponse.json(result);
	} catch (error) {
		logger.error("search orders", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api", "error"],
		});

		return new NextResponse("Internal error", { status: 500 });
	}
}
