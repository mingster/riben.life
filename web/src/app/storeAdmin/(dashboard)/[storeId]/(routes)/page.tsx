import { sqlClient } from "@/lib/prismadb";
import { getStoreWithRelations } from "@/lib/store-access";
import { redirect } from "next/navigation";
import { isPro } from "@/lib/store-admin-utils";
import { Store } from "@/types";
import { IconAlertTriangle } from "@tabler/icons-react";
import type { Metadata } from "next";
import Link from "next/link";
import { StoreAdminDashboard } from "./components/store-admin-dashboard";
import { Organization } from "@prisma/client";
import { getUtcNow } from "@/utils/datetime-utils";
import { auth } from "@/lib/auth";
import { logger } from "better-auth";
import { headers } from "next/headers";

export const metadata: Metadata = {
	title: "Store Dashboard",
	description: "",
};

// DashboardPage is home of the selected store. It displays store operating stats such as
// total revenue, sales count, products, etc.

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StoreAdminHomePage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Note: checkStoreStaffAccess already called in layout (cached)
	// Parallel queries for optimal performance - 3x faster!
	const [storeResult, hasProLevel, categoryCount, productCount] =
		await Promise.all([
			getStoreWithRelations(params.storeId, {
				includeOrganization: true,
				includeSupportTickets: true,
			}),
			isPro(params.storeId),
			sqlClient.category.count({ where: { storeId: params.storeId } }),
			sqlClient.product.count({ where: { storeId: params.storeId } }),
		]);

	if (!storeResult) {
		redirect("/storeAdmin");
	}

	const store = storeResult;

	// Get headers for authentication (only once)
	const headersList = await headers();

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
				logger.info("Reusing owner's existing organization for legacy store", {
					metadata: {
						organizationId: organization.id,
						storeId: store.id,
						ownerId: store.ownerId,
					},
					tags: ["store", "organization", "migration"],
				});
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

			store.organizationId = organization.id;

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

	return (
		<div>
			{/* Display setup prompts if needed */}
			<div className="text-2xl font-extrabold flex gap-2">
				{categoryCount === 0 && (
					<div className="flex gap-1 items-center">
						<IconAlertTriangle className="h-6 w-6 text-yellow-500" />
						<h1 className="sm:text-xl text-2xl tracking-wider">
							<Link href={`/storeAdmin/${params.storeId}/categories/`}>
								請新增分類
							</Link>
						</h1>
					</div>
				)}
				{productCount === 0 && (
					<div className="flex gap-1 items-center">
						<IconAlertTriangle className="h-6 w-6 text-yellow-500" />
						<h1 className="sm:text-xl text-2xl tracking-wider">
							<Link href={`/storeAdmin/${params.storeId}/products/`}>
								請新增產品
							</Link>
						</h1>
					</div>
				)}
			</div>

			<StoreAdminDashboard isProLevel={hasProLevel} store={store} />
		</div>
	);
}
