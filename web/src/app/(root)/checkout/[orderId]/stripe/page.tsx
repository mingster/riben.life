import getOrderById from "@/actions/get-order-by_id";
import { PostPaymentSuccessView } from "@/components/post-payment-success-view";
import { getPostPaymentSignInProps } from "@/lib/rsvp/get-post-payment-signin-props";
import type { StoreOrder } from "@/types";
import PaymentStripe from "./components/payment-stripe";

const PaymentPage = async (props: {
	params: Promise<{ orderId: string }>;
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
	const params = await props.params;
	const searchParams = await props.searchParams;

	if (!params.orderId) {
		throw new Error("order Id is missing");
	}

	const order = (await getOrderById(params.orderId)) as StoreOrder;

	const returnUrl =
		typeof searchParams.returnUrl === "string"
			? searchParams.returnUrl
			: undefined;

	if (order.isPaid) {
		const { rsvp, postPaymentSignInToken } = await getPostPaymentSignInProps(
			order.id,
		);
		return (
			<PostPaymentSuccessView
				order={order}
				returnUrl={returnUrl}
				rsvp={rsvp}
				postPaymentSignInToken={postPaymentSignInToken}
			/>
		);
	}

	return (
		<div className="px-3 pt-10 sm:px-5">
			<PaymentStripe order={order} returnUrl={returnUrl} />
		</div>
	);
};

export default PaymentPage;
