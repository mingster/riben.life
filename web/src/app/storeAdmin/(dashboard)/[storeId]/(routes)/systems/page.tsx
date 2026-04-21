import { redirect } from "next/navigation";

import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";

import { SystemsClient } from "./components/client-systems";

type Params = Promise<{ storeId: string }>;

export default async function StoreSystemsPage(props: { params: Params }) {
	const params = await props.params;
	const storeId = params.storeId;

	const [store, rsvpSettings, waitListSettings] = await Promise.all([
		sqlClient.store.findUnique({
			where: { id: storeId },
			select: { useOrderSystem: true, isDeleted: true },
		}),
		sqlClient.rsvpSettings.findFirst({ where: { storeId } }),
		sqlClient.waitListSettings.findUnique({ where: { storeId } }),
	]);

	if (!store || store.isDeleted) {
		redirect("/storeAdmin");
	}

	transformPrismaDataForJson(rsvpSettings);
	transformPrismaDataForJson(waitListSettings);

	return (
		<Container>
			<SystemsClient
				storeId={storeId}
				initialUseOrderSystem={store?.useOrderSystem ?? false}
				initialAcceptReservation={rsvpSettings?.acceptReservation ?? true}
				initialWaitlistEnabled={waitListSettings?.enabled ?? false}
			/>
		</Container>
	);
}
