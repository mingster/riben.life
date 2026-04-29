import { redirect } from "next/navigation";

interface PageProps {
	params: Promise<{ orderId: string }>;
}

/** Legacy URL: customer order detail is under /account/orders/[orderId]. */
export default async function OrderAliasRedirectPage(props: PageProps) {
	const { orderId } = await props.params;
	redirect(`/account/orders/${orderId}`);
}
