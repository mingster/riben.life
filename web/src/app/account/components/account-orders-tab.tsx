"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import type { Locale } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { ja } from "date-fns/locale/ja";
import { zhTW } from "date-fns/locale/zh-TW";
import Link from "next/link";

import { useTranslation } from "@/app/i18n/client";
import Currency from "@/components/currency";

import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/providers/i18n-provider";
import type { User } from "@/types";

type UserOrder = NonNullable<User["Orders"]>[number];
type OrderLine = NonNullable<UserOrder["OrderItemView"]>[number];

interface AccountOrdersTabProps {
	user: User;
}

function dateFnsLocaleForAppLang(lng: string): Locale {
	if (lng === "jp") {
		return ja;
	}
	if (lng === "tw") {
		return zhTW;
	}
	return enUS;
}

function formatOrderDate(createdAt: unknown, locale: Locale): string {
	let ms: number | null = null;
	if (typeof createdAt === "bigint") {
		ms = Number(createdAt);
	} else if (typeof createdAt === "number" && Number.isFinite(createdAt)) {
		ms = createdAt;
	}
	if (ms === null || !Number.isFinite(ms)) {
		return "—";
	}
	return format(new Date(ms), "PP", { locale });
}

export function AccountOrdersTab({ user }: AccountOrdersTabProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const orders = user.Orders ?? [];
	const dateLocale = useMemo(() => dateFnsLocaleForAppLang(lng), [lng]);

	/*
import { Trans } from "react-i18next";
import { shopPathWithDefaultStore } from "@/lib/shop/shop-nav-paths";

  <Trans
          t={t}
          i18nKey="account_orders_empty_cta"
          components={{
            shopLink: (
              <Link
                href={shopPathWithDefaultStore("")}
                className="underline underline-offset-4"
              />
            ),
          }}
        />

  */
	if (orders.length === 0) {
		return (
			<Card>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						{t("no_results_found")}
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<ul className="space-y-6">
			{orders.map((o: UserOrder) => (
				<li
					key={o.id}
					className="rounded-lg border border-border/80 bg-card/30 p-4 sm:p-5"
				>
					<div className="flex flex-wrap items-start justify-between gap-2">
						<div>
							<Link
								href={`/account/orders/${o.id}`}
								className="font-medium underline-offset-4 hover:underline"
							>
								{t("account_order_label")} {o.orderNum ?? o.id.slice(0, 8)}
							</Link>
							<p className="text-xs text-muted-foreground">
								{formatOrderDate(o.createdAt, dateLocale)} ·{" "}
								{o.Store?.name ?? t("account_order_store_fallback")}
							</p>
						</div>
						<div className="text-right text-sm">
							<p className={o.isPaid ? "text-green-600" : "text-amber-600"}>
								{o.isPaid
									? t("account_order_paid")
									: t("account_order_pending_payment")}
							</p>
							<div className="mt-1 text-xs text-muted-foreground">
								<Currency value={Number(o.orderTotal)} />
							</div>
						</div>
					</div>

					{o.OrderItemView && o.OrderItemView.length > 0 ? (
						<ul className="mt-4 space-y-2 border-t border-border/60 pt-4 text-sm">
							{o.OrderItemView.map((line: OrderLine) => (
								<li
									key={line.id}
									className="flex justify-between gap-4 text-muted-foreground"
								>
									<span>
										{line.name}{" "}
										<span className="text-xs">× {line.quantity}</span>
									</span>
									<Currency value={Number(line.unitPrice) * line.quantity} />
								</li>
							))}
						</ul>
					) : null}
				</li>
			))}
		</ul>
	);
}
