import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import type { Store, StorePaymentMethodMapping } from "@/types";
import { StoreLevel } from "@/types/enum";
import { SafeError } from "@/utils/error";
import { transformPrismaDataForJson } from "@/utils/utils";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RefillAccountBalanceForm } from "./components/refill-account-balance-form";
import { getUnpaidTotalAction } from "@/actions/store/credit/get-unpaid-total";

/**
 * Customer account balance (fiat) refill page.
 * Allows customers to deposit fiat currency to their CustomerCredit.fiat balance.
 */
export default async function RefillAccountBalancePage(props: {
	params: Promise<{ storeId: string }>;
	searchParams: Promise<{ rsvpId?: string }>;
}) {
	const params = await props.params;
	const searchParams = await props.searchParams;
	const rsvpId = searchParams?.rsvpId;

	// Check authentication
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user?.id) {
		const callbackUrl = `/s/${params.storeId}/refill-account-balance${rsvpId ? `?rsvpId=${rsvpId}` : ""}`;
		redirect(`/signIn?callbackUrl=${encodeURIComponent(callbackUrl ?? "")}`);
	}

	// Get store
	const store = await sqlClient.store.findUnique({
		where: { id: params?.storeId },
		select: {
			id: true,
			name: true,
			defaultCurrency: true,
			level: true,
			StorePaymentMethods: {
				include: {
					PaymentMethod: true,
				},
			},
		},
	});

	if (!store) {
		throw new SafeError("Store not found");
	}

	// Calculate unpaid total for the user in this store
	const unpaidTotalResult = await getUnpaidTotalAction({
		storeId: params.storeId,
	});
	const unpaidTotal =
		unpaidTotalResult?.data?.unpaidTotal &&
		unpaidTotalResult.data.unpaidTotal > 0
			? unpaidTotalResult.data.unpaidTotal
			: null;

	// Add default payment methods if store has none
	if (store.StorePaymentMethods.length === 0) {
		const defaultPaymentMethods = await sqlClient.paymentMethod.findMany({
			where: {
				isDefault: true,
				isDeleted: false,
			},
		});

		for (const paymentMethod of defaultPaymentMethods) {
			const mapping = {
				id: "",
				storeId: store.id,
				methodId: paymentMethod.id,
				paymentDisplayName: null,
				PaymentMethod: paymentMethod,
			} as StorePaymentMethodMapping;

			store.StorePaymentMethods.push(mapping);
		}
	}

	// Filter payment methods to only show those visible to customers
	// Only payment methods with visibleToCustomer=true are shown to customers
	store.StorePaymentMethods = store.StorePaymentMethods.filter(
		(mapping) => mapping.PaymentMethod.visibleToCustomer === true,
	);

	// Filter out cash payment method for Free-tier stores
	// Cash is only available for Pro (2) or Multi (3) level stores
	if (store.level === StoreLevel.Free) {
		store.StorePaymentMethods = store.StorePaymentMethods.filter(
			(mapping) => mapping.PaymentMethod.payUrl !== "cash",
		);
	}

	transformPrismaDataForJson(store);

	// Default returnUrl to fiat ledger page
	const returnUrl = `/s/${params.storeId}/my-fiat-ledger`;

	return (
		<Container className="bg-transparent">
			<div className="space-y-6">
				<Suspense fallback={<Loader />}>
					<RefillAccountBalanceForm
						storeId={params.storeId}
						store={
							store as Store & {
								StorePaymentMethods: StorePaymentMethodMapping[];
							}
						}
						rsvpId={rsvpId}
						returnUrl={returnUrl}
						unpaidTotal={unpaidTotal}
					/>
				</Suspense>
			</div>
		</Container>
	);
}
