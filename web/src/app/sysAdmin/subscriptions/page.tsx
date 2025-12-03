import { Loader } from "@/components/loader";
import { Suspense } from "react";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function SubscriptionsAdminPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	//const _params = await props.params;

	return <Suspense fallback={<Loader />}>SubscriptionsClient</Suspense>;
}
