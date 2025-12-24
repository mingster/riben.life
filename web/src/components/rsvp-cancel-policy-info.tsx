"use client";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import type { CancelPolicyInfo } from "@/utils/rsvp-cancel-policy-utils";

interface RsvpCancelPolicyInfoProps {
	cancelPolicyInfo: CancelPolicyInfo | null;
	rsvpTime?: Date | null;
	alreadyPaid?: boolean;
}

/**
 * Shared component for displaying cancel policy information in RSVP forms
 * Shows cancellation policy details including hours until reservation and refund status
 */
export function RsvpCancelPolicyInfo({
	cancelPolicyInfo,
	rsvpTime,
	alreadyPaid = false,
}: RsvpCancelPolicyInfoProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	if (!cancelPolicyInfo) {
		return null;
	}

	return (
		<div className="mt-2 p-3 rounded-md bg-muted/50 border border-border">
			<div className="text-xs font-medium mb-1">
				{t("cancel_policy") || "Cancel Policy"}
			</div>
			<div className="text-xs text-muted-foreground space-y-1">
				<div>
					{t("cancel_hours_policy", {
						hours: cancelPolicyInfo.cancelHours,
					}) ||
						`Cancellation must be made at least ${cancelPolicyInfo.cancelHours} hours before reservation time.`}
				</div>
				{rsvpTime && (
					<div>
						{cancelPolicyInfo.hoursUntilReservation > 0 ? (
							<>
								{t("hours_until_reservation", {
									hours:
										Math.round(cancelPolicyInfo.hoursUntilReservation * 10) /
										10,
								}) ||
									`${Math.round(cancelPolicyInfo.hoursUntilReservation * 10) / 10} hours until reservation`}
							</>
						) : (
							<>{t("reservation_passed") || "Reservation time has passed"}</>
						)}
					</div>
				)}
				{alreadyPaid && (
					<div
						className={
							cancelPolicyInfo.wouldRefund
								? "text-green-600 dark:text-green-400 font-medium"
								: "text-orange-600 dark:text-orange-400 font-medium"
						}
					>
						{cancelPolicyInfo.wouldRefund
							? t("cancellation_would_refund") ||
								"✓ Cancellation would result in refund"
							: t("cancellation_no_refund") ||
								"⚠ Cancellation within policy window - no refund"}
					</div>
				)}
			</div>
		</div>
	);
}
