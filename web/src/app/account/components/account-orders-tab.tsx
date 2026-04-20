"use client";

import { format } from "date-fns";
import Link from "next/link";
import Currency from "@/components/currency";
import { shopPathWithDefaultStore } from "@/lib/shop/shop-nav-paths";
import type { User } from "@/types";

type UserOrder = NonNullable<User["Orders"]>[number];
type OrderLine = NonNullable<UserOrder["OrderItemView"]>[number];

interface AccountOrdersTabProps {
	user: User;
}

function formatOrderDate(createdAt: unknown): string {
	if (typeof createdAt === "number" && Number.isFinite(createdAt)) {
		return format(new Date(createdAt), "PP");
	}
	return "—";
}

export function AccountOrdersTab({ user }: AccountOrdersTabProps) {
	const orders = user.Orders ?? [];

	if (orders.length === 0) {
		return (
			<p className="text-sm text-muted-foreground">
				No orders yet.{" "}
				<Link
					href={shopPathWithDefaultStore("")}
					className="underline underline-offset-4"
				>
					Browse the shop
				</Link>
				.
			</p>
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
								Order {o.orderNum ?? o.id.slice(0, 8)}
							</Link>
							<p className="text-xs text-muted-foreground">
								{formatOrderDate(o.createdAt)} · {o.Store?.name ?? "Store"}
							</p>
						</div>
						<div className="text-right text-sm">
							<p className={o.isPaid ? "text-green-600" : "text-amber-600"}>
								{o.isPaid ? "Paid" : "Pending"}
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
