import { getStoreHomeDataAction } from "@/actions/store/get-store-home-data";
import { Loader } from "@/components/loader";
import type { Store } from "@/types";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { WaitlistJoinClient } from "./components/waitlist-join-client";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function WaitlistPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	const result = await getStoreHomeDataAction({ storeId: params.storeId });

	if (result?.serverError || !result?.data) {
		redirect("/unv");
	}

	const { store, rsvpSettings } = result.data;
	const waitlistEnabled = rsvpSettings?.waitlistEnabled === true;
	const waitlistRequireSignIn = rsvpSettings?.waitlistRequireSignIn === true;

	return (
		<Suspense fallback={<Loader />}>
			<WaitlistJoinClient
				storeId={store.id}
				storeName={store.name}
				waitlistEnabled={waitlistEnabled}
				waitlistRequireSignIn={waitlistRequireSignIn}
			/>
		</Suspense>
	);
}
