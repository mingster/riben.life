"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";

import { useTranslation } from "@/app/i18n/client";
import { Heading } from "@/components/ui/heading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/providers/i18n-provider";
import type { StoreOrder } from "@/types";
import { OrderStatus } from "@/types/enum";
//import type { StoreOrder } from "@/types";
import type { OrderNote, orderitemview } from "@prisma/client";
import axios from "axios";
import { format } from "date-fns";
import Link from "next/link";
import { ClipLoader } from "react-spinners";
import { DisplayOrderStatus } from "@/components/order-status-display";

interface props {
  storeId: string;
  autoAcceptOrder: boolean;
  orders: StoreOrder[];
  parentLoading: boolean;
}

export const OrderInProgress = ({
  storeId,
  autoAcceptOrder,
  orders,
  parentLoading,
}: props) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  //const params = useParams();
  //const router = useRouter();
  const { toast } = useToast();
  const { lng } = useI18n();
  const { t } = useTranslation(lng, "storeAdmin");

  if (parentLoading) {
    return <ClipLoader color="text-primary" />;
  }

  const handleChecked = async (orderId: string) => {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${storeId}/orders/mark-as-completed/${orderId}`;
    await axios.post(url);

    // remove the order from the list
    orders.filter((order) => order.id !== orderId);

    toast({
      title: t("Order") + t("Updated"),
      description: "",
      variant: "success",
    });
  };

  if (!mounted) return <></>;

  return (
    <>
      <Card>
        <Heading
          title={t("Order_accept_mgmt")}
          description=""
          badge={orders.length}
          className="pt-2"
        />

        <CardContent className="pl-0 pr-0 m-0">
          {/* display */}
          <div className="text-muted-foreground text-xs">
            {orders.length === 0
              ? t("no_results_found")
              : autoAcceptOrder // if true, 請勾選來完成訂單; else 請勾選來接單
                ? t("Order_accept_mgmt_descr")
                : t("Order_accept_mgmt_descr2")}
          </div>

          {orders.length !== 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  {/*單號/桌號*/}
                  <TableHead className="text-nowrap w-[50px]">
                    {t("Order_number")}
                  </TableHead>
                  <TableHead className="text-nowrap">
                    {t("Order_items")}
                  </TableHead>
                  <TableHead className="w-[250px]">{t("Order_note")}</TableHead>
                  <TableHead className="hidden lg:table-cell text-right align-middle lg:w-[90px]">
                    {t("ordered_at")}
                  </TableHead>
                  <TableHead className="w-[100px] text-center">
                    {autoAcceptOrder ? t("Order_accept") : t("Order_accept2")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order: StoreOrder) => (
                  <TableRow key={order.id}>
                    <TableCell className="lg:text-2xl font-extrabold">
                      {order.orderNum}
                    </TableCell>

                    <TableCell className="text-nowrap">
                      {order.OrderItemView.map((item: orderitemview) => (
                        <div
                          key={item.id}
                        >{`${item.name} x ${item.quantity}`}</div>
                      ))}
                    </TableCell>

                    <TableCell className="border">
                      <div className="hidden lg:table-cell">
                        {order.OrderNotes.map((note: OrderNote) => (
                          <div key={note.id}>{note.note}</div>
                        ))}
                      </div>

                      <div className="flex gap-1 text-xs items-center">
                        <div>
                          {order.isPaid === true ? t("isPaid") : t("isNotPaid")}
                        </div>
                        <div>{order.ShippingMethod?.name}</div>
                        <div>{order.PaymentMethod?.name}</div>
                        <div>
                          <DisplayOrderStatus status={order.orderStatus} />
                        </div>
                        <div>{order.User?.name}</div>
                      </div>
                    </TableCell>

                    <TableCell className="hidden lg:table-cell text-xs text-right align-bottom">
                      {format(order.updatedAt, "yyyy-MM-dd HH:mm:ss")}
                    </TableCell>

                    <TableCell className="bg-red-100">
                      <div className="flex gap-3 items-center justify-end pr-1">
                        <Checkbox
                          value={order.id}
                          onClick={() => handleChecked(order.id)}
                        />

                        <Button className="text-xs" variant={"outline"}>
                          <Link
                            href={`/storeAdmin/${order.storeId}/order/${order.id}`}
                          >
                            {t("Modify")}
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
};
