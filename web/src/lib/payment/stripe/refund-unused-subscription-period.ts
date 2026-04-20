import type Stripe from "stripe";

import logger from "@/lib/logger";
import { stripe } from "@/lib/payment/stripe/config";
import {
	getStripeSubscriptionPeriodEndUnix,
	getStripeSubscriptionPeriodStartUnix,
} from "@/lib/payment/stripe/subscription-period-end";
import { SafeError } from "@/utils/error";

/** Stripe typings omit some invoice fields present at runtime (API 2026+). */
type InvoiceWithPaymentRefs = Stripe.Invoice & {
	payment_intent?: unknown;
	charge?: unknown;
};

type InvoiceLineLoose = {
	type?: string;
	subscription_item?: string | { id?: string } | null;
	period?: { start?: number; end?: number };
	amount?: number;
};

function lineLoose(line: Stripe.InvoiceLineItem): InvoiceLineLoose {
	return line as unknown as InvoiceLineLoose;
}

function paymentRefFromInvoice(
	invoice: Stripe.Invoice,
):
	| { type: "payment_intent"; id: string }
	| { type: "charge"; id: string }
	| null {
	const inv = invoice as InvoiceWithPaymentRefs;
	const pi = inv.payment_intent;
	if (typeof pi === "string" && pi.length > 0) {
		return { type: "payment_intent", id: pi };
	}
	if (pi && typeof pi === "object" && "id" in pi) {
		const id = (pi as { id: unknown }).id;
		if (typeof id === "string" && id.length > 0) {
			return { type: "payment_intent", id };
		}
	}
	const ch = inv.charge;
	if (typeof ch === "string" && ch.length > 0) {
		return { type: "charge", id: ch };
	}
	if (ch && typeof ch === "object" && "id" in ch) {
		const id = (ch as { id: unknown }).id;
		if (typeof id === "string" && id.length > 0) {
			return { type: "charge", id };
		}
	}
	return null;
}

function lineSubscriptionItemId(line: Stripe.InvoiceLineItem): string | null {
	const raw = lineLoose(line).subscription_item;
	if (typeof raw === "string") {
		return raw;
	}
	if (raw && typeof raw === "object" && typeof raw.id === "string") {
		return raw.id;
	}
	return null;
}

function lineType(line: Stripe.InvoiceLineItem): string | undefined {
	return lineLoose(line).type;
}

/**
 * Finds the paid invoice whose subscription line matches this subscription item
 * and current billing period.
 */
async function findPaidInvoiceForCurrentPeriod(
	subscriptionId: string,
	subscriptionItemId: string,
	periodStart: number,
	periodEnd: number,
): Promise<Stripe.Invoice | null> {
	const invoices = await stripe.invoices.list({
		subscription: subscriptionId,
		status: "paid",
		limit: 30,
	});

	for (const inv of invoices.data) {
		for (const line of inv.lines?.data ?? []) {
			if (lineType(line) !== "subscription") {
				continue;
			}
			const itemId = lineSubscriptionItemId(line);
			const ps = lineLoose(line).period?.start;
			const pe = lineLoose(line).period?.end;
			const periodMatch = ps === periodStart && pe === periodEnd;
			const itemMatch = itemId === subscriptionItemId;
			if (periodMatch && itemMatch) {
				return inv;
			}
		}
	}
	// Fallback: period match only (older invoices may omit item id linkage in edge cases)
	for (const inv of invoices.data) {
		for (const line of inv.lines?.data ?? []) {
			if (lineType(line) !== "subscription") {
				continue;
			}
			const ps = lineLoose(line).period?.start;
			const pe = lineLoose(line).period?.end;
			if (ps === periodStart && pe === periodEnd) {
				return inv;
			}
		}
	}
	return null;
}

/**
 * Refunds a proportional share of the current subscription period (unused time)
 * to the original payment method. Does not use subscription proration credits.
 *
 * @returns Refunded amount in smallest currency unit, or 0 if skipped.
 */
export async function refundUnusedCurrentSubscriptionPeriod(params: {
	subscriptionId: string;
	subscriptionItemId: string;
	storeId: string;
	/** Stripe refund metadata `reason` (default: interval-change flow). */
	refundMetadataReason?: string;
}): Promise<{ amountRefunded: number }> {
	const sub = await stripe.subscriptions.retrieve(params.subscriptionId, {
		expand: ["items.data.price"],
	});

	if (sub.status === "trialing") {
		return { amountRefunded: 0 };
	}

	const periodStart = getStripeSubscriptionPeriodStartUnix(sub);
	const periodEnd = getStripeSubscriptionPeriodEndUnix(sub);
	if (periodStart === null || periodEnd === null || periodEnd <= periodStart) {
		logger.warn(
			"refundUnusedCurrentSubscriptionPeriod: missing period bounds",
			{
				metadata: {
					subscriptionId: params.subscriptionId,
					storeId: params.storeId,
				},
				tags: ["stripe", "subscription", "refund"],
			},
		);
		return { amountRefunded: 0 };
	}

	const nowSec = Math.floor(Date.now() / 1000);
	if (nowSec >= periodEnd) {
		return { amountRefunded: 0 };
	}

	const unusedRatio = (periodEnd - nowSec) / (periodEnd - periodStart);
	if (unusedRatio <= 0 || unusedRatio > 1) {
		return { amountRefunded: 0 };
	}

	const invoice = await findPaidInvoiceForCurrentPeriod(
		params.subscriptionId,
		params.subscriptionItemId,
		periodStart,
		periodEnd,
	);
	if (!invoice) {
		throw new SafeError(
			"No paid invoice found for the current billing period; cannot refund unused time.",
		);
	}

	let periodLineTotal = 0;
	for (const line of invoice.lines?.data ?? []) {
		if (lineType(line) !== "subscription") {
			continue;
		}
		const ps = lineLoose(line).period?.start;
		const pe = lineLoose(line).period?.end;
		if (ps !== periodStart || pe !== periodEnd) {
			continue;
		}
		const itemId = lineSubscriptionItemId(line);
		if (itemId === params.subscriptionItemId) {
			periodLineTotal += lineLoose(line).amount ?? 0;
		}
	}
	if (periodLineTotal === 0) {
		for (const line of invoice.lines?.data ?? []) {
			if (lineType(line) !== "subscription") {
				continue;
			}
			const ps = lineLoose(line).period?.start;
			const pe = lineLoose(line).period?.end;
			if (ps === periodStart && pe === periodEnd) {
				periodLineTotal += lineLoose(line).amount ?? 0;
			}
		}
	}

	if (periodLineTotal <= 0) {
		return { amountRefunded: 0 };
	}

	const refundCents = Math.floor(periodLineTotal * unusedRatio);
	if (refundCents <= 0) {
		return { amountRefunded: 0 };
	}

	const payRef = paymentRefFromInvoice(invoice);
	if (!payRef) {
		throw new SafeError(
			"The paid invoice has no charge or payment intent; cannot refund unused time.",
		);
	}

	let refundableCap = refundCents;
	if (payRef.type === "payment_intent") {
		const pi = await stripe.paymentIntents.retrieve(payRef.id, {
			expand: ["latest_charge"],
		});
		const lc = pi.latest_charge;
		if (lc && typeof lc === "object" && "amount" in lc) {
			const chargeObj = lc as Stripe.Charge;
			refundableCap = Math.min(
				refundCents,
				Math.max(0, chargeObj.amount - (chargeObj.amount_refunded ?? 0)),
			);
		} else if (typeof lc === "string") {
			const ch = await stripe.charges.retrieve(lc);
			refundableCap = Math.min(
				refundCents,
				Math.max(0, ch.amount - (ch.amount_refunded ?? 0)),
			);
		} else {
			const received = pi.amount_received ?? 0;
			refundableCap = Math.min(refundCents, Math.max(0, received));
		}
	} else {
		const ch = await stripe.charges.retrieve(payRef.id);
		refundableCap = Math.min(
			refundCents,
			Math.max(0, ch.amount - (ch.amount_refunded ?? 0)),
		);
	}

	if (refundableCap <= 0) {
		throw new SafeError(
			"No refundable amount remains on the original payment; cannot refund unused subscription time.",
		);
	}

	const metadata = {
		reason:
			params.refundMetadataReason ?? "subscription_interval_change_unused",
		store_id: params.storeId,
		subscription_id: params.subscriptionId,
	};

	if (payRef.type === "payment_intent") {
		const refund = await stripe.refunds.create({
			payment_intent: payRef.id,
			amount: refundableCap,
			metadata,
		});
		logger.info(
			"Subscription interval change: partial refund (PaymentIntent)",
			{
				metadata: {
					storeId: params.storeId,
					subscriptionId: params.subscriptionId,
					refundId: refund.id,
					amount: refund.amount,
				},
				tags: ["stripe", "subscription", "refund"],
			},
		);
		return { amountRefunded: refund.amount };
	}

	const refund = await stripe.refunds.create({
		charge: payRef.id,
		amount: refundableCap,
		metadata,
	});
	logger.info("Subscription interval change: partial refund (charge)", {
		metadata: {
			storeId: params.storeId,
			subscriptionId: params.subscriptionId,
			refundId: refund.id,
			amount: refund.amount,
		},
		tags: ["stripe", "subscription", "refund"],
	});
	return { amountRefunded: refund.amount };
}
