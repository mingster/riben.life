"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";

import { useTranslation } from "@/app/i18n/client";
import { AlertModal } from "@/components/modals/alert-modal";
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
//import type { StoreOrder } from "@/types";
import type { OrderNote, orderitemview } from "@prisma/client";
import axios from "axios";
import { format } from "date-fns";
import { ClipLoader } from "react-spinners";
import { Heading } from "@/components/ui/heading";
import { OrderStatus } from "@/types/enum";

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
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const [selectedOrderId, setSelectedOrderId] = useState("");

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

  const handleEdit = async (orderId: string) => {
    setOpen(true);

    setSelectedOrderId(orderId);
    alert("not yet implemented");
  };

  const onCancel = async () => {
    alert("not yet implemented");

    toast({
      title: selectedOrderId + t("Order") + t("Canceled"),
      description: "",
      variant: "success",
    });
    setOpen(false);
  };

  if (!mounted) return <></>;

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onCancel}
        loading={loading}
      />

      <Card>
        <Heading title={t("Order_accept_mgmt")} description="" badge={orders.length} className="pt-2" />

        <CardContent className="space-y-2">
          {/* display */}
          <div className="pt-2 pl-1">
            {orders.length === 0
              ? t("no_results_found")
              : autoAcceptOrder // if true, 請勾選來完成訂單; else 請勾選來接單
                ? t("Order_accept_mgmt_descr2")
                : t("Order_accept_mgmt_descr")}
          </div>

          {orders.length !== 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  {/*單號/桌號*/}
                  <TableHead className="w-[90px]">
                    {t("Order_number")}
                  </TableHead>

                  <TableHead className="w-[200px]">
                    {t("Order_items")}
                  </TableHead>

                  <TableHead>{t("Order_note")}</TableHead>
                  <TableHead className="w-[90px]">{t("ordered_at")}</TableHead>

                  <TableHead className="w-[150px] text-center text-nowrap">
                    {autoAcceptOrder ? t("Order_accept2") : t("Order_accept")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order: StoreOrder) => (
                  <TableRow key={order.id}>
                    <TableCell className="text-2xl font-extrabold">
                      {order.orderNum}
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
                      <div className='flex gap-2'>
                        <div>{order.isPaid === true ? "已付" : "未付"}</div>
                        <div>{order.ShippingMethod?.name}</div>
                        <div>{order.PaymentMethod?.name}</div>
                        <div>{OrderStatus[order.orderStatus]}</div>
                        <div>{order.User?.name}</div>
                      </div>
                    </TableCell>

                    <TableCell className="text-nowrap">
                      {format(order.updatedAt, "yyyy-MM-dd HH:mm:ss")}
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="gap-10">
                        <Checkbox
                          value={order.id}
                          onClick={() => handleChecked(order.id)}
                        />
                        <Button
                          className="text-xs"
                          variant={"outline"}
                          onClick={() => handleEdit(order.id)}
                        >
                          {t("Modify")}
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
