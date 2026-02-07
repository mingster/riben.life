import Container from "@/components/ui/container";
import { checkStoreStaffAccess } from "@/lib/store-admin-utils";
import { Loader } from "@/components/loader";
import { Suspense } from "react";
import { StoreAdminCheckinClient } from "./components/store-admin-checkin-client";

type Params = Promise<{ storeId: string }>;

export default async function StoreAdminCheckinPage(props: { params: Params }) {
	const params = await props.params;
	const store = await checkStoreStaffAccess(params.storeId);
	const storeName = store.name ?? "";

	return (
		<Container>
			<Suspense fallback={<Loader />}>
				<StoreAdminCheckinClient
					storeId={params.storeId}
					storeName={storeName}
				/>
			</Suspense>
		</Container>
	);
}
