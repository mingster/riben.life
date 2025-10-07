import { Suspense } from "react";
import { Loader } from "@/components/loader";
import { stripe } from "@/lib/stripe/config";
import type { User } from "@/types";
import type { SubscriptionForUI } from "@/types/enum";
import logger from "@/lib/logger";
import { transformDecimalsToNumbers } from "@/utils/utils";
import { ManageUserClient } from "./client-manage-user";
import { sqlClient } from "@/lib/prismadb";

type Params = Promise<{ email: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function UsersBillingAdminPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const log = logger.child({ module: "UsersBillingAdminPage" });

	const params = await props.params;

	// url decode email
	const email = decodeURIComponent(params.email);
	//log.info({ email });

	// get user by email

	const user = await sqlClient.user.findUnique({
		where: {
			email: email,
		},
		include: {
			/*
	  NotificationTo: {
		take: 20,
		include: {
		  Sender: true,
		},
		orderBy: {
		  updatedAt: "desc",
		},
	  },*/
			Addresses: true,
			Orders: {
				include: {
					ShippingMethod: true,
					PaymentMethod: true,
					OrderItemView: true,
				},
				orderBy: {
					updatedAt: "desc",
				},
			},
			sessions: true,
			accounts: true,
		},
	});

	if (!user) {
		throw new Error("User not found");
	}

	transformDecimalsToNumbers(user);

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
		stripeSubscriptions = await stripe.subscriptions.list({
			customer: stripeCustomerId as string,
		});

		for (const subscription of stripeSubscriptions.data) {
			userSubscription.push({
				id: subscription.id,
				customer: subscription.customer as string,
				priceId: subscription.items.data[0].price.id as string,
				productName: "productName",
				status: subscription.status,
				// convert stripe timestamp to date
				start_date: new Date((subscription.start_date as number) * 1000),
				canceled_at: subscription.cancel_at
					? new Date((subscription.cancel_at as number) * 1000)
					: null,
			});
		}
	} catch (error) {
		log.error({ error });
		stripeSubscriptions = null;
	}

	return (
		<Suspense fallback={<Loader />}>
			<div className="">
				<ManageUserClient user={user} stripeSubscription={userSubscription} />
			</div>
		</Suspense>
	);
}
