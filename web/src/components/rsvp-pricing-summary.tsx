"use client";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { Separator } from "@/components/ui/separator";

interface RsvpPricingSummaryProps {
	facilityId?: string | null;
	facilityCost: number | null | undefined;
	serviceStaffId?: string | null;
	serviceStaffCost: number | null | undefined;
	totalCost: number;
	storeCurrency: string;
	isPricingLoading?: boolean;
	discountAmount?: number; // Optional discount amount from pricingData
	/** When true, hide the unpaid reservation hold time message */
	alreadyPaid?: boolean;
}

export function RsvpPricingSummary({
	facilityId,
	facilityCost,
	serviceStaffId,
	serviceStaffCost,
	totalCost,
	storeCurrency,
	isPricingLoading = false,
	discountAmount,
	alreadyPaid = false,
}: RsvpPricingSummaryProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	// Currency formatter helper
	const formatCurrency = (amount: number): string => {
		const formatter = new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: storeCurrency.toUpperCase(),
			maximumFractionDigits: 2,
			minimumFractionDigits: 2,
		});
		return formatter.format(amount);
	};

	return (
		<div className="rounded-lg border bg-muted/30 p-4 space-y-2">
			<p className="text-sm font-semibold">
				{t("rsvp_pricing_summary") || "Pricing Summary"}
			</p>
			<div className="space-y-1 text-sm">
				{facilityId && facilityCost !== null && facilityCost !== undefined && (
					<div className="flex justify-between">
						<span className="text-muted-foreground">
							{t("rsvp_facility_cost")}:
						</span>
						<span className="font-medium">{formatCurrency(facilityCost)}</span>
					</div>
				)}
				{serviceStaffId &&
					serviceStaffCost !== null &&
					serviceStaffCost !== undefined &&
					serviceStaffCost > 0 && (
						<div className="flex justify-between">
							<span className="text-muted-foreground">
								{t("rsvp_service_staff_cost") || "Service Staff Cost"}:
							</span>
							<span className="font-medium">
								{formatCurrency(serviceStaffCost)}
							</span>
						</div>
					)}
				{discountAmount !== undefined && discountAmount > 0 && (
					<div className="flex justify-between text-green-600 dark:text-green-400">
						<span>{t("rsvp_discount") || "Discount"}:</span>
						<span className="font-medium">
							-{formatCurrency(discountAmount)}
						</span>
					</div>
				)}
				<Separator />
				<div className="flex justify-between font-semibold text-base">
					<span>{t("rsvp_total_cost") || "Total Cost"}:</span>
					<span>
						{formatCurrency(totalCost)}
						{isPricingLoading && (
							<span className="ml-2 text-xs text-muted-foreground font-normal">
								({t("calculating") || "Calculating..."})
							</span>
						)}
					</span>
				</div>
				{!alreadyPaid && (
					<div className="mt-2 text-primary">
						{t("rsvp_unpaid_reservation_hold_time") ||
							"Unpaid reservations will only be held for 5 minutes, please pay as soon as possible."}
					</div>
				)}
			</div>
		</div>
	);
}
