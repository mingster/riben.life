import { getPayPalApiBase } from "./paypal-api-base";

type TokenCacheEntry = { token: string; expiresAtMs: number };

const tokenCache = new Map<string, TokenCacheEntry>();

function cacheKey(clientId: string, clientSecret: string): string {
	return `${clientId}:${clientSecret.slice(0, 8)}`;
}

/**
 * OAuth2 client-credentials access token (cached until ~60s before expiry).
 */
export async function getPayPalAccessToken(
	clientId: string,
	clientSecret: string,
): Promise<string> {
	const key = cacheKey(clientId, clientSecret);
	const now = Date.now();
	const hit = tokenCache.get(key);
	if (hit && hit.expiresAtMs > now + 5000) {
		return hit.token;
	}

	const base = getPayPalApiBase();
	const basic = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString(
		"base64",
	);

	const res = await fetch(`${base}/v1/oauth2/token`, {
		method: "POST",
		headers: {
			Authorization: `Basic ${basic}`,
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: "grant_type=client_credentials",
	});

	const json = (await res.json()) as {
		access_token?: string;
		expires_in?: number;
		error?: string;
		error_description?: string;
	};

	if (!res.ok || !json.access_token) {
		throw new Error(
			json.error_description ||
				json.error ||
				`PayPal OAuth failed (${res.status})`,
		);
	}

	const expiresInSec =
		typeof json.expires_in === "number" ? json.expires_in : 30000;
	tokenCache.set(key, {
		token: json.access_token,
		expiresAtMs: now + Math.max(60, expiresInSec - 60) * 1000,
	});

	return json.access_token;
}
