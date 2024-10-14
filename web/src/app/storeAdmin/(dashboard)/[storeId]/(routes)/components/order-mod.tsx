"use client";

import { useToast } from "@/components/ui/use-toast";
import { useCart } from "@/hooks/use-cart";
import type { ItemOption } from "@/hooks/use-cart";

import type { Product, ProductOption, Store, StoreOrder } from "@/types";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import type { ProductOptionSelections } from "@prisma/client";

import { useTranslation } from "@/app/i18n/client";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useI18n } from "@/providers/i18n-provider";
import { Minus, Plus } from "lucide-react";

import IconButton from "@/components/ui/icon-button";
import { useState } from "react";
import Currency from "@/components/currency";

import { zodResolver } from "@hookform/resolvers/zod";

import { z } from "zod";
import { useParams } from "next/navigation";
import { AlertModal } from "@/components/modals/alert-modal";

interface props {
  store: Store;
  order: StoreOrder;
}

// Modifiy Order Dialog
//
export const ModifiyOrderDialog: React.FC<props> = ({ store, order }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();
  const { lng } = useI18n();
  const { t } = useTranslation(lng, 'storeAdmin');

  console.log('StorePaymentMethods', JSON.stringify(store.StorePaymentMethods));

  //const params = useParams();
  //console.log(JSON.stringify(order));

  //console.log("form errors", form.formState.errors);


  const onCancel = async () => {
    if (confirm('are you sure?')) {
      alert("not yet implemented");
    }
    setOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            className="text-xs"
            variant={"outline"}>
            {t("Modify")}
          </Button>

        </DialogTrigger>
        <DialogContent>

          <div className="flex h-full flex-col">
            <DialogHeader className="border-b p-4">
              <DialogTitle>
                修改訂單
              </DialogTitle>
              <DialogDescription>

              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-auto p-4">

              <div className="pb-5">
              內用 | 外帶 改桌號
              </div>

              <div className="pb-5">
                改付款方式
              </div>

              <div className="pb-5">
                改menu
              </div>

            </div>

          </div>
          <DialogFooter className="w-full pt-2 pb-2">
            <Button
              className="text-xs"
              variant={"destructive"}
              onClick={onCancel}>
              刪單
            </Button>

          </DialogFooter>
        </DialogContent>
      </Dialog></>
  );
};
