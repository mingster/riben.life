import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { checkStoreAccess } from "@/lib/store-admin-utils";
import { Suspense } from "react";

import isProLevel from "@/actions/storeAdmin/is-pro-level";
import type { Store } from "@prisma/client";

type Params = Promise<{ storeId: string; messageId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function BalanceMgmtPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;
	const store = (await checkStoreAccess(params.storeId)) as Store;
	// this store is pro version or not?
	const _disablePaidOptions = await !isProLevel(store?.id);

	return (
		<Suspense fallback={<Loader />}>
			<Container>TBD</Container>
		</Suspense>
	);
}
