import { sqlClient } from "@/lib/prismadb";
import type { Store, StoreOrder } from "@/types";
import { OrderStatus, PaymentStatus } from "@/types/enum";
import { getNowTimeInTz, getUtcNow } from "@/utils/datetime-utils";
import getOrderById from "../get-order-by_id";
import isProLevel from "./is-pro-level";

import { use } from "react";
import getStoreById from "../get-store-by_id";

const MarkAsPaid = async (
	orderId: string,
	checkoutAttributes: string,
): Promise<StoreOrder> => {
	if (!orderId) {
		throw Error("orderId is required");
	}

	const order = (await getOrderById(orderId)) as StoreOrder;
	const store = (await getStoreById(order.storeId)) as Store;

	if (store === null) throw Error("store is null");
	if (order === null) throw Error("order is null");
	if (order.PaymentMethod === null) throw Error("PaymentMethod is null");
	const ispro = await isProLevel(order.storeId);
	let usePlatform = false; //是否代收款

	if (!ispro) {
		usePlatform = true; //for free level, always use platform
	} else {
		if (store.LINE_PAY_ID !== null || store.STRIPE_SECRET_KEY !== null) {
			//store has its own linePay or stripe
			usePlatform = true;
		}
	}

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

	let fee = 0;
	let feeTax = 0;

	// if store does not have its own linePay or stripe, calc balance and fee
	if (usePlatform) {
		// fee rate is determined by payment method
		fee = -Number(
			Number(order.orderTotal) * Number(order.PaymentMethod?.fee) +
				Number(order.PaymentMethod?.feeAdditional),
		);

		feeTax = Number(fee * 0.05);
	}

	// fee charge by riben.life
	let platform_fee = 0;
	if (!ispro) {
		//always charge platform fee for free store
		platform_fee = ispro ? 0 : -Number(Number(order.orderTotal) * 0.01);
	}

	// mark order as paid
	await sqlClient.storeOrder.update({
		where: {
			id: orderId as string,
		},
		data: {
			isPaid: true,
			paidDate: getNowTimeInTz(store.defaultTimezone),
			orderStatus: Number(OrderStatus.Processing),
			paymentStatus: Number(PaymentStatus.Paid),
			paymentCost: fee + feeTax + platform_fee,
			checkoutAttributes: checkoutAttributes || "",
			updatedAt: getNowTimeInTz(store.defaultTimezone),
		},
	});

	// avilablity date = order date + payment methods' clear days
	const avaiablityDate = new Date(
		order.updatedAt.getTime() +
			order.PaymentMethod?.clearDays * 24 * 60 * 60 * 1000,
	);

	// create store ledger entry
	await sqlClient.storeLedger.create({
		data: {
			orderId: order.id as string,
			storeId: order.storeId as string,
			amount: order.orderTotal,
			fee: fee + feeTax,
			platformFee: platform_fee,
			currency: order.currency,
			type: usePlatform ? 0 : 1, // 0: 代收 | 1: store's own payment provider
			description: `order # ${order.orderNum}`,
			note: `${order.PaymentMethod.name}, order id: ${order.id}`,
			availablity: avaiablityDate,
			balance:
				balance +
				Math.round(Number(order.orderTotal) + (fee + feeTax) + platform_fee),
		},
	});

	return (await getOrderById(orderId)) as StoreOrder;
};

export default MarkAsPaid;
