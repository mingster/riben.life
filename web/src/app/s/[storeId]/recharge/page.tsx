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
type SearchParams = Promise<{ rsvpId?: string }>;

/**
 * Customer credit recharge page.
 * Implements FR-CREDIT-008 to FR-CREDIT-011 from FUNCTIONAL-REQUIREMENTS-CREDIT.md
 */
export default async function RechargePage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;
	const searchParams = await props.searchParams;
	const rsvpId = searchParams.rsvpId;

	// Check authentication
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user?.id) {
		const callbackUrl = `/s/${params.storeId}/recharge${rsvpId ? `?rsvpId=${rsvpId}` : ""}`;
		redirect(`/signIn?callbackUrl=${encodeURIComponent(callbackUrl)}`);
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
			creditExchangeRate: true,
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
				<Suspense fallback={<Loader />}>
					<RechargeForm
						storeId={params.storeId}
						store={store as Store}
						rsvpId={rsvpId}
					/>
				</Suspense>
			</div>
		</Container>
	);
}
