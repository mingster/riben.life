import getStoreWithCategories from "@/actions/get-store";
import getCurrentUser from "@/actions/user/get-current-user";
import Container from "@/components/ui/container";
import { Loader } from "@/components/loader";
import type { Store } from "@/types";
import { transformDecimalsToNumbers } from "@/utils/utils";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Checkout } from "./client";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StoreCheckoutPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	const store = (await getStoreWithCategories(params.storeId)) as Store;

	if (!store) {
		redirect("/unv");
	}

	//console.log(`store: ${JSON.stringify(store)}`);

	const user = await getCurrentUser();
	transformDecimalsToNumbers(user);

	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<Checkout store={store} user={user} />
			</Container>
		</Suspense>
	);
}
