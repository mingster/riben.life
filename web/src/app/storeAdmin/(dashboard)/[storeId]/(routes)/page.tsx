import { sqlClient } from "@/lib/prismadb";
import { getStoreWithRelations } from "@/lib/store-access";
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
	const [store, hasProLevel, categoryCount, productCount] = await Promise.all([
		getStoreWithRelations(params.storeId, {
			includeSupportTickets: true,
		}) as Store,
		isPro(params.storeId),
		sqlClient.category.count({ where: { storeId: params.storeId } }),
		sqlClient.product.count({ where: { storeId: params.storeId } }),
	]);

	let organization;
	organization = (await sqlClient.organization.findFirst({
		where: {
			slug: store.name,
		},
	})) as unknown as Organization;

	// Get headers for authentication
	const headersList = await headers();

	if (!store.organizationId) {
		if (!organization) {
			organization = (await auth.api.createOrganization({
				headers: headersList,
				body: {
					name: store.name, // Use original name for organization display name
					slug: store.name,
					keepCurrentActiveOrganization: true,
				},
			})) as unknown as Organization;

			if (!organization || !organization.id) {
				throw new Error("Failed to create organization");
			}
		}

		store.organizationId = organization.id;
		await sqlClient.store.update({
			where: { id: store.id },
			data: { organizationId: organization.id },
		});

		logger.info("organization created successfully", {
			metadata: {
				organizationId: organization.id,
				storeId: store.id,
				storeName: store.name,
			},
		});
	}

	const data = await auth.api.setActiveOrganization({
		headers: headersList,
		body: {
			organizationId: organization.id,
			organizationSlug: organization.slug,
		},
	});

	//console.log("data", data);

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
