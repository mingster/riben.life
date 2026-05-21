import { WaitListStatus } from "@prisma/client";
import { listWaitlistAction } from "@/actions/storeAdmin/waitlist/list-waitlist";
import { ensureWaitListSettingsRow } from "@/actions/store/waitlist/ensure-waitlist-settings";
import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";

import { ClientWaitlist } from "./components/client-waitlist";

const DEFAULT_FILTERS = {
	statusFilter: WaitListStatus.waiting,
	sessionScope: "current_session" as const,
};

type Params = Promise<{ storeId: string }>;

export default async function StoreAdminWaitlistPage(props: {
	params: Params;
}) {
	const params = await props.params;
	const storeId = params.storeId;

	const result = await listWaitlistAction(storeId, DEFAULT_FILTERS);

	if (result?.serverError) {
		throw new Error(result.serverError);
	}

	const entries = result?.data?.entries ?? [];

	await ensureWaitListSettingsRow(sqlClient, storeId);
	const waitListSettings = await sqlClient.waitListSettings.findUnique({
		where: { storeId },
		select: {
			missedTurnEnabled: true,
			missedTurnMinutesAfterCall: true,
		},
	});

	return (
		<Container>
			<ClientWaitlist
				storeId={storeId}
				initialEntries={entries}
				initialStatusFilter={DEFAULT_FILTERS.statusFilter}
				initialSessionScope={DEFAULT_FILTERS.sessionScope}
				missedTurnEnabled={waitListSettings?.missedTurnEnabled ?? true}
				missedTurnMinutesAfterCall={
					waitListSettings?.missedTurnMinutesAfterCall ?? 5
				}
			/>
		</Container>
	);
}
