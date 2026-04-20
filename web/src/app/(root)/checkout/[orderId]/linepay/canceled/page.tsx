import { Suspense } from "react";
import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { CancelAndRedirect } from "./cancelAndRedirect";

export default async function LinePayCancelledPage(props: {
	params: Promise<{ orderId: string }>;
}) {
	const params = await props.params;
	const orderId = params.orderId;

	logger.info("LINE Pay cancel page accessed", {
		metadata: { orderId },
		tags: ["payment", "linepay", "cancel"],
	});

	if (!orderId) {
		throw new Error("order Id is missing");
	}

	await sqlClient.storeOrder.updateMany({
		where: {
			id: orderId,
			checkoutRef: { not: "" },
		},
		data: {
			checkoutAttributes: "",
			checkoutRef: "",
		},
	});

	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<CancelAndRedirect orderId={orderId} />
			</Container>
		</Suspense>
	);
}
