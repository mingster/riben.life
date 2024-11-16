"use client";

import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { TicketStatus } from "@/types/enum";
import type { ColumnDef } from "@tanstack/react-table";
import { t } from "i18next";
import Link from "next/link";
import { CellAction } from "./cell-action";

export type TicketColumn = {
  id: string;
  department: string;
  subject: string;
  status: number;
  updatedAt: string;
};

export const columns: ColumnDef<TicketColumn>[] = [
  {
    accessorKey: "department",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title={t("department")} />;
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return t("status");
    },
    cell: ({ row }) => {
      const status = TicketStatus[Number(row.getValue("status"))];
      return <div className="">{status}</div>;
    },
  },
  {
    accessorKey: "subject",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title={t("subject")} />;
    },
    cell: ({ row }) => (
      <Link
        className="pl-5"
        title="view and reply the ticket"
        href={`./support/${row.original.id}/`}
      >
        {row.getValue("subject")}
      </Link>
    ),
  },
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
