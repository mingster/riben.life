/**
 * Unified /unv marketing: which product line is shown (hero + body below).
 * URL: /unv?system=order|rsvp|waitlist
 */
export type MarketingSystemId = "order" | "rsvp" | "waitlist";

const VALID_SYSTEMS = new Set<MarketingSystemId>(["order", "rsvp", "waitlist"]);

export function parseMarketingSystemId(
	raw: string | null | undefined,
): MarketingSystemId {
	if (raw && VALID_SYSTEMS.has(raw as MarketingSystemId)) {
		return raw as MarketingSystemId;
	}
	return "order";
}
