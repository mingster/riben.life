import getStoreWithCategories from "@/actions/get-store";
import getCurrentUser from "@/actions/user/get-current-user";
import Container from "@/components/ui/container";
import type { Store } from "@/types";
import { transformPrismaDataForJson } from "@/utils/utils";
import { redirect } from "next/navigation";

import { Checkout } from "@/app/s/[storeId]/checkout/client";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * LIFF checkout: same {@link Checkout} client as `/s/[storeId]/checkout`;
 * default post-payment return targets `/liff/{segment}/menu`.
 */
export default async function LiffStoreCheckoutPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;
	const searchParams = await props.searchParams;

	const [store, user] = await Promise.all([
		getStoreWithCategories(params.storeId),
		getCurrentUser(),
	]);

	if (!store) {
		redirect("/unv");
	}

	transformPrismaDataForJson(user);

	const defaultReturnUrl = `/liff/${params.storeId}/menu`;
	const returnUrl =
		typeof searchParams.returnUrl === "string"
			? searchParams.returnUrl
			: defaultReturnUrl;

	return (
		<Container>
			<Checkout store={store as Store} user={user} returnUrl={returnUrl} />
		</Container>
	);
}
