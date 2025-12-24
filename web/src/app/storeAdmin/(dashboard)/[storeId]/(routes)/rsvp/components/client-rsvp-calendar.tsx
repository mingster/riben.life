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
	rsvpSettings: {
		useBusinessHours: boolean;
		rsvpHours: string | null;
		defaultDuration?: number | null;
		minPrepaidPercentage?: number | null;
		canCancel?: boolean | null;
		cancelHours?: number | null;
		canReserveBefore?: number | null;
		canReserveAfter?: number | null;
		singleServiceMode?: boolean | null;
	} | null;
	storeSettings: { businessHours: string | null } | null;
	storeTimezone: string;
	storeUseBusinessHours?: boolean | null;
}

export const RsvpCalendarClient: React.FC<RsvpCalendarClientProps> = ({
	serverData,
	rsvpSettings,
	storeSettings,
	storeTimezone,
	storeUseBusinessHours,
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const router = useRouter();

	const [data, setData] = useState<Rsvp[]>(serverData);

	//console.log("data", data);

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
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Heading
					title={t("Rsvp_List") || "Reservations"}
					badge={data.length}
					description=""
				/>
				<div className="flex gap-1.5 sm:gap-2">
					<AdminEditRsvpDialog
						isNew
						onCreated={handleCreated}
						storeTimezone={storeTimezone}
						rsvpSettings={rsvpSettings}
						storeSettings={storeSettings}
						storeUseBusinessHours={storeUseBusinessHours}
						trigger={
							<Button variant="outline" className="h-10 sm:h-9">
								<IconPlus className="mr-2 h-4 w-4" />
								<span className="text-sm sm:text-xs">{t("create")}</span>
							</Button>
						}
					/>
				</div>
			</div>
			<Separator />
			<WeekViewCalendar
				reservations={data}
				onRsvpCreated={handleCreated}
				onRsvpUpdated={handleUpdated}
				rsvpSettings={rsvpSettings}
				storeSettings={storeSettings}
				storeTimezone={storeTimezone}
				storeUseBusinessHours={storeUseBusinessHours}
			/>
		</>
	);
};
