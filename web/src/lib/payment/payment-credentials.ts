export interface StorePaymentCredentials {
	linepay?: { id?: string; secret?: string };
	stripe?: { secretKey?: string };
	paypal?: { clientId?: string; clientSecret?: string };
	newebpay?: { merchantId?: string; hashKey?: string; hashIV?: string };
}

export function parsePaymentCredentials(raw: unknown): StorePaymentCredentials {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
	return raw as StorePaymentCredentials;
}
