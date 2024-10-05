"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

interface props {
  storeId: string;
  autoAcceptOrder: boolean;
  orders: StoreOrder[];
  parentLoading: boolean;
}

export const InProgressOrder = ({
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

  const handleCancel = async (orderId: string) => {
    setOpen(true);
    setSelectedOrderId(orderId);
  };

  const onCancel = async () => {
    toast({
      title: selectedOrderId + t("Order") + t("Canceled"),
      description: "",
      variant: "success",
    });
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
        <CardTitle className="p-2">{t("Order_accept_mgmt")}</CardTitle>

        <CardContent className="space-y-2">
          {/* display */}
          <div className="pt-2 pl-6">
            {orders.length === 0
              ? t("no_results_found")
              : autoAcceptOrder
                ? t("Order_accept_mgmt_descr2")
                : t("Order_accept_mgmt_descr")}
          </div>

          {orders.length !== 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[20px] text-nowrap">
                    {t("Order_accept")}
                  </TableHead>
                  <TableHead className="w-[200px]">
                    {t("Order_items")}
                  </TableHead>
                  <TableHead>{t("Order_note")}</TableHead>
                  <TableHead className="w-[90px]">
                    {t("Order_number")}
                  </TableHead>
                  <TableHead className="w-[90px]">{t("ordered_at")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order: StoreOrder) => (
                  <TableRow key={order.id}>
                    <TableCell className="items-center justify-between">
                      <Checkbox
                        value={order.id}
                        onClick={() => handleChecked(order.id)}
                      />
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
                      <div>{order.User?.name}</div>
                      <div>{order.isPaid}</div>
                      <div>{order.ShippingMethod?.name}</div>
                      <div>{order.PaymentMethod?.name}</div>
                    </TableCell>
                    <TableCell>{order.orderNum}</TableCell>
                    <TableCell>
                      {format(order.updatedAt, "yyyy-MM-dd HH:mm:ss")}
                      <Button className="gap-2 text-xs" variant={"outline"}>
                        {t("Modify")}
                      </Button>
                      <Button
                        className="gap-2 text-xs"
                        variant={"destructive"}
                        onClick={() => handleCancel(order.id)}
                      >
                        {t("Cancel")}
                      </Button>
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
