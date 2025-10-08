import { Loader } from "@/components/loader";
import { sqlClient } from "@/lib/prismadb";
import type { Store } from "@/types";
import type { Metadata, ResolvingMetadata } from "next";
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

	if (!params.storeId) {
		// this will allow the user to set up a store
		redirect("/storeAdmin/");
	}

	// Note: Authentication and store access check is handled by child route layout
	// using checkStoreStaffAccess() which is cached per request
	// No need to duplicate checks here

	return <Suspense fallback={<Loader />}>{children}</Suspense>;
}
