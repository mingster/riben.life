"use client";

import { useTranslation } from "@/app/i18n/client";
import { Heading } from "@/components/ui/heading";
import { useI18n } from "@/providers/i18n-provider";
import type {
	Rsvp,
	RsvpSettings,
	StoreFacility,
	StoreSettings,
	User,
} from "@/types";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CustomerWeekViewCalendar } from "./customer-week-view-calendar";
import { ReservationDialog } from "./reservation-dialog";

interface ReservationClientProps {
	existingReservations: Rsvp[];
	rsvpSettings: (RsvpSettings & { defaultCost?: number | null }) | null;
	storeSettings: StoreSettings | null;
	facilities: StoreFacility[];
	user: User | null;
	storeId: string;
	storeOwnerId: string;
	storeTimezone: string;
	storeCurrency?: string;
	storeUseBusinessHours?: boolean | null;
	isBlacklisted?: boolean;
	useCustomerCredit?: boolean;
	creditExchangeRate?: number | null;
	creditServiceExchangeRate?: number | null;
}

export function ReservationClient({
	existingReservations,
	rsvpSettings,
	storeSettings,
	facilities,
	user,
	storeId,
	storeOwnerId,
	storeTimezone,
	storeCurrency = "twd",
	storeUseBusinessHours,
	isBlacklisted = false,
	useCustomerCredit = false,
	creditExchangeRate = null,
	creditServiceExchangeRate = null,
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
			const rsvp = existingReservations.find((r) => r.id === editId);
			if (rsvp) {
				setEditRsvp(rsvp);
				setEditRsvpId(editId);
			}
		}
	}, [searchParams, existingReservations]);

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

	const prepaidRequired =
		(rsvpSettings?.minPrepaidPercentage ?? 0) > 0
			? t("store_reservation_required")
			: t("store_reservation_non-required");
	const hours = rsvpSettings?.cancelHours;

	return (
		<div className="flex flex-col gap-1">
			<Heading
				title={t("store_reservation_title")}
				description={t("store_reservation_descr", {
					prepaidRequired,
					hours: hours ?? 24,
				})}
			/>

			{/* Week View Calendar */}
			<CustomerWeekViewCalendar
				existingReservations={existingReservations}
				rsvpSettings={rsvpSettings}
				storeSettings={storeSettings}
				storeId={storeId}
				storeOwnerId={storeOwnerId}
				facilities={facilities}
				user={user}
				storeTimezone={storeTimezone}
				storeCurrency={storeCurrency}
				storeUseBusinessHours={storeUseBusinessHours}
				onReservationCreated={handleReservationCreated}
				isBlacklisted={isBlacklisted}
				useCustomerCredit={useCustomerCredit}
				creditExchangeRate={creditExchangeRate}
				creditServiceExchangeRate={creditServiceExchangeRate}
			/>

			{/* Edit Reservation Dialog */}
			{editRsvp && (
				<ReservationDialog
					storeId={storeId}
					rsvpSettings={rsvpSettings}
					storeSettings={storeSettings}
					facilities={facilities}
					user={user}
					rsvp={editRsvp}
					existingReservations={existingReservations}
					storeTimezone={storeTimezone}
					storeCurrency={storeCurrency}
					storeUseBusinessHours={storeUseBusinessHours}
					open={Boolean(editRsvpId)}
					onOpenChange={(open) => {
						if (!open) {
							setEditRsvp(null);
							setEditRsvpId(null);
							removeEditParam();
						}
					}}
					onReservationUpdated={handleReservationUpdated}
					useCustomerCredit={useCustomerCredit}
					creditExchangeRate={creditExchangeRate}
					creditServiceExchangeRate={creditServiceExchangeRate}
				/>
			)}
		</div>
	);
}
