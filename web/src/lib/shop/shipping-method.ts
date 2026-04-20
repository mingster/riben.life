import { sqlClient } from "@/lib/prismadb";

/**
 * Picks a shipping method for checkout: store mapping first, then any non-deleted default/global method.
 */
export async function resolveShippingMethodIdForStore(
	storeId: string,
): Promise<string | null> {
	const mapped = await sqlClient.storeShipMethodMapping.findFirst({
		where: { storeId },
		select: { methodId: true },
	});
	if (mapped) return mapped.methodId;

	const preferred = await sqlClient.shippingMethod.findFirst({
		where: { isDeleted: false, isDefault: true },
		select: { id: true },
	});
	if (preferred) return preferred.id;

	const any = await sqlClient.shippingMethod.findFirst({
		where: { isDeleted: false },
		select: { id: true },
	});
	return any?.id ?? null;
}
