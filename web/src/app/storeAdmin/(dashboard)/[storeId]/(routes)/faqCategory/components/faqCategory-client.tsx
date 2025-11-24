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
			<div className="flex items-center justify-between">
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
