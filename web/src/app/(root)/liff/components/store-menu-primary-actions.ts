import type { ReadonlyURLSearchParams } from "next/navigation";

import type { Store } from "@/types";

export type CustomerPrimaryNavItemId = "waitlist";

export interface CustomerPrimaryNavItem {
	id: CustomerPrimaryNavItemId;
	href: string;
	label: string;
	active: boolean;
}

type StoreWithRsvp = Store & {
	rsvpSettings?: {
		acceptReservation?: boolean | null;
		waitlistEnabled?: boolean | null;
	};
};

/**
 * Builds primary customer nav links for LIFF/mobile bottom bars (waitlist entry: `/liff/waitlist`).
 */
export function buildCustomerPrimaryNavItems(input: {
	/** Reserved for future LIFF nav; callers should pass `/liff/{storeId}`. */
	navPrefix: string;
	pathname: string;
	store: StoreWithRsvp;
	labels: {
		waiting_list: string;
	};
	/** From `useSearchParams()` in the LIFF shell (optional). */
	searchParams?: ReadonlyURLSearchParams | null;
}): CustomerPrimaryNavItem[] {
	void input.navPrefix;
	const { pathname, store, labels, searchParams } = input;
	const waitlistEnabled = store.rsvpSettings?.waitlistEnabled === true;

	const items: CustomerPrimaryNavItem[] = [];

	if (waitlistEnabled) {
		const waitlistHref = `/liff/waitlist?storeId=${encodeURIComponent(store.id)}`;
		const queryStoreId = searchParams?.get("storeId") ?? null;
		const active = pathname === "/liff/waitlist" && queryStoreId === store.id;

		items.push({
			id: "waitlist",
			href: waitlistHref,
			label: labels.waiting_list,
			active,
		});
	}

	return items;
}
