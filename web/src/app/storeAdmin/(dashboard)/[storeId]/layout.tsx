import { sqlClient } from "@/lib/prismadb";
import type { Metadata, ResolvingMetadata } from "next";
import { redirect } from "next/navigation";

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

	// Get store name for metadata (minimal query)
	const store = await sqlClient.store.findFirst({
		where: { id: params.storeId },
		select: { name: true },
	});

	if (!store) return { title: "riben.life" };

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
		// Redirect to store selection if no storeId
		redirect("/storeAdmin/");
	}

	// Note: Authentication and store access check is handled by child route layout
	// using checkStoreStaffAccess() which is cached per request
	// No need to duplicate checks here

	return <>{children}</>;
}
