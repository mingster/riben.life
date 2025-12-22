import getStoreWithCategories from "@/actions/get-store";
import getCurrentUser from "@/actions/user/get-current-user";
import Container from "@/components/ui/container";
import type { Store } from "@/types";
import { transformPrismaDataForJson } from "@/utils/utils";
import { redirect } from "next/navigation";
import { Checkout } from "./client";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StoreCheckoutPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;
	const searchParams = await props.searchParams;

	// Parallel queries for optimal performance
	const [store, user] = await Promise.all([
		getStoreWithCategories(params.storeId),
		getCurrentUser(),
	]);

	if (!store) {
		redirect("/unv");
	}

	transformPrismaDataForJson(user);

	return (
		<Container>
			<Checkout
				store={store as Store}
				user={user}
				returnUrl={
					typeof searchParams.returnUrl === "string"
						? searchParams.returnUrl
						: undefined
				}
			/>
		</Container>
	);
}
