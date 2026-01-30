import Container from "@/components/ui/container";
import { Loader } from "@/components/loader";
import { Suspense } from "react";
import { CancelAndRedirect } from "./cancelAndRedirect";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";

// https://developers-pay.line.me/merchant/redirection-pages/
// Cancel page is called when user cancels payment on LINE Pay.
// Clear the order's LinePay session (checkoutAttributes, checkoutRef) so the order
// is not left in an in-progress state and the order page shows correct isPaid.
export default async function LinePayCancelledPage(props: {
	searchParams: Promise<{
		orderId: string;
		transactionId: string;
	}>;
}) {
	const searchParams = await props.searchParams;
	logger.info("LINE Pay cancel page accessed", {
		metadata: { orderId: searchParams.orderId },
		tags: ["payment", "linepay", "cancel"],
	});

	if (!searchParams.orderId) {
		throw new Error("order Id is missing");
	}

	// Clear LinePay session fields so order is not left with stale transaction data
	await sqlClient.storeOrder.updateMany({
		where: {
			id: searchParams.orderId,
			checkoutRef: { not: "" }, // Only clear if we had a LinePay session (paymentAccessToken)
		},
		data: {
			checkoutAttributes: "",
			checkoutRef: "",
		},
	});

	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<CancelAndRedirect orderId={searchParams.orderId} />
			</Container>
		</Suspense>
	);
}
