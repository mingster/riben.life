import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";

/**
 * Collects candidate store IDs from an auth-related URL (magic link, reset link, etc.).
 * Handles `storeId` query param and storefront paths embedded in `callbackURL` (`/s/{storeId}/...`).
 */
function extractStoreIdsFromUrlString(raw: string): string[] {
	const ids: string[] = [];
	const push = (id: string | null | undefined) => {
		if (id && id.trim().length > 0) {
			ids.push(id.trim());
		}
	};
	try {
		const u = new URL(raw);
		push(u.searchParams.get("storeId"));
		const cb = u.searchParams.get("callbackURL");
		if (cb) {
			const decoded = decodeURIComponent(cb);
			try {
				const cbUrl = new URL(decoded);
				push(cbUrl.searchParams.get("storeId"));
				const pathMatch = cbUrl.pathname.match(/\/s\/([^/?#]+)/);
				if (pathMatch?.[1]) {
					push(pathMatch[1]);
				}
			} catch {
				const pathMatch = decoded.match(/\/s\/([^/?#]+)/);
				if (pathMatch?.[1]) {
					push(pathMatch[1]);
				}
			}
		}
	} catch {
		const pathMatch = raw.match(/\/s\/([^/?#]+)/);
		if (pathMatch?.[1]) {
			push(pathMatch[1]);
		}
	}
	return ids;
}

export interface AuthEmailStoreContext {
	id: string;
	name: string;
}

/**
 * Resolves store id/name for auth emails when the magic-link / reset URL (or request)
 * includes `storeId`, `callbackURL` with `/s/{storeId}/`, or `storeId` on the incoming request.
 */
export async function resolveStoreForAuthEmail(
	linkUrl: string,
	request?: Request | null,
): Promise<AuthEmailStoreContext | null> {
	const candidates: string[] = [...extractStoreIdsFromUrlString(linkUrl)];

	if (request?.url) {
		try {
			const ru = new URL(request.url);
			const sid = ru.searchParams.get("storeId");
			if (sid) {
				candidates.push(sid.trim());
			}
		} catch {
			/* ignore malformed request.url */
		}
	}

	const headerSid = request?.headers.get("x-store-id");
	if (headerSid?.trim()) {
		candidates.push(headerSid.trim());
	}

	const unique = [...new Set(candidates)];

	for (const id of unique) {
		try {
			const store = await sqlClient.store.findFirst({
				where: { id, isDeleted: false },
				select: { id: true, name: true },
			});
			if (store) {
				return store;
			}
		} catch (err: unknown) {
			logger.warn("resolveStoreForAuthEmail store lookup failed", {
				metadata: {
					storeId: id,
					error: err instanceof Error ? err.message : String(err),
				},
				tags: ["mail", "auth-email", "store-resolve"],
			});
		}
	}

	return null;
}
