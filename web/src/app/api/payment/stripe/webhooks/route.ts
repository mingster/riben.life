import { handleStripeWebhookPost } from "@/actions/payment/handle-stripe-webhook-post";

/** Legacy path; delegates to the same handler as `POST /api/webhooks/stripe`. */
export const POST = handleStripeWebhookPost;
