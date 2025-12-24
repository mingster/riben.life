"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";
import type { StoreOrder } from "@/types";
import { createCustomerOrderColumns } from "./customer-order-columns";

interface ClientMyOrdersProps {
	serverData: StoreOrder[];
	storeTimezone: string;
}

export const ClientMyOrders: React.FC<ClientMyOrdersProps> = ({
	serverData,
	storeTimezone,
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [data] = useState<StoreOrder[]>(serverData);

	const columns = useMemo(
		() => createCustomerOrderColumns(t, { storeTimezone }),
		[t, storeTimezone],
	);

	return (
		<>
			<div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Heading
					title={t("my_orders") || "My Orders"}
					badge={data.length}
					description=""
				/>
			</div>
			<Separator />
			<DataTable<StoreOrder, unknown>
				columns={columns}
				data={data}
				searchKey="orderNum"
			/>
		</>
	);
};
