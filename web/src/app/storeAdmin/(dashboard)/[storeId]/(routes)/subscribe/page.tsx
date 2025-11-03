import { sqlClient } from "@/lib/prismadb";
import { checkStoreStaffAccess } from "@/lib/store-admin-utils";
import type { Store } from "@/types";
import { PkgSelection } from "./pkgSelection";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ensureStripeCustomer } from "@/actions/user/ensure-stripe-customer";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StoreSubscribePage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Check authentication first
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		redirect(`/signin?callbackUrl=/storeAdmin/${params.storeId}/subscribe`);
	}

	// Parallel queries for optimal performance
	const [_customerCheck, store, subscription] = await Promise.all([
		ensureStripeCustomer(session.user.id),
		checkStoreStaffAccess(params.storeId),
		sqlClient.storeSubscription.findUnique({
			where: { storeId: params.storeId },
		}),
	]);

	if (process.env.NODE_ENV === "development") {
		console.log("subscription", subscription);
	}

	return (
		<section className="relative w-full">
			<div className="container">
				<PkgSelection store={store as Store} subscription={subscription} />
			</div>
		</section>
	);
}
