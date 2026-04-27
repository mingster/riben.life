import { getStoreHomeDataAction } from "@/actions/store/get-store-home-data";
import { Loader } from "@/components/loader";
import { auth } from "@/lib/auth";
import { getCustomerStoreBasePath } from "@/lib/customer-store-base-path";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RsvpMode } from "@/types/enum";
import { ClientReservation } from "./components/client-reservation";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function isGuestSession(email: string | null | undefined): boolean {
	return Boolean(email?.startsWith("guest-") && email.endsWith("@riben.life"));
}

export default async function ReservationPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Fetch store, RSVP settings, and store settings all at once
	const result = await getStoreHomeDataAction({ storeId: params.storeId });

	if (result?.serverError) {
		redirect("/unv");
	}

	if (!result?.data) {
		redirect("/unv");
	}

	const { store, rsvpSettings, storeSettings, facilities, serviceStaff } =
		result.data;
	const acceptReservation = rsvpSettings.acceptReservation === true;

	if (rsvpSettings.requireSignIn) {
		const session = await auth.api.getSession({
			headers: await headers(),
		});
		const isSignedIn =
			Boolean(session?.user?.id) && !isGuestSession(session?.user?.email);

		if (!isSignedIn) {
			const callbackUrl = `/s/${params.storeId}/reservation`;
			redirect(`/signIn?callbackUrl=${encodeURIComponent(callbackUrl)}`);
		}
	}

	if (
		acceptReservation &&
		Number(rsvpSettings.rsvpMode) === RsvpMode.RESTAURANT
	) {
		const customerBase = await getCustomerStoreBasePath(params.storeId);
		redirect(`${customerBase}/reservation/open`);
	}

	return (
		<Suspense fallback={<Loader />}>
			<ClientReservation
				store={store}
				rsvpSettings={rsvpSettings}
				storeSettings={storeSettings}
				useOrderSystem={store.useOrderSystem}
				acceptReservation={acceptReservation}
				facilities={facilities || []}
				serviceStaff={serviceStaff ?? []}
			/>
		</Suspense>
	);
}
