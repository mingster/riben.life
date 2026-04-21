import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Container from "@/components/ui/container";
import { getStoreWithRelations } from "@/lib/store-access";
import { StoreLevel } from "@/types/enum";
import { CashCashierClient } from "./client";

export const metadata: Metadata = {
	title: "Cash cashier",
	description: "Confirm cash payments for unpaid orders",
};

type Params = Promise<{ storeId: string }>;

export default async function CashCashierPage(props: { params: Params }) {
	const params = await props.params;
	const store = await getStoreWithRelations(params.storeId);

	if (!store) {
		redirect("/storeAdmin");
	}

	if (!store.useOrderSystem) {
		redirect(`/storeAdmin/${params.storeId}/dashboard`);
	}

	if (store.level === StoreLevel.Free) {
		redirect(`/storeAdmin/${params.storeId}/dashboard`);
	}

	return (
		<Container>
			<CashCashierClient store={store} />
		</Container>
	);
}
