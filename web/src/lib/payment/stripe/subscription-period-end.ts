import type Stripe from "stripe";

/**
 * Current billing period end as Unix seconds. Stripe typings moved period fields
 * to subscription items in newer API versions; this supports both shapes.
 */
export function getStripeSubscriptionPeriodEndUnix(
	subscription: Stripe.Subscription,
): number | null {
	const fromItem = subscription.items?.data?.[0]?.current_period_end;
	if (typeof fromItem === "number") {
		return fromItem;
	}
	const legacy = subscription as unknown as { current_period_end?: unknown };
	if (typeof legacy.current_period_end === "number") {
		return legacy.current_period_end;
	}
	return null;
}

/** Current billing period start as Unix seconds (subscription item or legacy). */
export function getStripeSubscriptionPeriodStartUnix(
	subscription: Stripe.Subscription,
): number | null {
	const fromItem = subscription.items?.data?.[0]?.current_period_start;
	if (typeof fromItem === "number") {
		return fromItem;
	}
	const legacy = subscription as unknown as { current_period_start?: unknown };
	if (typeof legacy.current_period_start === "number") {
		return legacy.current_period_start;
	}
	return null;
}
