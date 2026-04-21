import logger from "@/lib/logger";
import { getPayPalApiBase } from "./paypal-api-base";
import { getPayPalAccessToken } from "./paypal-oauth";

export interface CreatePayPalOrderParams {
	clientId: string;
	clientSecret: string;
	amountValue: string;
	currencyCode: string;
	returnUrl: string;
	cancelUrl: string;
	customId: string;
	description: string;
}

export interface CreatePayPalOrderOk {
	orderId: string;
	approvalUrl: string;
}

/**
 * Create a PayPal order (intent CAPTURE) and return the approval URL.
 */
export async function createPayPalOrder(
	params: CreatePayPalOrderParams,
): Promise<CreatePayPalOrderOk | { error: string }> {
	try {
		const token = await getPayPalAccessToken(
			params.clientId,
			params.clientSecret,
		);
		const base = getPayPalApiBase();
		const currency = params.currencyCode.toUpperCase();

		const res = await fetch(`${base}/v2/checkout/orders`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
				Prefer: "return=representation",
			},
			body: JSON.stringify({
				intent: "CAPTURE",
				purchase_units: [
					{
						custom_id: params.customId,
						description: params.description,
						amount: {
							currency_code: currency,
							value: params.amountValue,
						},
					},
				],
				application_context: {
					return_url: params.returnUrl,
					cancel_url: params.cancelUrl,
					landing_page: "NO_PREFERENCE",
					user_action: "PAY_NOW",
				},
			}),
		});

		const json = (await res.json()) as {
			id?: string;
			links?: { href: string; rel: string; method?: string }[];
			message?: string;
			name?: string;
			details?: unknown;
		};

		if (!res.ok || !json.id) {
			const msg =
				json.message ||
				json.name ||
				`PayPal create order failed (${res.status})`;
			logger.error("PayPal create order failed", {
				metadata: {
					status: res.status,
					body: json,
				},
				tags: ["payment", "paypal", "error"],
			});
			return { error: msg };
		}

		const approve = json.links?.find((l) => l.rel === "approve");
		if (!approve?.href) {
			return { error: "PayPal response missing approval link." };
		}

		return {
			orderId: json.id,
			approvalUrl: approve.href,
		};
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		logger.error("PayPal create order exception", {
			metadata: { error: message },
			tags: ["payment", "paypal", "error"],
		});
		return { error: message };
	}
}

export interface CapturePayPalOrderOk {
	captureId: string;
}

/**
 * Capture payment for an approved PayPal order.
 */
export async function capturePayPalOrder(
	clientId: string,
	clientSecret: string,
	payPalOrderId: string,
): Promise<CapturePayPalOrderOk | { error: string }> {
	try {
		const token = await getPayPalAccessToken(clientId, clientSecret);
		const base = getPayPalApiBase();

		const res = await fetch(
			`${base}/v2/checkout/orders/${encodeURIComponent(payPalOrderId)}/capture`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
					Prefer: "return=representation",
				},
			},
		);

		const json = (await res.json()) as {
			id?: string;
			status?: string;
			purchase_units?: Array<{
				payments?: {
					captures?: { id?: string; status?: string }[];
				};
			}>;
			message?: string;
			name?: string;
		};

		if (!res.ok) {
			const msg =
				json.message || json.name || `PayPal capture failed (${res.status})`;
			logger.error("PayPal capture failed", {
				metadata: { status: res.status, orderId: payPalOrderId, body: json },
				tags: ["payment", "paypal", "error"],
			});
			return { error: msg };
		}

		const captureId =
			json.purchase_units?.[0]?.payments?.captures?.[0]?.id ||
			json.id ||
			payPalOrderId;

		if (json.status && json.status !== "COMPLETED") {
			return { error: `Unexpected PayPal order status: ${json.status}` };
		}

		return { captureId };
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		logger.error("PayPal capture exception", {
			metadata: { error: message, orderId: payPalOrderId },
			tags: ["payment", "paypal", "error"],
		});
		return { error: message };
	}
}
