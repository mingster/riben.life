import { markOrderAsPaidAction } from "@/actions/storeAdmin/order/mark-order-as-paid";
import logger from "@/lib/logger";
import { NextResponse } from "next/server";

/**
 * Store Admin API route to mark cash/in-person orders as paid.
 * Allows store admins to manually confirm cash payments.
 *
 * POST /api/storeAdmin/[storeId]/orders/cash-mark-as-paid/[orderId]
 *
 * Access: Requires store admin access (validated by markOrderAsPaidAction)
 */
export async function POST(
	_req: Request,
	props: { params: Promise<{ storeId: string; orderId: string }> },
) {
	const params = await props.params;

	if (!params.orderId) {
		return NextResponse.json(
			{ success: false, message: "Order ID is required" },
			{ status: 400 },
		);
	}

	if (!params.storeId) {
		return NextResponse.json(
			{ success: false, message: "Store ID is required" },
			{ status: 400 },
		);
	}

	try {
		// Mark order as paid using the safe-action
		// storeActionClient validates store admin access automatically
		const result = await markOrderAsPaidAction(
			params.storeId, // Bound argument: storeId
			{
				orderId: params.orderId,
				checkoutAttributes: JSON.stringify({ paymentMethod: "cash" }),
			},
		);

		if (result?.serverError) {
			logger.error("Failed to mark order as paid", {
				metadata: {
					storeId: params.storeId,
					orderId: params.orderId,
					error: result.serverError,
				},
				tags: ["payment", "cash", "error", "api"],
			});

			return NextResponse.json(
				{ success: false, message: result.serverError },
				{ status: 400 },
			);
		}

		if (result?.data) {
			logger.info("Order marked as paid (cash)", {
				metadata: {
					storeId: params.storeId,
					orderId: params.orderId,
				},
				tags: ["payment", "cash", "success", "api"],
			});

			return NextResponse.json(
				{ success: true, order: result.data.order },
				{ status: 200 },
			);
		}

		return NextResponse.json(
			{ success: false, message: "Unknown error occurred" },
			{ status: 500 },
		);
	} catch (error) {
		logger.error("Cash order mark as paid error", {
			metadata: {
				storeId: params.storeId,
				orderId: params.orderId,
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			},
			tags: ["payment", "cash", "error", "api"],
		});

		return NextResponse.json(
			{
				success: false,
				message:
					error instanceof Error
						? error.message
						: "Failed to mark order as paid",
			},
			{ status: 500 },
		);
	}
}
