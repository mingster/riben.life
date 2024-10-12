import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { FileWarning } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export const RequiredProVersion = () => {
  const params = useParams();
  const { lng } = useI18n();
  const { t } = useTranslation(lng, "storeAdmin");

  return (
    <div>
      <Link
        className="flex gap-2 pt-2 pb-2 font-bold"
        href={`/storeAdmin/${params.storeId}/subscribe/`}
      >
        <FileWarning className="w-6 h-6 text-red-500" />
        {t("RequiredProVersion")}
      </Link>
    </div>
  );
};
