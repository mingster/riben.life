"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/providers/i18n-provider";
import {
	type PeriodRangeWithDates,
	RsvpPeriodSelector,
	useRsvpPeriodRanges,
} from "@/components/rsvp-period-selector";
import type { StoreOrder } from "@/types";
import { createCustomerOrderColumns } from "./customer-order-columns";
import { DisplayOrderStatus } from "@/components/display-order-status";
import { DisplayPaymentStatus } from "@/components/display-payment-status";
import Currency from "@/components/currency";
import { OrderStatus } from "@/types/enum";
import {
	epochToDate,
	getDateInTz,
	getOffsetHours,
} from "@/utils/datetime-utils";
import { format } from "date-fns";
import Link from "next/link";
import type { orderitemview } from "@prisma/client";

interface ClientMyOrdersProps {
	serverData: StoreOrder[];
	storeTimezone: string;
	storeId?: string;
}

export const ClientMyOrders: React.FC<ClientMyOrdersProps> = ({
	serverData,
	storeTimezone,
	storeId,
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [allData, setAllData] = useState<StoreOrder[]>(serverData);

	// Update allData when serverData prop changes
	useEffect(() => {
		setAllData(serverData);
	}, [serverData]);

	// Get default period ranges for initialization
	const defaultPeriodRanges = useRsvpPeriodRanges(storeTimezone);

	// Initialize period range with default "month" period epoch values
	// This ensures the component is valid immediately, and RsvpPeriodSelector will update it
	// with the correct values (from localStorage or user selection) via onPeriodRangeChange
	const initialPeriodRange = useMemo<PeriodRangeWithDates>(() => {
		const monthRange = defaultPeriodRanges.month;
		return {
			periodType: "month",
			startDate: null,
			endDate: null,
			startEpoch: monthRange.startEpoch,
			endEpoch: monthRange.endEpoch,
		};
	}, [defaultPeriodRanges]);

	const [periodRange, setPeriodRange] =
		useState<PeriodRangeWithDates>(initialPeriodRange);

	// Handle period range change from RsvpPeriodSelector
	const handlePeriodRangeChange = useCallback((range: PeriodRangeWithDates) => {
		setPeriodRange(range);
	}, []);

	// Filter data based on period range (using updatedAt field)
	const data = useMemo(() => {
		const { periodType, startEpoch, endEpoch } = periodRange;

		// Handle "all" period (no date filtering)
		if (periodType === "all") {
			return allData;
		}

		// Handle custom or predefined periods (require startEpoch and endEpoch)
		if (!startEpoch || !endEpoch) {
			return allData;
		}

		return allData.filter((order) => {
			const updatedAt = order.updatedAt;
			if (!updatedAt) return false;

			// updatedAt is Date or BigInt epoch milliseconds
			let updatedAtBigInt: bigint;
			if (updatedAt instanceof Date) {
				updatedAtBigInt = BigInt(updatedAt.getTime());
			} else if (typeof updatedAt === "bigint") {
				updatedAtBigInt = updatedAt;
			} else if (typeof updatedAt === "number") {
				updatedAtBigInt = BigInt(updatedAt);
			} else {
				return false;
			}

			return updatedAtBigInt >= startEpoch && updatedAtBigInt <= endEpoch;
		});
	}, [allData, periodRange]);

	const datetimeFormat = useMemo(() => t("datetime_format"), [t]);

	const columns = useMemo(
		() => createCustomerOrderColumns(t, { storeTimezone }),
		[t, storeTimezone],
	);

	return (
		<>
			<div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Heading
					title={t("my_orders") || "My Orders"}
					badge={data.length}
					description=""
				/>
			</div>
			<Separator />
			<div className="flex flex-col gap-3 sm:gap-4 py-3">
				<RsvpPeriodSelector
					storeTimezone={storeTimezone}
					storeId={storeId}
					onPeriodRangeChange={handlePeriodRangeChange}
					defaultPeriod="month"
					allowCustom={true}
				/>
			</div>
			<Separator />
			<div className="space-y-3 sm:space-y-4">
				{/* Mobile: Card view */}
				<div className="block sm:hidden space-y-3">
					{data.map((order) => {
						const items = order.OrderItemView || [];
						const itemNames = items
							.map((item: orderitemview) => item.name)
							.join(", ");
						const maxLength = 50;
						const displayItemNames =
							itemNames.length > maxLength
								? `${itemNames.substring(0, maxLength)}...`
								: itemNames;

						const updatedAt = order.updatedAt;
						const utcDate =
							epochToDate(
								typeof updatedAt === "number"
									? BigInt(updatedAt)
									: updatedAt instanceof Date
										? BigInt(updatedAt.getTime())
										: updatedAt,
							) ?? new Date();

						const storeDate = getDateInTz(
							utcDate,
							getOffsetHours(
								order.Store?.defaultTimezone ?? storeTimezone ?? "Asia/Taipei",
							),
						);

						let total = Number(order.orderTotal ?? 0);
						const isRefunded =
							order.orderStatus === Number(OrderStatus.Refunded);
						if (isRefunded) {
							total = -Number(order.orderTotal);
						}

						return (
							<div
								key={order.id}
								className="rounded-lg border bg-card p-3 sm:p-4 space-y-2 text-xs"
							>
								<div className="flex items-start justify-between gap-2">
									<div className="flex-1 min-w-0">
										<div className="font-medium text-sm sm:text-base truncate font-mono">
											{order.orderNum || "-"}
										</div>
										<span className="font-mono text-xs sm:text-sm">
											{format(storeDate, `${datetimeFormat} HH:mm`)}
										</span>
									</div>
									<div className="shrink-0 flex flex-col gap-1.5 items-end">
										<DisplayOrderStatus
											status={order.orderStatus}
											className="text-xs"
										/>
										<DisplayPaymentStatus
											paymentStatus={order.paymentStatus}
											orderStatus={order.orderStatus}
											orderId={order.id}
											className="text-xs"
										/>
									</div>
								</div>

								<div className="flex items-center justify-between pt-2 border-t">
									<div className="space-y-1 flex-1 min-w-0">
										<div className="text-muted-foreground">{t("items")}</div>
										<div className="text-xs truncate" title={itemNames}>
											{items.length > 1 && (
												<span className="text-muted-foreground mr-1">
													{items.length}x{" "}
												</span>
											)}
											{displayItemNames || "-"}
										</div>
									</div>

									<div className="space-y-1 text-right shrink-0">
										<div className="text-muted-foreground">
											{t("order_total")}
										</div>
										<div className="font-semibold text-base">
											<Currency value={total} />
										</div>
									</div>
								</div>

								{order.PaymentMethod?.name &&
									order.PaymentMethod.name !== "TBD" && (
										<div className="text-muted-foreground pt-2 border-t">
											<span className="font-medium">
												{t("payment_method_name")}:
											</span>{" "}
											{order.PaymentMethod.name}
										</div>
									)}

								<div className="pt-2 border-t">
									<Button
										variant="outline"
										size="sm"
										asChild
										className="w-full h-10"
									>
										<Link href={`/order/${order.id}`}>
											{t("view") || "View"}
										</Link>
									</Button>
								</div>
							</div>
						);
					})}
				</div>

				{/* Desktop: Table view */}
				<div className="hidden sm:block">
					<DataTable<StoreOrder, unknown>
						columns={columns}
						data={data}
						searchKey="orderNum"
					/>
				</div>
			</div>
		</>
	);
};
