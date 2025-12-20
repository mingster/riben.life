"use client";

import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { ReservationForm } from "./reservation-form";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import type { StoreFacility, User, Rsvp } from "@/types";
import type { RsvpSettings, StoreSettings } from "@prisma/client";

interface ReservationDialogProps {
	storeId: string;
	rsvpSettings: RsvpSettings | null;
	storeSettings?: StoreSettings | null;
	facilities: StoreFacility[];
	user: User | null;
	// Create mode props
	defaultRsvpTime?: Date;
	onReservationCreated?: (newRsvp: Rsvp) => void;
	// Edit mode props
	rsvp?: Rsvp;
	rsvps?: Rsvp[];
	onReservationUpdated?: (updatedRsvp: Rsvp) => void;
	// Common props
	storeTimezone?: string;
	trigger?: React.ReactNode;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	useCustomerCredit?: boolean;
	creditExchangeRate?: number | null;
	creditServiceExchangeRate?: number | null;
}

export function ReservationDialog({
	storeId,
	rsvpSettings,
	storeSettings,
	facilities,
	user,
	defaultRsvpTime,
	onReservationCreated,
	rsvp,
	rsvps = [],
	onReservationUpdated,
	storeTimezone = "Asia/Taipei",
	trigger,
	open,
	onOpenChange,
	useCustomerCredit = false,
	creditExchangeRate = null,
	creditServiceExchangeRate = null,
}: ReservationDialogProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [internalOpen, setInternalOpen] = useState(false);
	const isControlled = open !== undefined;
	const dialogOpen = isControlled ? open : internalOpen;
	const setDialogOpen = isControlled ? onOpenChange : setInternalOpen;

	// Determine if we're in edit mode
	const isEditMode = Boolean(rsvp);

	// Edit mode needs wider dialog for SlotPicker
	const dialogClassName = isEditMode
		? "max-w-[calc(100vw-2rem)] sm:max-w-[95vw] lg:max-w-[90vw] max-h-[calc(100vh-2rem)] overflow-y-auto w-full"
		: "max-w-[calc(100%-1rem)] sm:max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto";

	const handleReservationCreated = (newRsvp: Rsvp) => {
		setDialogOpen?.(false);
		onReservationCreated?.(newRsvp);
	};

	const handleReservationUpdated = (updatedRsvp: Rsvp) => {
		setDialogOpen?.(false);
		onReservationUpdated?.(updatedRsvp);
	};

	return (
		<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
			{trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
			<DialogContent className={dialogClassName}>
				<DialogHeader>
					<DialogTitle>
						{isEditMode ? t("edit_reservation") : t("create_Reservation")}
					</DialogTitle>
					<DialogDescription>
						{isEditMode
							? t("edit_reservation_description")
							: t("create_Reservation_description")}
					</DialogDescription>
				</DialogHeader>
				<div className="mt-4">
					<ReservationForm
						storeId={storeId}
						rsvpSettings={rsvpSettings}
						storeSettings={storeSettings}
						facilities={facilities}
						user={user}
						defaultRsvpTime={defaultRsvpTime}
						onReservationCreated={handleReservationCreated}
						rsvp={rsvp}
						rsvps={rsvps}
						storeTimezone={storeTimezone}
						onReservationUpdated={handleReservationUpdated}
						hideCard={true}
						useCustomerCredit={useCustomerCredit}
						creditExchangeRate={creditExchangeRate}
						creditServiceExchangeRate={creditServiceExchangeRate}
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
}
