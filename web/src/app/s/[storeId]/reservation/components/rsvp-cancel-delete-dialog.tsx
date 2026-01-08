"use client";

import { useMemo } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RsvpCancelPolicyInfo } from "@/components/rsvp-cancel-policy-info";
import { calculateCancelPolicyInfo } from "@/utils/rsvp-cancel-policy-utils";
import { epochToDate } from "@/utils/datetime-utils";
import { RsvpStatus } from "@/types/enum";
import type { Rsvp, RsvpSettings } from "@/types";

interface RsvpCancelDeleteDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	reservation: Rsvp | null;
	onConfirm: () => void | Promise<void>;
	isLoading?: boolean;
	rsvpSettings: RsvpSettings | null;
	storeCurrency?: string;
	useCustomerCredit?: boolean;
	creditExchangeRate?: number | null;
	t: (key: string) => string;
}

/**
 * Reusable dialog component for canceling or deleting RSVP reservations
 * Shows appropriate title and message based on reservation status
 * Displays cancel policy information if applicable
 */
export function RsvpCancelDeleteDialog({
	open,
	onOpenChange,
	reservation,
	onConfirm,
	isLoading = false,
	rsvpSettings,
	storeCurrency = "twd",
	useCustomerCredit = false,
	creditExchangeRate = null,
	t,
}: RsvpCancelDeleteDialogProps) {
	// Calculate cancel policy info for the reservation being cancelled
	const cancelPolicyInfo = useMemo(() => {
		if (!reservation) return null;

		const rsvpTimeDate = reservation.rsvpTime
			? epochToDate(
					typeof reservation.rsvpTime === "number"
						? BigInt(reservation.rsvpTime)
						: reservation.rsvpTime instanceof Date
							? BigInt(reservation.rsvpTime.getTime())
							: reservation.rsvpTime,
				)
			: null;

		return calculateCancelPolicyInfo(
			rsvpSettings,
			rsvpTimeDate,
			reservation.alreadyPaid ?? false,
		);
	}, [reservation, rsvpSettings]);

	const reservationRsvpTime = useMemo(() => {
		if (!reservation) return null;

		return reservation.rsvpTime
			? epochToDate(
					typeof reservation.rsvpTime === "number"
						? BigInt(reservation.rsvpTime)
						: reservation.rsvpTime instanceof Date
							? BigInt(reservation.rsvpTime.getTime())
							: reservation.rsvpTime,
				)
			: null;
	}, [reservation]);

	const isPending = reservation?.status === RsvpStatus.Pending;
	const isReadyToConfirm = reservation?.status === RsvpStatus.ReadyToConfirm;
	const isDelete = isPending || isReadyToConfirm;

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						{isDelete
							? t("rsvp_delete_reservation")
							: t("rsvp_cancel_reservation")}
					</AlertDialogTitle>
					<AlertDialogDescription>
						{isDelete
							? t("rsvp_delete_reservation_confirmation")
							: t("rsvp_cancel_reservation_confirmation")}
					</AlertDialogDescription>
				</AlertDialogHeader>
				{reservation && (
					<RsvpCancelPolicyInfo
						cancelPolicyInfo={cancelPolicyInfo}
						rsvpTime={reservationRsvpTime}
						alreadyPaid={reservation.alreadyPaid ?? false}
						rsvpSettings={rsvpSettings}
						facilityCost={
							reservation.facilityCost ? Number(reservation.facilityCost) : null
						}
						serviceStaffCost={
							reservation.serviceStaffCost
								? Number(reservation.serviceStaffCost)
								: null
						}
						currency={storeCurrency}
						useCustomerCredit={useCustomerCredit}
						creditExchangeRate={creditExchangeRate}
					/>
				)}
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isLoading}>
						{t("cancel")}
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={onConfirm}
						disabled={isLoading}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{isLoading
							? isDelete
								? t("deleting")
								: t("cancelling")
							: t("confirm")}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
