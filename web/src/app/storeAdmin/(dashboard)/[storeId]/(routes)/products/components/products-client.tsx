"use client";

import { Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";

import { Heading } from "@/components/ui/heading";
import { type ProductColumn, columns } from "./columns";

interface ProductsClientProps {
  data: ProductColumn[];
}

export const ProductsClient: React.FC<ProductsClientProps> = ({ data }) => {
  const params = useParams();
  const router = useRouter();

  const { lng } = useI18n();
  const { t } = useTranslation(lng, "storeAdmin");

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading
          title={t("Product_Mgmt")}
          badge={data.length}
          description={t("Product_Mgmt_descr")}
        />
        <Button
          variant={"outline"}
          onClick={() =>
            router.push(`/storeAdmin/${params.storeId}/products/new`)
          }
        >
          <Plus className="mr-0 size-4" />
          {t("Create")}
        </Button>
      </div>
      <Separator />
      <DataTable searchKey="name" columns={columns} data={data} />
    </>
  );
};
