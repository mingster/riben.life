import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ShopShell } from "@/components/shop/shop-shell";
import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { listCategoriesForStore } from "@/lib/shop/catalog";
import type { ShopNavCategory } from "@/lib/shop/nav-types";

type Params = Promise<{ storeId: string }>;

export default async function ShopStoreLayout(props: {
	children: ReactNode;
	params: Params;
}) {
	const { storeId } = await props.params;
	const store = await sqlClient.store.findFirst({
		where: { id: storeId, isDeleted: false },
		select: { id: true, ownerId: true },
	});
	if (!store) {
		notFound();
	}

	const categoriesRaw = await listCategoriesForStore(store.id);
	const categories: ShopNavCategory[] = categoriesRaw.map((c) => ({
		id: c.id,
		name: c.name,
	}));

	const session = await auth.api.getSession({ headers: await headers() });
	const showOwnerPickupLink =
		Boolean(session?.user?.id) && session?.user?.id === store.ownerId;

	return (
		<ShopShell
			storeId={store.id}
			categories={categories}
			showOwnerPickupLink={showOwnerPickupLink}
		>
			{props.children}
		</ShopShell>
	);
}
