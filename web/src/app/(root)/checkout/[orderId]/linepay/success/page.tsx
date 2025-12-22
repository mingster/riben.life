import { SuccessAndRedirect } from "@/components/success-and-redirect";
import Container from "@/components/ui/container";
import { Loader } from "@/components/loader";
import { Suspense } from "react";
import { StoreOrder } from "@/types";
import getOrderById from "@/actions/get-order-by_id";

type Params = Promise<{ orderId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function CheckoutSuccessPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;
	const searchParams = await props.searchParams;
	const orderId = params.orderId;
	const _query = searchParams.query;

	const order = (await getOrderById(orderId)) as StoreOrder;
	if (!order) {
		throw new Error("order not found");
	}

	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<SuccessAndRedirect order={order} />
			</Container>
		</Suspense>
	);
}
