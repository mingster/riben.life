import { Loader } from "@/components/loader";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { stripe } from "@/lib/payment/stripe/config";
import { getStoreCustomerProfileForManage } from "@/actions/storeAdmin/store-admin/get-store-customer-profile-for-manage";
import type { SubscriptionForUI } from "@/types/enum";
import { Suspense } from "react";
import { ManageUserClient } from "./client-manage-user";

type Params = Promise<{ email: string; storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function UsersBillingAdminPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	const email = decodeURIComponent(params.email);

	const [user, storeMeta] = await Promise.all([
		getStoreCustomerProfileForManage(email, params.storeId),
		sqlClient.store.findUnique({
			where: { id: params.storeId },
			select: { defaultCurrency: true },
		}),
	]);

	const storeCurrency = storeMeta?.defaultCurrency ?? "TWD";

	let stripeSubscriptions = null;
	const userSubscription: SubscriptionForUI[] = [];

	let stripeCustomerId = null;
	if (
		user &&
		user.stripeCustomerId !== null &&
		user.stripeCustomerId !== undefined
	) {
		stripeCustomerId = user.stripeCustomerId;
	}

	try {
		if (stripeCustomerId) {
			stripeSubscriptions = await stripe.subscriptions.list({
				customer: stripeCustomerId,
			});
		}

		if (stripeSubscriptions?.data) {
			for (const subscription of stripeSubscriptions.data) {
				userSubscription.push({
					id: subscription.id,
					customer: subscription.customer as string,
					priceId: subscription.items.data[0].price.id as string,
					productName: "productName" as string,
					status: subscription.status,
					start_date: new Date((subscription.start_date as number) * 1000),
					canceled_at: subscription.cancel_at
						? new Date((subscription.cancel_at as number) * 1000)
						: null,
				});
			}
		}
	} catch (error) {
		logger.error({ error });
		stripeSubscriptions = null;
	}

	return (
		<Suspense fallback={<Loader />}>
			<div className="">
				<ManageUserClient
					user={user}
					stripeSubscription={userSubscription}
					storeCurrency={storeCurrency}
				/>
			</div>
		</Suspense>
	);
}
