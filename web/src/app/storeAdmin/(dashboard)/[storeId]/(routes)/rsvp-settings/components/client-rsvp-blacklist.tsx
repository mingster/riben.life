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

import { mapRsvpBlacklistToColumn } from "./rsvp-blacklist-column";
import { createRsvpBlacklistColumns } from "./rsvp-blacklist-columns";
import { EditRsvpBlacklistDialog } from "./edit-rsvp-blacklist-dialog";
import type { RsvpBlacklistColumn } from "./rsvp-blacklist-column";

interface RsvpBlacklistClientProps {
	serverData: (RsvpBlacklistColumn & {
		User?: {
			id: string;
			name: string | null;
			email: string | null;
		} | null;
	})[];
}

export const RsvpBlacklistClient: React.FC<RsvpBlacklistClientProps> = ({
	serverData,
}) => {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const sortBlacklist = useCallback((blacklist: RsvpBlacklistColumn[]) => {
		return [...blacklist].sort((a, b) => {
			const aName = a.userName || a.userEmail || a.userId;
			const bName = b.userName || b.userEmail || b.userId;
			return aName.localeCompare(bName, undefined, {
				numeric: true,
				sensitivity: "base",
			});
		});
	}, []);

	const [data, setData] = useState<RsvpBlacklistColumn[]>(() =>
		sortBlacklist(serverData.map(mapRsvpBlacklistToColumn)),
	);

	useEffect(() => {
		setData(sortBlacklist(serverData.map(mapRsvpBlacklistToColumn)));
	}, [serverData, sortBlacklist]);

	const handleCreated = useCallback(
		(newBlacklist: RsvpBlacklistColumn) => {
			if (!newBlacklist) return;
			setData((prev) => {
				const exists = prev.some((item) => item.id === newBlacklist.id);
				if (exists) return prev;
				return sortBlacklist([...prev, newBlacklist]);
			});
		},
		[sortBlacklist],
	);

	const handleDeleted = useCallback((blacklistId: string) => {
		setData((prev) => prev.filter((item) => item.id !== blacklistId));
	}, []);

	const handleUpdated = useCallback(
		(updated: RsvpBlacklistColumn) => {
			if (!updated) return;
			setData((prev) => {
				const next = prev.map((item) =>
					item.id === updated.id ? updated : item,
				);
				return sortBlacklist(next);
			});
		},
		[sortBlacklist],
	);

	const columns = useMemo(
		() =>
			createRsvpBlacklistColumns(t, {
				onDeleted: handleDeleted,
				onUpdated: handleUpdated,
			}),
		[t, handleDeleted, handleUpdated],
	);

	return (
		<>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Heading
					title={t("rsvp_Blacklist_Settings")}
					badge={data.length}
					description={t("rsvp_Blacklist_Settings_descr")}
				/>
				<div className="flex flex-wrap gap-1.5 sm:gap-2 sm:content-end items-center">
					<EditRsvpBlacklistDialog
						isNew
						onCreated={handleCreated}
						trigger={
							<Button variant="outline" className="h-10 sm:h-9">
								<IconPlus className="mr-2 size-4" />
								<span className="text-sm sm:text-xs">{t("add")}</span>
							</Button>
						}
					/>
				</div>
			</div>
			<Separator />
			<DataTable<RsvpBlacklistColumn, unknown>
				columns={columns}
				data={data}
				searchKey="userName"
			/>
		</>
	);
};
