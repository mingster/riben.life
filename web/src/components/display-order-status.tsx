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
			<div className={className}>
				{t(`order_status_${OrderStatus[Number(status)]}`)}
			</div>

			{(status === OrderStatus.Completed ||
				status === OrderStatus.InShipping) &&
				displayBuyAgain && (
					<Button
						variant="outline"
						size="sm"
						className="w-full sm:w-auto h-10 sm:h-9"
						onClick={() => onCompletedStatus?.()}
					>
						{t("order_tab_buy_again")}
					</Button>
				)}
		</div>
	);
};
