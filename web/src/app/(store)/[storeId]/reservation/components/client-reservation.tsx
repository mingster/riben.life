"use client";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import type { Rsvp, StoreFacility, User } from "@/types";
import type { RsvpSettings, StoreSettings } from "@prisma/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CustomerWeekViewCalendar } from "./customer-week-view-calendar";
import { EditReservationDialog } from "./edit-reservation-dialog";

interface ReservationClientProps {
	rsvps: Rsvp[];
	rsvpSettings: RsvpSettings | null;
	storeSettings: StoreSettings | null;
	facilities: StoreFacility[];
	user: User | null;
	storeId: string;
	storeTimezone: string;
	isBlacklisted?: boolean;
}

export function ReservationClient({
	rsvps: initialRsvps,
	rsvpSettings,
	storeSettings,
	facilities,
	user,
	storeId,
	storeTimezone,
	isBlacklisted = false,
}: ReservationClientProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const router = useRouter();
	const searchParams = useSearchParams();
	const [_selectedDateTime, setSelectedDateTime] = useState<{
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

	const handleReservationCreated = useCallback((newRsvp: Rsvp) => {
		// Reset selected date/time after successful creation
		setSelectedDateTime(null);
		// The calendar component handles updating its own state
		// This callback is just for any additional cleanup if needed
	}, []);

	// Helper to remove edit parameter from URL
	const removeEditParam = useCallback(() => {
		const params = new URLSearchParams(searchParams.toString());
		params.delete("edit");
		const newUrl = params.toString()
			? `${window.location.pathname}?${params.toString()}`
			: window.location.pathname;
		router.replace(newUrl, { scroll: false });
	}, [router, searchParams]);

	const handleReservationUpdated = useCallback(
		(updatedRsvp: Rsvp) => {
			// Close edit dialog
			setEditRsvp(null);
			setEditRsvpId(null);
			// Update URL to remove edit parameter
			removeEditParam();
		},
		[removeEditParam],
	);

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
				isBlacklisted={isBlacklisted}
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
							removeEditParam();
						}
					}}
					onReservationUpdated={handleReservationUpdated}
				/>
			)}
		</div>
	);
}
