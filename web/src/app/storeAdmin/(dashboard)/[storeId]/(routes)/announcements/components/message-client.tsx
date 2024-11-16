"use client";

import { Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { DataTable } from "@/components/dataTable";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { useTranslation } from "@/app/i18n/client";
import { Heading } from "@/components/ui/heading";
import { useI18n } from "@/providers/i18n-provider";
import { type MessageColumn, columns } from "./columns";

interface messageClientProps {
  data: MessageColumn[];
}

export const MessageClient: React.FC<messageClientProps> = ({ data }) => {
  const params = useParams();
  const router = useRouter();
  const { lng } = useI18n();
  const { t } = useTranslation(lng, "storeAdmin");

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading
          title={t("Announcement_Mgmt")}
          badge={data.length}
          description={t("Announcement_Mgmt_descr")}
        />

        <Button
          variant={"outline"}
          onClick={() =>
            router.push(`/storeAdmin/${params.storeId}/announcements/new`)
          }
        >
          <Plus className="mr-1 h-4 w-4" />
          {t("Create")}
        </Button>
      </div>
      <Separator />
      <DataTable searchKey="message" columns={columns} data={data} />
    </>
  );
};
