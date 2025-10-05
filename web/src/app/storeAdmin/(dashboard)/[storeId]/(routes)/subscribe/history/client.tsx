"use client";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import type { Store } from "@/types";
import { formatDateTime } from "@/utils/utils";
import { useParams, useRouter } from "next/navigation";

import { useEffect, useState } from "react";

import Currency from "@/components/currency";
import { Card, CardContent } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { SubscriptionStatus } from "@/types/enum";
import type { StoreSubscription, SubscriptionPayment } from "@prisma/client";
import { formatDate } from "date-fns";

export function SubscriptionHistoryClient({
	store,
	subscription,
	//subscriptionSchedule,
	payments,
}: {
	store: Store;
	subscription: StoreSubscription | null;
	//subscriptionSchedule: Stripe.SubscriptionSchedule | null;
	payments: SubscriptionPayment[];
}) {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const _params = useParams();
	const _router = useRouter();

	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");
	if (!mounted) return <></>;

	return (
		<Card>
			<CardContent className="px-0 m-0">
				{/*display subscription info*/}
				<div className="sm:flex sm:flex-col sm:align-middle">
					<div className="max-w-2xl mt-5 text-xl sm:text-2xl">
						{
							// if no subscription...
							subscription?.status === SubscriptionStatus.Inactive
								? t("SubscriptionStatus_Inactive")
								: subscription?.status === SubscriptionStatus.Active
									? t("SubscriptionStatus_Active")
									: subscription?.status === SubscriptionStatus.Cancelled
										? t("SubscriptionStatus_Canceled")
										: ""
						}
					</div>
					<div>
						{subscription !== null && (
							<div className="">
								{t("storeAdmin_switchLevel_subscription_expiry").replace(
									"{0}",
									formatDate(subscription.expiration, "yyyy-MM-dd"),
								)}
							</div>
						)}
					</div>
				</div>

				<div className="text-muted-foreground xs:text-xs">
					{payments.length === 0 ? t("no_results_found") : ""}
				</div>

				{payments.length !== 0 && (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="">Renewal date</TableHead>
								<TableHead className="">Amount</TableHead>
								<TableHead>Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{payments.map((payment: SubscriptionPayment) => (
								<TableRow key={payment.id}>
									<TableCell className="hidden lg:table-cell">
										{formatDateTime(payment.createdAt)}
									</TableCell>

									<TableCell className="flex gap-1">
										{payment.currency}
										<Currency value={300} />
									</TableCell>

									<TableCell>
										<div className="flex gap-1 text-xs items-center">
											<div>
												{payment.isPaid === true ? (
													<div className="text-green-700 dark:text-green-700">
														{t("isPaid")}
													</div>
												) : (
													<div className="text-red-400 dark:text-red-700">
														{t("isNotPaid")}
													</div>
												)}
											</div>
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	);
}
