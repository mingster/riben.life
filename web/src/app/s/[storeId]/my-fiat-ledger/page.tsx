import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loader } from "@/components/loader";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import type { CustomerFiatLedger } from "@/types";
import logger from "@/lib/logger";
import { isValidGuid } from "@/utils/guid-utils";
import { CustomerFiatUsageClient } from "./components/customer-fiat-usage-client";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function CustomerFiatUsagePage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Get session to check if user is logged in
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user?.id) {
		const callbackUrl = `/s/${params.storeId}/my-fiat-ledger`;
		redirect(`/signIn?callbackUrl=${encodeURIComponent(callbackUrl)}`);
	}

	// Find store by ID (UUID) or name
	const isUuid = isValidGuid(params.storeId);
	const store = await sqlClient.store.findFirst({
		where: isUuid
			? { id: params.storeId }
			: { name: { equals: params.storeId, mode: "insensitive" } },
		select: {
			id: true,
			name: true,
			defaultTimezone: true,
			defaultCurrency: true,
		},
	});

	if (!store) {
		logger.error("Store not found", {
			metadata: { storeId: params.storeId },
			tags: ["fiat", "error"],
		});
		redirect("/unv");
	}

	// Use the actual store ID for subsequent queries
	const actualStoreId = store.id;

	// Fetch fiat ledger entries for the current user in this store
	const ledgerEntries = await sqlClient.customerFiatLedger.findMany({
		where: {
			storeId: actualStoreId,
			userId: session.user.id,
		},
		include: {
			Store: true,
			Creator: true,
			StoreOrder: true,
		},
		orderBy: { createdAt: "desc" },
	});

	// Transform Decimal objects to numbers for client components
	const formattedData: CustomerFiatLedger[] = (
		ledgerEntries as CustomerFiatLedger[]
	).map((entry) => {
		const transformed = { ...entry };
		transformPrismaDataForJson(transformed);
		return transformed as CustomerFiatLedger;
	});

	return (
		<Container>
			<Suspense fallback={<Loader />}>
				<CustomerFiatUsageClient
					ledger={formattedData}
					storeTimezone={store.defaultTimezone || "Asia/Taipei"}
					currency={store.defaultCurrency || "TWD"}
				/>
			</Suspense>
		</Container>
	);
}
