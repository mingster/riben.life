// display given fiat ledger in a table

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import type { CustomerFiatLedger } from "@/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CustomerCreditLedgerType } from "@/types/enum";

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
								<div className="truncate">
									{item.Store?.id ? (
										<Link
											href={`/s/${item.Store.id}`}
											className="hover:underline text-primary text-xl"
										>
											{item.Store.name}
										</Link>
									) : (
										<span className="text-muted-foreground">
											{item.Store?.name || "-"}
										</span>
									)}
								</div>
								<div className="text-muted-foreground">
									{format(item.createdAt, datetimeFormat)}
								</div>
							</div>
							<div className="shrink-0">
								<Badge
									className={
										item.type === CustomerCreditLedgerType.Topup
											? "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 border-green-200 dark:border-green-950/40"
											: item.type === CustomerCreditLedgerType.Spend
												? "bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400 border-orange-200 dark:border-orange-950/40"
												: item.type === CustomerCreditLedgerType.Refund
													? "bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border-purple-200 dark:border-purple-950/40"
													: item.type === CustomerCreditLedgerType.Adjustment
														? "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border-blue-200 dark:border-blue-950/40"
														: item.type === CustomerCreditLedgerType.Hold
															? "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400 border-yellow-200 dark:border-yellow-950/40"
															: item.type === CustomerCreditLedgerType.Bonus
																? "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/20 dark:text-cyan-400 border-cyan-200 dark:border-cyan-950/40"
																: "bg-gray-50 text-gray-700 dark:bg-gray-950/20 dark:text-gray-400 border-gray-200 dark:border-gray-950/40"
									}
								>
									{t(`customer_fiat_type_${item.type}`) || item.type}
								</Badge>
							</div>
						</div>

						<div className="flex items-center justify-between pt-2 border-t">
							<div className="space-y-1">
								<div className="text-muted-foreground">
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
									{new Intl.NumberFormat("en-US", {
										style: "currency",
										currency: (currency || "TWD").toUpperCase(),
										maximumFractionDigits: 2,
										minimumFractionDigits: 0,
										signDisplay: "exceptZero",
									}).format(Number(item.amount))}
								</div>
							</div>

							<div className="space-y-1 text-right">
								<div className="text-muted-foreground">{t("balance")}</div>
								<div className="font-semibold text-base font-mono">
									{new Intl.NumberFormat("en-US", {
										style: "currency",
										currency: (currency || "TWD").toUpperCase(),
										maximumFractionDigits: 2,
										minimumFractionDigits: 0,
									}).format(Number(item.balance))}
								</div>
							</div>
						</div>

						{item.note && (
							<div className="pt-2 border-t">
								<span className="text-muted-foreground">{t("note")}:</span>{" "}
								<span className="text-foreground">{item.note}</span>
							</div>
						)}

						{item.Creator?.name && (
							<div className="text-muted-foreground">
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
										<Badge
											className={
												item.type === CustomerCreditLedgerType.Topup
													? "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 border-green-200 dark:border-green-950/40"
													: item.type === CustomerCreditLedgerType.Spend
														? "bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400 border-orange-200 dark:border-orange-950/40"
														: item.type === CustomerCreditLedgerType.Refund
															? "bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border-purple-200 dark:border-purple-950/40"
															: item.type ===
																	CustomerCreditLedgerType.Adjustment
																? "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border-blue-200 dark:border-blue-950/40"
																: item.type === CustomerCreditLedgerType.Hold
																	? "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400 border-yellow-200 dark:border-yellow-950/40"
																	: item.type === CustomerCreditLedgerType.Bonus
																		? "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/20 dark:text-cyan-400 border-cyan-200 dark:border-cyan-950/40"
																		: "bg-gray-50 text-gray-700 dark:bg-gray-950/20 dark:text-gray-400 border-gray-200 dark:border-gray-950/40"
											}
										>
											{t(`customer_fiat_type_${item.type}`) || item.type}
										</Badge>
									</td>
									<td
										className={cn(
											"px-3 py-2 font-semibold font-mono text-right",
											Number(item.amount) >= 0
												? "text-green-600 dark:text-green-400"
												: "text-red-600 dark:text-red-400",
										)}
									>
										{new Intl.NumberFormat("en-US", {
											style: "currency",
											currency: (currency || "TWD").toUpperCase(),
											maximumFractionDigits: 2,
											minimumFractionDigits: 0,
											signDisplay: "exceptZero",
										}).format(Number(item.amount))}
									</td>
									<td className="px-3 py-2 font-semibold font-mono text-right">
										{new Intl.NumberFormat("en-US", {
											style: "currency",
											currency: (currency || "TWD").toUpperCase(),
											maximumFractionDigits: 2,
											minimumFractionDigits: 0,
										}).format(Number(item.balance))}
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
