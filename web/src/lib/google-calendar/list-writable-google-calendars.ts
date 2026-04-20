export interface WritableGoogleCalendarOption {
	id: string;
	summary: string;
	primary: boolean;
}

/** Token fields passed when refreshing Google OAuth tokens for a connection. */
export interface GoogleCalendarConnectionTokenUpdate {
	readonly accessToken: string;
	readonly accessTokenExpiresAt: bigint;
	readonly refreshTokenEnc?: string | null;
}

export type ListWritableGoogleCalendarsOutcome =
	| { ok: true; calendars: WritableGoogleCalendarOption[] }
	| {
			ok: false;
			errorKind: "not_signed_up" | "unknown";
			message: string;
	  };

export interface ListWritableGoogleCalendarsForConnectionParams {
	readonly storeId: string;
	readonly refreshTokenEnc: string;
	readonly accessToken: string | null;
	readonly accessTokenExpiresAt: bigint | null;
	readonly updateTokens: (
		data: GoogleCalendarConnectionTokenUpdate,
	) => Promise<void>;
}

interface GoogleTokenResponse {
	readonly access_token?: string;
	readonly expires_in?: number;
	readonly refresh_token?: string;
}

interface GoogleCalendarListItem {
	readonly id?: string;
	readonly summary?: string;
	readonly primary?: boolean;
	readonly accessRole?: string;
}

interface GoogleCalendarListResponse {
	readonly items?: GoogleCalendarListItem[];
	readonly error?: {
		readonly errors?: ReadonlyArray<{ readonly reason?: string }>;
	};
}

async function refreshGoogleAccessToken(
	refreshToken: string,
): Promise<{ accessToken: string; expiresAt: bigint } | null> {
	const clientId = process.env.AUTH_GOOGLE_ID;
	const clientSecret = process.env.AUTH_GOOGLE_SECRET;
	if (
		typeof clientId !== "string" ||
		clientId.length === 0 ||
		typeof clientSecret !== "string" ||
		clientSecret.length === 0
	) {
		return null;
	}

	const body = new URLSearchParams({
		grant_type: "refresh_token",
		refresh_token: refreshToken,
		client_id: clientId,
		client_secret: clientSecret,
	});

	const res = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: body.toString(),
	});

	if (!res.ok) {
		return null;
	}

	const json = (await res.json()) as GoogleTokenResponse;
	if (
		typeof json.access_token !== "string" ||
		json.access_token.length === 0 ||
		typeof json.expires_in !== "number"
	) {
		return null;
	}

	const expiresAt = BigInt(Date.now() + json.expires_in * 1000);
	return { accessToken: json.access_token, expiresAt };
}

async function resolveAccessToken(
	params: ListWritableGoogleCalendarsForConnectionParams,
): Promise<string | null> {
	const now = Date.now();
	const expiresMs =
		params.accessTokenExpiresAt !== null &&
		params.accessTokenExpiresAt !== undefined
			? Number(params.accessTokenExpiresAt)
			: 0;
	if (
		typeof params.accessToken === "string" &&
		params.accessToken.length > 0 &&
		expiresMs > now + 60_000
	) {
		return params.accessToken;
	}

	const refreshed = await refreshGoogleAccessToken(params.refreshTokenEnc);
	if (!refreshed) {
		return null;
	}

	await params.updateTokens({
		accessToken: refreshed.accessToken,
		accessTokenExpiresAt: refreshed.expiresAt,
	});

	return refreshed.accessToken;
}

/**
 * Lists calendars the user can write events to (Calendar API `calendarList`).
 */
export async function listWritableGoogleCalendarsForConnection(
	params: ListWritableGoogleCalendarsForConnectionParams,
): Promise<ListWritableGoogleCalendarsOutcome> {
	void params.storeId;

	if (params.refreshTokenEnc.length === 0) {
		return {
			ok: false,
			errorKind: "unknown",
			message: "Missing Google refresh token for this store connection.",
		};
	}

	const accessToken = await resolveAccessToken(params);
	if (!accessToken) {
		return {
			ok: false,
			errorKind: "unknown",
			message: "Could not obtain a Google access token (refresh failed).",
		};
	}

	const listRes = await fetch(
		"https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250",
		{
			headers: { Authorization: `Bearer ${accessToken}` },
		},
	);

	if (!listRes.ok) {
		const text = await listRes.text();
		let reason = "";
		try {
			const errJson = JSON.parse(text) as GoogleCalendarListResponse;
			reason = errJson.error?.errors?.[0]?.reason ?? "";
		} catch {
			reason = "";
		}
		if (reason === "notACalendarUser" || reason === "authError") {
			return {
				ok: false,
				errorKind: "not_signed_up",
				message: text.slice(0, 500),
			};
		}
		return {
			ok: false,
			errorKind: "unknown",
			message: `Calendar list HTTP ${listRes.status}: ${text.slice(0, 500)}`,
		};
	}

	const listJson = (await listRes.json()) as GoogleCalendarListResponse;
	const items = Array.isArray(listJson.items) ? listJson.items : [];

	const writable: WritableGoogleCalendarOption[] = [];
	for (const item of items) {
		const id = item.id;
		if (typeof id !== "string" || id.length === 0) {
			continue;
		}
		const role = item.accessRole;
		if (role !== "owner" && role !== "writer") {
			continue;
		}
		const summary =
			typeof item.summary === "string" && item.summary.length > 0
				? item.summary
				: id;
		writable.push({
			id,
			summary,
			primary: item.primary === true,
		});
	}

	writable.sort((a, b) => {
		if (a.primary !== b.primary) {
			return a.primary ? -1 : 1;
		}
		return a.summary.localeCompare(b.summary);
	});

	return { ok: true, calendars: writable };
}
