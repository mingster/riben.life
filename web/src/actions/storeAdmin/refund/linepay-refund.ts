import getOrderById from "@/actions/get-order-by_id";
import getStoreById from "@/actions/get-store-by_id";
import {
	type RefundRequestBody,
	type RefundRequestConfig,
	getLinePayClientByStore,
} from "@/lib/linePay";
import { sqlClient } from "@/lib/prismadb";
import type { Store, StoreOrder } from "@/types";
import { OrderStatus, PaymentStatus } from "@/types/enum";
import isProLevel from "../is-pro-level";
import {
	epochToDate,
	dateToEpoch,
	getUtcNowEpoch,
} from "@/utils/datetime-utils";

const LinePayRefund = async (
	orderId: string,
	refundAmount: number,
): Promise<boolean> => {
	if (!orderId) {
		throw Error("orderId is required");
	}

	const order = (await getOrderById(orderId)) as StoreOrder | null;
	if (!order) {
		throw new Error("order not found");
	}
	const store = (await getStoreById(order.storeId)) as Store;
	const ispro = await isProLevel(order.storeId);

	if (store === null) throw Error("store is null");
	if (order.PaymentMethod === null) throw Error("PaymentMethod is null");

	// line refund
	const requestBody: RefundRequestBody = {
		refundAmount: Number(order.orderTotal),
	};

	const requestConfig: RefundRequestConfig = {
		transactionId: order.checkoutAttributes,
		body: requestBody,
	};

	const linePayClient = await getLinePayClientByStore(store);
	const res = await linePayClient.refund.send(requestConfig);

	if (res.body.returnCode === "0000") {
		// refund success, update order status
		await sqlClient.storeOrder.update({
			where: {
				id: order.id,
			},
			data: {
				refundAmount: refundAmount,
				orderStatus: OrderStatus.Refunded,
				paymentStatus: PaymentStatus.Refunded,
			},
		});

		// create new entry in store ledger
		//
		const lastLedger = await sqlClient.storeLedger.findFirst({
			where: {
				storeId: order.storeId,
			},
			orderBy: {
				createdAt: "desc",
			},
			take: 1,
		});

		const balance = Number(lastLedger ? lastLedger.balance : 0);

		// fee rate is determined by payment method
		const fee = Number(refundAmount) * Number(order.PaymentMethod?.fee);
		const feeTax = Number(fee * 0.05);

		// fee charge by riben.life
		const platform_fee = ispro ? 0 : Number(Number(order.orderTotal) * 0.01);

		// availabilityDate = order date + payment methods' clear days
		const updatedAtDate =
			order.updatedAt instanceof Date
				? order.updatedAt
				: (epochToDate(
						typeof order.updatedAt === "number"
							? BigInt(order.updatedAt)
							: typeof order.updatedAt === "bigint"
								? order.updatedAt
								: BigInt(order.updatedAt),
					) ?? new Date());
		const availabilityDate = new Date(
			updatedAtDate.getTime() +
				order.PaymentMethod?.clearDays * 24 * 60 * 60 * 1000,
		);

		await sqlClient.storeLedger.create({
			data: {
				orderId: order.id as string,
				storeId: order.storeId as string,
				amount: refundAmount,
				fee: fee + feeTax,
				platformFee: platform_fee,
				currency: order.currency,
				description: `order # ${order.orderNum}`,
				note: `order id: ${order.id}`,
				availability: dateToEpoch(availabilityDate) ?? BigInt(0),
				balance:
					balance -
					Math.round(Number(refundAmount) + (fee + feeTax) + platform_fee),
				createdAt: getUtcNowEpoch(),
			},
		});

		return true;
	}

	return false;
};

export default LinePayRefund;
