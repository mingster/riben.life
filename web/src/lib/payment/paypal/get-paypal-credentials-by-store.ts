import isProLevel from "@/actions/storeAdmin/is-pro-level";
import { sqlClient } from "@/lib/prismadb";
import { parsePaymentCredentials } from "@/lib/payment/payment-credentials";

export interface PayPalCredentials {
	clientId: string;
	clientSecret: string;
}

function trimPair(
	id: string | null | undefined,
	secret: string | null | undefined,
): PayPalCredentials | null {
	const ci = id?.trim() ?? "";
	const cs = secret?.trim() ?? "";
	if (ci === "" || cs === "") {
		return null;
	}
	return { clientId: ci, clientSecret: cs };
}

function platformCredentials(): PayPalCredentials | null {
	return trimPair(
		process.env.PAYPAL_CLIENT_ID,
		process.env.PAYPAL_CLIENT_SECRET,
	);
}

/**
 * Resolves PayPal REST credentials: Pro stores may use store paymentCredentials JSON; otherwise platform env.
 */
export async function getPayPalCredentialsByStore(
	storeId: string,
	store?: { paymentCredentials: unknown } | null,
): Promise<PayPalCredentials | null> {
	const isPro = await isProLevel(storeId);

	if (!isPro) {
		return platformCredentials();
	}

	let raw: unknown = store?.paymentCredentials;
	if (raw === undefined) {
		const row = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { paymentCredentials: true },
		});
		raw = row?.paymentCredentials;
	}

	const creds = parsePaymentCredentials(raw);
	const fromStore = trimPair(
		creds.paypal?.clientId,
		creds.paypal?.clientSecret,
	);
	if (fromStore) {
		return fromStore;
	}

	return platformCredentials();
}
