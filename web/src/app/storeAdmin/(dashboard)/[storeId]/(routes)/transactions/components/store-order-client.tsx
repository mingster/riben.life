"use client";

import { useParams, useRouter } from "next/navigation";

import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/providers/i18n-provider";

import { Heading } from "@/components/ui/heading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { addDays, format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StoreOrder } from "@/types";
import type { OrderNote, orderitemview } from "@prisma/client";
import axios from "axios";
import { useState } from "react";
import { OrderStatus } from "@/types/enum";

interface StoreOrderClientProps {
  storeId: string;
}

export const StoreOrderClient: React.FC<StoreOrderClientProps> = ({
  storeId,
}) => {
  const params = useParams();
  const router = useRouter();

  const [val, setVal] = useState(0);

  const [date, setDate] = useState<Date>(new Date()); //default to today
  const [orders, setOrders] = useState<StoreOrder[]>([]);

  const setDateVal = (v: string) => {
    setVal(Number.parseInt(v));
    setDate(addDays(new Date(), val));
  };

  const { lng } = useI18n();
  const { t } = useTranslation(lng, "storeAdmin");

  const doSearch = async () => {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${storeId}/orders/search`;
    axios
      .get(url, {
        params: {
          date: date.valueOf(),
        },
      })
      .then((response) => {
        // handle success
        //console.log(response);
        setOrders(response.data);
      });
  };

  return (
    <>
      <div className="flex pb-2 items-center justify-between">
        <Heading
          title={t("Store_orders")}
          badge={orders.length}
          description=""
        />
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-[240px] justify-start text-left font-normal",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? (
              format(date, "yyyy-MM-dd")
            ) : (
              <span>{t("PickDate_Pick_a_date")}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="flex w-auto flex-col space-y-2 p-2"
        >
          <Select onValueChange={(value) => setDateVal(value)}>
            <SelectTrigger>
              <SelectValue placeholder={t("select")} />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="-30">{t("PickDate_Past_30_days")}</SelectItem>
              <SelectItem value="-7">{t("PickDate_Past_7_days")}</SelectItem>
              <SelectItem value="-1">{t("PickDate_Yesterday")}</SelectItem>
              <SelectItem value="0">{t("PickDate_Today")}</SelectItem>
            </SelectContent>
          </Select>
          <div className="rounded-md border">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(date) => date && setDate(date)}
              initialFocus
            />
          </div>
        </PopoverContent>
      </Popover>
      <Button variant={"outline"} onClick={() => doSearch()}>
        search
      </Button>

      <div className="text-descr text-xs font-mono">
        {format(date, "yyyy-MM-dd")}至{format(new Date(), "yyyy-MM-dd")}
      </div>
      {orders.length === 0 ? (
        <p className="text-descr text-xs font-mono">{t("no_results_found")}</p>
      ) : (
        <>
          <DisplayOrders orders={orders} />
        </>
      )}
    </>
  );
};

type orderTabProps = { orders: StoreOrder[] };
export const DisplayOrders = ({ orders }: orderTabProps) => {
  const { lng } = useI18n();
  const { t } = useTranslation(lng, "storeAdmin");

  return (
    <>
      <div className="flex-col">
        <div className="flex-1 p-1 pt-1 space-y-1">
          {/* display */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[90px]">{t("Order_number")}</TableHead>
                <TableHead className="w-[200px]">{t("Order_items")}</TableHead>
                <TableHead>{t("Order_note")}</TableHead>
                <TableHead className="w-[90px]">{t("Order_status")}</TableHead>
                <TableHead className="w-[90px]">{t("ordered_at")}</TableHead>
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

                    <div className="flex gap-2">
                      <div>{order.isPaid === true ? "已付" : "未付"}</div>
                      <div>{order.ShippingMethod?.name}</div>
                      <div>{order.PaymentMethod?.name}</div>
                      <div>{order.User?.name}</div>
                    </div>
                  </TableCell>

                  <TableCell>{OrderStatus[order.orderStatus]}</TableCell>

                  <TableCell>
                    {format(order.updatedAt, "yyyy-MM-dd HH:mm:ss")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
};
