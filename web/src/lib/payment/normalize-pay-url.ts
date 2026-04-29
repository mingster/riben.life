/**
 * Pure helper for comparing payment processor identifiers. Safe for client bundles.
 */
export function normalizePayUrl(payUrl: string): string {
	return payUrl.trim().toLowerCase();
}
