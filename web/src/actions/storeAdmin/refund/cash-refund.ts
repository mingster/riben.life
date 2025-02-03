import getOrderById from "@/actions/get-order-by_id";
import getStoreById from "@/actions/get-store-by_id";
import { sqlClient } from "@/lib/prismadb";
import type { Store, StoreOrder } from "@/types";
import { OrderStatus, PaymentStatus } from "@/types/enum";
import isProLevel from "../is-pro-level";

const CashRefund = async (
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

	// cash refund

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

	// avilablity date = order date + payment methods' clear days
	const avaiablityDate = new Date(
		order.updatedAt.getTime() +
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
			availablity: avaiablityDate,
			balance:
				balance -
				Math.round(Number(refundAmount) + (fee + feeTax) + platform_fee),
		},
	});

	return true;
};

export default CashRefund;
