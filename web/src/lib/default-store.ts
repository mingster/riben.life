import { sqlClient } from "@/lib/prismadb";

/**
 * Resolves store id from `NEXT_PUBLIC_DEFAULT_STORE_ID` when set and valid.
 * Does not fall back to “first store” (multi-store shop uses explicit resolution).
 */
export async function getDefaultStoreIdFromEnv(): Promise<string | null> {
	const envId = process.env.NEXT_PUBLIC_DEFAULT_STORE_ID?.trim();
	if (!envId) return null;
	const exists = await sqlClient.store.findFirst({
		where: { id: envId, isDeleted: false },
		select: { id: true },
	});
	return exists?.id ?? null;
}
