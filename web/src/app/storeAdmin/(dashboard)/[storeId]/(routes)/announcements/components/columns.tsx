"use client";

import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import type { ColumnDef } from "@tanstack/react-table";
import { t } from "i18next";
import { CellAction } from "./cell-action";

export type MessageColumn = {
  id: string;
  storeId: string;
  message: string;
  updatedAt: string;
};

export const columns: ColumnDef<MessageColumn>[] = [
  {
    accessorKey: "message",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader column={column} title={t("announcement_body")} />
      );
    },
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title={t("updated")} />;
    },
  },
  {
    id: "actions",
    header: ({ column }) => {
      return t("actions");
    },
    cell: ({ row }) => <CellAction data={row.original} />,
  },
];
