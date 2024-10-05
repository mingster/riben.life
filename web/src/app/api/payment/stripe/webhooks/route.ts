import { stripe } from "@/lib/stripe/config";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

const relevantEvents = new Set([
  "product.created",
  "product.updated",
  "product.deleted",
  "price.created",
  "price.updated",
  "price.deleted",
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

// stripe webhook handler
export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event: Stripe.Event;

  try {
    if (!sig || !webhookSecret)
      return new Response("Webhook secret not found.", { status: 400 });
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    console.log(`🔔  Webhook received: ${event.type}`);
  } catch (err: unknown) {
    console.log(`Error message: ${err as Error}.message}`);
    return new Response(`Webhook Error: ${(err as Error).message}`, {
      status: 400,
    });
  }

  try {
    if (relevantEvents.has(event.type)) {
      switch (event.type) {
        case "product.created":
        case "product.updated":
          break;
        case "price.created":
        case "price.updated":
          break;
        case "price.deleted":
          break;
        case "product.deleted":
          break;
        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted":
          break;
        case "checkout.session.completed":
          break;
        default:
          throw new Error("Unhandled relevant event!");
      }
    } else {
      return new NextResponse(`Unsupported event type: ${event.type}`, {
        status: 400,
      });
    }
  } catch (error: unknown) {
    console.log(error);
    return new NextResponse("Webhook handler failed. View your server logs.", {
      status: 400,
    });
  }

  return new NextResponse(JSON.stringify({ received: true }));
}
