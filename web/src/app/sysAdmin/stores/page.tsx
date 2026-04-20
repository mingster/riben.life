import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";

import { ClientStores } from "./components/client-stores";
import { toSysAdminStoreRow } from "./store-column";

export default async function SysAdminStoresPage() {
	const [stores, organizations, users] = await Promise.all([
		sqlClient.store.findMany({
			orderBy: { updatedAt: "desc" },
			take: 400,
			select: {
				id: true,
				name: true,
				ownerId: true,
				defaultCurrency: true,
				defaultCountry: true,
				defaultLocale: true,
				updatedAt: true,
				isDeleted: true,
				isOpen: true,
				acceptAnonymousOrder: true,
				autoAcceptOrder: true,
				Organization: { select: { id: true, name: true, slug: true } },
			},
		}),
		sqlClient.organization.findMany({
			select: { id: true, name: true, slug: true },
			orderBy: { name: "asc" },
			take: 300,
		}),
		sqlClient.user.findMany({
			select: { id: true, name: true, email: true },
			orderBy: { email: "asc" },
			take: 500,
		}),
	]);

	transformPrismaDataForJson(stores);
	transformPrismaDataForJson(organizations);
	transformPrismaDataForJson(users);

	return (
		<Container>
			<h1 className="mb-4 text-xl font-semibold">Stores</h1>
			<p className="text-muted-foreground mb-6 text-sm">
				Create, edit, and archive stores. Archived stores stay in the database (
				<code className="text-xs">isDeleted</code>) and can be restored.
			</p>
			<ClientStores
				serverStores={stores.map(toSysAdminStoreRow)}
				organizations={organizations}
				users={users}
			/>
		</Container>
	);
}
