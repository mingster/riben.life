import { Loader } from "@/components/loader";
import { Suspense } from "react";
import { CustomersClient } from "./components/client-customer";
import { getCustomersAction } from "@/actions/storeAdmin/customer/get-customers";

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

	const result = await getCustomersAction({ storeId });

	if (result?.serverError) {
		throw new Error(result.serverError);
	}

	const users = result?.data?.users || [];

	return (
		<Suspense fallback={<Loader />}>
			<CustomersClient serverData={users} />
		</Suspense>
	);
}
