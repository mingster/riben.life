import checkStoreAdminAccess from "@/actions/storeAdmin/check-store-access";
import isProLevel from "@/actions/storeAdmin/is-pro-level";
import { auth, Session } from "@/lib/auth";
import { transformDecimalsToNumbers } from "@/utils/utils";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

// NOTE - protect storeAdmin route by redirect user to appropriate routes.
export const checkStoreAccess = async (storeId: string) => {
	//console.log('storeid: ' + params.storeId);

	const session = (await auth.api.getSession({
		headers: await headers(), // you need to pass the headers object.
	})) as unknown as Session;
	const userId = session?.user.id;

	if (!session || !userId) {
		redirect(`/signin`);
	}

	const store = await checkStoreAdminAccess(storeId, userId);

	if (!store) {
		redirect("/storeAdmin");
	}
	transformDecimalsToNumbers(store);

	return store;
};

// return true if this store level is not free
export const isPro = async (storeId: string) => {
	return await isProLevel(storeId);
};
