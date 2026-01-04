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
	serviceStaffCost?: number | null; // Optional service staff cost
	currency?: string; // Store currency (e.g., "twd", "usd")
	useCustomerCredit?: boolean; // Whether store uses customer credit system
	creditExchangeRate?: number | null; // Credit points to cash conversion rate (1 point = X dollars)
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
	serviceStaffCost,
	currency = "twd", // Default to TWD if not provided
	useCustomerCredit = false,
	creditExchangeRate = null,
}: RsvpCancelPolicyInfoProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	// If canCancel is false, show cannot cancel message
	if (rsvpSettings?.canCancel === false) {
		return (
			<div className="mt-2 p-3 rounded-md bg-muted/50 border border-border">
				<div className="text-xs font-medium mb-1">
					{t("cancel_policy") || "Cancel Policy"}
				</div>
				<div className="text-xs text-muted-foreground">
					{t("rsvp_cannot_cancel_reservation") ||
						"Reservations cannot be cancelled"}
				</div>
			</div>
		);
	}

	// If cancelPolicyInfo is null (canCancel not enabled or invalid), don't show anything
	if (!cancelPolicyInfo) {
		return null;
	}

	// Calculate total cost: facility cost + service staff cost (if provided), otherwise use rsvpSettings.defaultCost
	const facility = facilityCost ?? 0;
	const staff = serviceStaffCost ?? 0;
	const totalCost = facility + staff > 0 ? facility + staff : rsvpSettings?.defaultCost ?? null;

	return (
		<div className="mt-2 p-3 rounded-md bg-muted/50 border border-border">
			<div className="text-xs font-medium mb-1">
				{t("cancel_policy") || "Cancel Policy"}
			</div>

			<div className="text-xs text-muted-foreground space-y-1">
				<ol className="list-decimal list-inside space-y-1 text-muted-foreground">
					{rsvpSettings?.canCancel && (
						<li>
							{t("rsvp_cancellation_policy", {
								hours: rsvpSettings.cancelHours ?? 24,
							})}
						</li>
					)}

					{/* TODO: Display credit points needed if useCustomerCredit is true and there's a facility cost
					{useCustomerCredit &&
						creditExchangeRate &&
						creditExchangeRate > 0 &&
						totalCost !== null &&
						totalCost > 0 && (
							<li>
								{(() => {
									// Convert facility cost to credit points: creditPoints = dollarAmount / creditExchangeRate
									// This matches the calculation in process-rsvp-prepaid-payment.ts
									const requiredCredit = Number(totalCost) / creditExchangeRate;
									return (
										t("rsvp_prepaid_required", {
											points: Math.ceil(requiredCredit),
										})
									);
								})()}
							</li>
						)}
 */}

					{/* display fiat needed for selected facility */}
					{rsvpSettings &&
						(rsvpSettings.minPrepaidPercentage ?? 0) > 0 &&
						totalCost &&
						totalCost > 0 &&
						(() => {
							const percentage = Number(rsvpSettings.minPrepaidPercentage ?? 0);
							const prepaid = Math.ceil(Number(totalCost) * (percentage / 100));

							// If store uses customer credit, calculate and display credit points
							if (
								useCustomerCredit &&
								creditExchangeRate &&
								creditExchangeRate > 0
							) {
								const requiredCredit = prepaid / creditExchangeRate;
								return (
									<>
										<li>
											{t("rsvp_prepaid_required", {
												points: Math.ceil(requiredCredit),
											}) ||
												`This reservation will deduct your prepaid points: ${Math.ceil(requiredCredit)} points.`}
										</li>
										{totalCost > 0 && (
											<li>
												{t("rsvp_facility_cost", {
													amount: Number(totalCost).toFixed(2),
													currency: currency.toUpperCase(),
												}) ||
													`Facility cost: ${Number(totalCost).toFixed(2)} ${currency.toUpperCase()}`}
											</li>
										)}
									</>
								);
							}

							// Otherwise, just display fiat amount
							return (
								<li>
									{t("rsvp_prepaid_required_fiat", {
										amount: Number(prepaid).toFixed(2),
										currency: currency.toUpperCase(),
									}) ||
										`Prepaid required. This reservation will deduct ${Number(prepaid).toFixed(2)} ${currency.toUpperCase()}.`}
								</li>
							);
						})()}

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
