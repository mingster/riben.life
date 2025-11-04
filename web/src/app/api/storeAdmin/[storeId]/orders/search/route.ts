import { sqlClient } from "@/lib/prismadb";
import type { StoreOrder } from "@prisma/client";
import { format } from "date-fns";
import { CheckStoreAdminApiAccess } from "../../../api_helper";

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

		// set time to 23:59:59
		const todayStr = `${new Date().getFullYear()}/${new Date().getMonth() + 1}/${new Date().getDate()} 23:59:59`;
		const today = Date.parse(todayStr);

		const tmp = new Date(Number.parseInt(dateVal));
		// set time to 00:00:00
		const dateStr = `${tmp.getFullYear()}/${tmp.getMonth() + 1}/${tmp.getDate()} 00:00:00`;
		const date = Date.parse(dateStr);

		console.log(
			`${format(date, "yyyy-MM-dd HH:mm:ss")}至${format(today, "yyyy-MM-dd HH:mm:ss")}`,
		);

		const result = (await sqlClient.storeOrder.findMany({
			where: {
				storeId: storeId,
				updatedAt: {
					gte: new Date(date),
					lte: new Date(today),
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
