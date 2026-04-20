import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { ensureWaitListSettingsRow } from "@/lib/store/waitlist/ensure-waitlist-settings";
import { transformPrismaDataForJson } from "@/utils/utils";

import { ClientWaitlistSettings } from "./components/client-waitlist-settings";

type Params = Promise<{ storeId: string }>;

export default async function WaitlistSettingsPage(props: { params: Params }) {
	const params = await props.params;
	const storeId = params.storeId;

	await ensureWaitListSettingsRow(sqlClient, storeId);
	const waitListSettings = await sqlClient.waitListSettings.findUnique({
		where: { storeId },
	});

	transformPrismaDataForJson(waitListSettings);

	const initialSettings = waitListSettings
		? {
				enabled: waitListSettings.enabled,
				requireSignIn: waitListSettings.requireSignIn,
				requireName: waitListSettings.requireName,
				requireLineOnly: waitListSettings.requireLineOnly,
				canGetNumBefore: waitListSettings.canGetNumBefore,
			}
		: null;

	return (
		<Container>
			<ClientWaitlistSettings
				storeId={storeId}
				initialSettings={initialSettings}
			/>
		</Container>
	);
}
