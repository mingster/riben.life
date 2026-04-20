"use client";

import { FileWarning } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

export const RequiredProVersion = () => {
	const params = useParams();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	return (
		<div>
			<Link
				className="flex gap-2 py-2 font-bold"
				href={`/storeAdmin/${params.storeId}/subscribe`}
			>
				<FileWarning className="size-6 text-red-500" />
				{t("required_pro_version")}
			</Link>
		</div>
	);
};
