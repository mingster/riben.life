import { WaitListStatus } from "@prisma/client";
import { listWaitlistAction } from "@/actions/storeAdmin/waitlist/list-waitlist";
import Container from "@/components/ui/container";

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

	return (
		<Container>
			<ClientWaitlist
				storeId={storeId}
				initialEntries={entries}
				initialStatusFilter={DEFAULT_FILTERS.statusFilter}
				initialSessionScope={DEFAULT_FILTERS.sessionScope}
			/>
		</Container>
	);
}
