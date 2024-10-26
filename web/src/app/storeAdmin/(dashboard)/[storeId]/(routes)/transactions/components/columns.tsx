"use client";

import Currency from "@/components/currency";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { OrderStatus, ProductStatuses } from "@/types/enum";
import type { ColumnDef } from "@tanstack/react-table";
import { t } from "i18next";
import { CheckIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { CellAction } from "./cell-action";


// #region data table realted
export type StoreOrderColumn = {
  id: string;
  userId: string | null;
  orderStatus: number;
  amount: number;
  currency: string;
  isPaid: boolean;
  updatedAt: string;
  paymentMethod: string|null|undefined;
  shippingMethod: string|null|undefined;
  tableId: string|null|undefined;
  orderNum: number;
  paymentCost: number;
};

export const columns: ColumnDef<StoreOrderColumn>[] = [
  {
    accessorKey: "amount",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader column={column} title={t("Product_price")} />
      );
    },
    cell: ({ row }) => {
      const amount = Number(row.getValue("amount"));
      return <Currency value={amount} />;
    },
  },

  /*
  {
    accessorKey: "orderStatus",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader column={column} title={t("Product_status")} />
      );
    },
    cell: ({ row }) => {
      const status = OrderStatus[Number(row.getValue("orderStatus"))];
      return {status}
      //return <div>{t(`ProductStatus_${status.label}`)}</div>;
    },
  },

  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader column={column} title={t("Product_name")} />
      );
    },
    cell: ({ row }) => (
      <Link
        className="pl-0"
        title="click to edit"
        href={`./products/${row.original.id}`}
      >
        {row.getValue("name")}
      </Link>
    ),
  },

  {
    accessorKey: "isFeatured",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader column={column} title={t("Product_featured")} />
      );
    },
    cell: ({ row }) => {
      const val =
        row.getValue("isFeatured") === true ? (
          <CheckIcon className="text-green-400  h-4 w-4" />
        ) : (
          <XIcon className="text-red-400 h-4 w-4" />
        );
      return <div className="pl-3">{val}</div>;
    },
  },
  {
    accessorKey: "hasOptions",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={t("Product_hasOptions")}
        />
      );
    },
    cell: ({ row }) => {
      const val =
        row.getValue("hasOptions") === true ? (
          <CheckIcon className="text-green-400  h-4 w-4" />
        ) : (
          <XIcon className="text-red-400 h-4 w-4" />
        );
      return <div className="pl-3">{val}</div>;
    },
  },
*/
  {
    accessorKey: "updatedAt",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title={t("updated")} />;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />,
  },
];
