import type Stripe from "stripe";
import { stripe } from "@/lib/stripe/config";
import type { User } from "@/types";
import { SafeError } from "@/utils/error";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";

// ensure stripe customer exists for the user
// return stripe customer object
export const ensureStripeCustomer = async (
	userId: string,
): Promise<Stripe.Customer | null> => {
	const user = await sqlClient.user.findUnique({
		where: { id: userId },
	});

	if (!user) throw new SafeError("Unauthorized");

	//await syncNopCustomerToAuth(user.email);

	const updatedUser = (await sqlClient.user.findUnique({
		where: { id: userId },
	})) as User;
	if (!updatedUser) throw new SafeError("Unauthorized");

	if (!updatedUser.stripeCustomerId || updatedUser.stripeCustomerId === "") {
		return (await doCreateStripeCustomer(updatedUser)) as Stripe.Customer;
	} else {
		return (await doValidateStripeCustomer(updatedUser)) as Stripe.Customer;
	}
};

async function doCreateStripeCustomer(
	user: User,
): Promise<Stripe.Customer | null> {
	if (!user.email) throw new SafeError("Email is required");
	return await stripe.customers
		.create({
			email: user.email || "",
			name: user.name || "",
			metadata: {
				userId: user.id,
			},
		})
		.then(async (customer) => {
			await sqlClient.user.update({
				where: { id: user.id },
				data: {
					stripeCustomerId: customer.id,
				},
			});

			return customer as Stripe.Customer;
		});
}

async function doValidateStripeCustomer(
	user: User,
): Promise<Stripe.Customer | null> {
	try {
		if (!user.stripeCustomerId)
			throw new SafeError("Stripe customer ID is required");

		const _stripeCustomer = await stripe.customers.retrieve(
			user.stripeCustomerId,
		);

		return _stripeCustomer as Stripe.Customer;
	} catch (error) {
		logger.error("Failed to validate Stripe customer", {
			metadata: {
				userId: user.id,
				stripeCustomerId: user.stripeCustomerId,
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["doValidateStripeCustomer"],
			service: "ensure-stripe-customer",
			environment: process.env.NODE_ENV,
			version: process.env.npm_package_version,
		});
		//if stripe customer does not exist, create it
		return await doCreateStripeCustomer(user);
	}
}
