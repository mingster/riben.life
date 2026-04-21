import { redirect } from "next/navigation";

import { resolveBareShopStoreIdForRequest } from "@/lib/shop-store-context";

/** Bare `/shop`: env default, then custom domain — no cookie. */
export default async function ShopEntryPage() {
	const id = await resolveBareShopStoreIdForRequest();
	if (id) {
		redirect(`/shop/${id}`);
	}
	redirect("/shop/no-store");
}
