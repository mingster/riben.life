import { getPaymentWebhookHandler } from "@/lib/payment/plugins/webhook-registry";
import { handleStripeWebhookPost } from "@/lib/payment/stripe/handle-stripe-webhook";

interface RouteParams {
	params: Promise<{ provider: string }>;
}

/**
 * Scalable provider entry. `stripe` uses the unified Stripe handler (shop + platform).
 */
export async function POST(req: Request, props: RouteParams) {
	const { provider } = await props.params;
	const id = provider?.trim().toLowerCase() ?? "";

	if (id === "stripe") {
		return handleStripeWebhookPost(req);
	}

	const handler = getPaymentWebhookHandler(id);
	if (!handler) {
		return new Response(`Unknown payment webhook provider: ${provider}`, {
			status: 404,
		});
	}

	return handler.handlePost(req);
}
