import { NextResponse } from "next/server";

import getStoreWithCategories from "@/actions/get-store";
import type { Store } from "@/types";
import { CheckStoreAdminApiAccess } from "../api_helper";

// get unpaid orders in the store.
export async function GET(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);

		const store = (await getStoreWithCategories(params.storeId)) as Store;

		if (!store) {
			return new NextResponse("store not found", { status: 404 });
		}

		//console.log("getStore", JSON.stringify(store));
		return NextResponse.json(store);
	} catch (error) {
		console.error("[GET_STORE]", error);

		return new NextResponse("Internal error", { status: 500 });
	}
}
