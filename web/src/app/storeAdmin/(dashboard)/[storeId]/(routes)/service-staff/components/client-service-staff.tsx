"use client";

import { IconPlus } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";
import { useParams } from "next/navigation";

import type { ServiceStaffColumn } from "../service-staff-column";

import { createTableColumns } from "./columns";
import { EditServiceStaffDialog } from "./edit-service-staff-dialog";

interface ServiceStaffClientProps {
	serverData: ServiceStaffColumn[];
}

export const ServiceStaffClient: React.FC<ServiceStaffClientProps> = ({
	serverData,
}) => {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const sortServiceStaff = useCallback((items: ServiceStaffColumn[]) => {
		return [...items].sort((a, b) => {
			const nameA = a.userName || a.userEmail || "";
			const nameB = b.userName || b.userEmail || "";
			return nameA.localeCompare(nameB, undefined, {
				numeric: true,
				sensitivity: "base",
			});
		});
	}, []);

	const [data, setData] = useState<ServiceStaffColumn[]>(() =>
		sortServiceStaff(serverData),
	);

	useEffect(() => {
		setData(sortServiceStaff(serverData));
	}, [serverData, sortServiceStaff]);

	const handleCreated = useCallback(
		(newItem: ServiceStaffColumn) => {
			if (!newItem) return;
			setData((prev) => {
				const exists = prev.some((item) => item.id === newItem.id);
				if (exists) return prev;
				return sortServiceStaff([...prev, newItem]);
			});
		},
		[sortServiceStaff],
	);

	const handleDeleted = useCallback((id: string) => {
		setData((prev) => prev.filter((item) => item.id !== id));
	}, []);

	const handleUpdated = useCallback(
		(updated: ServiceStaffColumn) => {
			if (!updated) return;
			setData((prev) => {
				const next = prev.map((item) =>
					item.id === updated.id ? updated : item,
				);
				return sortServiceStaff(next);
			});
		},
		[sortServiceStaff],
	);

	const columns = useMemo(
		() =>
			createTableColumns(t, {
				onDeleted: handleDeleted,
				onUpdated: handleUpdated,
			}),
		[t, handleDeleted, handleUpdated],
	);

	return (
		<>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Heading
					title={t("service_staff_mgmt") || "Service Staff Management"}
					badge={data.length}
					description=""
				/>
				<div className="flex flex-wrap gap-1.5 sm:gap-2 sm:content-end items-center">
					<EditServiceStaffDialog
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
			</div>
			<Separator />
			<DataTable<ServiceStaffColumn, unknown>
				columns={columns}
				data={data}
				searchKey="userName"
			/>
		</>
	);
};
