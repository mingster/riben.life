"use client";

import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";
import { IconPlus } from "@tabler/icons-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import type { ShippingMethodColumn } from "../shipping-method-column";
import { createShippingMethodColumns } from "./columns";
import { EditShippingMethodDialog } from "./edit-shipping-method-dialog";

interface ShippingMethodClientProps {
	serverData: ShippingMethodColumn[];
}

const sortShippingMethods = (items: ShippingMethodColumn[]) =>
	[...items].sort((a, b) => {
		const updatedDiff =
			new Date(b.updatedAtIso).getTime() - new Date(a.updatedAtIso).getTime();
		if (updatedDiff !== 0) {
			return updatedDiff;
		}

		return (
			new Date(b.createdAtIso).getTime() - new Date(a.createdAtIso).getTime()
		);
	});

export function ShippingMethodClient({
	serverData,
}: ShippingMethodClientProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "sysAdmin");

	const [data, setData] = useState<ShippingMethodColumn[]>(() =>
		sortShippingMethods(serverData),
	);

	useEffect(() => {
		setData(sortShippingMethods(serverData));
	}, [serverData]);

	const handleCreated = useCallback((shippingMethod: ShippingMethodColumn) => {
		setData((prev) => sortShippingMethods([...prev, shippingMethod]));
	}, []);

	const handleUpdated = useCallback((shippingMethod: ShippingMethodColumn) => {
		setData((prev) => {
			const next = prev.map((item) =>
				item.id === shippingMethod.id ? shippingMethod : item,
			);
			return sortShippingMethods(next);
		});
	}, []);

	const handleDeleted = useCallback((shippingMethodId: string) => {
		setData((prev) => prev.filter((item) => item.id !== shippingMethodId));
	}, []);

	const columns = useMemo(
		() =>
			createShippingMethodColumns(t, {
				onUpdated: handleUpdated,
				onDeleted: handleDeleted,
			}),
		[t, handleDeleted, handleUpdated],
	);

	return (
		<>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Heading
					title="Shipping Methods"
					badge={data.length}
					description="Manage shipping methods in this system."
				/>
				<EditShippingMethodDialog
					isNew
					onCreated={handleCreated}
					trigger={
						<Button variant="outline" className="h-10 sm:h-9">
							<IconPlus className="mr-2 size-4" />
							<span className="text-sm sm:text-xs">{t("create")}</span>
						</Button>
					}
				/>
			</div>
			<Separator />
			<DataTable<ShippingMethodColumn, unknown>
				data={data}
				columns={columns}
				searchKey="name"
			/>
		</>
	);
}
