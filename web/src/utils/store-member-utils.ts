/**
 * Store Member Utilities
 *
 * Utilities for managing customer membership in store organizations.
 */

import { sqlClient } from "@/lib/prismadb";
import type { PrismaClient } from "@prisma/client";
import { getUtcNow } from "@/utils/datetime-utils";
import crypto from "crypto";
import logger from "@/lib/logger";

/**
 * Add a customer as a member to a store's organization.
 * If the member already exists, this function does nothing (idempotent).
 *
 * @param storeId - The store ID
 * @param userId - The user ID to add as a member
 * @param role - The role to assign (default: "user")
 * @param tx - Optional transaction client (for use within transactions)
 * @returns Promise that resolves when the member is added or already exists
 */
export async function ensureCustomerIsStoreMember(
	storeId: string,
	userId: string,
	role: string = "user",
	tx?: Omit<
		PrismaClient,
		"$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
	>,
): Promise<void> {
	if (!storeId || !userId) {
		logger.warn("Missing storeId or userId for ensureCustomerIsStoreMember", {
			metadata: { storeId, userId },
			tags: ["store-member", "warn"],
		});
		return;
	}

	const client = tx || sqlClient;

	try {
		// Get store's organizationId
		const store = await client.store.findUnique({
			where: { id: storeId },
			select: { organizationId: true },
		});

		if (!store || !store.organizationId) {
			logger.warn("Store or organization not found", {
				metadata: { storeId, userId },
				tags: ["store-member", "warn"],
			});
			return;
		}

		const organizationId = store.organizationId;

		// Check if member already exists
		const existingMember = await client.member.findFirst({
			where: {
				userId,
				organizationId,
			},
		});

		if (existingMember) {
			// Member already exists, no action needed
			return;
		}

		// Create new member
		await client.member.create({
			data: {
				id: crypto.randomUUID(),
				userId,
				organizationId,
				role,
				createdAt: getUtcNow(),
			},
		});

		logger.info("Customer added as store member", {
			metadata: {
				storeId,
				userId,
				organizationId,
				role,
			},
			tags: ["store-member", "create"],
		});
	} catch (error) {
		logger.error("Failed to ensure customer is store member", {
			metadata: {
				storeId,
				userId,
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["store-member", "error"],
		});
		// Don't throw - this is a non-critical operation
		// Order creation should continue even if member creation fails
	}
}
