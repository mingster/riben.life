import { Loader } from "@/components/loader";
import { Suspense } from "react";
import { CustomersClient } from "./components/client-customer";
import { getCustomersAction } from "@/actions/storeAdmin/customer/get-customers";
import { sqlClient } from "@/lib/prismadb";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// manage customers in this store
//
export default async function CustomersPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;
	const storeId = params.storeId;

	const [result, store] = await Promise.all([
		getCustomersAction(storeId, {}),
		sqlClient.store.findUnique({
			where: { id: storeId },
			select: { defaultCurrency: true },
		}),
	]);

	if (result?.serverError) {
		throw new Error(result.serverError);
	}

	const users = result?.data?.users || [];
	const currency = store?.defaultCurrency || "twd";

	return (
		<Suspense fallback={<Loader />}>
			<CustomersClient serverData={users} currency={currency} />
		</Suspense>
	);
}
