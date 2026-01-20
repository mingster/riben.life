"use client";
import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/providers/i18n-provider";

import { OrderStatus } from "@/types/enum";
import { cn } from "@/utils/utils";

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
	className = "cursor-default text-nowrap gap-2 sm:gap-3 shrink-0 text-xs sm:text-sm",
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	//console.log("status", status);

	return (
		<div className={cn(className, "flex items-center")}>
			<div>{t(`order_status_${OrderStatus[Number(status)]}`)}</div>

			{(status === OrderStatus.Completed ||
				status === OrderStatus.InShipping) &&
				displayBuyAgain && (
					<Button
						variant="outline"
						size="sm"
						className="h-10 sm:h-9"
						onClick={() => onCompletedStatus?.()}
					>
						{t("order_tab_buy_again")}
					</Button>
				)}
		</div>
	);
};
