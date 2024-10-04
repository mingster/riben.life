import { NextResponse } from "next/server";
import Stripe from "stripe";

//create stripe payment intent
export async function POST(
  req: Request,
  //{ params }: { params: { chargeTotal: number } }
) {
  try {
    const data = await req.json();
    const { total, currency } = data;

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

    const stripe = new Stripe(
      process.env.STRIPE_SECRET_KEY_LIVE ?? process.env.STRIPE_SECRET_KEY ?? '',
      {
        apiVersion: "2024-06-20",
        typescript: true,
      });

    const paymentIntent = await stripe.paymentIntents.create({
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
