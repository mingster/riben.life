import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { formatDateTime, epochToDate } from "@/utils/datetime-utils";
import { transformPrismaDataForJson } from "@/utils/utils";
import { redirect } from "next/navigation";
import type { StoreColumn } from "./components/columns";
import { StoresClient } from "./components/stores-client";
import { checkAdminAccess } from "../admin-utils";
import type { Store } from "@/types";
import { Suspense } from "react";
import { Loader } from "@/components/loader";
import { StoreLevel, MemberRole } from "@/types/enum";
import { Prisma } from "@prisma/client";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StoreAdminPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const _params = await props.params;

	const isAdmin = await checkAdminAccess();
	if (!isAdmin) redirect("/error/?code=500&message=Unauthorized");

	// Optimized query using _count instead of loading all related data
	const stores = await sqlClient.store.findMany({
		include: {
			Owner: {
				select: {
					email: true,
					name: true,
				},
			},
			_count: {
				select: {
					Products: true,
					StoreOrders: true,
				},
			},
		},
		orderBy: {
			updatedAt: "desc",
		},
	});

	// Calculate credit per store by summing credits for users who are members of each store's organization
	// Since credit is now cross-store, we calculate based on organization membership
	const creditMap = new Map<string, number>();

	// For each store, get all customer members and sum their credit points
	for (const store of stores) {
		if (!store.organizationId) {
			creditMap.set(store.id, 0);
			continue;
		}

		// Get all customer members for this store's organization
		const customerMembers = await sqlClient.member.findMany({
			where: {
				organizationId: store.organizationId,
				role: MemberRole.customer,
			},
			select: {
				userId: true,
			},
		});

		if (customerMembers.length === 0) {
			creditMap.set(store.id, 0);
			continue;
		}

		const customerUserIds = customerMembers.map((m) => m.userId);

		// Sum credit points for all customers in this organization
		const creditAggregate = await sqlClient.customerCredit.aggregate({
			where: {
				userId: {
					in: customerUserIds,
				},
			},
			_sum: {
				point: true,
			},
		});

		creditMap.set(store.id, Number(creditAggregate._sum.point ?? 0));
	}

	// Transform BigInt (epoch timestamps) and Decimal to numbers for JSON serialization
	transformPrismaDataForJson(stores);

	const levelLabel = (level: number | null | undefined) => {
		switch (level) {
			case StoreLevel.Free:
				return "Free";
			case StoreLevel.Pro:
				return "Pro";
			case StoreLevel.Multi:
				return "Multi";
			default:
				return level ? String(level) : "";
		}
	};

	// Map stores to UI format
	const formattedStores: StoreColumn[] = stores.map((item) => ({
		id: item.id,
		name: item.name || "",
		customDomain: item.customDomain || "",
		owner: item.Owner.email || item.Owner.name || "",
		level: levelLabel(item.level),
		customerCredit: creditMap.get(item.id) ?? 0,
		createdAt: formatDateTime(epochToDate(item.updatedAt) ?? new Date()),
		products: item._count.Products,
		storeOrders: item._count.StoreOrders,
	}));

	return (
		<Suspense fallback={<Loader />}>
			<StoresClient data={formattedStores} />
		</Suspense>
	);
}
