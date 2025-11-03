import Container from "@/components/ui/container";
import { checkStoreStaffAccess } from "@/lib/store-admin-utils";
import type { Store } from "@/types";
import { Awaiting4ProcessingClient } from "./client";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function OrderAwaiting4Processing(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Check store access
	const store = (await checkStoreStaffAccess(params.storeId)) as Store;

	return (
		<Container>
			<Awaiting4ProcessingClient store={store} />
		</Container>
	);
}
