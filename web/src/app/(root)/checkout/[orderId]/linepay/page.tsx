import type { orderitemview } from "@prisma/client";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import getOrderById from "@/actions/get-order-by_id";
import getStoreById from "@/actions/get-store-by_id";
import { Loader } from "@/components/loader";
import { SuccessAndRedirect } from "@/components/success-and-redirect";
import Container from "@/components/ui/container";
import {
	type Currency,
	getLinePayClientByStore,
	type RequestPackage,
	type RequestRequestBody,
	type RequestRequestConfig,
} from "@/lib/payment/linePay";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { getPostPaymentSignInProps } from "@/lib/rsvp/get-post-payment-signin-props";
import type { Store, StoreOrder } from "@/types";
import { isMobileUserAgent } from "@/utils/utils";

const PaymentPage = async (props: {
	params: Promise<{ orderId: string }>;
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
	const params = await props.params;
	const searchParams = await props.searchParams;
	if (!params.orderId) {
		throw new Error("order Id is missing");
	}
	const headerList = await headers();
	const host = headerList.get("host");
	const isMobile = isMobileUserAgent(headerList.get("user-agent"));

	const returnUrl =
		typeof searchParams.returnUrl === "string"
			? searchParams.returnUrl
			: undefined;

	logger.info("LINE Pay payment page accessed", {
		metadata: {
			orderId: params.orderId,
			returnUrl: returnUrl || null,
		},
		tags: ["payment", "linepay", "access"],
	});

	const order = (await getOrderById(params.orderId)) as StoreOrder | null;

	if (!order) {
		logger.warn("Order not found for LINE Pay payment", {
			metadata: {
				orderId: params.orderId,
			},
			tags: ["payment", "linepay", "error", "not-found"],
		});
		notFound();
	}

	if (order.isPaid === true) {
		const { rsvp } = await getPostPaymentSignInProps(order.id);
		return (
			<Suspense fallback={<Loader />}>
				<Container>
					<SuccessAndRedirect
						order={order}
						returnUrl={returnUrl}
						rsvp={rsvp}
					/>
				</Container>
			</Suspense>
		);
	}

	const store = (await getStoreById(order.storeId)) as Store | null;

	if (!store) {
		logger.error("Store not found for LINE Pay payment", {
			metadata: {
				orderId: order.id,
				storeId: order.storeId,
			},
			tags: ["payment", "linepay", "error", "not-found"],
		});
		notFound();
	}

	const linePayClient = await getLinePayClientByStore(order.storeId, store);

	if (!linePayClient) {
		logger.error("LINE Pay client not found for store", {
			metadata: {
				orderId: order.id,
				storeId: order.storeId,
			},
			tags: ["payment", "linepay", "error", "configuration"],
		});
		throw new Error("LINE Pay is not configured for this store");
	}

	const env =
		process.env.NODE_ENV === "development" ? "development" : "production";

	let protocol = "http:";
	if (env === "production") {
		protocol = "https:";
	}

	const confirmUrlBase = `${protocol}//${host}/checkout/${order.id}/linepay/confirmed`;
	const cancelUrlBase = `${protocol}//${host}/checkout/${order.id}/linepay/canceled`;
	const confirmUrl = returnUrl
		? `${confirmUrlBase}?returnUrl=${encodeURIComponent(returnUrl)}`
		: confirmUrlBase;
	const cancelUrl = returnUrl
		? `${cancelUrlBase}?returnUrl=${encodeURIComponent(returnUrl)}`
		: cancelUrlBase;

	const orderTotal = Number(order.orderTotal);
	if (Number.isNaN(orderTotal) || orderTotal <= 0) {
		logger.error("Invalid order total for LINE Pay", {
			metadata: {
				orderId: order.id,
				orderTotal: order.orderTotal,
				convertedTotal: orderTotal,
			},
			tags: ["payment", "linepay", "error", "validation"],
		});
		throw new Error("Invalid order total");
	}

	const currency = (order.currency?.toUpperCase() || "TWD") as Currency;
	const validCurrencies: Currency[] = ["USD", "JPY", "TWD", "THB"];
	if (!validCurrencies.includes(currency)) {
		logger.error("Invalid currency for LINE Pay", {
			metadata: {
				orderId: order.id,
				currency: order.currency,
				convertedCurrency: currency,
			},
			tags: ["payment", "linepay", "error", "validation"],
		});
		throw new Error(
			`Invalid currency: ${currency}. LINE Pay supports: USD, JPY, TWD, THB`,
		);
	}

	const packages = order.OrderItemView.filter((item: orderitemview) => {
		const unitPrice = Number(item.unitPrice);
		return !Number.isNaN(unitPrice) && unitPrice > 0;
	}).map((item: orderitemview) => {
		const unitPrice = Number(item.unitPrice);
		const quantity = item.quantity;
		const amount = unitPrice * quantity;

		if (Number.isNaN(unitPrice) || unitPrice <= 0) {
			logger.error("Invalid unit price in order item (after filtering)", {
				metadata: {
					orderId: order.id,
					itemId: item.id,
					unitPrice: item.unitPrice,
					convertedUnitPrice: unitPrice,
				},
				tags: ["payment", "linepay", "error", "validation"],
			});
			throw new Error(`Invalid unit price for item ${item.id}`);
		}

		if (Number.isNaN(amount) || amount <= 0) {
			logger.error("Invalid package amount", {
				metadata: {
					orderId: order.id,
					itemId: item.id,
					unitPrice,
					quantity,
					amount,
				},
				tags: ["payment", "linepay", "error", "validation"],
			});
			throw new Error(`Invalid package amount for item ${item.id}`);
		}

		return {
			id: item.id,
			amount: Math.round(amount * 100) / 100,
			products: [
				{
					name: item.name || "Product",
					quantity: quantity,
					price: Math.round(unitPrice * 100) / 100,
				},
			],
		};
	});

	if (packages.length === 0) {
		logger.error("No packages in order for LINE Pay", {
			metadata: {
				orderId: order.id,
			},
			tags: ["payment", "linepay", "error", "validation"],
		});
		throw new Error("Order must have at least one item");
	}

	const packagesTotal = packages.reduce(
		(sum: number, pkg: RequestPackage) => sum + pkg.amount,
		0,
	);
	const roundedOrderTotal = Math.round(orderTotal * 100) / 100;
	const roundedPackagesTotal = Math.round(packagesTotal * 100) / 100;

	if (Math.abs(roundedOrderTotal - roundedPackagesTotal) > 0.01) {
		logger.warn("Order total mismatch with packages total", {
			metadata: {
				orderId: order.id,
				orderTotal: roundedOrderTotal,
				packagesTotal: roundedPackagesTotal,
				difference: Math.abs(roundedOrderTotal - roundedPackagesTotal),
			},
			tags: ["payment", "linepay", "warning", "validation"],
		});
	}

	const requestBody: RequestRequestBody = {
		amount: roundedOrderTotal,
		currency: currency,
		orderId: order.id,
		packages: packages,
		redirectUrls: {
			confirmUrl: confirmUrl,
			cancelUrl: cancelUrl,
		},
	};

	logger.info("LINE Pay request body prepared", {
		metadata: {
			orderId: order.id,
			amount: requestBody.amount,
			currency: requestBody.currency,
			packageCount: requestBody.packages.length,
			packagesTotal: roundedPackagesTotal,
		},
		tags: ["payment", "linepay", "request"],
	});

	const requestConfig: RequestRequestConfig = {
		body: requestBody,
	};

	const res = await linePayClient.request.send(requestConfig);

	if (res.body.returnCode === "0000") {
		const weburl = res.body.info.paymentUrl.web;
		const appurl = res.body.info.paymentUrl.app;
		const transactionId = res.body.info.transactionId;
		const paymentAccessToken = res.body.info.paymentAccessToken;

		await sqlClient.storeOrder.update({
			where: {
				id: order.id,
			},
			data: {
				checkoutAttributes: transactionId,
				checkoutRef: paymentAccessToken,
			},
		});

		logger.info("LINE Pay payment request created", {
			metadata: {
				orderId: order.id,
				transactionId,
				amount: Number(order.orderTotal),
				currency: order.currency,
			},
			tags: ["payment", "linepay", "success"],
		});

		if (isMobile) {
			redirect(appurl);
		} else {
			redirect(weburl);
		}
	}

	logger.error("LINE Pay payment request failed", {
		metadata: {
			orderId: order.id,
			returnCode: res.body.returnCode,
			returnMessage: res.body.returnMessage,
		},
		tags: ["payment", "linepay", "error"],
	});
	throw new Error(res.body.returnMessage || "LINE Pay payment request failed");
};

export default PaymentPage;
