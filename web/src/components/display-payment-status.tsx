"use client";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { PaymentStatus, OrderStatus } from "@/types/enum";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface DisplayPaymentStatusProps {
	paymentStatus: number;
	orderStatus?: number;
	orderId?: string;
	className?: string;
}

export const DisplayPaymentStatus: React.FC<DisplayPaymentStatusProps> = ({
	paymentStatus,
	orderStatus,
	orderId,
	className,
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	// Don't display payment status if order is voided
	if (orderStatus === Number(OrderStatus.Voided)) {
		return null;
	}

	let statusText: string;
	let statusClass: string;

	switch (paymentStatus) {
		case Number(PaymentStatus.Paid):
			statusText = t("payment_status_paid");
			statusClass =
				"bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300";
			break;
		case Number(PaymentStatus.Refunded):
			statusText = t("payment_status_refunded");
			statusClass =
				"bg-orange-50 text-orange-700 dark:bg-orange-900 dark:text-orange-300";
			break;
		case Number(PaymentStatus.PartiallyRefunded):
			statusText = t("payment_status_partially_refunded");
			statusClass =
				"bg-yellow-50 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
			break;
		case Number(PaymentStatus.Authorized):
			statusText = t("payment_status_authorized");
			statusClass =
				"bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
			break;
		case Number(PaymentStatus.SelfPickup):
			statusText = t("payment_status_self_pickup");
			statusClass =
				"bg-purple-50 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
			break;
		case Number(PaymentStatus.Voided):
			statusText = t("payment_status_voided");
			statusClass =
				"bg-gray-50 text-gray-700 dark:bg-gray-900 dark:text-gray-300";
			break;
		case Number(PaymentStatus.Pending):
			statusText = t("payment_status_pending");
			statusClass = "bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-300";
			break;
		default:
			statusText = t("payment_status_no_payment");
			statusClass = "bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-300";
			break;
	}

	// If pending payment and pending order, make it a clickable button
	const isPending =
		paymentStatus === Number(PaymentStatus.Pending) &&
		orderStatus === Number(OrderStatus.Pending) &&
		orderId;

	if (isPending) {
		return (
			<Button
				variant="outline"
				className={cn("px-2 py-0.5 h-auto", statusClass, className)}
				size="sm"
				asChild
			>
				<Link href={`/checkout/${orderId}`}>{statusText}</Link>
			</Button>
		);
	}

	// Otherwise, display as a badge
	return (
		<div
			className={cn(
				"px-2 py-0.5 h-auto text-xs rounded-md border border-input bg-background",
				statusClass,
				className,
			)}
		>
			{statusText}
		</div>
	);
};
