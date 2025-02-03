"use client";

import Currency from "@/components/currency";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { DisplayOrderStatus } from "@/components/order-status-display";
import { Button } from "@/components/ui/button";
import { OrderStatus } from "@/types/enum";
import type { orderitemview } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import { t } from "i18next";
import { CellAction } from "./cell-action";

// #region data table realted
export type StoreOrderColumn = {
	id: string;
	storeId: string;
	user: string | null | undefined;
	orderStatus: number;
	amount: number;
	refundAmount: number;
	currency: string;
	isPaid: boolean;
	updatedAt: string;
	paymentMethod: string | null | undefined;
	shippingMethod: string | null | undefined;
	orderItems: orderitemview[];
	//tableId: string | null | undefined;
	orderNum: number;
	paymentCost: number;
	note: string | null | undefined;
};

export const columns: ColumnDef<StoreOrderColumn>[] = [
	{
		accessorKey: "amount",
		header: ({ column }) => {
			return <DataTableColumnHeader column={column} title={t("Order_total")} />;
		},
		cell: ({ row }) => {
			const amount = Number(row.getValue("amount"));

			return <Currency value={amount} />;
		},
	},
	{
		accessorKey: "orderStatus",
		header: ({ column }) => {
			return (
				<DataTableColumnHeader column={column} title={t("Order_status")} />
			);
		},
		cell: ({ row }) => {
			const status = OrderStatus[Number(row.getValue("orderStatus"))];

			return <DisplayOrderStatus status={row.getValue("orderStatus")} />;
		},
	},
	{
		accessorKey: "isPaid",
		header: ({ column }) => {
			return (
				<DataTableColumnHeader column={column} title={t("Order_isPaid")} />
			);
		},
		cell: ({ row }) => {
			return row.getValue("isPaid") === true ? (
				<Button variant={"outline"} className="mr-2 cursor-default" size="sm">
					{t("isPaid")}
				</Button>
			) : (
				<Button
					variant={"outline"}
					className="mr-2 bg-red-900 text-gray cursor-default"
					size="sm"
				>
					{t("isNotPaid")}
				</Button>
			);
		},
	},
	{
		accessorKey: "paymentMethod",
		header: ({ column }) => {
			return (
				<DataTableColumnHeader column={column} title={t("PaymentMethod")} />
			);
		},
		cell: ({ row }) => {
			return row.getValue("paymentMethod");
		},
	},
	{
		accessorKey: "shippingMethod",
		header: ({ column }) => {
			return (
				<DataTableColumnHeader column={column} title={t("ShippingMethod")} />
			);
		},
		cell: ({ row }) => {
			return row.getValue("shippingMethod");
		},
	},
	{
		accessorKey: "orderNum",
		header: ({ column }) => {
			return (
				<DataTableColumnHeader column={column} title={t("Order_orderNum")} />
			);
		},

		cell: ({ row }) => {
			return row.getValue("orderNum");
		},
	},
	{
		accessorKey: "updatedAt",
		header: ({ column }) => {
			return <DataTableColumnHeader column={column} title={t("updated")} />;
		},
	},
	{
		id: "info",
		header: ({ column }) => {
			return "";
		},
		cell: ({ row }) => <InfoCol data={row.original} />,
	},
	{
		id: "actions",
		cell: ({ row }) => <CellAction data={row.original} />,
	},
];

interface CellActionProps {
	data: StoreOrderColumn;
}

export const InfoCol: React.FC<CellActionProps> = ({ data }) => {
	//const note = `${t("Order_edit_orderNum")}${data.orderNum.toString()}`;
	//if (data.tableId) note = `${note}/ ${data.tableId}`;
	/*
    const orderNum =row.getValue("orderNum")??'';
    const note =row.getValue("note");
      <div>{data.isPaid === true ?
        <Button
          variant={"outline"}
          className="mr-2 cursor-default"
          size="sm"
        >
          {t("isPaid")}
        </Button>
        :
        <Button
          variant={"outline"}
          className="mr-2 bg-red-900 text-gray cursor-default"
          size="sm"
        >
          {t("isNotPaid")}
        </Button>
      }</div>
    */

	return (
		<div className="flex flex-col gap-1 text-nowrap">
			<div>
				{data.orderItems.map((item) => (
					<div key={item.id} className="text-xs">
						{item.name} x {item.quantity}
					</div>
				))}
			</div>
			<div>{data.user}</div>
		</div>
	);
};
