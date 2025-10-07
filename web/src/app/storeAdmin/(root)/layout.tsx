import { auth, Session } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

// this is the main layout for store admin.
// if the user has a store, redirect to the store dashboard (dashboard/[storeId])
// if the user doesn't have store, show the create store modal (via page.tsx)
export default async function StoreAdminLayout(props: {
	children: React.ReactNode;
	params: Promise<{}>;
}) {
	const params = await props.params;

	const { children } = props;

	const session = (await auth.api.getSession({
		headers: await headers(), // you need to pass the headers object.
	})) as unknown as Session;

	if (!session) {
		redirect(`/signin?callbackUrl=/storeAdmin`);
	}

	//const ownerId = session.user?.id;
	//console.log('userid: ' + userId);

	// Find the user's store
	const store = await sqlClient.store.findFirst({
		where: {
			ownerId: session.user.id,
			isDeleted: false,
		},
	});

	const storeId = store?.id;

	//console.log('storeId: ' + storeId);
	//console.log('ownerId: ' + session.user.id);

	// redirect user to `/storeAdmin/${store.id}` if the user is already a store owner
	if (storeId) {
		redirect(`/storeAdmin/${storeId}`);
	}

	//console.log('userId: ' + user?.id);
	/*

  if (session.user.role != 'owner') {
	console.log('access denied');
	redirect('/error/?code=500');

  }

  //console.log('store: ' + JSON.stringify(store));
*/
	return <>{children}</>;
}
