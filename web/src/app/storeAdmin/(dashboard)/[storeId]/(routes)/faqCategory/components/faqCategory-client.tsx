"use client";

import { Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { DataTable } from "@/components/dataTable";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { useTranslation } from "@/app/i18n/client";
import { Heading } from "@/components/ui/heading";
import { useI18n } from "@/providers/i18n-provider";
import { type FaqCategoryColumn, columns } from "./columns";

interface FaqCategoryClientProps {
	data: FaqCategoryColumn[];
}

export const FaqCategoryClient: React.FC<FaqCategoryClientProps> = ({
	data,
}) => {
	const params = useParams();
	const router = useRouter();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	return (
		<>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Heading
					title={t("FaqCategory_mgmt")}
					badge={data.length}
					description={t("FaqCategory_mgmt_descr")}
				/>

				<Button
					variant={"outline"}
					onClick={() =>
						router.push(`/storeAdmin/${params.storeId}/faqCategory/new`)
					}
					className="h-10 min-h-[44px] sm:h-9 sm:min-h-0 touch-manipulation"
				>
					<Plus className="mr-2 size-4" />
					<span className="text-sm sm:text-xs">{t("create")}</span>
				</Button>
			</div>
			<Separator />
			<DataTable searchKey="name" columns={columns} data={data} />
		</>
	);
};
