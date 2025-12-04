"use client";

import { IconPlus } from "@tabler/icons-react";
import { useCallback, useMemo, useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";

import type { Rsvp } from "@/types";
import { createRsvpColumns } from "./columns";
import { AdminEditRsvpDialog } from "./admin-edit-rsvp-dialog";

interface RsvpHistoryClientProps {
	serverData: Rsvp[];
	storeTimezone: string;
}

export const RsvpHistoryClient: React.FC<RsvpHistoryClientProps> = ({
	serverData,
	storeTimezone,
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [data, setData] = useState<Rsvp[]>(serverData);

	const handleCreated = useCallback((newRsvp: Rsvp) => {
		if (!newRsvp) return;
		setData((prev) => {
			const exists = prev.some((item) => item.id === newRsvp.id);
			if (exists) return prev;
			return [newRsvp, ...prev];
		});
	}, []);

	const handleDeleted = useCallback((rsvpId: string) => {
		setData((prev) => prev.filter((item) => item.id !== rsvpId));
	}, []);

	const handleUpdated = useCallback((updated: Rsvp) => {
		if (!updated) return;
		setData((prev) =>
			prev.map((item) => (item.id === updated.id ? updated : item)),
		);
	}, []);

	const columns = useMemo(
		() =>
			createRsvpColumns(t, {
				onDeleted: handleDeleted,
				onUpdated: handleUpdated,
				storeTimezone,
			}),
		[t, handleDeleted, handleUpdated, storeTimezone],
	);

	return (
		<>
			<div className="flex items-center justify-between">
				<Heading
					title={t("Rsvp_List") || "Reservations"}
					badge={data.length}
					description=""
				/>
				<div className="flex gap-2">
					<AdminEditRsvpDialog
						isNew
						onCreated={handleCreated}
						storeTimezone={storeTimezone}
						trigger={
							<Button variant="outline">
								<IconPlus className="mr-0 size-4" />
								{t("create")}
							</Button>
						}
					/>
				</div>
			</div>
			<Separator />
			<DataTable<Rsvp, unknown>
				columns={columns}
				data={data}
				searchKey="message"
			/>
		</>
	);
};
