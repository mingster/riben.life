import { notFound } from "next/navigation";
import { sqlClient } from "@/lib/prismadb";
import { getStoreWithRelations } from "@/lib/store-access";
import { transformPrismaDataForJson } from "@/utils/utils";

import { StoreSetupWizard } from "./components/store-setup-wizard";

type Params = Promise<{ storeId: string }>;

export default async function StoreSetupWizardPage(props: {
	params: Params;
	searchParams: Promise<{ step?: string }>;
}) {
	const params = await props.params;
	const searchParams = await props.searchParams;

	const store = await getStoreWithRelations(params.storeId, {
		includeRsvpSettings: true,
		includeWaitListSettings: true,
		includePaymentMethods: true,
		includeShippingMethods: true,
	});

	if (!store) {
		notFound();
	}

	const settings = await sqlClient.storeSettings.findUnique({
		where: { storeId: params.storeId },
		select: {
			businessHours: true,
			setupWizardCompletedAt: true,
			setupWizardDismissedAt: true,
		},
	});

	const [facilityCount, featuredProductCount, serviceStaffCount] =
		await Promise.all([
			sqlClient.storeFacility.count({ where: { storeId: params.storeId } }),
			sqlClient.product.count({
				where: {
					storeId: params.storeId,
					status: 1,
					ProductCategories: { some: { Category: { isFeatured: true } } },
				},
			}),
			sqlClient.serviceStaff.count({
				where: { storeId: params.storeId, capacity: { gt: 0 } },
			}),
		]);

	transformPrismaDataForJson(store);

	const rsvpSettings = store.rsvpSettings ?? null;
	const waitListSettings = store.waitListSettings ?? null;

	const waitlistInitial = waitListSettings
		? {
				enabled: waitListSettings.enabled,
				requireSignIn: waitListSettings.requireSignIn,
				requireName: waitListSettings.requireName,
				requirePhone: waitListSettings.requirePhone,
				requireLineOnly: waitListSettings.requireLineOnly,
				canGetNumBefore: waitListSettings.canGetNumBefore,
			}
		: null;

	return (
		<StoreSetupWizard
			storeId={params.storeId}
			storeName={store.name}
			initialStep={searchParams.step ?? "systems"}
			systems={{
				useOrderSystem: store.useOrderSystem,
				acceptReservation: rsvpSettings?.acceptReservation ?? true,
				waitlistEnabled: waitListSettings?.enabled ?? false,
			}}
			storeBasic={{
				name: store.name,
				description: store.description ?? "",
				defaultLocale: store.defaultLocale,
				defaultCountry: store.defaultCountry,
				defaultCurrency: store.defaultCurrency,
				defaultTimezone: store.defaultTimezone ?? "Asia/Taipei",
				autoAcceptOrder: store.autoAcceptOrder,
				isOpen: store.isOpen,
				acceptAnonymousOrder: store.acceptAnonymousOrder,
				useBusinessHours: store.useBusinessHours,
				businessHours: settings?.businessHours ?? "",
				requireSeating: store.requireSeating,
				requirePrepaid: store.requirePrepaid,
			}}
			rsvpMode={rsvpSettings?.rsvpMode ?? 0}
			paymentMethodCount={store.StorePaymentMethods?.length ?? 0}
			shippingMethodCount={store.StoreShippingMethods?.length ?? 0}
			facilityCount={facilityCount}
			featuredProductCount={featuredProductCount}
			serviceStaffCount={serviceStaffCount}
			waitlistSettings={waitlistInitial}
			wizardCompletedAt={
				settings?.setupWizardCompletedAt != null
					? String(settings.setupWizardCompletedAt)
					: null
			}
		/>
	);
}
