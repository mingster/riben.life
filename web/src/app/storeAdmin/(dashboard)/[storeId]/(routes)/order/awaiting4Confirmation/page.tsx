import Container from "@/components/ui/container";
import { checkStoreStaffAccess } from "@/lib/store-admin-utils";
import type { Store } from "@/types";
import type { Metadata } from "next";
import { Awaiting4ConfirmationClient } from "./client";

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
	const store = (await checkStoreStaffAccess(params.storeId)) as Store;

	return (
		<Container>
			<Awaiting4ConfirmationClient store={store} />
		</Container>
	);
}
