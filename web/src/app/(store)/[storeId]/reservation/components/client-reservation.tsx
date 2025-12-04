"use client";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import type { Rsvp, StoreFacility, User } from "@/types";
import type { RsvpSettings, StoreSettings } from "@prisma/client";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CustomerWeekViewCalendar } from "./customer-week-view-calendar";
import { EditReservationDialog } from "./edit-reservation-dialog";
import { dayAndTimeSlotToUtc } from "@/utils/datetime-utils";

interface ReservationClientProps {
	rsvps: Rsvp[];
	rsvpSettings: RsvpSettings | null;
	storeSettings: StoreSettings | null;
	facilities: StoreFacility[];
	user: User | null;
	storeId: string;
	storeTimezone: string;
}

export function ReservationClient({
	rsvps: initialRsvps,
	rsvpSettings,
	storeSettings,
	facilities,
	user,
	storeId,
	storeTimezone,
}: ReservationClientProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const searchParams = useSearchParams();
	const [selectedDateTime, setSelectedDateTime] = useState<{
		day: Date;
		timeSlot: string;
	} | null>(null);
	const [editRsvpId, setEditRsvpId] = useState<string | null>(null);
	const [editRsvp, setEditRsvp] = useState<Rsvp | null>(null);

	// Handle edit query parameter
	useEffect(() => {
		const editId = searchParams.get("edit");
		if (editId) {
			const rsvp = initialRsvps.find((r) => r.id === editId);
			if (rsvp) {
				setEditRsvp(rsvp);
				setEditRsvpId(editId);
			}
		}
	}, [searchParams, initialRsvps]);

	const handleTimeSlotClick = useCallback((day: Date, timeSlot: string) => {
		setSelectedDateTime({ day, timeSlot });
		// Scroll to form
		setTimeout(() => {
			const formElement = document.getElementById("reservation-form");
			formElement?.scrollIntoView({ behavior: "smooth", block: "start" });
		}, 100);
	}, []);

	const handleReservationCreated = useCallback((newRsvp: Rsvp) => {
		// Reset selected date/time after successful creation
		setSelectedDateTime(null);
		// The calendar component handles updating its own state
		// This callback is just for any additional cleanup if needed
	}, []);

	const handleReservationUpdated = useCallback((updatedRsvp: Rsvp) => {
		// Close edit dialog and refresh
		setEditRsvp(null);
		setEditRsvpId(null);
		// Update URL to remove edit parameter
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("edit");
			window.history.replaceState({}, "", url.toString());
		}
	}, []);

	// Calculate default rsvp time from selected date/time
	const defaultRsvpTime = selectedDateTime
		? dayAndTimeSlotToUtc(
				selectedDateTime.day,
				selectedDateTime.timeSlot,
				storeTimezone,
			)
		: undefined;

	return (
		<div className="flex flex-col gap-1">
			{/* Week View Calendar */}
			<CustomerWeekViewCalendar
				rsvps={initialRsvps}
				rsvpSettings={rsvpSettings}
				storeSettings={storeSettings}
				storeId={storeId}
				facilities={facilities}
				user={user}
				storeTimezone={storeTimezone}
				onReservationCreated={handleReservationCreated}
			/>

			{/* Edit Reservation Dialog */}
			{editRsvp && (
				<EditReservationDialog
					storeId={storeId}
					rsvpSettings={rsvpSettings}
					storeSettings={storeSettings}
					facilities={facilities}
					user={user}
					rsvp={editRsvp}
					rsvps={initialRsvps}
					storeTimezone={storeTimezone}
					open={Boolean(editRsvpId)}
					onOpenChange={(open) => {
						if (!open) {
							setEditRsvp(null);
							setEditRsvpId(null);
							// Update URL to remove edit parameter
							if (typeof window !== "undefined") {
								const url = new URL(window.location.href);
								url.searchParams.delete("edit");
								window.history.replaceState({}, "", url.toString());
							}
						}
					}}
					onReservationUpdated={handleReservationUpdated}
				/>
			)}
		</div>
	);
}
