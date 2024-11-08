"use client";

import { useEffect, useState } from "react";

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
import type { Store, StoreOrder } from "@/types";
import type { OrderNote, StoreTables, orderitemview } from "@prisma/client";
import axios from "axios";
import { format } from "date-fns";
import { ClipLoader } from "react-spinners";

import Currency from "@/components/currency";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getTableName } from "@/lib/utils";
interface props {
  store: Store;
  tables: StoreTables[];
  orders: StoreOrder[];
  parentLoading: boolean;
}

export const OrderUnpaid = ({
  store,
  tables,
  orders,
  parentLoading,
}: props) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const { lng } = useI18n();
  const { t } = useTranslation(lng, "storeAdmin");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const [selectedOrderId, setSelectedOrderId] = useState("");

  if (parentLoading) {
    return <ClipLoader color="text-primary" />;
  }

  const handleChecked = async (orderId: string) => {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${store.id}/orders/mark-as-paid/${orderId}`;
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
    <Card>
      <div className="flex justify-between items-center pl-2 pr-2">
        <Heading
          title={t("Order_unpiad_title")}
          description={t("Order_unpiad_descr")}
          badge={orders.length}
          className="pt-2"
        />
        <div>
          <Button
            variant={"outline"}
            onClick={() =>
              router.push(`/storeAdmin/${params.storeId}/order/add`)
            }
          >
            <Plus className="mr-1 h-4 w-4" />
            {t("Create")}
          </Button>
        </div>
      </div>

      <CardContent className="space-y-2">
        {/* display */}
        <div className="pt-2 pl-1">
          {orders.length === 0 ? t("no_results_found") : ""}
        </div>

        {orders.length !== 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                {/*單號/桌號*/}
                <TableHead className="">{t("Order_number")}</TableHead>
                <TableHead className="w-[200px]">{t("Order_items")}</TableHead>
                <TableHead>{t("Order_note")}</TableHead>
                <TableHead className="w-[90px]">{t("ordered_at")}</TableHead>
                <TableHead className="w-[90px] text-right">
                  {t("Order_total")}
                </TableHead>
                <TableHead className="w-[150px] text-center">
                  {t("Order_cashier_confirm")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order: StoreOrder) => (
                <TableRow key={order.id}>
                  <TableCell className="text-2xl font-extrabold">
                    {order.orderNum}
                    {order.tableId &&
                      ` / ${getTableName(tables, order.tableId)}`}
                  </TableCell>

                  <TableCell>
                    {order.OrderItemView.map((item: orderitemview) => (
                      <div
                        key={item.id}
                      >{`${item.name} x ${item.quantity}`}</div>
                    ))}
                  </TableCell>

                  <TableCell>
                    {order.OrderNotes.map((note: OrderNote) => (
                      <div key={note.id}>{note.note}</div>
                    ))}
                    <div className="flex gap-2">
                      <div>{order.isPaid === true ? "已付" : "未付"}</div>
                      <div>{order.ShippingMethod?.name}</div>
                      <div>{order.PaymentMethod?.name}</div>
                      <div>{order.User?.name}</div>
                    </div>
                  </TableCell>

                  <TableCell className="text-nowrap">
                    {format(order.updatedAt, "yyyy-MM-dd HH:mm:ss")}
                  </TableCell>

                  <TableCell className="text-right text-2xl font-extrabold">
                    <Currency value={Number(order.orderTotal)} />
                  </TableCell>

                  <TableCell className="bg-red-100">
                    <div className="flex gap-5 items-center justify-end pr-1">
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
  );
};
