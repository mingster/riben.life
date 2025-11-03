import Container from "@/components/ui/container";
import { checkStoreStaffAccess } from "@/lib/store-admin-utils";
import type { Store } from "@/types";
import { AwaitingToShipClient } from "./client";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function OrderAwaitingToShip(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;
	const store = (await checkStoreStaffAccess(params.storeId)) as Store;

	return (
		<Container>
			<AwaitingToShipClient store={store} />
		</Container>
	);
}
