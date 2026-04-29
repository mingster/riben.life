import type { ReadonlyURLSearchParams } from "next/navigation";

import type { Store } from "@/types";

export type CustomerPrimaryNavItemId = "order" | "rsvp" | "waitlist";

export interface CustomerPrimaryNavItem {
	id: CustomerPrimaryNavItemId;
	href: string;
	label: string;
	active: boolean;
	/** Mirrors `/storeAdmin/.../systems`: order / RSVP / waitlist toggles. */
	enabled: boolean;
}

type StoreWithSystemsNav = Store & {
	rsvpSettings?: { acceptReservation?: boolean | null } | null;
	waitListSettings?: { enabled?: boolean | null } | null;
};

/**
 * Primary LIFF bottom-nav: online order, RSVP, waitlist (`/storeAdmin/…/systems`).
 */
export function buildCustomerPrimaryNavItems(input: {
	navPrefix: string;
	pathname: string;
	store: StoreWithSystemsNav;
	labels: {
		order: string;
		rsvp: string;
		waitlist: string;
	};
	searchParams?: ReadonlyURLSearchParams | null;
}): CustomerPrimaryNavItem[] {
	const { navPrefix, pathname, store, labels, searchParams } = input;

	const useOrderSystem = store.useOrderSystem === true;
	const acceptReservation = store.rsvpSettings?.acceptReservation === true;
	const waitlistEnabled = store.waitListSettings?.enabled === true;

	const queryStoreId = searchParams?.get("storeId") ?? null;

	const orderHref = `${navPrefix}/menu`;
	const checkoutHref = `${navPrefix}/checkout`;
	const rsvpHref = `${navPrefix}/reservation`;
	const waitlistHref = `/liff/waitlist?storeId=${encodeURIComponent(store.id)}`;

	const orderActive =
		pathname === orderHref ||
		pathname.startsWith(`${orderHref}/`) ||
		pathname === checkoutHref ||
		pathname.startsWith(`${checkoutHref}/`);
	const rsvpActive =
		pathname === rsvpHref || pathname.startsWith(`${rsvpHref}/`);
	const waitlistActive =
		pathname === "/liff/waitlist" && queryStoreId === store.id;

	return [
		{
			id: "order",
			href: orderHref,
			label: labels.order,
			active: orderActive,
			enabled: useOrderSystem,
		},
		{
			id: "rsvp",
			href: rsvpHref,
			label: labels.rsvp,
			active: rsvpActive,
			enabled: acceptReservation,
		},
		{
			id: "waitlist",
			href: waitlistHref,
			label: labels.waitlist,
			active: waitlistActive,
			enabled: waitlistEnabled,
		},
	];
}
