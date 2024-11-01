"use client";

import { Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { DataTable } from "@/components/dataTable";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { Heading } from "@/components/ui/heading";
import { type FaqCategoryColumn, columns } from "./columns";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

interface FaqCategoryClientProps {
  data: FaqCategoryColumn[];
}

export const FaqCategoryClient: React.FC<FaqCategoryClientProps> = ({
  data,
}) => {
  const params = useParams();
  const router = useRouter();
  const { lng } = useI18n();
  const { t } = useTranslation(lng, "storeAdmin");

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading
          title={t("FaqCategory_Mgmt")}
          badge={data.length}
          description={t("FaqCategory_Mgmt_descr")}
        />

        <Button
          variant={"outline"}
          onClick={() =>
            router.push(`/storeAdmin/${params.storeId}/faqCategory/new`)
          }
        >
          <Plus className="mr-1 h-4 w-4" />
          {t("Create")}
        </Button>
      </div>
      <Separator />
      <DataTable searchKey="name" columns={columns} data={data} />
    </>
  );
};
