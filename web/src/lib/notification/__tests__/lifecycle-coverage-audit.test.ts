/**
 * Lifecycle template coverage audit.
 *
 * Maps every key from getLifecycleTemplateNames() to one of three statuses:
 *   resolved_at_send   - a code path calls renderLifecycleTemplateMessage / sendCreditSuccess etc.
 *   intentionally_unused - an explicit product decision not to send this notification
 *   gap                - no code path today (tracked here, to be closed over time)
 *
 * The test asserts the gap count matches EXPECTED_GAP_COUNT so CI fails when gaps
 * are introduced without being classified, or when gaps are closed without updating this file.
 */

import { describe, expect, it } from "bun:test";
import { LIFECYCLE_CHANNELS } from "../lifecycle-events";
import { getLifecycleTemplateNames } from "../template-registry";

// ---------------------------------------------------------------------------
// Classification maps (email channel only — non-email keys are mirrored from
// the email row; see LIFECYCLE-NOTIFICATION-MATRIX.md § Channel semantics)
// ---------------------------------------------------------------------------

/** Events where renderLifecycleTemplateMessage is called with email channel. */
const RESOLVED_AT_SEND_EMAIL = new Set<string>([
	// reservation — staff notifications
	"reservation.created.staff.email",
	"reservation.updated.staff.email",
	"reservation.cancelled.staff.email",
	"reservation.confirmed_by_customer.staff.email",
	"reservation.ready_to_confirm.staff.email",
	"reservation.checked_in.staff.email",
	"reservation.reminder.staff.email",
	// reservation — customer notifications
	"reservation.updated.customer.email",
	"reservation.cancelled.customer.email",
	"reservation.confirmed_by_store.customer.email",
	"reservation.ready.customer.email",
	"reservation.completed.customer.email",
	"reservation.reminder.customer.email",
	"reservation.created.customer.email",
	// order — sendCreditSuccess (caller wired)
	"order.credit_topup_completed.customer.email",
	// subscription — sendCancelSubscription (caller wired)
	"subscription.cancelled.customer.email",
]);

/** Rows that exist in the catalog but are explicitly excluded from sending. */
const INTENTIONALLY_UNUSED_EMAIL = new Set<string>([]);

// ---------------------------------------------------------------------------
// All non-email channel keys are classified as "email_canonical": the router
// always resolves the .email row then broadcasts the same body across channels.
// ---------------------------------------------------------------------------

/** All non-email channels from the lifecycle definition. */
const NON_EMAIL_CHANNELS = LIFECYCLE_CHANNELS.filter((c) => c !== "email");

function isEmailCanonical(key: string): boolean {
	return NON_EMAIL_CHANNELS.some((ch) => key.endsWith(`.${ch}`));
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

type CoverageStatus =
	| "resolved_at_send"
	| "intentionally_unused"
	| "email_canonical"
	| "gap";

function classify(key: string): CoverageStatus {
	if (isEmailCanonical(key)) return "email_canonical";
	if (RESOLVED_AT_SEND_EMAIL.has(key)) return "resolved_at_send";
	if (INTENTIONALLY_UNUSED_EMAIL.has(key)) return "intentionally_unused";
	return "gap";
}

describe("lifecycle template coverage audit", () => {
	const allKeys = getLifecycleTemplateNames();

	it("catalog is non-empty", () => {
		expect(allKeys.length).toBeGreaterThan(100);
	});

	it("all classified keys exist in the catalog", () => {
		const catalogSet = new Set(allKeys);
		for (const key of RESOLVED_AT_SEND_EMAIL) {
			expect(catalogSet.has(key)).toBe(true);
		}
		for (const key of INTENTIONALLY_UNUSED_EMAIL) {
			expect(catalogSet.has(key)).toBe(true);
		}
	});

	it("documents current gap count (update when gaps close)", () => {
		const gaps = allKeys.filter((k) => classify(k) === "gap");

		// Known email-channel gaps as of plan execution:
		//   reservation (5): deleted.customer, confirmed_by_customer.customer,
		//     payment_received.customer, no_show.customer
		//   order (8): paid/cancelled/refunded/completed customer + staff rows
		//     except credit_topup_completed.customer (resolved) and
		//     payment_received customer/staff (fallback only, omitted from catalog);
		//     cancelled.customer uses subscription domain
		//   subscription (2): created.customer.email (templates added; send path TBD),
		//     cancelled.customer.email resolved at sendCancelSubscription
		const EXPECTED_GAP_COUNT = 12;

		if (gaps.length !== EXPECTED_GAP_COUNT) {
			const gapList = gaps.map((k) => `  ${k}`).join("\n");
			throw new Error(
				`Gap count changed: expected ${EXPECTED_GAP_COUNT}, got ${gaps.length}.\n` +
					"Update EXPECTED_GAP_COUNT in this file and close or document new gaps.\n" +
					`Current gaps:\n${gapList}`,
			);
		}
	});

	it("produces a full coverage report (informational)", () => {
		const counts: Record<CoverageStatus, number> = {
			resolved_at_send: 0,
			intentionally_unused: 0,
			email_canonical: 0,
			gap: 0,
		};
		for (const key of allKeys) {
			counts[classify(key)]++;
		}
		// Just log; the counts test above guards the gap count.
		expect(counts.resolved_at_send).toBeGreaterThan(0);
		expect(counts.email_canonical).toBeGreaterThan(0);
	});
});
