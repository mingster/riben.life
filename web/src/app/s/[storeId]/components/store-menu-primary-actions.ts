import type { Store } from "@/types";

export type CustomerPrimaryNavItemId =
	| "home"
	| "menu"
	| "reservation"
	| "waitlist";

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

function normalizeNavPrefix(navPrefix: string): string {
	return navPrefix.replace(/\/$/, "");
}

/**
 * Builds primary customer nav links for LIFF/mobile bottom bars.
 * Visibility rules match {@link GetMenuList} in `./store-menu-list.ts` (no duplicate menu fork).
 */
export function buildCustomerPrimaryNavItems(input: {
	navPrefix: string;
	pathname: string;
	store: StoreWithRsvp;
	labels: {
		home: string;
		online_order: string;
		reservation: string;
		waiting_list: string;
	};
}): CustomerPrimaryNavItem[] {
	const navPrefix = normalizeNavPrefix(input.navPrefix);
	const { pathname, store, labels } = input;
	const acceptReservation = store.rsvpSettings?.acceptReservation === true;
	const waitlistEnabled = store.rsvpSettings?.waitlistEnabled === true;
	const useOrder = store.useOrderSystem === true;

	const items: CustomerPrimaryNavItem[] = [];
	const isHome = pathname === navPrefix || pathname === `${navPrefix}/`;

	if (useOrder) {
		items.push({
			id: "menu",
			href: `${navPrefix}/menu`,
			label: labels.online_order,
			active: pathname.includes(`${navPrefix}/menu`),
		});
	}

	if (acceptReservation) {
		items.push({
			id: "reservation",
			href: `${navPrefix}/reservation`,
			label: labels.reservation,
			active: pathname.startsWith(`${navPrefix}/reservation`),
		});
	}

	if (waitlistEnabled) {
		items.push({
			id: "waitlist",
			href: `${navPrefix}/waitlist`,
			label: labels.waiting_list,
			active: pathname.includes(`${navPrefix}/waitlist`),
		});
	}

	// Only show Home when no primary systems are enabled.
	if (items.length === 0) {
		items.push({
			id: "home",
			href: navPrefix,
			label: labels.home,
			active: isHome,
		});
	}

	return items;
}
