import { redirect } from "next/navigation";

import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { getStoreWithRelations } from "@/lib/store-access";
import { isPro } from "@/lib/store-admin-utils";
import { transformPrismaDataForJson } from "@/utils/utils";

import { SettingsClient } from "./components/settings-client";

type Params = Promise<{ storeId: string }>;

export default async function StoreSettingsPage(props: { params: Params }) {
	const params = await props.params;
	const storeId = params.storeId;

	const [store, storeSettings, paymentMethods, shippingMethods, hasProLevel] =
		await Promise.all([
			getStoreWithRelations(storeId, {
				includePaymentMethods: true,
				includeShippingMethods: true,
			}),
			sqlClient.storeSettings.findUnique({ where: { storeId } }),
			sqlClient.paymentMethod.findMany({
				where: { isDeleted: false },
				orderBy: { name: "asc" },
			}),
			sqlClient.shippingMethod.findMany({
				where: { isDeleted: false },
				orderBy: { name: "asc" },
			}),
			isPro(storeId),
		]);

	if (!store || store.isDeleted) {
		redirect("/storeAdmin");
	}

	transformPrismaDataForJson(store);
	transformPrismaDataForJson(storeSettings);
	transformPrismaDataForJson(paymentMethods);
	transformPrismaDataForJson(shippingMethods);

	return (
		<Container>
			<SettingsClient
				serverStore={store}
				serverStoreSettings={storeSettings}
				serverPaymentMethods={paymentMethods}
				serverShippingMethods={shippingMethods}
				disablePaidOptions={!hasProLevel}
			/>
		</Container>
	);
}
