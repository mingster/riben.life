import { handleStripeWebhookPost } from "@/actions/payment/handle-stripe-webhook-post";

/** Canonical Stripe webhook URL (shop + platform). Configure this in Stripe Dashboard. */
export const POST = handleStripeWebhookPost;
