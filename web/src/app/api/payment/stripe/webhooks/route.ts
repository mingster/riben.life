import { handleStripeWebhookPost } from "@/lib/payment/stripe/handle-stripe-webhook";

/** Legacy path; delegates to the same handler as `POST /api/webhooks/stripe`. */
export const POST = handleStripeWebhookPost;
