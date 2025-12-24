import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Container from "@/components/ui/container";
import { Loader } from "@/components/loader";
import { Suspense } from "react";
import { getStoreUserOrdersAction } from "@/actions/store/get-store-user-orders";
import { ClientMyOrders } from "./components/client-my-orders";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function MyOrdersPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;
	const storeId = params.storeId;

	// Get session to check if user is logged in
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user?.id) {
		const callbackUrl = `/s/${storeId}/my-orders`;
		redirect(`/signIn?callbackUrl=${encodeURIComponent(callbackUrl)}`);
	}

	// Fetch orders for the logged-in user in this store
	const result = await getStoreUserOrdersAction({ storeId });

	if (result?.serverError || !result?.data) {
		// Handle error - could redirect or show error message
		redirect(`/s/${storeId}`);
	}

	const { orders, storeTimezone } = result.data;

	return (
		<Container>
			<Suspense fallback={<Loader />}>
				<ClientMyOrders serverData={orders} storeTimezone={storeTimezone} />
			</Suspense>
		</Container>
	);
}
