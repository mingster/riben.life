import getOrderById from "@/actions/get-order-by_id";
import { SuccessAndRedirect } from "@/components/success-and-redirect";
import Container from "@/components/ui/container";
import { Loader } from "@/components/loader";
import type { StoreOrder } from "@/types";
import { Suspense } from "react";
import PaymentStripe from "./components/payment-stripe";

const PaymentPage = async (props: { params: Promise<{ orderId: string }> }) => {
	const params = await props.params;
	//console.log('orderId: ' + params.orderId);

	if (!params.orderId) {
		throw new Error("order Id is missing");
	}

	/*
    const session = await getServerSession(authOptions);
    if (!session) {
      //if (status != 'authenticated') {
      redirect(`/signIn`);
    }
    //get user with needed assoicated objects
    //
    const userId = session?.user.id;
    */

	const order = (await getOrderById(params.orderId)) as StoreOrder;
	//console.log('order: ' + JSON.stringify(order));

	if (order.isPaid) {
		return (
			<Suspense fallback={<Loader />}>
				<Container>
					<SuccessAndRedirect orderId={order.id} />
				</Container>
			</Suspense>
		);
	}

	return (
		<div className="px-5 pt-10">
			<PaymentStripe order={order} />
		</div>
	);
};

export default PaymentPage;
