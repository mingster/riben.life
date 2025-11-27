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
import type { RsvpSettings } from "@prisma/client";

interface ReservationDialogProps {
	storeId: string;
	rsvpSettings: RsvpSettings | null;
	facilities: StoreFacility[];
	user: User | null;
	defaultRsvpTime?: Date;
	trigger?: React.ReactNode;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	onReservationCreated?: (newRsvp: Rsvp) => void;
}

export function ReservationDialog({
	storeId,
	rsvpSettings,
	facilities,
	user,
	defaultRsvpTime,
	trigger,
	open,
	onOpenChange,
	onReservationCreated,
}: ReservationDialogProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [internalOpen, setInternalOpen] = useState(false);
	const isControlled = open !== undefined;
	const dialogOpen = isControlled ? open : internalOpen;
	const setDialogOpen = isControlled ? onOpenChange : setInternalOpen;

	const handleReservationCreated = (newRsvp: Rsvp) => {
		// Close dialog after successful creation
		setDialogOpen?.(false);
		// Call parent callback with the new reservation
		onReservationCreated?.(newRsvp);
	};

	return (
		<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
			{trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
			<DialogContent className="max-w-[calc(100%-1rem)] sm:max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{t("Create_Reservation")}</DialogTitle>
					<DialogDescription>
						{t("Create_Reservation_description")}
					</DialogDescription>
				</DialogHeader>
				<div className="mt-4">
					<ReservationForm
						storeId={storeId}
						rsvpSettings={rsvpSettings}
						facilities={facilities}
						user={user}
						defaultRsvpTime={defaultRsvpTime}
						onReservationCreated={handleReservationCreated}
						hideCard={true}
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
}
