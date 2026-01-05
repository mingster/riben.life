// display given fiat ledger in a table

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import type { CustomerFiatLedger } from "@/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useMemo } from "react";
import Link from "next/link";

export const DisplayFiatLedger = ({
	ledger,
	currency = "TWD",
}: {
	ledger: CustomerFiatLedger[];
	currency?: string;
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const datetimeFormat = useMemo(() => t("datetime_format"), [t]);

	if (!ledger || ledger.length === 0) {
		return (
			<div className="text-center py-8 text-muted-foreground">
				<span className="text-2xl font-mono">{t("no_result")}</span>
			</div>
		);
	}

	return (
		<div className="space-y-3 sm:space-y-4">
			{/* Mobile: Card view */}
			<div className="block sm:hidden space-y-3">
				{ledger.map((item) => (
					<div
						key={item.id}
						className="rounded-lg border bg-card p-3 sm:p-4 space-y-2 "
					>
						<div className="flex items-start justify-between gap-2">
							<div className="flex-1 min-w-0">
								<div className="font-medium text-sm sm:text-base truncate">
									{item.Store?.id ? (
										<Link
											href={`/s/${item.Store.id}`}
											className="hover:underline text-primary"
										>
											{item.Store.name}
										</Link>
									) : (
										<span className="text-muted-foreground">
											{item.Store?.name || "-"}
										</span>
									)}
								</div>
								<div className="text-muted-foreground text-[10px]">
									{format(item.createdAt, datetimeFormat)}
								</div>
							</div>
							<div className="shrink-0">
								<span
									className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-medium ${
										item.type === "TOPUP"
											? "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400"
											: item.type === "PAYMENT"
												? "bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400"
												: item.type === "REFUND"
													? "bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400"
													: item.type === "ADJUSTMENT"
														? "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400"
														: "bg-gray-50 text-gray-700 dark:bg-gray-950/20 dark:text-gray-400"
									}`}
								>
									{t(`customer_fiat_type_${item.type}`) || item.type}
								</span>
							</div>
						</div>

						<div className="flex items-center justify-between pt-2 border-t">
							<div className="space-y-1">
								<div className="text-[10px] text-muted-foreground">
									{t("customer_fiat_amount") || "Amount"}
								</div>
								<div
									className={cn(
										"font-bold text-base font-mono",
										Number(item.amount) >= 0
											? "text-green-600 dark:text-green-400"
											: "text-red-600 dark:text-red-400",
									)}
								>
									{Number(item.amount) > 0 ? "+" : ""}
									{Number(item.amount).toFixed(2)} {currency}
								</div>
							</div>

							<div className="space-y-1 text-right">
								<div className="text-[10px] text-muted-foreground">
									{t("balance")}
								</div>
								<div className="font-semibold text-base font-mono">
									{Number(item.balance).toFixed(2)} {currency}
								</div>
							</div>
						</div>

						{item.note && (
							<div className="text-[10px] pt-2 border-t">
								<span className="font-medium text-muted-foreground">
									{t("note")}:
								</span>{" "}
								<span className="text-foreground">{item.note}</span>
							</div>
						)}

						{item.Creator?.name && (
							<div className="text-[10px] text-muted-foreground">
								<span className="font-medium">
									{t("customer_fiat_creator") || "Creator"}:
								</span>{" "}
								{item.Creator.name}
							</div>
						)}
					</div>
				))}
			</div>

			{/* Desktop: Table view */}
			<div className="hidden sm:block rounded-md border overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full border-collapse min-w-full">
						<thead>
							<tr className="bg-muted/50">
								<th className="text-left px-3 py-2 ">{t("created_at")}</th>
								<th className="text-left px-3 py-2 ">{t("store_name")}</th>
								<th className="text-left px-3 py-2 ">
									{t("customer_fiat_type") || "Type"}
								</th>
								<th className="text-right px-3 py-2 ">
									{t("customer_fiat_amount") || "Amount"}
								</th>
								<th className="text-right px-3 py-2 ">{t("balance")}</th>
								<th className="text-left px-3 py-2 ">{t("note")}</th>
								<th className="text-left px-3 py-2 ">
									{t("customer_fiat_creator") || "Creator"}
								</th>
							</tr>
						</thead>
						<tbody>
							{ledger.map((item) => (
								<tr key={item.id} className="border-b last:border-b-0">
									<td className="px-3 py-2 font-mono">
										{format(item.createdAt, datetimeFormat)}
									</td>
									<td className="px-3 py-2 ">
										{item.Store?.id ? (
											<Link
												href={`/s/${item.Store.id}`}
												className="hover:underline text-primary"
											>
												{item.Store.name}
											</Link>
										) : (
											<span className="text-muted-foreground">
												{item.Store?.name || "-"}
											</span>
										)}
									</td>
									<td className="px-3 py-2 ">
										<span
											className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-medium ${
												item.type === "TOPUP"
													? "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400"
													: item.type === "PAYMENT"
														? "bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400"
														: item.type === "REFUND"
															? "bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400"
															: item.type === "ADJUSTMENT"
																? "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400"
																: "bg-gray-50 text-gray-700 dark:bg-gray-950/20 dark:text-gray-400"
											}`}
										>
											{t(`customer_fiat_type_${item.type}`) || item.type}
										</span>
									</td>
									<td
										className={cn(
											"px-3 py-2 font-semibold font-mono text-right",
											Number(item.amount) >= 0
												? "text-green-600 dark:text-green-400"
												: "text-red-600 dark:text-red-400",
										)}
									>
										{Number(item.amount) > 0 ? "+" : ""}
										{Number(item.amount).toFixed(2)} {currency}
									</td>
									<td className="px-3 py-2 font-semibold font-mono text-right">
										{Number(item.balance).toFixed(2)} {currency}
									</td>
									<td className="px-3 py-2 max-w-[200px] truncate">
										{item.note || "-"}
									</td>
									<td className="px-3 py-2 ">{item.Creator?.name || "-"}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
};
