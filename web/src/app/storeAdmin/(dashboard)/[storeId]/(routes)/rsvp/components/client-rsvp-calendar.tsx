"use client";

import { IconPlus } from "@tabler/icons-react";
import { useCallback, useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";
import { useRouter } from "next/navigation";

import type { Rsvp } from "@/types";
import { WeekViewCalendar } from "./week-view-calendar";
import { AdminEditRsvpDialog } from "./admin-edit-rsvp-dialog";

interface RsvpCalendarClientProps {
	serverData: Rsvp[];
	rsvpSettings: { useBusinessHours: boolean; rsvpHours: string | null } | null;
	storeSettings: { businessHours: string | null } | null;
}

export const RsvpCalendarClient: React.FC<RsvpCalendarClientProps> = ({
	serverData,
	rsvpSettings,
	storeSettings,
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const router = useRouter();

	const [data, setData] = useState<Rsvp[]>(serverData);

	const handleCreated = useCallback(
		(newRsvp: Rsvp) => {
			if (!newRsvp) return;
			setData((prev) => {
				const exists = prev.some((item) => item.id === newRsvp.id);
				if (exists) return prev;
				return [newRsvp, ...prev];
			});
			router.refresh();
		},
		[router],
	);

	const handleUpdated = useCallback(
		(updated: Rsvp) => {
			if (!updated) return;
			setData((prev) =>
				prev.map((item) => (item.id === updated.id ? updated : item)),
			);
			router.refresh();
		},
		[router],
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
			<WeekViewCalendar
				rsvps={data}
				onRsvpCreated={handleCreated}
				onRsvpUpdated={handleUpdated}
				rsvpSettings={rsvpSettings}
				storeSettings={storeSettings}
			/>
		</>
	);
};
