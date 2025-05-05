"use client";
import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/providers/i18n-provider";
import { OrderStatus } from "@/types/enum";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { DisplayOrder } from "@/components/order-display";
import { cn, highlight_css } from "@/lib/utils";
import type { StoreOrder } from "@/types";

type orderTabProps = { orders: StoreOrder[] };
export const DisplayOrders = ({ orders }: orderTabProps) => {
	return (
		<>
			<div className="flex-col">
				<div className="flex-1 p-1 space-y-1">
					{orders.map((order: StoreOrder) => (
						<div key={order.id}>
							<DisplayOrder order={order} />
						</div>
					))}
				</div>
			</div>
		</>
	);
};

type props = { orders: StoreOrder[] };
export const OrderTab = ({ orders }: props) => {
	const { data: session, status } = useSession();
	const searchParams = useSearchParams();
	const initialTab = searchParams.get("ordertab");
	const [_activeTab, setActiveTab] = useState(
		initialTab || OrderStatus[OrderStatus.Pending],
	);

	const _handleTabChange = (value: string) => {
		//update the state
		setActiveTab(value);
		// update the URL query parameter
		//router.push({ query: { tab: value } });
	};

	// if the query parameter changes, update the state
	useEffect(() => {
		if (initialTab) setActiveTab(initialTab);
	}, [initialTab]);

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	// orderStatus numeric key
	const keys = Object.keys(OrderStatus).filter((v) => !Number.isNaN(Number(v)));

	const [filterStatus, setFilterStatus] = useState(0); //0 = all
	let result = orders;

	if (filterStatus !== 0) {
		//console.log('filter', filterStatus);
		result = orders.filter((d) => d.orderStatus === filterStatus);
		//console.log('result', result.length);
	}

	//sort orders by updateAt
	//result.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
	result.sort((a, b) => (b.orderNum ?? 0) - (a.orderNum ?? 0));

	return (
		<>
			<div className="flex gap-1 pb-2">
				<Button
					className={cn("sm:text-xs h-12", filterStatus === 0 && highlight_css)}
					variant="outline"
					onClick={() => {
						setFilterStatus(0);
					}}
				>
					ALL
				</Button>
				{keys.map((key) => (
					<Button
						key={key}
						className={cn(
							"sm:text-xs h-12",
							filterStatus === Number(key) && highlight_css,
						)}
						variant="outline"
						onClick={() => {
							setFilterStatus(Number(key));
						}}
					>
						{t(`OrderStatus_${OrderStatus[Number(key)]}`)}
					</Button>
				))}
			</div>
			<DisplayOrders orders={result} />
		</>
	);
};
