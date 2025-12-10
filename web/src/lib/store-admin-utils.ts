/**
 * Store Admin Utilities
 *
 * High-level utilities for store admin routes.
 * Combines authentication, authorization, and store access checks.
 */

import isProLevel from "@/actions/storeAdmin/is-pro-level";
import { requireAuthWithRole, UserRole } from "@/lib/auth-utils";
import { requireStoreAccess } from "@/lib/store-access";
import type { Store } from "@/types";
import { Role } from "@prisma/client";
import { cache } from "react";

/**
 * Check if current user has staff access to a specific store
 *
 * This function:
 * 1. Validates user authentication
 * 2. Verifies user has owner, staff, or storeAdmin role
 * 3. Checks store access/ownership
 * 4. Returns minimal store data for access control
 *
 * Uses React cache() to deduplicate calls within the same request.
 * This ensures only one database query even if multiple components call it.
 *
 * Note: This returns minimal store data. If you need products, orders, etc.,
 * fetch them separately in your page using getStoreWithRelations().
 *
 * @param storeId - The store ID to check access for
 * @returns Minimal store object with basic information
 * @throws Redirects to appropriate page if access denied
 *
 * @example
 * ```typescript
 * // In a page component
 * export default async function Page(props: { params: Params }) {
 *   const params = await props.params;
 *
 *   // Check access (returns minimal store data)
 *   const store = await checkStoreStaffAccess(params.storeId);
 *
 *   // Fetch only what this page needs
 *   const categories = await sqlClient.category.findMany({
 *     where: { storeId: params.storeId },
 *   });
 *
 *   return <CategoryClient serverData={categories} />;
 * }
 * ```
 */
export const checkStoreStaffAccess = cache(
	async (storeId: string): Promise<Store> => {
		// 1. Require authentication with owner, staff, or storeAdmin role
		const session = await requireAuthWithRole([
			Role.owner,
			Role.staff,
			Role.storeAdmin,
			Role.admin,
		] as UserRole[]);

		// 2. Require store access/ownership
		// Pass user role so admins can access any store
		const store = await requireStoreAccess(
			storeId,
			session.user.id,
			session.user.role ?? undefined,
		);

		// 3. Return minimal store data
		return store;
	},
);

/**
 * Check if store has an active Pro or Multi subscription
 *
 * @param storeId - The store ID to check
 * @returns true if store has active pro-level subscription
 */
export const isPro = async (storeId: string): Promise<boolean> => {
	return await isProLevel(storeId);
};
