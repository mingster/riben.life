/**
 * Persists `/liff/[storeId]` (and query) before LINE Login redirects to the LIFF endpoint root,
 * so we can send the user back after OAuth when LINE drops the path segment.
 */
const STORAGE_KEY = "liff_post_login_path";

/** Matches `/liff/<segment>` where segment is a single path part (e.g. store id or slug). */
const DEEP_LIFF_PATH = /^\/liff\/[^/]+/;

export function saveLiffReturnPathIfDeepLink(
	pathname: string,
	search: string,
): void {
	if (typeof window === "undefined") {
		return;
	}
	if (!DEEP_LIFF_PATH.test(pathname)) {
		return;
	}
	const suffix = search ? (search.startsWith("?") ? search : `?${search}`) : "";
	try {
		window.sessionStorage.setItem(STORAGE_KEY, `${pathname}${suffix}`);
	} catch {
		// ignore quota / private mode
	}
}

export function consumeLiffReturnPath(): string | null {
	if (typeof window === "undefined") {
		return null;
	}
	try {
		const value = window.sessionStorage.getItem(STORAGE_KEY);
		if (!value || !DEEP_LIFF_PATH.test(value.split("?")[0] ?? "")) {
			return null;
		}
		window.sessionStorage.removeItem(STORAGE_KEY);
		return value;
	} catch {
		return null;
	}
}

export function isLiffRootPath(pathname: string): boolean {
	const normalized = pathname.replace(/\/$/, "") || "/";
	return normalized === "/liff";
}

/**
 * After email/phone/passkey sign-in on this origin, prefer a stored `/liff/...` deep link
 * (saved before redirecting to `/signIn`) over the query `callbackUrl`.
 */
export function getPostSignInRedirect(callbackUrl: string): string {
	const stored = consumeLiffReturnPath();
	if (stored) {
		return stored;
	}
	return callbackUrl;
}
