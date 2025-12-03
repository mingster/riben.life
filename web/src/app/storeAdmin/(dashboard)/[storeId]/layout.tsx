import { sqlClient } from "@/lib/prismadb";
import { Role } from "@prisma/client";
import type { Metadata, ResolvingMetadata } from "next";
import { redirect } from "next/navigation";
import { requireAuth, requireRole } from "@/lib/auth-utils";

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

	// Note: Authentication and store access check is handled by (dashboard/[storeId]/(routes)/layout.tsx)
	// No need to duplicate checks here

	return <>{children}</>;
}
