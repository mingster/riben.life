import { Toaster } from "@/components/ui/toaster";
import { GetSession } from "@/lib/auth/utils";
import { sqlClient } from "@/lib/prismadb";
import type { Session } from "next-auth";

import { redirect } from "next/navigation";

// this is the main layout for store admin.
// if the user has a store, redirect to the store dashboard (dashboard/[storeId])
// if the user doesn't have store, show the create store modal (via page.tsx)
export default async function StoreAdminLayout(props: {
	children: React.ReactNode;
	params: Promise<{ storeId: string }>;
}) {
	const params = await props.params;

	const { children } = props;

	const session = (await GetSession()) as Session;
	if (!session) {
		redirect(
			`${process.env.NEXT_PUBLIC_API_URL}/auth/signin?callbackUrl=/storeAdmin/${params.storeId}`,
		);
	}

	//const ownerId = session.user?.id;
	//console.log('userid: ' + userId);

	let storeId = params.storeId;
	if (!storeId) {
		const store = await sqlClient.store.findFirst({
			where: {
				ownerId: session.user.id,
				isDeleted: false,
			},
		});

		if (store) storeId = store?.id;
	}

	//console.log('storeId: ' + storeId);
	//console.log('ownerId: ' + session.user.id);

	// redirect user to `/storeAdmin/${store.id}` if the user is already a store owner
	if (storeId) {
		redirect(`/storeAdmin/${storeId}`);
	}

	//console.log('userId: ' + user?.id);
	/*

  if (session.user.role != 'OWNER') {
    console.log('access denied');
    redirect('/error/?code=500');

  }

  //console.log('store: ' + JSON.stringify(store));
*/
	return (
		<>
			{children}
			<Toaster />
		</>
	);
}
