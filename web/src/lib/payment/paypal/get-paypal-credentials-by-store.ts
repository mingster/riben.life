import isProLevel from "@/actions/storeAdmin/is-pro-level";
import { sqlClient } from "@/lib/prismadb";

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
 * Resolves PayPal REST credentials: Pro stores may use Store.PAYPAL_*; otherwise platform env.
 * Mirrors {@link getLinePayClientByStore} selection logic.
 */
export async function getPayPalCredentialsByStore(
	storeId: string,
	store?: {
		PAYPAL_CLIENT_ID: string | null;
		PAYPAL_CLIENT_SECRET: string | null;
	} | null,
): Promise<PayPalCredentials | null> {
	const isPro = await isProLevel(storeId);

	if (!isPro) {
		return platformCredentials();
	}

	let storeConfig = store;
	if (!storeConfig) {
		const row = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: {
				PAYPAL_CLIENT_ID: true,
				PAYPAL_CLIENT_SECRET: true,
			},
		});
		storeConfig = row;
	}

	const fromStore = trimPair(
		storeConfig?.PAYPAL_CLIENT_ID,
		storeConfig?.PAYPAL_CLIENT_SECRET,
	);
	if (fromStore) {
		return fromStore;
	}

	return platformCredentials();
}
