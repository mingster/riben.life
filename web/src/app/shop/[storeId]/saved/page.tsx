import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";

import { type CloudDesignRow, ShopSavedClient } from "./shop-saved-client";

type Params = Promise<{ storeId: string }>;

export default async function ShopSavedPage(props: { params: Params }) {
	const { storeId } = await props.params;
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	let initialCloudDesigns: CloudDesignRow[] = [];
	const serverHadSession = Boolean(session?.user);

	if (session?.user?.id) {
		const rows = await sqlClient.savedProductCustomization.findMany({
			where: { userId: session.user.id },
			orderBy: { updatedAt: "desc" },
			select: {
				id: true,
				productId: true,
				productName: true,
				updatedAt: true,
				createdAt: true,
			},
		});

		transformPrismaDataForJson(rows);
		initialCloudDesigns = rows.map((row) => ({
			id: row.id,
			productId: row.productId,
			productName: row.productName,
			updatedAt: Number(row.updatedAt),
			createdAt: Number(row.createdAt),
		}));
	}

	return (
		<ShopSavedClient
			storeId={storeId}
			initialCloudDesigns={initialCloudDesigns}
			serverHadSession={serverHadSession}
		/>
	);
}
