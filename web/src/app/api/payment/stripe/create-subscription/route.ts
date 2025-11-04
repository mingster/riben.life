import { NextResponse } from "next/server";
import Stripe from "stripe";
import logger from "@/lib/logger";

//create stripe payment intent
export async function POST(
	_req: Request,
	//{ params }: { params: { chargeTotal: number } }
) {
	/*
  try {
    const data = await req.json();
    const { name, email, paymentMethod, priceId } = data;

    // create a stripe customer
    const customer = await this.stripe.customers.create({
      name: name,
      email: email,
      payment_method: paymentMethod,
      invoice_settings: {
        default_payment_method: paymentMethod,
      },
    });

    // create a stripe subscription
    const subscription = await this.stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_settings: {
        payment_method_options: {
          card: {
            request_three_d_secure: "any",
          },
        },
        payment_method_types: ["card"],
        save_default_payment_method: "on_subscription",
      },
      expand: ["latest_invoice.payment_intent"],
    });

    // return the client secret and subscription id

    return NextResponse.json({
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      subscriptionId: subscription.id,
    });
  } catch (error) {
    logger.info("stripe payment intent", {
    	metadata: {
    		error: error instanceof Error ? error.message : String(error),
    	},
    	tags: ["api"],
    });
    return new NextResponse("Internal error", { status: 500 });
  }

*/
}
