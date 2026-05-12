/** Cookie names for QR /s entry → /shop context. Edge-safe (no Prisma). */

export const SHOP_STORE_COOKIE = "riben.life_shop_store_id";
export const SHOP_FACILITY_COOKIE = "riben.life_shop_facility_id";
export const SHOP_FACILITY_STORE_COOKIE = "riben.life_shop_facility_store_id";

/** Max-Age 1 year (seconds). */
export const SHOP_CONTEXT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Path segments under `/s/[storeId]/...` that are not facility IDs. */
export const S_STORE_RESERVED_SEGMENTS = new Set(["reservation", "waitlist"]);
