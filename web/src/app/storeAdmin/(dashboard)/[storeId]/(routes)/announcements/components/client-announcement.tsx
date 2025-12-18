"use client";

import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";
import { IconPlus } from "@tabler/icons-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import type { AnnouncementColumn } from "../announcement-column";
import { createAnnouncementColumns } from "./columns";
import { EditAnnouncementDialog } from "./edit-announcement-dialog";

interface AnnouncementClientProps {
	serverData: AnnouncementColumn[];
}

const sortAnnouncements = (items: AnnouncementColumn[]) =>
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

	return (
		<>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Heading
					title={t("Announcement_mgmt")}
					badge={data.length}
					description={t("Announcement_mgmt_descr")}
				/>
				<EditAnnouncementDialog
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
			<DataTable<AnnouncementColumn, unknown>
				data={data}
				columns={columns}
				searchKey="message"
			/>
		</>
	);
}
