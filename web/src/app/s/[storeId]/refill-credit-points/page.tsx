import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import type { Store, StorePaymentMethodMapping } from "@/types";
import { StoreLevel } from "@/types/enum";
import { SafeError } from "@/utils/error";
import { transformPrismaDataForJson } from "@/utils/utils";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RefillCreditPointsForm } from "./components/refill-credit-points-form";
import { getT } from "@/app/i18n";
import { IconAlertCircle } from "@tabler/icons-react";

/**
 * Customer credit points refill page.
 * Implements FR-CREDIT-008 to FR-CREDIT-011 from FUNCTIONAL-REQUIREMENTS-CREDIT.md
 */
export default async function RefillCreditPointsPage(props: {
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
		const callbackUrl = `/s/${params.storeId}/refill-credit-points${rsvpId ? `?rsvpId=${rsvpId}` : ""}`;
		redirect(`/signIn?callbackUrl=${encodeURIComponent(callbackUrl ?? "")}`);
	}
	// Get store and validate credit system is enabled
	const store = await sqlClient.store.findUnique({
		where: { id: params?.storeId },
		select: {
			id: true,
			name: true,
			useCustomerCredit: true,
			creditMinPurchase: true,
			creditMaxPurchase: true,
			creditExchangeRate: true,
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

	// Get translation function
	const { t } = await getT();

	// If customer credit is not enabled, display error gracefully
	if (!store.useCustomerCredit) {
		return (
			<Container className="bg-transparent">
				<Alert variant="destructive">
					<IconAlertCircle className="h-4 w-4" />
					<AlertTitle>{t("error_title") || "Error"}</AlertTitle>
					<AlertDescription>
						{t("customer_credit_system_not_enabled") ||
							"Customer credit system is not enabled for this store."}
					</AlertDescription>
				</Alert>
			</Container>
		);
	}

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

	// Default returnUrl to credit ledger page
	const returnUrl = `/s/${params.storeId}/my-credit-ledger`;

	return (
		<Container className="bg-transparent">
			<div className="space-y-6">
				<Suspense fallback={<Loader />}>
					<RefillCreditPointsForm
						storeId={params.storeId}
						store={
							store as Store & {
								StorePaymentMethods: StorePaymentMethodMapping[];
							}
						}
						rsvpId={rsvpId}
						returnUrl={returnUrl}
					/>
				</Suspense>
			</div>
		</Container>
	);
}
