"use client";

import axios, { type AxiosError } from "axios";
import { Copy, Edit, UserRoundPen, MoreHorizontal, Trash } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { AlertModal } from "@/components/modals/alert-modal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { toast } from "@/components/ui/use-toast";
import type { CategoryColumn } from "./columns";

interface CellActionProps {
  data: CategoryColumn;
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const params = useParams();

  const onConfirm = async () => {
    try {
      setLoading(true);

      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/categories/${data.categoryId}`,
      );

      toast({
        title: "category deleted.",
        description: "",
        variant: "success",
      });
      router.refresh();
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
      title: "CategoryID copied to clipboard.",
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
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => onCopy(data.categoryId)}
          >
            <Copy className="mr-2 h-4 w-4" /> Copy Id
          </DropdownMenuItem>

          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() =>
              router.push(
                `/storeAdmin/${params.storeId}/categories/${data.categoryId}`,
              )
            }
          >
            <Edit className="mr-2 h-4 w-4" /> Update
          </DropdownMenuItem>
          <DropdownMenuItem
            {...(data.numOfProducts !== 0 && { disabled: true })}
            className="cursor-pointer"
            onClick={() => setOpen(true)}
          >
            <Trash className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
