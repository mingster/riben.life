"use client";

import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import type { ColumnDef } from "@tanstack/react-table";
import { t } from "i18next";
import Link from "next/link";
import { CellAction } from "./cell-action";
import { useQRCode } from "next-qrcode";

export type TableColumn = {
  id: string;
  storeId: string;
  tableName: string;
  capacity: number;
};

interface QrCodeProps {
  data: TableColumn;
}

export const QRCode: React.FC<QrCodeProps> = ({ data }) => {
  const { SVG } = useQRCode();
  return (
    <Link
      href={`/${data.storeId}/${data.id}`}
      target="_blank"
      title="click to preview the table store page."
    >
      <SVG
        text={`/${data.storeId}/${data.id}`}
        options={{
          margin: 2,
          width: 100,
        }}
      />
    </Link>
  );
};
export const columns: ColumnDef<TableColumn>[] = [
  {
    accessorKey: "tableName",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader column={column} title={t("StoreTable_Name")} />
      );
    },
    cell: ({ row }) => (
      <Link
        className="pl-0"
        title="click to edit"
        href={`./tables/${row.original.id}`}
      >
        {row.getValue("tableName")}
      </Link>
    ),
  },
  {
    accessorKey: "capacity",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader column={column} title={t("StoreTable_Seats")} />
      );
    },
  },
  {
    id: "qrcode",
    header: ({ column }) => {
      return "";
    },
    cell: ({ row }) => <QRCode data={row.original} />,
  },
  {
    id: "actions",
    header: ({ column }) => {
      return t("actions");
    },
    cell: ({ row }) => <CellAction data={row.original} />,
  },
];
