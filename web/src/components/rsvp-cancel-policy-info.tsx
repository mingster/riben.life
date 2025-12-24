"use client";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import type { CancelPolicyInfo } from "@/utils/rsvp-cancel-policy-utils";

interface RsvpCancelPolicyInfoProps {
	cancelPolicyInfo: CancelPolicyInfo | null;
	rsvpTime?: Date | null;
	alreadyPaid?: boolean;
	rsvpSettings?: {
		minPrepaidPercentage?: number | null;
		canCancel?: boolean | null;
		cancelHours?: number | null;
		defaultCost?: number | null; // Optional default cost for prepaid calculation
	} | null;
	facilityCost?: number | null; // Optional facility cost (used if provided, otherwise falls back to defaultCost)
	currency?: string; // Store currency (e.g., "twd", "usd")
}

/**
 * Shared component for displaying cancel policy information in RSVP forms
 * Shows cancellation policy details including hours until reservation and refund status
 */
export function RsvpCancelPolicyInfo({
	cancelPolicyInfo,
	rsvpTime,
	alreadyPaid = false,
	rsvpSettings,
	facilityCost,
	currency = "twd", // Default to TWD if not provided
}: RsvpCancelPolicyInfoProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	if (!cancelPolicyInfo) {
		return null;
	}

	// Calculate total cost: use facilityCost if provided, otherwise use rsvpSettings.defaultCost
	const totalCost = facilityCost ?? rsvpSettings?.defaultCost ?? null;

	return (
		<div className="mt-2 p-3 rounded-md bg-muted/50 border border-border">
			<div className="text-xs font-medium mb-1">
				{t("cancel_policy") || "Cancel Policy"}
			</div>

			<div className="text-xs text-muted-foreground space-y-1">
				<ol className="list-decimal list-inside space-y-1 text-muted-foreground">
					{rsvpSettings &&
						(rsvpSettings.minPrepaidPercentage ?? 0) > 0 &&
						totalCost &&
						totalCost > 0 && (
							<li>
								{(() => {
									const percentage = Number(
										rsvpSettings.minPrepaidPercentage ?? 0,
									);
									const prepaid = Math.ceil(
										Number(totalCost) * (percentage / 100),
									);

									return (t("rsvp_prepaid_required_fiat", {
										amount: Number(prepaid).toFixed(2),
										currency: currency.toUpperCase(),
									}));
								})()}
							</li>
						)}

					{rsvpSettings?.canCancel && (
						<li>
							{t("rsvp_cancellation_policy", {
								hours: rsvpSettings.cancelHours ?? 24,
							})}
						</li>
					)}

					{rsvpTime && (
						<li>
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
								<>
									{t("reservation_time_passed") ||
										"Reservation time has passed"}
								</>
							)}
						</li>
					)}
				</ol>

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
