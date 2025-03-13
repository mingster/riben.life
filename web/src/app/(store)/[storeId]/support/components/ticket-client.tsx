"use client";

import { Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { DataTable } from "@/components/dataTable";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { Heading } from "@/components/ui/heading";
import { StoreContactCard } from "../../components/store-contact-card";
import { type TicketColumn, columns } from "./columns";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

import type { Store, StoreSettings } from "@prisma/client";

interface TicketClientProps {
	store: Store;
	storeSettings: StoreSettings;
	data: TicketColumn[];
}

export const TicketClient: React.FC<TicketClientProps> = ({
	data,
	store,
	storeSettings,
}) => {
	const params = useParams();
	const router = useRouter();

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	return (
		<>
			<div className="flex items-center justify-between px-2">
				<Heading title={t("ticket")} badge={data.length} description="" />

				<Button
					variant={"outline"}
					onClick={() => router.push(`/${params.storeId}/support/new`)}
				>
					<Plus className="mr-0 size-4" /> {t("create")}
				</Button>
			</div>

			<div className="flex flex-row pr-2">
				<div className="basis-3/4">
					<DataTable searchKey="subject" columns={columns} data={data} />
				</div>
				<div className="basis-1/4 gap-1 pt-5 pl-2">
					<div className="flex justify-center">
						<StoreContactCard store={store} storeSettings={storeSettings} />
					</div>
				</div>
			</div>
		</>
	);
};
