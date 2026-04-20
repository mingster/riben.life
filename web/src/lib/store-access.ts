/**
 * Store Access Control and Data Fetching
 *
 * Provides functions for checking store access permissions and fetching store data.
 * Separates minimal access checks from full data fetching for better performance.
 */

import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import type { Store } from "@/types";
import { transformDecimalsToNumbers } from "@/utils/utils";

// Route constants
const ROUTES = {
	STORE_ADMIN: "/storeAdmin",
} as const;

/** Organization member roles allowed to use store admin (aligned with storeActionClient). */
const STORE_ADMIN_ORG_MEMBER_ROLES: Role[] = [
	Role.owner,
	Role.storeAdmin,
	Role.staff,
];

const minimalStoreAccessSelect = {
	id: true,
	name: true,
	ownerId: true,
	defaultLocale: true,
	defaultCountry: true,
	defaultCurrency: true,
	isOpen: true,
	useBusinessHours: true,
	requireSeating: true,
	requirePrepaid: true,
	level: true,
	createdAt: true,
	updatedAt: true,
	Owner: {
		select: {
			id: true,
			name: true,
			email: true,
			role: true,
		},
	},
} as const;

function isGlobalAdminRole(userRole?: string | Role): boolean {
	return (
		userRole === Role.admin ||
		userRole === "admin" ||
		String(userRole) === "admin"
	);
}

/**
 * Check if the user may open store admin for a store: global admin, store owner,
 * or organization member with owner / storeAdmin / staff role (same rules as storeActionClient).
 */
export async function checkStoreAdminAccess(
	storeId: string,
	userId: string,
	userRole?: string | Role,
): Promise<Store | null> {
	if (!storeId || !userId) {
		logger.error("Missing storeId or userId for admin access check", {
			metadata: { storeId, userId },
		});
		return null;
	}

	if (isGlobalAdminRole(userRole)) {
		const store = await sqlClient.store.findFirst({
			where: { id: storeId, isDeleted: false },
			select: minimalStoreAccessSelect,
		});
		if (store) {
			transformDecimalsToNumbers(store);
		}
		return store as Store | null;
	}

	const owned = await sqlClient.store.findFirst({
		where: {
			id: storeId,
			ownerId: userId,
			isDeleted: false,
		},
		select: minimalStoreAccessSelect,
	});
	if (owned) {
		transformDecimalsToNumbers(owned);
		return owned as Store | null;
	}

	const asOrgStaff = await sqlClient.store.findFirst({
		where: {
			id: storeId,
			isDeleted: false,
			Organization: {
				members: {
					some: {
						userId,
						role: { in: STORE_ADMIN_ORG_MEMBER_ROLES },
					},
				},
			},
		},
		select: minimalStoreAccessSelect,
	});
	if (asOrgStaff) {
		transformDecimalsToNumbers(asOrgStaff);
		return asOrgStaff as Store | null;
	}

	return null;
}

/**
 * First store the user can access for store admin (/storeAdmin redirect), excluding deleted stores.
 */
export async function findFirstAccessibleStoreForUser(
	userId: string,
	userRole?: string | Role,
): Promise<Store | null> {
	if (!userId) {
		return null;
	}

	if (isGlobalAdminRole(userRole)) {
		const owned = await sqlClient.store.findFirst({
			where: { ownerId: userId, isDeleted: false },
			select: minimalStoreAccessSelect,
			orderBy: { updatedAt: "desc" },
		});
		if (owned) {
			transformDecimalsToNumbers(owned);
		}
		return owned as Store | null;
	}

	const memberships = await sqlClient.member.findMany({
		where: {
			userId,
			role: { in: STORE_ADMIN_ORG_MEMBER_ROLES },
		},
		select: { organizationId: true },
	});
	const orgIds = [...new Set(memberships.map((m) => m.organizationId))];

	const orConditions: Array<
		{ ownerId: string } | { organizationId: { in: string[] } }
	> = [{ ownerId: userId }];
	if (orgIds.length > 0) {
		orConditions.push({ organizationId: { in: orgIds } });
	}

	const store = await sqlClient.store.findFirst({
		where: {
			isDeleted: false,
			OR: orConditions,
		},
		select: minimalStoreAccessSelect,
		orderBy: { updatedAt: "desc" },
	});

	if (store) {
		transformDecimalsToNumbers(store);
	}
	return store as Store | null;
}

/**
 * Check if user has access to a specific store
 * Returns minimal store data for access control - does NOT include relations
 *
 * Note: This function checks store ownership (ownerId === userId), or global admin.
 * For full store-admin access including organization staff, use {@link checkStoreAdminAccess}.
 *
 * @param storeId - The store ID to check
 * @param userId - The user ID to check access for
 * @param userRole - Optional user role for admin bypass
 * @returns Minimal store object or null if no access
 */
export async function checkStoreOwnership(
	storeId: string,
	userId: string,
	userRole?: string | Role,
): Promise<Store | null> {
	if (!storeId || !userId) {
		logger.error("Missing storeId or userId for access check", {
			metadata: { storeId, userId },
		});
		return null;
	}

	const isAdmin = isGlobalAdminRole(userRole);

	const where = isAdmin ? { id: storeId } : { id: storeId, ownerId: userId };

	const store = await sqlClient.store.findFirst({
		where,
		select: minimalStoreAccessSelect,
	});

	if (store) {
		transformDecimalsToNumbers(store);
	}

	return store as Store | null;
}

/**
 * Require user to have store admin access (owner, org staff, or global admin).
 * Redirects to store admin root if access denied.
 *
 * @param storeId - The store ID to check
 * @param userId - The user ID to check access for
 * @param userRole - Optional user role (admin can access any non-deleted store)
 * @returns Minimal store object
 * @throws Redirects to /storeAdmin if access denied
 */
export async function requireStoreAccess(
	storeId: string,
	userId: string,
	userRole?: string | Role,
): Promise<Store> {
	const store = await checkStoreAdminAccess(storeId, userId, userRole);

	if (!store) {
		logger.warn("Store access denied or store not found", {
			metadata: {
				storeId,
				userId,
				userRole,
			},
		});
		// Redirect to store admin root
		// The root layout will check if the store exists before redirecting,
		// which prevents infinite loops
		redirect(ROUTES.STORE_ADMIN);
	}

	return store;
}

/**
 * Get store with specific relations
 * Use this when you need additional data beyond basic store info
 *
 * @param storeId - The store ID
 * @param options - Options for what to include
 * @returns Store with requested relations
 */
export async function getStoreWithRelations(
	storeId: string,
	options: {
		includeProducts?: boolean;
		includeOrders?: boolean;
		includeCategories?: boolean;
		includePaymentMethods?: boolean;
		includeShippingMethods?: boolean;
		includeAnnouncements?: boolean;
		includeTables?: boolean;
		includeSupportTickets?: boolean;
		includeOrganization?: boolean;
		includeRsvpSettings?: boolean;
		includeWaitListSettings?: boolean;
		productsLimit?: number;
		ordersLimit?: number;
	} = {},
): Promise<Store | null> {
	const {
		includeProducts = false,
		includeOrders = false,
		includeCategories = false,
		includePaymentMethods = false,
		includeShippingMethods = false,
		includeAnnouncements = false,
		includeTables = false,
		includeSupportTickets = false,
		includeOrganization = false,
		includeRsvpSettings = false,
		includeWaitListSettings = false,
		productsLimit = 100,
		ordersLimit = 50,
	} = options;

	const store = await sqlClient.store.findFirst({
		where: { id: storeId },
		include: {
			Owner: {
				select: {
					id: true,
					name: true,
					email: true,
					role: true,
				},
			},
			...(includeProducts && {
				Products: {
					take: productsLimit,
					orderBy: { updatedAt: "desc" },
					include: {
						ProductImages: true,
						ProductAttribute: true,
					},
				},
			}),
			...(includeOrders && {
				StoreOrders: {
					take: ordersLimit,
					orderBy: { updatedAt: "desc" },
				},
			}),
			...(includeCategories && {
				Categories: {
					orderBy: { sortOrder: "asc" },
				},
			}),
			...(includePaymentMethods && {
				StorePaymentMethods: {
					include: {
						PaymentMethod: true,
					},
				},
			}),
			...(includeShippingMethods && {
				StoreShippingMethods: {
					include: {
						ShippingMethod: true,
					},
				},
			}),
			...(includeAnnouncements && {
				StoreAnnouncement: {
					orderBy: { updatedAt: "desc" },
				},
			}),
			...(includeTables && {
				StoreFacilities: {
					orderBy: { facilityName: "asc" },
				},
			}),
			...(includeSupportTickets && {
				SupportTicket: {
					orderBy: { lastModified: "desc" },
					include: {
						Sender: true,
					},
				},
			}),
			...(includeOrganization && {
				Organization: true,
			}),
			...(includeRsvpSettings && {
				rsvpSettings: true,
			}),
			...(includeWaitListSettings && {
				waitListSettings: true,
			}),
		},
	});

	if (store) {
		transformDecimalsToNumbers(store);
	}

	return store as Store | null;
}

/**
 * Get basic store info without any relations
 * Fastest option for when you only need store metadata
 *
 * @param storeId - The store ID
 * @returns Store without relations
 */
export async function getStoreBasic(storeId: string): Promise<Store | null> {
	const store = await sqlClient.store.findFirst({
		where: { id: storeId },
	});

	if (store) {
		transformDecimalsToNumbers(store);
	}

	return store as Store | null;
}
