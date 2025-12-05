import { redirect } from "next/navigation";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import Container from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { RechargeForm } from "./components/recharge-form";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { SafeError } from "@/utils/error";
import { Suspense } from "react";
import { Loader } from "@/components/loader";
import type { Store } from "@/types";

type Params = Promise<{ storeId: string }>;

/**
 * Customer credit recharge page.
 * Implements FR-CREDIT-008 to FR-CREDIT-011 from FUNCTIONAL-REQUIREMENTS-CREDIT.md
 */
export default async function RechargePage(props: { params: Params }) {
	const params = await props.params;

	// Check authentication
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user?.id) {
		redirect(`/${params.storeId}?signin=true`);
	}

	// Get store and validate credit system is enabled
	const store = await sqlClient.store.findUnique({
		where: { id: params.storeId },
		select: {
			id: true,
			name: true,
			useCustomerCredit: true,
			creditMinPurchase: true,
			creditMaxPurchase: true,
			defaultCurrency: true,
		},
	});

	if (!store) {
		throw new SafeError("Store not found");
	}

	if (!store.useCustomerCredit) {
		throw new SafeError("Customer credit system is not enabled for this store");
	}

	transformPrismaDataForJson(store);

	return (
		<Container className="bg-transparent">
			<div className="space-y-6">
				<Heading
					title="Credit Recharge"
					description="Top up your credit balance to use for future purchases"
				/>
				<Suspense fallback={<Loader />}>
					<RechargeForm storeId={params.storeId} store={store as Store} />
				</Suspense>
			</div>
		</Container>
	);
}
