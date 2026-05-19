"use client";

import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";
import { useEffect, useMemo, useState, useCallback } from "react";
import type { AnnouncementColumn } from "../announcement-column";
import { createAnnouncementColumns } from "./columns";
import { EditAnnouncementDialog } from "./edit-announcement-dialog";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

interface AnnouncementClientProps {
	serverData: AnnouncementColumn[];
}

const sortAnnouncements = (items: AnnouncementColumn[]) =>
	[...items].sort((a, b) => {
		const updatedDiff =
			new Date(b.updatedAtIso || 0).getTime() -
			new Date(a.updatedAtIso || 0).getTime();
		if (updatedDiff !== 0) return updatedDiff;
		return (
			new Date(b.createdAtIso || 0).getTime() -
			new Date(a.createdAtIso || 0).getTime()
		);
	});

export function AnnouncementClient({ serverData }: AnnouncementClientProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	const [data, setData] = useState<AnnouncementColumn[]>(() =>
		sortAnnouncements(serverData),
	);

	useEffect(() => {
		setData(sortAnnouncements(serverData));
	}, [serverData]);

	const handleCreated = useCallback((announcement: AnnouncementColumn) => {
		setData((prev) => sortAnnouncements([...prev, announcement]));
	}, []);

	const handleUpdated = useCallback((announcement: AnnouncementColumn) => {
		setData((prev) => {
			const next = prev.map((item) =>
				item.id === announcement.id ? announcement : item,
			);
			return sortAnnouncements(next);
		});
	}, []);

	const handleDeleted = useCallback((announcementId: string) => {
		setData((prev) => prev.filter((item) => item.id !== announcementId));
	}, []);

	const columns = useMemo(
		() =>
			createAnnouncementColumns(t, {
				onUpdated: handleUpdated,
				onDeleted: handleDeleted,
			}),
		[t, handleDeleted, handleUpdated],
	);

	const newItem: AnnouncementColumn = {
		id: "new",
		storeId: "",
		name: null,
		published: false,
		locales: [],
		updatedAt: "",
		createdAt: "",
		updatedAtIso: "",
		createdAtIso: "",
	};

	return (
		<>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Heading
					title={t("announcement_mgmt")}
					badge={data.length}
					description={t("announcement_mgmt_descr")}
				/>
				<EditAnnouncementDialog item={newItem} onUpdated={handleCreated} />
			</div>
			<Separator />
			<DataTable<AnnouncementColumn, unknown>
				data={data}
				columns={columns}
				searchKey="name"
			/>
		</>
	);
}
