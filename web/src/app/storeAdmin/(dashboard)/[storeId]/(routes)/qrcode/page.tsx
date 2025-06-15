import isProLevel from "@/actions/storeAdmin/is-pro-level";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { checkStoreAccess } from "@/lib/store-admin-utils";

import type { Store } from "@/types";
import { transformDecimalsToNumbers } from "@/utils/utils";
import type { StoreTables } from "@prisma/client";

import getStoreTables from "@/actions/get-store-tables";
import { Suspense } from "react";
import { QrCodeClient } from "./client";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StoreSettingsPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;
	//NOTE - we call checkStoreAccess here to get the store object
	const store = (await checkStoreAccess(params.storeId)) as Store;

	transformDecimalsToNumbers(store);

	const tables = (await getStoreTables(store.id)) as StoreTables[];

	//console.log("isProLevel", disablePaidOptions);

	return (
		<Suspense fallback={<Loader />}>
			<Container>
				QR Code
				<QrCodeClient store={store} tables={tables} />
			</Container>
		</Suspense>
	);
}
