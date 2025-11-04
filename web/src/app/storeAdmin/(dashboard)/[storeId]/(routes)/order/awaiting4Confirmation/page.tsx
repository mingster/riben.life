import Container from "@/components/ui/container";
import getStoreWithCategories from "@/actions/get-store";
import type { Metadata } from "next";
import { Awaiting4ConfirmationClient } from "./client";
import { getStoreWithRelations } from "@/lib/store-access";

export const metadata: Metadata = {
	title: "Orders Awaiting Confirmation",
	description: "Manage orders awaiting confirmation",
};

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function OrderAwaiting4ConfirmationPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Note: checkStoreStaffAccess already called in layout (cached)
	const store = await getStoreWithRelations(params.storeId);

	return (
		<Container>
			<Awaiting4ConfirmationClient store={store} />
		</Container>
	);
}
