import { handleStripeWebhookPost } from "@/lib/payment/stripe/handle-stripe-webhook";

/** Canonical Stripe webhook URL (shop + platform). Configure this in Stripe Dashboard. */
export const POST = handleStripeWebhookPost;
