import { redirect } from "next/navigation";

type Params = Promise<{ storeId: string }>;

export default async function StoreAdminStoreRootPage(props: {
	params: Params;
}) {
	const params = await props.params;
	redirect(`/storeAdmin/${params.storeId}/dashboard`);
}
