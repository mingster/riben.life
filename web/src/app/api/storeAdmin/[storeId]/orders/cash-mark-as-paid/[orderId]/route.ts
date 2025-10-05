import MarkAsPaid from "@/actions/storeAdmin/mark-order-as-paid";
import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import logger from "@/lib/logger";
import { NextResponse } from "next/server";

///!SECTION mark order as paid
export async function POST(
	_req: Request,
	props: { params: Promise<{ storeId: string; orderId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);

		if (!params.orderId) {
			return new NextResponse("orderId is required", { status: 403 });
		}

		// mark order as paid
		const checkoutAttributes = "cash";

		const updated_order = await MarkAsPaid(params.orderId, checkoutAttributes);
		logger.info({ order: updated_order }, { message: "order marked as paid" });

		return NextResponse.json("success", { status: 200 });
	} catch (error) {
		console.log("[CASH_ORDER_MARK_AS_PAID]", error);

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}
