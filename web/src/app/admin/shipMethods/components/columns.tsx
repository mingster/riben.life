"use client";

import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { CellAction } from "./cell-action";

export type DataColumn = {
  id: string;
  name: string;
  //description: string;
  basic_price: number;
  currencyId: string;

  isDefault: boolean;
  isDeleted: boolean;
  shipRequried: boolean;

  updatedAt?: string;

  stores?: number;
  StoreOrder?: number;
  Shipment?: number;
};

export const columns: ColumnDef<DataColumn>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Name" />;
    },
    cell: ({ row }) => (
      <Link
        className="pl-5"
        title="edit this shipping method"
        href={`./shipMethods/${row.original.id}/`}
      >
        {row.getValue("name")}
      </Link>
    ),
  },
  {
    accessorKey: "basic_price",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="price" />;
    },
  } /*
  {
    accessorKey: "currencyId",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="currency" />;
    },
  }, */,
  {
    accessorKey: "isDefault",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="isDefault" />;
    },
    cell: ({ row }) => {
      const val =
        row.getValue("isDefault") === true ? (
          <CheckIcon className="text-green-400  size-4" />
        ) : (
          <XIcon className="text-red-400 size-4" />
        );

      return <div className="pl-3">{val}</div>;
    },
  },
  {
    accessorKey: "isDeleted",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="isDeleted" />;
    },
    cell: ({ row }) => {
      const val =
        row.getValue("isDeleted") === true ? (
          <CheckIcon className="text-green-400  size-4" />
        ) : (
          <XIcon className="text-red-400 size-4" />
        );

      return <div className="pl-3">{val}</div>;
    },
  },
  {
    accessorKey: "shipRequried",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="shipRequried" />;
    },
    cell: ({ row }) => {
      const val =
        row.getValue("shipRequried") === true ? (
          <CheckIcon className="text-green-400  size-4" />
        ) : (
          <XIcon className="text-red-400 size-4" />
        );

      return <div className="pl-3">{val}</div>;
    },
  },
  {
    accessorKey: "stores",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="# of store" />;
    },
  },
  {
    accessorKey: "StoreOrder",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="# of order" />;
    },
  },
  {
    accessorKey: "Shipment",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="# of shipment" />;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />,
  },
];
