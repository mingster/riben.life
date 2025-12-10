/**
 * Store Access Control and Data Fetching
 *
 * Provides functions for checking store access permissions and fetching store data.
 * Separates minimal access checks from full data fetching for better performance.
 */

import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { transformDecimalsToNumbers } from "@/utils/utils";
import type { Store } from "@/types";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { cookies } from "next/headers";

// Route constants
const ROUTES = {
	STORE_ADMIN: "/storeAdmin",
} as const;

/**
 * Check if user has access to a specific store
 * Returns minimal store data for access control - does NOT include relations
 *
 * Note: This function checks store ownership (ownerId === userId).
 * For role-based access (admin access to all stores), use requireStoreAccess
 * which should be called AFTER role verification via requireAuthWithRole.
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

	// admin users can access any store
	// storeAdmin users can access their own store
	// staff users can access their own store
	// Check both string and enum values for compatibility
	const isAdmin =
		userRole === Role.admin ||
		userRole === "admin" ||
		String(userRole) === "admin";

	const where = isAdmin ? { id: storeId } : { id: storeId, ownerId: userId };

	const store = await sqlClient.store.findFirst({
		where,
		select: {
			// Only select essential fields for access control
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
			// Include owner info if needed
			Owner: {
				select: {
					id: true,
					name: true,
					email: true,
					role: true,
				},
			},
		},
	});

	if (store) {
		transformDecimalsToNumbers(store);
	}

	return store as Store | null;
}

/**
 * Require user to have access to a specific store
 * Redirects to store admin list if access denied
 *
 * @param storeId - The store ID to check
 * @param userId - The user ID to check access for
 * @param userRole - Optional user role (admin can access any store)
 * @returns Minimal store object
 * @throws Redirects to /storeAdmin if access denied
 */
export async function requireStoreAccess(
	storeId: string,
	userId: string,
	userRole?: string | Role,
): Promise<Store> {
	const store = await checkStoreOwnership(storeId, userId, userRole);

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
