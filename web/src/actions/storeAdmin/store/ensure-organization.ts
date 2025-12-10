"use server";

import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import logger from "@/lib/logger";
import type { Organization } from "@prisma/client";
import { z } from "zod";

const ensureOrganizationSchema = z.object({
	// No input needed - storeId comes from bindArgsClientInputs
});

export const ensureOrganizationAction = storeActionClient
	.metadata({ name: "ensureOrganization" })
	.schema(ensureOrganizationSchema)
	.action(async ({ bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const headersList = await headers();

		// Get store with owner info
		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: {
				id: true,
				name: true,
				ownerId: true,
				organizationId: true,
			},
		});

		if (!store) {
			throw new Error("Store not found");
		}

		// Get or create organization if needed
		let organization: Organization | null = null;

		if (store.organizationId) {
			// Store already has organizationId, fetch the organization
			organization = (await sqlClient.organization.findUnique({
				where: {
					id: store.organizationId,
				},
			})) as Organization | null;
		}

		// If store doesn't have organizationId or organization not found, create/link one
		if (!store.organizationId || !organization) {
			// First, check if store owner already has an organization (one org per user design)
			const ownerOrganizations = await sqlClient.member.findMany({
				where: {
					userId: store.ownerId,
				},
				include: {
					organization: {
						select: {
							id: true,
							name: true,
							slug: true,
						},
					},
				},
			});

			// If owner has an organization, reuse it (one org per user, multiple stores)
			if (ownerOrganizations.length > 0 && ownerOrganizations[0].organization) {
				// Fetch full organization object
				organization = (await sqlClient.organization.findUnique({
					where: { id: ownerOrganizations[0].organization.id },
				})) as Organization | null;

				if (organization) {
					logger.info(
						"Reusing owner's existing organization for legacy store",
						{
							metadata: {
								organizationId: organization.id,
								storeId: store.id,
								ownerId: store.ownerId,
							},
							tags: ["store", "organization", "migration"],
						},
					);
				}
			}

			// If still no organization (owner had none, or fetch failed), create one
			if (!organization) {
				// Owner has no organization, create one
				// Try to find by slug first (in case it was created but not linked)
				organization = (await sqlClient.organization.findFirst({
					where: {
						slug: store.name.toLowerCase().replace(/ /g, "-"),
					},
				})) as Organization | null;

				// If still not found, create new organization
				if (!organization) {
					try {
						// Generate slug from store name
						let storeSlug = store.name.toLowerCase().replace(/ /g, "-");

						// Check if slug is already taken
						const slugExists = await sqlClient.organization.findUnique({
							where: { slug: storeSlug },
							select: { id: true },
						});

						// If slug exists, add suffix
						if (slugExists) {
							storeSlug =
								storeSlug + "-" + Math.random().toString(36).substring(2, 15);
						}

						organization = (await auth.api.createOrganization({
							headers: headersList,
							body: {
								name: store.name, // Use original name for organization display name
								slug: storeSlug,
								keepCurrentActiveOrganization: true,
							},
						})) as unknown as Organization;

						if (!organization || !organization.id) {
							throw new Error("Failed to create organization");
						}

						logger.info("Created new organization for legacy store owner", {
							metadata: {
								organizationId: organization.id,
								storeId: store.id,
								ownerId: store.ownerId,
								storeName: store.name,
							},
							tags: ["store", "organization", "migration", "create"],
						});
					} catch (error) {
						logger.error("Failed to create organization", {
							metadata: {
								error: error instanceof Error ? error.message : String(error),
								storeId: store.id,
								storeName: store.name,
								ownerId: store.ownerId,
							},
							tags: ["store", "organization", "error"],
						});
						throw error;
					}
				}
			}

			// Update store with organizationId if not already set
			if (!store.organizationId && organization && organization.id) {
				await sqlClient.store.update({
					where: { id: store.id },
					data: { organizationId: organization.id },
				});

				logger.info("organization linked to store successfully", {
					metadata: {
						organizationId: organization.id,
						storeId: store.id,
						storeName: store.name,
					},
					tags: ["store", "organization"],
				});
			}
		}

		// Set active organization if we have one
		// Only call this once, not on every render, to avoid memory leaks
		if (organization && organization.id) {
			try {
				await auth.api.setActiveOrganization({
					headers: headersList,
					body: {
						organizationId: organization.id,
						organizationSlug: organization.slug,
					},
				});
			} catch (error) {
				// Log but don't throw - setting active org is not critical for page rendering
				logger.warn("Failed to set active organization", {
					metadata: {
						error: error instanceof Error ? error.message : String(error),
						organizationId: organization.id,
						storeId: store.id,
					},
					tags: ["store", "organization", "warning"],
				});
			}
		}

		return {
			organization,
		};
	});
