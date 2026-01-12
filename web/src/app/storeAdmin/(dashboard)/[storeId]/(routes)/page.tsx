import { sqlClient } from "@/lib/prismadb";
import { getStoreWithRelations } from "@/lib/store-access";
import { redirect } from "next/navigation";
import { isPro } from "@/lib/store-admin-utils";
import { Store } from "@/types";
import { IconAlertTriangle } from "@tabler/icons-react";
import type { Metadata } from "next";
import Link from "next/link";
import { StoreAdminDashboard } from "./components/store-admin-dashboard";
import { ensureOrganizationAction } from "@/actions/storeAdmin/store/ensure-organization";
import logger from "@/lib/logger";
import { transformPrismaDataForJson } from "@/utils/utils";

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
	const [storeResult, hasProLevel, categoryCount, productCount, rsvpSettings] =
		await Promise.all([
			getStoreWithRelations(params.storeId, {
				includeOrganization: true,
				includeSupportTickets: true,
			}),
			isPro(params.storeId),
			sqlClient.category.count({ where: { storeId: params.storeId } }),
			sqlClient.product.count({ where: { storeId: params.storeId } }),
			sqlClient.rsvpSettings.findFirst({ where: { storeId: params.storeId } }),
		]);

	if (!storeResult) {
		redirect("/storeAdmin");
	}

	const store = storeResult;

	transformPrismaDataForJson(rsvpSettings);
	transformPrismaDataForJson(store);

	// Ensure organization exists and is linked to store
	// This is a non-critical operation - if it fails, page still renders
	try {
		const result = await ensureOrganizationAction(String(params.storeId), {});

		if (result?.serverError) {
			// Log error but don't block page rendering
			logger.error("Failed to ensure organization", {
				metadata: {
					storeId: params.storeId,
					error: result.serverError,
					validationErrors: result.validationErrors,
					storeName: store.name,
					storeOrganizationId: store.organizationId,
				},
				tags: ["store", "organization", "error"],
			});
		} else if (result?.data?.organization) {
			// Update store object with organizationId if it was set
			if (!store.organizationId && result.data.organization.id) {
				store.organizationId = result.data.organization.id;
			}
		}
	} catch (error) {
		// Catch any unexpected errors (shouldn't happen with safe-action, but just in case)
		logger.error("Unexpected error ensuring organization", {
			metadata: {
				storeId: params.storeId,
				error: error instanceof Error ? error.message : String(error),
				storeName: store.name,
				storeOrganizationId: store.organizationId,
			},
			tags: ["store", "organization", "error"],
		});
	}

	return (
		<div>
			{/* Display setup prompts if needed */}
			{store.useOrderSystem && (
				<div className="text-2xl font-extrabold flex gap-2">
					{categoryCount === 0 && (
						<div className="flex gap-1 items-center">
							<IconAlertTriangle className="h-6 w-6 text-yellow-500" />
							<div className="sm:text-xl text-2xl tracking-wider">
								<Link href={`/storeAdmin/${params.storeId}/categories/`}>
									請新增產品分類
								</Link>
							</div>
						</div>
					)}
					{productCount === 0 && (
						<div className="flex gap-1 items-center">
							<IconAlertTriangle className="h-6 w-6 text-yellow-500" />
							<div className="sm:text-xl text-2xl tracking-wider">
								<Link href={`/storeAdmin/${params.storeId}/products/`}>
									請新增產品
								</Link>
							</div>
						</div>
					)}
				</div>
			)}

			<StoreAdminDashboard
				isProLevel={hasProLevel}
				store={store}
				rsvpSettings={rsvpSettings}
			/>
		</div>
	);
}
