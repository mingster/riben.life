"use client";

import { format } from "date-fns";
import { useTransition } from "react";
import { toast } from "sonner";
import { markShopPickupReadyAction } from "@/actions/shop/mark-pickup-ready";
import { useTranslation } from "@/app/i18n/client";
import Currency from "@/components/currency";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/providers/i18n-provider";

export interface PickupOrderRow {
	id: string;
	orderNum: number | null;
	createdAt: number;
	isPaid: boolean;
	shopPickupReadyAt: number | null;
	orderTotal: number;
	currency: string;
	customerEmail: string | null;
}

export function PickupOrdersClient({ orders }: { orders: PickupOrderRow[] }) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "shop");
	const [pending, startTransition] = useTransition();

	if (orders.length === 0) {
		return (
			<p className="text-sm text-muted-foreground">
				{t("shop_owner_pickups_empty")}
			</p>
		);
	}

	return (
		<ul className="divide-y divide-border rounded-lg border border-border/80">
			{orders.map((o) => (
				<li
					key={o.id}
					className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
				>
					<div>
						<p className="font-medium">
							{t("shop_owner_order_label", {
								num: String(o.orderNum ?? o.id.slice(0, 8)),
							})}
						</p>
						<p className="text-xs text-muted-foreground">
							{format(new Date(o.createdAt), "PPp")}
							{o.customerEmail ? ` · ${o.customerEmail}` : ""}
						</p>
						<p className="mt-1 text-sm">
							<Currency value={o.orderTotal} />{" "}
							<span className="text-muted-foreground">
								({o.currency.toUpperCase()})
							</span>
						</p>
						{o.shopPickupReadyAt ? (
							<p className="mt-1 text-xs font-medium text-green-600">
								{t("shop_owner_ready_for_pickup", {
									time: format(new Date(o.shopPickupReadyAt), "PPp"),
								})}
							</p>
						) : (
							<p className="mt-1 text-xs text-amber-600">
								{t("shop_owner_awaiting_prep")}
							</p>
						)}
					</div>
					{!o.shopPickupReadyAt ? (
						<Button
							type="button"
							size="sm"
							disabled={pending || !o.isPaid}
							className="touch-manipulation sm:shrink-0"
							onClick={() => {
								startTransition(async () => {
									const res = await markShopPickupReadyAction({
										orderId: o.id,
									});
									if (res?.serverError) {
										toast.error(t("shop_owner_toast_pickup_title"), {
											description: res.serverError,
										});
										return;
									}
									toast.success(t("shop_owner_marked_ready_toast"));
									window.location.reload();
								});
							}}
						>
							{t("shop_owner_mark_ready_button")}
						</Button>
					) : null}
				</li>
			))}
		</ul>
	);
}
