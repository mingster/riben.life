import { redirect } from "next/navigation";
import { sqlClient } from "@/lib/prismadb";

export default async function NewebPayCanceledPage(props: {
	params: Promise<{ orderId: string }>;
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const params = await props.params;
	const searchParams = await props.searchParams;
	const returnUrl =
		typeof searchParams.returnUrl === "string"
			? searchParams.returnUrl
			: undefined;

	await sqlClient.storeOrder.updateMany({
		where: { id: params.orderId },
		data: { checkoutRef: "", checkoutAttributes: "" },
	});

	if (returnUrl) {
		redirect(returnUrl);
	}
	redirect(`/checkout/${params.orderId}`);
}
