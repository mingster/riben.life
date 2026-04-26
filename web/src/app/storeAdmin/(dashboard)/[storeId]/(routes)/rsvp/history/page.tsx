import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Container from "@/components/ui/container";
import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";

import { ClientRsvpHistory } from "./components/client-rsvp-history";

type Params = Promise<{ storeId: string }>;

export default async function StoreAdminRsvpHistoryPage(props: {
	params: Params;
}) {
	const params = await props.params;
	const storeId = params.storeId;

	const [store, rsvpSettings, storeSettings, facilities, session] =
		await Promise.all([
			sqlClient.store.findFirst({
				where: { id: storeId, isDeleted: false },
				select: {
					id: true,
					name: true,
					defaultTimezone: true,
					defaultCurrency: true,
					useBusinessHours: true,
					useCustomerCredit: true,
					creditExchangeRate: true,
					creditServiceExchangeRate: true,
				},
			}),
			sqlClient.rsvpSettings.findFirst({ where: { storeId } }),
			sqlClient.storeSettings.findFirst({ where: { storeId } }),
			sqlClient.storeFacility.findMany({
				where: { storeId },
				orderBy: { facilityName: "asc" },
			}),
			auth.api.getSession({ headers: await headers() }),
		]);

	if (!store) {
		notFound();
	}

	let user = null;
	if (session?.user?.id) {
		user = await sqlClient.user.findUnique({
			where: { id: session.user.id },
		});
	}

	const rsvps = await sqlClient.rsvp.findMany({
		where: { storeId },
		orderBy: { rsvpTime: "desc" },
		take: 500,
		include: {
			Store: true,
			Customer: true,
			Order: true,
			Facility: true,
			FacilityPricingRule: true,
			RsvpConversation: {
				include: {
					Messages: {
						where: { deletedAt: null },
						orderBy: { createdAt: "asc" },
						take: 1,
					},
				},
			},
			CreatedBy: true,
			ServiceStaff: {
				include: {
					User: {
						select: {
							id: true,
							name: true,
						},
					},
				},
			},
		},
	});

	transformPrismaDataForJson(rsvpSettings);
	transformPrismaDataForJson(storeSettings);
	transformPrismaDataForJson(facilities);
	transformPrismaDataForJson(user);
	transformPrismaDataForJson(rsvps);

	const creditExchangeRate = store.creditExchangeRate
		? Number(store.creditExchangeRate)
		: null;
	const creditServiceExchangeRate = store.creditServiceExchangeRate
		? Number(store.creditServiceExchangeRate)
		: null;

	return (
		<Container>
			<ClientRsvpHistory
				storeId={storeId}
				initialRsvps={rsvps as never}
				rsvpSettings={rsvpSettings as never}
				storeSettings={storeSettings as never}
				facilities={facilities as never}
				user={user as never}
				storeTimezone={store.defaultTimezone}
				storeCurrency={store.defaultCurrency}
				storeUseBusinessHours={store.useBusinessHours}
				useCustomerCredit={store.useCustomerCredit}
				creditExchangeRate={creditExchangeRate}
				creditServiceExchangeRate={creditServiceExchangeRate}
			/>
		</Container>
	);
}
