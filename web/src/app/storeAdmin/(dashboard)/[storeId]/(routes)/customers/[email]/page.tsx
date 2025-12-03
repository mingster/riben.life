import { Loader } from "@/components/loader";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { stripe } from "@/lib/stripe/config";
import type { User } from "@/types";
import type { SubscriptionForUI } from "@/types/enum";
import { transformPrismaDataForJson } from "@/utils/utils";
import { Suspense } from "react";
import { ManageUserClient } from "./client-manage-user";

type Params = Promise<{ email: string; storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function UsersBillingAdminPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// url decode email
	const email = decodeURIComponent(params.email);

	// get user by email
	const user = (await sqlClient.user.findUnique({
		where: {
			email: email,
		},
		include: {
			Orders: {
				where: {
					storeId: params.storeId,
				},
				include: {
					OrderItemView: {
						include: {
							Product: true,
						},
					},
					ShippingMethod: true,
					PaymentMethod: true,
				},
				orderBy: {
					updatedAt: "desc",
				},
			},
			Rsvp: {
				where: {
					storeId: params.storeId,
				},
				orderBy: {
					rsvpTime: "desc",
				},
			},
			CustomerCredits: {
				where: {
					storeId: params.storeId,
				},
			},
			CustomerCreditLedger: {
				where: {
					storeId: params.storeId,
				},
				include: {
					Creator: true,
					StoreOrder: true,
				},
				orderBy: {
					createdAt: "desc",
				},
			},
		},
	})) as User;
	transformPrismaDataForJson(user);

	//console.log(`user: ${JSON.stringify(user)}`);
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
					// convert stripe timestamp to date
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

	//get devices

	return (
		<Suspense fallback={<Loader />}>
			<div className="">
				<ManageUserClient user={user} stripeSubscription={userSubscription} />
			</div>
		</Suspense>
	);
}
