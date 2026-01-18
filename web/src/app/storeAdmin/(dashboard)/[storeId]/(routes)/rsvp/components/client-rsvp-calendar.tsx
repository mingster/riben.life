"use client";

import { useCallback, useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";
import { useRouter } from "next/navigation";

import type { Rsvp } from "@/types";
import { WeekViewCalendar } from "./week-view-calendar";

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
	storeCurrency?: string;
	storeUseBusinessHours?: boolean | null;
	useCustomerCredit?: boolean;
	creditExchangeRate?: number | null;
}

export const RsvpCalendarClient: React.FC<RsvpCalendarClientProps> = ({
	serverData,
	rsvpSettings,
	storeSettings,
	storeTimezone,
	storeCurrency = "twd",
	storeUseBusinessHours,
	useCustomerCredit = false,
	creditExchangeRate = null,
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
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Heading
					title={t("rsvp_week_view") || "Week View"}
					badge={data.length}
					description=""
				/>
			</div>
			<Separator />
			<WeekViewCalendar
				reservations={data}
				onRsvpCreated={handleCreated}
				onRsvpUpdated={handleUpdated}
				rsvpSettings={rsvpSettings}
				storeSettings={storeSettings}
				storeTimezone={storeTimezone}
				storeCurrency={storeCurrency}
				storeUseBusinessHours={storeUseBusinessHours}
				useCustomerCredit={useCustomerCredit}
				creditExchangeRate={creditExchangeRate}
			/>
		</>
	);
};
