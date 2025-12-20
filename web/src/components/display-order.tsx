"use client";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

import { OrderStatus, PaymentStatus } from "@/types/enum";
import { useRouter } from "next/navigation";

import type { StoreOrder } from "@/types";
import { formatDateTime } from "@/utils/datetime-utils";
import type { orderitemview } from "@prisma/client";
import Currency from "./currency";
import { DisplayOrderStatus } from "./display-order-status";
import Link from "next/link";

type orderProps = { order: StoreOrder };

// show order success prompt and then redirect the customer to view order page (購物明細)
export const DisplayOrder: React.FC<orderProps> = ({ order }) => {
	//console.log("DisplayOrder", JSON.stringify(order));
	//logger.info(order);

	const router = useRouter();

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	if (!order) {
		return "no order";
	}

	if (!order.OrderItemView) {
		return <></>;
	}

	//console.log('order', JSON.stringify(order));
	//console.log("status", order.orderStatus);

	const buyAgain = async (orderId: string) => {
		alert(`buy again${orderId}`);
	};

	const pay = async (orderId: string, payUrl?: string) => {
		let purl = payUrl;

		// if no pay url, use stripe as default
		if (!purl) purl = "stripe";

		const url = `/checkout/${orderId}/${purl}/`;
		//console.log(url);
		router.push(url);
	};

	const contactSeller = (storeId: string, orderId: string) => {
		router.push(`/s/${storeId}/support/new?orderid=${orderId}`);
	};

	const canPay =
		!order.isPaid &&
		order.PaymentMethod?.name !== "cash" &&
		(order.orderStatus === OrderStatus.Pending ||
			order.orderStatus === OrderStatus.Processing);

	return (
		<Card key={order.id} className="overflow-hidden">
			<CardContent className="p-3 sm:p-4">
				{/* Header section with store name and order info */}
				<div className="space-y-2 sm:space-y-1 mb-3">
					<div className="flex items-start justify-between gap-2">
						<div className="font-semibold text-sm sm:text-base truncate">
							<Link
								href={`/s/${order.Store.id}`}
								className="hover:underline text-primary"
							>
								{order.Store.name}
							</Link>
						</div>
						<div className="text-[10px] sm:text-xs text-muted-foreground font-mono shrink-0">
							{formatDateTime(order.createdAt)}
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-xs font-mono text-muted-foreground">
						{order.pickupCode && (
							<div className="flex items-center gap-1">
								<span className="font-medium">{t("order_pickup_code")}:</span>
								<span className="font-semibold text-foreground">
									{order.pickupCode}
								</span>
							</div>
						)}
						<div className="flex items-center gap-1">
							<span className="font-medium">{t("order_number")}:</span>
							<span className="font-semibold text-foreground">
								{order.orderNum}
							</span>
						</div>
						<div className="flex items-center gap-1">
							<span>({order.OrderItemView.length})</span>
						</div>
					</div>
				</div>

				{/* Order items */}
				<div className="space-y-2 border-t pt-3">
					{order.OrderItemView.map((item: orderitemview) => (
						<DisplayOrderItem key={item.id} currentItem={item} />
					))}
				</div>

				{/* Total */}
				<div className="flex items-center justify-between mt-3 pt-3 border-t">
					<span className="font-semibold text-sm sm:text-base">
						{t("orderTotal_label")}
					</span>
					<span className="font-bold text-base sm:text-lg">
						${Number(order.orderTotal)} {order.currency}
					</span>
				</div>
			</CardContent>

			<CardFooter className="flex-col gap-2 p-3 sm:p-4 pt-0 sm:pt-0 bg-muted/30">
				{/* Action buttons */}
				<div className="flex flex-col sm:flex-row gap-2 w-full">
					{canPay && (
						<Button
							className="w-full sm:w-auto h-10 sm:h-9 bg-green-600 hover:bg-green-700"
							size="sm"
							onClick={() => pay(order.id, order.PaymentMethod?.payUrl)}
						>
							{order.PaymentMethod?.name} {t("order_tab_pay")}
						</Button>
					)}

					{!order.isPaid && order.PaymentMethod?.name === "cash" && (
						<Button
							variant="outline"
							className="w-full sm:w-auto h-10 sm:h-9 cursor-default bg-green-50 hover:bg-green-100 dark:bg-green-950/20"
							size="sm"
							disabled
						>
							現金{t(`PaymentStatus_${PaymentStatus[order.paymentStatus]}`)}
						</Button>
					)}

					<div className="flex-1 w-full sm:w-auto">
						<DisplayOrderStatus
							status={order.orderStatus}
							displayBuyAgain={true}
							onCompletedStatus={() => buyAgain(order.id)}
						/>
					</div>

					<Button
						variant="outline"
						size="sm"
						className="w-full sm:w-auto h-10 sm:h-9"
						onClick={() => contactSeller(order.storeId, order.id)}
					>
						{t("order_tab_contact_seller")}
					</Button>
				</div>
			</CardFooter>
		</Card>
	);
};

type itemViewOrops = {
	currentItem: orderitemview;
};

export const DisplayOrderItem: React.FC<itemViewOrops> = ({ currentItem }) => {
	return (
		<div className="flex items-start justify-between gap-2 text-xs sm:text-sm">
			<div className="flex-1 min-w-0">
				<div className="font-medium truncate">{currentItem.name}</div>

				{currentItem.variants && currentItem.variants.length > 0 && (
					<div className="mt-1 space-y-0.5 text-[10px] sm:text-xs text-muted-foreground">
						{currentItem.variants.split(",").map((itemOption) => (
							<div key={itemOption} className="truncate">
								• {itemOption}
							</div>
						))}
					</div>
				)}
			</div>

			<div className="flex items-center gap-2 sm:gap-3 shrink-0 text-xs sm:text-sm">
				<div className="font-medium">×{currentItem.quantity ?? 0}</div>
				<div className="font-semibold min-w-[60px] text-right">
					<Currency value={Number(currentItem.unitPrice)} />
				</div>
			</div>
		</div>
	);
};
