"use client";

import { useTranslation } from "@/app/i18n/client";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useI18n } from "@/providers/i18n-provider";
import type { Product } from "@/types";
import { Eye } from "lucide-react";

interface props {
  initialData: Product;
}

export const ProductPreviewDialog: React.FC<props> = ({ initialData }) => {
  const { lng } = useI18n();
  const { t } = useTranslation(lng, "storeAdmin");

  if (!initialData) {
    return <></>;
  }

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Button
            title={t("Preview")}
            className="bg-blue-900"
            size="sm"
            variant={"outline"}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle> </DialogTitle>
            <DialogDescription> </DialogDescription>
          </DialogHeader>

          <ProductCard
            className="lg:min-w-[220px]"
            disableBuyButton={true}
            product={{
              ...initialData,
            }}
          />

          <DialogFooter className="sm:justify-start">
            <DialogClose asChild>
              <Button variant="outline">{t("Cancel")}</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
