"use client";

import axios, { type AxiosError } from "axios";
import { Copy, Edit, MoreHorizontal, Trash } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { AlertModal } from "@/components/modals/alert-modal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/providers/i18n-provider";

import { toast } from "@/components/ui/use-toast";
import type { TableColumn } from "./columns";

interface CellActionProps {
  data: TableColumn;
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const params = useParams();
  const { lng } = useI18n();
  const { t } = useTranslation(lng, "storeAdmin");

  const onConfirm = async () => {
    try {
      setLoading(true);

      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/tables/${data.id}`,
      );

      toast({
        title: t("StoreTable_Mgmt_Deleted"),
        description: "",
        variant: "success",
      });
      //router.refresh();
      window.location.assign(`/storeAdmin/${params.storeId}/tables`);
    } catch (error: unknown) {
      const err = error as AxiosError;
      toast({
        title: "something wrong.",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  const onCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({
      title: "table ID copied to clipboard.",
      description: "",
      variant: "success",
    });
  };

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onConfirm}
        loading={loading}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{t("Actions")}</DropdownMenuLabel>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => onCopy(data.id)}
          >
            <Copy className="mr-2 h-4 w-4" /> Copy Id
          </DropdownMenuItem>

          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() =>
              router.push(`/storeAdmin/${params.storeId}/tables/${data.id}`)
            }
          >
            <Edit className="mr-2 h-4 w-4" /> {t("Edit")}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => setOpen(true)}
          >
            <Trash className="mr-2 h-4 w-4" /> {t("Delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
