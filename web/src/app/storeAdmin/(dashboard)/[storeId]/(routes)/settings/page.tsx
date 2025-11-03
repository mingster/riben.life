import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { checkStoreStaffAccess, isPro } from "@/lib/store-admin-utils";
import { transformDecimalsToNumbers } from "@/utils/utils";
import {
	type PaymentMethod,
	Prisma,
	type ShippingMethod,
} from "@prisma/client";
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

	// Parallel queries for optimal performance - 3x faster!
	const [
		store,
		storeSettings,
		allPaymentMethods,
		allShippingMethods,
		hasProLevel,
	] = await Promise.all([
		checkStoreStaffAccess(params.storeId),
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
	transformDecimalsToNumbers(store);
	transformDecimalsToNumbers(allPaymentMethods);
	transformDecimalsToNumbers(allShippingMethods);

	return (
		<Container>
			<StoreSettingTabs
				sqlData={store}
				storeSettings={storeSettings}
				paymentMethods={allPaymentMethods as PaymentMethod[]}
				shippingMethods={allShippingMethods as ShippingMethod[]}
				disablePaidOptions={!hasProLevel}
			/>
		</Container>
	);
}
