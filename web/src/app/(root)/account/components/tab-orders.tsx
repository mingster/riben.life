"use client";
import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/providers/i18n-provider";
import { OrderStatus } from "@/types/enum";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DisplayOrders } from "@/components/display-orders";
import { authClient } from "@/lib/auth-client";
import type { StoreOrder } from "@/types";
import { cn, highlight_css } from "@/utils/utils";
import {
	Card,
	CardContent,
	CardHeader,
	CardFooter,
} from "@/components/ui/card";

type props = { orders: StoreOrder[] | [] };
export const OrderTab = ({ orders }: props) => {
	const { data: session } = authClient.useSession();
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
		<Card>
			<CardContent className="space-y-0 p-0">
				<div className="flex gap-1 pb-2">
					<Button
						className={cn(
							"sm:text-xs h-12",
							filterStatus === 0 && highlight_css,
						)}
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
			</CardContent>
		</Card>
	);
};
