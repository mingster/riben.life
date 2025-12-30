"use client";
import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/providers/i18n-provider";

import { OrderStatus } from "@/types/enum";

type props = {
	status: OrderStatus;
	displayBuyAgain?: boolean;
	onCompletedStatus?: () => void;
	className?: string;
};

// show order success prompt and then redirect the customer to view order page (購物明細)
export const DisplayOrderStatus: React.FC<props> = ({
	status,
	displayBuyAgain,
	onCompletedStatus,
	className = "mr-2 cursor-default font-semibold text-base",
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	//console.log("status", status);

	return (
		<div className="flex items-center justify-between w-full">
			{status !== OrderStatus.Voided && (
				<div className={className}>
					{t(`OrderStatus_${OrderStatus[Number(status)]}`)}
				</div>
			)}

			{status === OrderStatus.Voided && (
				<Button
					variant={"outline"}
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
						variant="outline"
						size="sm"
						className="w-full sm:w-auto h-10 sm:h-9"
						onClick={() => onCompletedStatus?.()}
					>
						{t("order_tab_buyAgain")}
					</Button>
				)}
		</div>
	);
};
