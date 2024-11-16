"use client";

import { Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { DataTable } from "@/components/dataTable";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { Heading } from "@/components/ui/heading";
import type { FaqCategory } from "@prisma/client";
import { type FaqColumn, columns } from "./columns";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

interface FaqClientProps {
  data: FaqColumn[];
  category: FaqCategory;
}

export const FaqClient: React.FC<FaqClientProps> = ({ data, category }) => {
  const params = useParams();
  const router = useRouter();

  const { lng } = useI18n();
  const { t } = useTranslation(lng, "storeAdmin");

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading
          title={`${category.name}-${t("FAQ")}`}
          badge={data.length}
          description={t("FAQ_Mgmt_descr")}
        />

        <Button
          variant={"outline"}
          onClick={() =>
            router.push(
              `/storeAdmin/${params.storeId}/faqCategory/${params.categoryId}/faq/new`,
            )
          }
        >
          <Plus className="mr-1 size-4" />
          {t("Create")}
        </Button>
      </div>
      <Separator />
      <DataTable searchKey="question" columns={columns} data={data} />
    </>
  );
};
