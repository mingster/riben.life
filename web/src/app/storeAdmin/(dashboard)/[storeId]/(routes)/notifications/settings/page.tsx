import { Suspense } from "react";
import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { getStoreWithRelations } from "@/lib/store-access";
import { redirect } from "next/navigation";
import { NotificationSettingsClient } from "./components/client-settings";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function NotificationSettingsPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Get store (access check already done in layout)
	const storeResult = await getStoreWithRelations(params.storeId, {});

	if (!storeResult) {
		redirect("/storeAdmin");
	}

	// Fetch system notification settings (to check plugin status)
	const systemSettings = await sqlClient.systemNotificationSettings.findFirst();

	// Fetch all channel configs for this store
	const channelConfigs = await sqlClient.notificationChannelConfig.findMany({
		where: {
			storeId: params.storeId,
		},
	});

	// Create a map of channel -> config for easy lookup
	const configMap = new Map(
		channelConfigs.map((config) => [
			config.channel,
			{
				...config,
				// Parse JSON credentials and settings
				credentials: config.credentials ? JSON.parse(config.credentials) : null,
				settings: config.settings ? JSON.parse(config.settings) : null,
			},
		]),
	);

	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<NotificationSettingsClient
					storeId={params.storeId}
					systemSettings={systemSettings}
					channelConfigs={configMap}
				/>
			</Container>
		</Suspense>
	);
}
