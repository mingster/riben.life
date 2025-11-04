"use server";
import Container from "@/components/ui/container";
import { Loader } from "@/components/loader";
import { Suspense } from "react";
import { CancelAndRedirect } from "./cancelAndRedirect";
import logger from "@/lib/logger";

// https://developers-pay.line.me/merchant/redirection-pages/
// cancel page is called when user
export default async function LinePayCancelledPage(props: {
	searchParams: Promise<{
		orderId: string;
		transactionId: string;
	}>;
}) {
	const searchParams = await props.searchParams;
	logger.info("Operation log");

	if (!searchParams.orderId) {
		throw new Error("order Id is missing");
	}

	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<CancelAndRedirect orderId={searchParams.orderId} />
			</Container>
		</Suspense>
	);
}
