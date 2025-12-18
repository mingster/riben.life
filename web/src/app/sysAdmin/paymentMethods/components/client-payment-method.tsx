"use client";

import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";
import { IconPlus } from "@tabler/icons-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import type { PaymentMethodColumn } from "../payment-method-column";
import { createPaymentMethodColumns } from "./columns";
import { EditPaymentMethodDialog } from "./edit-payment-method-dialog";

interface PaymentMethodClientProps {
	serverData: PaymentMethodColumn[];
}

const sortPaymentMethods = (items: PaymentMethodColumn[]) =>
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

export function PaymentMethodClient({ serverData }: PaymentMethodClientProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "sysAdmin");

	const [data, setData] = useState<PaymentMethodColumn[]>(() =>
		sortPaymentMethods(serverData),
	);

	useEffect(() => {
		setData(sortPaymentMethods(serverData));
	}, [serverData]);

	const handleCreated = useCallback((paymentMethod: PaymentMethodColumn) => {
		setData((prev) => sortPaymentMethods([...prev, paymentMethod]));
	}, []);

	const handleUpdated = useCallback((paymentMethod: PaymentMethodColumn) => {
		setData((prev) => {
			const next = prev.map((item) =>
				item.id === paymentMethod.id ? paymentMethod : item,
			);
			return sortPaymentMethods(next);
		});
	}, []);

	const handleDeleted = useCallback((paymentMethodId: string) => {
		setData((prev) => prev.filter((item) => item.id !== paymentMethodId));
	}, []);

	const columns = useMemo(
		() =>
			createPaymentMethodColumns(t, {
				onUpdated: handleUpdated,
				onDeleted: handleDeleted,
			}),
		[t, handleDeleted, handleUpdated],
	);

	return (
		<>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Heading
					title="Payment Methods"
					badge={data.length}
					description="Manage payment methods in this system."
				/>
				<EditPaymentMethodDialog
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
			<DataTable<PaymentMethodColumn, unknown>
				data={data}
				columns={columns}
				searchKey="name"
			/>
		</>
	);
}
