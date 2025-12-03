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
import { EditReservationForm } from "./edit-reservation-form";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import type { StoreFacility, User, Rsvp } from "@/types";
import type { RsvpSettings, StoreSettings } from "@prisma/client";

interface EditReservationDialogProps {
	storeId: string;
	rsvpSettings: RsvpSettings | null;
	storeSettings: StoreSettings | null;
	facilities: StoreFacility[];
	user: User | null;
	rsvp: Rsvp;
	rsvps: Rsvp[];
	storeTimezone?: string;
	trigger?: React.ReactNode;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	onReservationUpdated?: (updatedRsvp: Rsvp) => void;
}

export function EditReservationDialog({
	storeId,
	rsvpSettings,
	storeSettings,
	facilities,
	user,
	rsvp,
	rsvps,
	storeTimezone = "Asia/Taipei",
	trigger,
	open,
	onOpenChange,
	onReservationUpdated,
}: EditReservationDialogProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [internalOpen, setInternalOpen] = useState(false);
	const isControlled = open !== undefined;
	const dialogOpen = isControlled ? open : internalOpen;
	const setDialogOpen = isControlled ? onOpenChange : setInternalOpen;

	const handleReservationUpdated = (updatedRsvp: Rsvp) => {
		// Close dialog after successful update
		setDialogOpen?.(false);
		// Call parent callback with the updated reservation
		onReservationUpdated?.(updatedRsvp);
	};

	return (
		<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
			{trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
			<DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[95vw] lg:max-w-[90vw] max-h-[calc(100vh-2rem)] overflow-y-auto w-full">
				<DialogHeader>
					<DialogTitle>{t("edit_reservation")}</DialogTitle>
					<DialogDescription>
						{t("edit_reservation_description")}
					</DialogDescription>
				</DialogHeader>
				<div className="mt-4">
					<EditReservationForm
						storeId={storeId}
						rsvpSettings={rsvpSettings}
						storeSettings={storeSettings}
						facilities={facilities}
						user={user}
						rsvp={rsvp}
						rsvps={rsvps}
						storeTimezone={storeTimezone}
						onReservationUpdated={handleReservationUpdated}
						hideCard={true}
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
}
