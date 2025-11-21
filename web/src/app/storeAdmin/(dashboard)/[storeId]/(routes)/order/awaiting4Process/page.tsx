import Container from "@/components/ui/container";
import { getStoreWithRelations } from "@/lib/store-access";
import { Awaiting4ProcessingClient } from "./client";
import { redirect } from "next/navigation";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function OrderAwaiting4Processing(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Note: checkStoreStaffAccess already called in layout (cached)
	const store = await getStoreWithRelations(params.storeId);

	if (!store) {
		redirect("/storeAdmin");
	}

	return (
		<Container>
			<Awaiting4ProcessingClient store={store} />
		</Container>
	);
}
