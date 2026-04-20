import { redirect } from "next/navigation";
import getCurrentUser from "@/actions/user/get-current-user";
import { getT } from "@/app/i18n";
import { sqlClient } from "@/lib/prismadb";
import {
	type PickupOrderRow,
	PickupOrdersClient,
} from "./pickup-orders-client";

type Params = Promise<{ storeId: string }>;

export default async function ShopOwnerPickupsPage(props: { params: Params }) {
	const { t } = await getT(undefined, "shop");
	const { storeId } = await props.params;
	const user = await getCurrentUser();
	if (!user) {
		redirect(
			`/signIn?callbackUrl=${encodeURIComponent(`/shop/${storeId}/owner/pickups`)}`,
		);
	}

	const store = await sqlClient.store.findFirst({
		where: { id: storeId, isDeleted: false },
		select: { ownerId: true, name: true },
	});
	if (!store || store.ownerId !== user.id) {
		redirect(`/shop/${storeId}`);
	}

	const orders = await sqlClient.storeOrder.findMany({
		where: {
			storeId,
			shopFulfillmentType: "pickup",
		},
		orderBy: { createdAt: "desc" },
		take: 80,
		include: {
			User: { select: { email: true } },
		},
	});

	const rows: PickupOrderRow[] = orders.map((o) => ({
		id: o.id,
		orderNum: o.orderNum,
		createdAt: Number(o.createdAt),
		isPaid: o.isPaid,
		shopPickupReadyAt:
			o.shopPickupReadyAt !== null && o.shopPickupReadyAt !== undefined
				? Number(o.shopPickupReadyAt)
				: null,
		orderTotal: Number(o.orderTotal),
		currency: o.currency,
		customerEmail: o.User?.email ?? null,
	}));

	return (
		<div className="mx-auto max-w-3xl space-y-6 px-3 py-8 sm:px-4 lg:px-6">
			<div>
				<h1 className="font-serif text-2xl font-light tracking-tight">
					{t("shop_owner_pickups_title", { storeName: store.name })}
				</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					{t("shop_owner_pickups_intro")}
				</p>
			</div>
			<PickupOrdersClient orders={rows} />
		</div>
	);
}
