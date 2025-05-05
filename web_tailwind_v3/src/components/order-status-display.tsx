"use client";
import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/providers/i18n-provider";

import { OrderStatus } from "@/types/enum";

type props = {
	status: OrderStatus;
	displayBuyAgain?: boolean;
	onCompletedStatus?: () => void;
};

// show order success prompt and then redirect the customer to view order page (購物明細)
export const DisplayOrderStatus: React.FC<props> = ({
	status,
	displayBuyAgain,
	onCompletedStatus,
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	//console.log("status", status);

	return (
		<>
			{status !== OrderStatus.Voided && (
				<Button variant={"ghost"} className="mr-2 cursor-default" size="sm">
					{t(`OrderStatus_${OrderStatus[Number(status)]}`)}
				</Button>
			)}

			{status === OrderStatus.Voided && (
				<Button
					variant={"ghost"}
					className="mr-2 bg-muted text-gray-500 cursor-default"
					size="sm"
				>
					{t(`OrderStatus_${OrderStatus[Number(status)]}`)}
				</Button>
			)}

			{(status === OrderStatus.Completed ||
				status === OrderStatus.InShipping) &&
				displayBuyAgain && (
					<Button
						className="mr-2 bg-green-200 hover:bg-green-300"
						variant={"outline"}
						size="sm"
						onClick={() => onCompletedStatus?.()}
					>
						{t("order_tab_buyAgain")}
					</Button>
				)}
		</>
	);
};
