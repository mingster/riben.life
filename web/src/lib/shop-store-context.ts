import { cookies, headers } from "next/headers";

import { sqlClient } from "@/lib/prismadb";
import {
	SHOP_FACILITY_COOKIE,
	SHOP_FACILITY_STORE_COOKIE,
	SHOP_STORE_COOKIE,
} from "@/lib/shop-store-cookies";

/** UUID v4 pattern for store ids in URLs. */
const STORE_ID_UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPlausibleShopStoreIdSegment(segment: string): boolean {
	return STORE_ID_UUID_RE.test(segment.trim());
}

/**
 * Host as sent by the client, without port; lowercase.
 * Tries `x-forwarded-host` first (proxy), then `host`.
 */
export function normalizeRequestHost(hostHeader: string | null): string | null {
	if (!hostHeader) return null;
	const first = hostHeader.split(",")[0]?.trim();
	if (!first) return null;
	const noPort = first.replace(/:\d+$/, "");
	return noPort.toLowerCase() || null;
}

async function resolveStoreIdFromEnv(): Promise<string | null> {
	const envId = process.env.NEXT_PUBLIC_DEFAULT_STORE_ID?.trim();
	if (!envId) return null;
	const row = await sqlClient.store.findFirst({
		where: { id: envId, isDeleted: false },
		select: { id: true },
	});
	return row?.id ?? null;
}

async function resolveStoreIdFromCustomDomainHost(
	host: string | null,
): Promise<string | null> {
	if (!host) return null;

	const tryLookup = async (domain: string) =>
		sqlClient.store.findFirst({
			where: { customDomain: domain, isDeleted: false },
			select: { id: true },
		});

	let row = await tryLookup(host);
	if (row) return row.id;

	if (host.startsWith("www.")) {
		row = await tryLookup(host.slice(4));
		if (row) return row.id;
	}

	return null;
}

/**
 * Env default store, then `Store.customDomain` matching request host.
 * No cookie, no first-store fallback.
 */
export async function resolveShopStoreIdEnvThenCustomDomain(): Promise<
	string | null
> {
	const hdrs = await headers();
	const host = normalizeRequestHost(
		hdrs.get("x-forwarded-host") ?? hdrs.get("host"),
	);

	const fromEnv = await resolveStoreIdFromEnv();
	if (fromEnv) return fromEnv;

	return resolveStoreIdFromCustomDomainHost(host);
}

/**
 * Bare `/shop` landing: env then customDomain only (no cookie).
 */
export async function resolveBareShopStoreIdForRequest(): Promise<
	string | null
> {
	return resolveShopStoreIdEnvThenCustomDomain();
}

async function validateStoreId(
	id: string | null | undefined,
): Promise<string | null> {
	const trimmed = typeof id === "string" ? id.trim() : "";
	if (!trimmed) return null;
	const row = await sqlClient.store.findFirst({
		where: { id: trimmed, isDeleted: false },
		select: { id: true },
	});
	return row?.id ?? null;
}

/**
 * API routes: optional explicit `storeId` (query/body) wins, then cookie + env + customDomain.
 */
export async function getShopStoreIdForApi(
	explicitStoreId: string | null | undefined,
): Promise<string | null> {
	const direct = await validateStoreId(explicitStoreId);
	if (direct) return direct;
	return getShopStoreIdForRequest();
}

/**
 * API and checkout: validated QR cookie, then env + customDomain (no first store).
 */
export async function getShopStoreIdForRequest(): Promise<string | null> {
	const jar = await cookies();
	const fromCookie = jar.get(SHOP_STORE_COOKIE)?.value?.trim();
	if (fromCookie) {
		const row = await sqlClient.store.findFirst({
			where: { id: fromCookie, isDeleted: false },
			select: { id: true },
		});
		if (row) return row.id;
	}
	return resolveShopStoreIdEnvThenCustomDomain();
}

/**
 * Facility/table QR context when it matches the active shop store.
 */
export async function getShopFacilityIdForStoreOrder(
	storeId: string,
): Promise<string | null> {
	const jar = await cookies();
	const facilityId = jar.get(SHOP_FACILITY_COOKIE)?.value?.trim();
	const facilityStoreId = jar.get(SHOP_FACILITY_STORE_COOKIE)?.value?.trim();
	if (!facilityId || facilityStoreId !== storeId) {
		return null;
	}
	const row = await sqlClient.storeFacility.findFirst({
		where: { id: facilityId, storeId },
		select: { id: true },
	});
	return row?.id ?? null;
}
