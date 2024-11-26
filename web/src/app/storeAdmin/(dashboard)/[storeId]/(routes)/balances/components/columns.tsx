"use client";

import Currency from "@/components/currency";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import type { ColumnDef } from "@tanstack/react-table";
import { t } from "i18next";

// #region data table realted
export type StoreLedgerColumn = {
  id: string;
  storeId: string;
  orderId: string;
  amount: number;
  fee: number;
  platformFee: number;
  currency: string;
  balance: number;
  description: string | null | undefined;
  note: string | null | undefined;
  createdAt: string;
  availablity: string;
};

export const columns: ColumnDef<StoreLedgerColumn>[] = [
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title={t("createdAt")} />;
    },
  },
  {
    accessorKey: "availablity",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader column={column} title={t("availablityDate")} />
      );
    },
  },
  {
    accessorKey: "description",
    header: ({ column }) => {
      return t("description");
    },
  },
  {
    accessorKey: "amount",
    header: ({ column }) => {
      return <div className="pl-2">{t("amount")}</div>;
    },
    cell: ({ row }) => {
      const amount = Number(row.getValue("amount"));

      return <Currency value={amount} />;
    },
  },
  {
    accessorKey: "fee",
    header: ({ column }) => {
      return t("fee");
    },
    cell: ({ row }) => {
      const fee = Number(row.getValue("fee"));

      return <Currency value={fee} />;
    },
  },

  {
    accessorKey: "platformFee",
    header: ({ column }) => {
      return t("platformFee");
    },
    cell: ({ row }) => {
      const platformFee = Number(row.getValue("platformFee"));

      return <Currency value={platformFee} />;
    },
  },

  {
    accessorKey: "balance",
    header: ({ column }) => {
      return t("balance");
    },
    cell: ({ row }) => {
      const balance = Number(row.getValue("balance"));

      return <Currency value={balance} />;
    },
  },

  {
    accessorKey: "note",
    header: ({ column }) => {
      return t("note");
    },
  },
];
