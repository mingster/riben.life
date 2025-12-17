import { Suspense } from "react";
import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { ClientNotificationSettings } from "./components/client-settings";

export default async function NotificationSettingsPage() {
	// SystemNotificationSettings is a singleton - get the first (and only) record
	// If it doesn't exist, create it with defaults
	let settings = await sqlClient.systemNotificationSettings.findFirst();

	if (!settings) {
		// Initialize with default values
		settings = await sqlClient.systemNotificationSettings.create({
			data: {
				notificationsEnabled: true,
				maxRetryAttempts: 3,
				retryBackoffMs: 1000,
				queueBatchSize: 100,
				rateLimitPerMinute: 1000,
				historyRetentionDays: 90,
				updatedAt: getUtcNowEpoch(),
				updatedBy: "system",
			},
		});
	}

	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<ClientNotificationSettings initialSettings={settings} />
			</Container>
		</Suspense>
	);
}
