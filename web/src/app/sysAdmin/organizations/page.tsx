import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";

import { ClientOrganizations } from "./components/client-organizations";
import { toSysAdminOrganizationRow } from "./organization-column";

export default async function SysAdminOrganizationsPage() {
	const organizations = await sqlClient.organization.findMany({
		orderBy: { name: "asc" },
		take: 500,
		include: {
			_count: { select: { stores: true } },
		},
	});

	transformPrismaDataForJson(organizations);

	return (
		<Container>
			<h1 className="mb-4 text-xl font-semibold">Organizations</h1>
			<p className="text-muted-foreground mb-6 text-sm">
				Create and edit organizations. Stores belong to an organization. You can
				only delete an organization after all its stores are removed or
				reassigned.
			</p>
			<ClientOrganizations
				serverOrganizations={organizations.map(toSysAdminOrganizationRow)}
			/>
		</Container>
	);
}
