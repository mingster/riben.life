"use client";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { Button } from "@/components/ui/button";

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

  /*
{(status === OrderStatus.Completed || status === OrderStatus.InShipping) && (
  <Button
    className="mr-2 bg-green-200 hover:bg-green-300"
    variant={"outline"}
    size="sm"
    onClick={() => buyAgain(order.id)}
  >
    {t("order_tab_buyAgain")}
  </Button>
)}
  */

  //{order.tableId && order.tableId !== null && order.tableId !== 'null' && `桌號：${getTableName(tables, order.tableId)}`}
  return (
    <>
      {status !== OrderStatus.Voided && (
        <Button variant={"outline"} className="mr-2 cursor-default" size="sm">
          {t(`OrderStatus_${OrderStatus[Number(status)]}`)}
        </Button>
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
