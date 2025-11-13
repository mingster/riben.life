import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { isPro } from "@/lib/store-admin-utils";
import { transformDecimalsToNumbers } from "@/utils/utils";
import { type PaymentMethod, type ShippingMethod } from "@prisma/client";
import { getStoreWithRelations } from "@/lib/store-access";
import { Store } from "@/types";
import { SettingsClient } from "./client-settings";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StoreSettingsPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Note: checkStoreStaffAccess already called in layout (cached)
	// Parallel queries for optimal performance
	const [
		store,
		storeSettings,
		allPaymentMethods,
		allShippingMethods,
		hasProLevel,
	] = await Promise.all([
		getStoreWithRelations(params.storeId, {
			includePaymentMethods: true,
			includeShippingMethods: true,
		}) as Store,
		sqlClient.storeSettings.findFirst({
			where: { storeId: params.storeId },
		}),
		sqlClient.paymentMethod.findMany({
			where: { isDeleted: false },
		}),
		sqlClient.shippingMethod.findMany({
			where: { isDeleted: false },
		}),
		isPro(params.storeId),
	]);

	// Transform decimal fields to numbers
	transformDecimalsToNumbers(allPaymentMethods);
	transformDecimalsToNumbers(allShippingMethods);

	return (
		<Container>
			<SettingsClient
				serverStore={store as Store}
				serverStoreSettings={storeSettings}
				serverPaymentMethods={allPaymentMethods as PaymentMethod[]}
				serverShippingMethods={allShippingMethods as ShippingMethod[]}
				disablePaidOptions={!hasProLevel}
			/>
		</Container>
	);
}
