import { stripe } from "@/lib/stripe/config";
import { NextResponse } from "next/server";

//create stripe payment intent
export async function POST(
	req: Request,
	//{ params }: { params: { chargeTotal: number } }
) {
	try {
		const data = await req.json();
		const { total, currency, stripeCustomerId } = data;

		if (!total) {
			return NextResponse.json(
				{ success: false, message: "orderTotal is required." },
				{ status: 402 },
			);
		}

		if (Number.isNaN(total)) {
			return NextResponse.json(
				{ success: false, message: "orderTotal is required." },
				{ status: 403 },
			);
		}

		if (!currency) {
			return NextResponse.json(
				{ success: false, message: "currency is required." },
				{ status: 404 },
			);
		}

		const paymentIntent = await stripe.paymentIntents.create({
			customer: stripeCustomerId || undefined, // Change here to allow undefined
			amount: total * 100,
			currency: currency,
			automatic_payment_methods: { enabled: true },
		});

		//console.log('paymentIntent: ' + JSON.stringify(paymentIntent));

		return NextResponse.json(paymentIntent);
	} catch (error) {
		console.log("[STRIPE_payment_intent]", error);

		return new NextResponse("Internal error", { status: 500 });
	}
}
