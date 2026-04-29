import { markOrderAsPaidAction } from "@/actions/storeAdmin/order/mark-order-as-paid";
import logger from "@/lib/logger";
import { normalizePayUrl } from "@/lib/payment/normalize-pay-url";
import { NextResponse } from "next/server";
import { sqlClient } from "@/lib/prismadb";

/**
 * Store Admin API route to mark cash or ATM bank-transfer orders as paid.
 * If the order’s payment method is cash or ATM, that method is used; otherwise
 * the legacy cash payment method row is used (e.g. older orders).
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
		const order = await sqlClient.storeOrder.findFirst({
			where: {
				id: params.orderId,
				storeId: params.storeId,
			},
			include: {
				PaymentMethod: true,
			},
		});

		if (!order) {
			return NextResponse.json(
				{ success: false, message: "Order not found" },
				{ status: 404 },
			);
		}

		const orderPayUrl = order.PaymentMethod?.payUrl;
		const normalized =
			typeof orderPayUrl === "string" && orderPayUrl.length > 0
				? normalizePayUrl(orderPayUrl)
				: null;

		let paymentMethodId: string;
		let paymentMethodKey: string;

		if (normalized === "cash" || normalized === "atm") {
			if (!order.PaymentMethod) {
				return NextResponse.json(
					{ success: false, message: "Payment method not found" },
					{ status: 400 },
				);
			}
			paymentMethodId = order.PaymentMethod.id;
			paymentMethodKey = normalized;
		} else {
			const cashPaymentMethod = await sqlClient.paymentMethod.findFirst({
				where: {
					payUrl: "cash",
					isDeleted: false,
				},
			});

			if (!cashPaymentMethod) {
				return NextResponse.json(
					{ success: false, message: "Cash payment method not found" },
					{ status: 400 },
				);
			}

			paymentMethodId = cashPaymentMethod.id;
			paymentMethodKey = "cash";
		}

		// Mark order as paid using the safe-action
		// storeActionClient validates store admin access automatically
		const result = await markOrderAsPaidAction(
			params.storeId, // Bound argument: storeId
			{
				orderId: params.orderId,
				paymentMethodId,
				checkoutAttributes: JSON.stringify({
					paymentMethod: paymentMethodKey,
				}),
			},
		);

		if (result?.serverError) {
			logger.error("Failed to mark order as paid", {
				metadata: {
					storeId: params.storeId,
					orderId: params.orderId,
					error: result.serverError,
				},
				tags: ["payment", "cash", "atm", "error", "api"],
			});

			return NextResponse.json(
				{ success: false, message: result.serverError },
				{ status: 400 },
			);
		}

		if (result?.data) {
			logger.info("Order marked as paid (cash or ATM)", {
				metadata: {
					storeId: params.storeId,
					orderId: params.orderId,
				},
				tags: ["payment", "cash", "atm", "success", "api"],
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
			tags: ["payment", "cash", "atm", "error", "api"],
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
