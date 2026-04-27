import {
	internalMinorToMajor,
	majorUnitsToInternalMinor,
} from "@/lib/payment/stripe/stripe-money";

function clampPrepaidPercentage(pct: number): number {
	const n = Math.round(Number(pct));
	if (!Number.isFinite(n)) {
		return 0;
	}
	return Math.min(100, Math.max(0, n));
}

/**
 * Store policy enables online prepayment when either percentage or fixed floor is set.
 * (`minPrepaidAmount` is internal minor — major × 100 — same as checkout.)
 */
export function isRsvpPrepaidPolicyEnabled(params: {
	minPrepaidPercentage: number;
	minPrepaidAmount: number;
}): boolean {
	const pct = Number(params.minPrepaidPercentage ?? 0);
	const floor = Number(params.minPrepaidAmount ?? 0);
	return pct > 0 || floor > 0;
}

/** True when the store policy requires a positive online prepayment (checkout path). */
export function isRsvpPrepaidRequired(params: {
	minPrepaidPercentage: number;
	minPrepaidAmount: number;
	totalCostMajor: number;
}): boolean {
	return computeRequiredRsvpPrepaidMajor(params) > 0;
}

/**
 * Minimum amount the customer must prepay online (store currency **major** units),
 * capped at the reservation quote total.
 *
 * Percentage is applied in internal minor; floor uses **internal minor** per schema.
 */
export function computeRequiredRsvpPrepaidMajor(params: {
	minPrepaidPercentage: number;
	minPrepaidAmount: number;
	totalCostMajor: number;
}): number {
	const total = params.totalCostMajor;
	if (!Number.isFinite(total) || total < 0) {
		return 0;
	}
	const pct = clampPrepaidPercentage(Number(params.minPrepaidPercentage ?? 0));
	const floorMinor = Math.max(0, Math.round(Number(params.minPrepaidAmount ?? 0)));
	// Quote is $0: percentage of 0 is 0; minimum floor (internal minor) still applies.
	if (total === 0) {
		if (floorMinor <= 0) {
			return 0;
		}
		return internalMinorToMajor(floorMinor);
	}
	const totalMinor = majorUnitsToInternalMinor(total);
	const pctPart = Math.ceil((totalMinor * pct) / 100);
	const requiredMinor = Math.min(totalMinor, Math.max(pctPart, floorMinor));
	return internalMinorToMajor(requiredMinor);
}
