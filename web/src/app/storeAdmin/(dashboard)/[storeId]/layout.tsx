import type { Metadata, ResolvingMetadata } from "next";
import { redirect } from "next/navigation";
import { sqlClient } from "@/lib/prismadb";
import { checkStoreStaffAccess } from "@/lib/store-admin-utils";
import logger from "@/lib/logger";

type Props = {
	params: Promise<{ storeId: string }>;
};

export async function generateMetadata(
	props: Props,
	_parent: ResolvingMetadata,
): Promise<Metadata> {
	const params = await props.params;
	if (!params.storeId) {
		return { title: "Store admin" };
	}

	const store = await sqlClient.store.findFirst({
		where: { id: params.storeId, isDeleted: false },
		select: { name: true },
	});

	if (!store) {
		return { title: "Store admin" };
	}

	return {
		title: `${store.name} — Store admin`,
	};
}

/** Access gate for all `/storeAdmin/[storeId]/…` routes (wizard + dashboard shell). */
export default async function StoreAdminStoreLayout(props: {
	children: React.ReactNode;
	params: Promise<{ storeId: string }>;
}) {
	const params = await props.params;
	const { children } = props;

	if (!params.storeId) {
		redirect("/storeAdmin");
	}

	const accessibleStore = await checkStoreStaffAccess(params.storeId);

	if (!accessibleStore) {
		logger.info("store not found...redirect to store creation page.");
		redirect("/storeAdmin");
	}

	return children;
}
