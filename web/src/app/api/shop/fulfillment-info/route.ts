import { NextResponse } from "next/server";
import { sqlClient } from "@/lib/prismadb";
import { resolveShippingMethodIdForStore } from "@/lib/shop/shipping-method";
import { parseStorefrontPickupLocationsJson } from "@/lib/shop/storefront-fulfillment";
import { getShopStoreIdForApi } from "@/lib/shop-store-context";
import { transformPrismaDataForJson } from "@/utils/utils";

export async function GET(req: Request) {
	const url = new URL(req.url);
	const storeId = await getShopStoreIdForApi(url.searchParams.get("storeId"));
	if (!storeId) {
		return NextResponse.json({ error: "No default store" }, { status: 503 });
	}

	const settings = await sqlClient.storeSettings.findUnique({
		where: { storeId },
		select: {
			storefrontFreeShippingMinimum: true,
			storefrontShippingEtaCopy: true,
			storefrontPickupLocationsJson: true,
		},
	});

	const locations = parseStorefrontPickupLocationsJson(
		settings?.storefrontPickupLocationsJson,
	);

	let defaultShippingMajor = 0;
	const methodId = await resolveShippingMethodIdForStore(storeId);
	if (methodId) {
		const m = await sqlClient.shippingMethod.findUnique({
			where: { id: methodId },
			select: { basic_price: true },
		});
		if (m) {
			defaultShippingMajor = Number(m.basic_price);
		}
	}

	const payload = {
		freeShippingMinimum:
			settings?.storefrontFreeShippingMinimum !== null &&
			settings?.storefrontFreeShippingMinimum !== undefined
				? Number(settings.storefrontFreeShippingMinimum)
				: null,
		shippingEtaCopy: settings?.storefrontShippingEtaCopy ?? null,
		pickupLocations: locations,
		pickupEnabled: locations.length > 0,
		defaultShippingMajor,
	};

	transformPrismaDataForJson(payload);
	return NextResponse.json(payload);
}
