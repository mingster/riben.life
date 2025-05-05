import isProLevel from "@/actions/storeAdmin/is-pro-level";
import { checkStoreAccess } from "@/lib/store-admin-utils";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/lib/utils";
import {
	type PaymentMethod,
	Prisma,
	type ShippingMethod,
} from "@prisma/client";
import { Suspense } from "react";
import { StoreSettingTabs } from "./tabs";

const storeObj = Prisma.validator<Prisma.StoreDefaultArgs>()({
	include: {
		StoreShippingMethods: true,
		StorePaymentMethods: true,
	},
});
export type Store = Prisma.StoreGetPayload<typeof storeObj>;

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StoreSettingsPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;
	//NOTE - we call checkStoreAccess here to get the store object
	const store = (await checkStoreAccess(params.storeId)) as Store;

	transformDecimalsToNumbers(store);

	const storeSettings = await sqlClient.storeSettings.findFirst({
		where: {
			storeId: params.storeId,
		},
	});

	//console.log(`store: ${JSON.stringify(store)}`);
	//console.log('storeSettings: ' + JSON.stringify(storeSettings));

	/*
  await sqlClient.storePaymentMethodMapping.deleteMany({
    where: {
      storeId: params.storeId,
    }
  })
  await sqlClient.storeShipMethodMapping.deleteMany({
    where: {
      storeId: params.storeId,
    }
  })
  */

	const allPaymentMethods = (await sqlClient.paymentMethod.findMany({
		where: { isDeleted: false },
	})) as PaymentMethod[];
	const allShippingMethods = (await sqlClient.shippingMethod.findMany({
		where: { isDeleted: false },
	})) as ShippingMethod[];

	transformDecimalsToNumbers(allPaymentMethods);
	transformDecimalsToNumbers(allShippingMethods);

	// this store is pro version or not?
	const disablePaidOptions = !(await isProLevel(store?.id));

	//console.log("isProLevel", disablePaidOptions);

	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<StoreSettingTabs
					sqlData={store}
					storeSettings={storeSettings}
					paymentMethods={allPaymentMethods}
					shippingMethods={allShippingMethods}
					disablePaidOptions={disablePaidOptions}
				/>
			</Container>
		</Suspense>
	);
}
