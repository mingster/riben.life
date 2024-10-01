"use client";

import Currency from "@/components/currency";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { ProductStatuses } from "@/types/enum";
import type { ColumnDef } from "@tanstack/react-table";
import { t } from "i18next";
import { CheckIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { CellAction } from "./cell-action";

export type ProductColumn = {
  id: string;
  name: string;
  status: number;
  price: number;
  isFeatured: boolean;
  updatedAt: string;
  hasOptions: boolean;
  stock: number | undefined;
  isRecurring: boolean | undefined;
};

export const columns: ColumnDef<ProductColumn>[] = [
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
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader column={column} title={t("Product_status")} />
      );
    },
    cell: ({ row }) => {
      const status = ProductStatuses[Number(row.getValue("status"))];
      return <div>{t(`ProductStatus_${status.label}`)}</div>;
    },
  },
  /*
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
  },*/
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
  {
    accessorKey: "price",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader column={column} title={t("Product_price")} />
      );
    },
    cell: ({ row }) => {
      const price = Number(row.getValue("price"));
      return <Currency value={price} />;
    },
  },
  {
    accessorKey: "stock",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader column={column} title={t("Product_stock")} />
      );
    },
  },
  /*
  {
    accessorKey: "isRecurring",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={t("Product_isRecurring")}
        />
      );
    },
    cell: ({ row }) => {
      //console.log( typeof(row.getValue("isRecurring")) );
      const isRecurring =
        row.getValue("isRecurring") === true ? (
          <CheckIcon className="text-green-400  h-4 w-4" />
        ) : (
          <XIcon className="text-red-400 h-4 w-4" />
        );
      return <div className="pl-3">{isRecurring}</div>;
    },
  },*/
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
