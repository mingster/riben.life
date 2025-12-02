"use client";

import { useState, useCallback } from "react";
import { CustomerWeekViewCalendar } from "./customer-week-view-calendar";
import { ReservationForm } from "./reservation-form";
import type { Rsvp, StoreFacility, User } from "@/types";
import type { RsvpSettings, StoreSettings } from "@prisma/client";
import { Separator } from "@/components/ui/separator";
import { Heading } from "@/components/ui/heading";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

interface ReservationClientProps {
	rsvps: Rsvp[];
	rsvpSettings: RsvpSettings | null;
	storeSettings: StoreSettings | null;
	facilities: StoreFacility[];
	user: User | null;
	storeId: string;
	storeTimezone: number;
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
	const [selectedDateTime, setSelectedDateTime] = useState<{
		day: Date;
		timeSlot: string;
	} | null>(null);

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

	// Calculate default rsvp time from selected date/time
	const defaultRsvpTime = selectedDateTime
		? (() => {
				const [hours, minutes] = selectedDateTime.timeSlot
					.split(":")
					.map(Number);
				const date = new Date(selectedDateTime.day);
				date.setHours(hours, minutes, 0, 0);
				return date;
			})()
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
		</div>
	);
}
