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
import { AdminReservationForm } from "./admin-reservation-form";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import type { Rsvp } from "@/types";

interface AdminEditRsvpDialogProps {
	storeId: string;
	rsvpSettings: {
		minPrepaidPercentage?: number | null;
		canCancel?: boolean | null;
		cancelHours?: number | null;
		singleServiceMode?: boolean | null;
		defaultDuration?: number | null;
		useBusinessHours?: boolean | null;
		rsvpHours?: string | null;
	} | null;
	storeSettings?: {
		businessHours?: string | null;
	} | null;
	// Create mode props
	defaultRsvpTime?: Date;
	onReservationCreated?: (newRsvp: Rsvp) => void;
	// Edit mode props
	rsvp?: Rsvp | null;
	existingReservations?: Rsvp[];
	onReservationUpdated?: (updatedRsvp: Rsvp) => void;
	// Common props
	storeTimezone?: string;
	storeCurrency?: string;
	storeUseBusinessHours?: boolean | null;
	trigger?: React.ReactNode;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	useCustomerCredit?: boolean;
	creditExchangeRate?: number | null;
}

export function AdminEditRsvpDialog({
	storeId,
	rsvpSettings,
	storeSettings,
	defaultRsvpTime,
	onReservationCreated,
	rsvp,
	existingReservations = [],
	onReservationUpdated,
	storeTimezone = "Asia/Taipei",
	storeCurrency = "twd",
	storeUseBusinessHours,
	trigger,
	open,
	onOpenChange,
	useCustomerCredit = false,
	creditExchangeRate = null,
}: AdminEditRsvpDialogProps) {
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
						{isEditMode
							? t("rsvp_admin_edit_reservation")
							: t("rsvp_admin_create_reservation")}
					</DialogTitle>
					<DialogDescription>
						{isEditMode
							? t("rsvp_admin_edit_reservation_description")
							: t("rsvp_admin_create_reservation_description")}
					</DialogDescription>
				</DialogHeader>
				<div className="mt-4">
					<AdminReservationForm
						storeId={storeId}
						rsvpSettings={rsvpSettings}
						storeSettings={storeSettings || null}
						defaultRsvpTime={defaultRsvpTime}
						onReservationCreated={handleReservationCreated}
						rsvp={rsvp}
						existingReservations={existingReservations}
						storeTimezone={storeTimezone}
						storeCurrency={storeCurrency}
						storeUseBusinessHours={storeUseBusinessHours}
						onReservationUpdated={handleReservationUpdated}
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
}
