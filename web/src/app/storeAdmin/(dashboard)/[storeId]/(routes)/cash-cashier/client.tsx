"use client";

import type { orderitemview } from "@prisma/client";
import Link from "next/link";
import { useCallback, useState } from "react";
import { ClipLoader } from "react-spinners";
import useSWR from "swr";
import { useTranslation } from "@/app/i18n/client";
import Currency from "@/components/currency";
import { DisplayOrderStatus } from "@/components/display-order-status";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useIsHydrated } from "@/hooks/use-hydrated";
import { useI18n } from "@/providers/i18n-provider";
import type { Store, StoreOrder } from "@/types";
import {
	epochToDate,
	formatDateTime,
	getUtcNow,
	isDateValue,
} from "@/utils/datetime-utils";

export interface CashCashierClientProps {
	store: Store;
}

export function CashCashierClient({ store }: CashCashierClientProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const isHydrated = useIsHydrated();
	const [confirmingId, setConfirmingId] = useState<string | null>(null);

	const url =
		store.id && isHydrated
			? `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${store.id}/orders/get-unpaid-orders`
			: null;

	const fetcher = (u: RequestInfo) => fetch(u).then((res) => res.json());

	const {
		data: unpaidOrders,
		error,
		isLoading,
		mutate,
	} = useSWR<StoreOrder[]>(url, fetcher, {
		refreshInterval: 10_000,
		revalidateOnFocus: true,
		revalidateOnReconnect: true,
	});

	const handleConfirmCash = useCallback(
		async (orderId: string) => {
			setConfirmingId(orderId);
			try {
				const res = await fetch(
					`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${store.id}/orders/cash-mark-as-paid/${orderId}`,
					{ method: "POST" },
				);
				const json = (await res.json()) as {
					success?: boolean;
					message?: string;
				};

				if (!res.ok || json.success === false) {
					toastError({
						title: t("error_title"),
						description: json.message ?? t("err_toaster"),
					});
					return;
				}

				toastSuccess({
					description: t("order") + (t("updated") ?? ""),
				});
				await mutate();
			} catch (err: unknown) {
				toastError({
					title: t("error_title"),
					description:
						err instanceof Error ? err.message : String(err ?? "Error"),
				});
			} finally {
				setConfirmingId(null);
			}
		},
		[mutate, store.id, t],
	);

	if (!isHydrated) {
		return (
			<section className="relative w-full">
				<div className="flex flex-col gap-1">
					<div className="h-64 w-full animate-pulse rounded-md bg-muted" />
				</div>
			</section>
		);
	}

	if (isLoading) {
		return (
			<section className="flex min-h-[200px] items-center justify-center">
				<ClipLoader color="var(--primary)" />
			</section>
		);
	}

	if (error || !unpaidOrders) {
		return <p className="text-destructive text-sm">{t("err_toaster")}</p>;
	}

	const list = unpaidOrders.filter((o) => !o.isPaid);
	const date = getUtcNow();

	return (
		<section
			className="relative w-full space-y-4"
			aria-busy={confirmingId !== null}
		>
			<Card>
				<Heading
					title={t("cash_cashier")}
					description={t("order_unpaid_descr")}
					badge={list.length}
					className="px-4 pt-4"
				/>
				<CardContent className="px-0 pb-4">
					{list.length === 0 ? (
						<p className="text-muted-foreground px-4 text-sm">
							{t("no_results_found")}
						</p>
					) : (
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>{t("order_number_label")}</TableHead>
										<TableHead className="min-w-[180px]">
											{t("order_items")}
										</TableHead>
										<TableHead className="hidden lg:table-cell">
											{t("ordered_at")}
										</TableHead>
										<TableHead>{t("order_status")}</TableHead>
										<TableHead className="text-right">
											{t("order_total")}
										</TableHead>
										<TableHead className="w-[120px] text-center">
											{t("order_cashier_confirm")}
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{list.map((order) => (
										<TableRow key={order.id}>
											<TableCell className="font-semibold">
												<Link
													href={`/storeAdmin/${store.id}/order/${order.id}`}
													className="text-primary underline-offset-4 hover:underline"
												>
													{order.orderNum}
												</Link>
											</TableCell>
											<TableCell className="text-nowrap text-sm">
												{order.OrderItemView?.map((item: orderitemview) => (
													<div key={item.id}>
														{`${item.name} × ${item.quantity}`}
													</div>
												))}
											</TableCell>
											<TableCell className="hidden text-sm lg:table-cell">
												{formatDateTime(
													typeof order.createdAt === "number"
														? (epochToDate(BigInt(order.createdAt)) ??
																new Date())
														: isDateValue(order.createdAt)
															? order.createdAt
															: new Date(),
												)}
											</TableCell>
											<TableCell>
												<DisplayOrderStatus status={order.orderStatus} />
											</TableCell>
											<TableCell className="text-right">
												<Currency
													value={Number(order.orderTotal)}
													currency={order.currency ?? store.defaultCurrency}
													lng={lng}
												/>
											</TableCell>
											<TableCell className="text-center">
												<Button
													type="button"
													size="sm"
													variant="default"
													disabled={confirmingId !== null}
													className="touch-manipulation"
													onClick={() => handleConfirmCash(order.id)}
												>
													{confirmingId === order.id ? (
														<ClipLoader size={18} color="currentColor" />
													) : (
														t("order_cashier_confirm")
													)}
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>
			<div className="text-muted-foreground text-xs">
				{formatDateTime(date)}
			</div>
		</section>
	);
}
