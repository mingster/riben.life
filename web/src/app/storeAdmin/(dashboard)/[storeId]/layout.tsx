import { Loader } from "@/components/loader";
import { auth, Session } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import type { Store } from "@/types";
import type { Metadata, ResolvingMetadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

type Props = {
	params: Promise<{ storeId: string }>;
};

export async function generateMetadata(
	props: Props,
	_parent: ResolvingMetadata,
): Promise<Metadata> {
	const params = await props.params;
	if (!params.storeId) {
		return {
			title: "店家後台",
		};
	}

	// read route params
	const store = (await sqlClient.store.findFirst({
		where: {
			id: params.storeId,
		},
		include: {
			Categories: {
				where: { isFeatured: true },
				orderBy: { sortOrder: "asc" },
			},
			StoreAnnouncement: true,
		},
	})) as Store;

	if (!store) return { title: "pstv" };

	return {
		title: `${store.name} - 店家後台`,
	};
}

export default async function StoreAdminLayout(props: {
	children: React.ReactNode;
	params: Promise<{ storeId: string }>;
}) {
	const params = await props.params;

	const { children } = props;

	//console.log('session: ' + JSON.stringify(session));
	//console.log('userid: ' + userId);

	if (!params.storeId) {
		// this will allow the user to set up a store
		redirect("/storeAdmin/");
	}

	const session = (await auth.api.getSession({
		headers: await headers(), // you need to pass the headers object.
	})) as unknown as Session;

	const store = await sqlClient.store.findFirst({
		where: {
			id: params.storeId,
			ownerId: session.user?.id,
		},
	});

	if (!store) {
		console.log("no access to the store...redirect to store creation page.");
		redirect("/storeAdmin");
	}

	return <Suspense fallback={<Loader />}>{children}</Suspense>;
}
