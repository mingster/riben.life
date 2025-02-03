"use client";

import { useParams, useRouter } from "next/navigation";

import { DataTable } from "@/components/dataTable";

import { Heading } from "@/components/ui/heading";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

import type { Store } from "prisma/prisma-client";

import { type TicketColumn, columns } from "./columns";

interface TicketClientProps {
	store: Store;
	data: TicketColumn[];
}

export const TicketClient: React.FC<TicketClientProps> = ({ data, store }) => {
	const params = useParams();
	const router = useRouter();
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	return (
		<>
			<div className="flex flex-row pr-2">
				<Heading title={t("ticket")} badge={data.length} description="" />
			</div>
			<DataTable searchKey="subject" columns={columns} data={data} />
		</>
	);
};
