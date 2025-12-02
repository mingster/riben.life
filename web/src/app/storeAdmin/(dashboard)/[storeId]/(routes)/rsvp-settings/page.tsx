import Container from "@/components/ui/container";
import { isPro } from "@/lib/store-admin-utils";
import { getStoreWithRelations } from "@/lib/store-access";
import { Store } from "@/types";
import { RsvpSettingTabs, type RsvpSettingsData } from "./components/tabs";
import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/utils/utils";
import { redirect } from "next/navigation";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

//https://tinybook.cc/spacebooking/
export default async function RsvpSettingsPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Note: checkStoreStaffAccess already called in layout (cached)
	// Parallel queries for optimal performance
	const [storeResult, isProLevel, rsvpSettings] = await Promise.all([
		getStoreWithRelations(params.storeId, {}),
		isPro(params.storeId),
		sqlClient.rsvpSettings.findFirst({
			where: { storeId: params.storeId },
		}),
	]);

	if (!storeResult) {
		redirect("/storeAdmin");
	}

	const store = storeResult;

	let transformedRsvpSettings: RsvpSettingsData | null = null;
	if (rsvpSettings) {
		transformDecimalsToNumbers(rsvpSettings);
		transformedRsvpSettings = {
			id: rsvpSettings.id,
			storeId: rsvpSettings.storeId,
			acceptReservation: rsvpSettings.acceptReservation,
			prepaidRequired: rsvpSettings.prepaidRequired,
			minPrepaidAmount: rsvpSettings.minPrepaidAmount
				? Number(rsvpSettings.minPrepaidAmount)
				: null,
			canCancel: rsvpSettings.canCancel,
			cancelHours: rsvpSettings.cancelHours,
			defaultDuration: rsvpSettings.defaultDuration,
			requireSignature: rsvpSettings.requireSignature,
			showCostToCustomer: rsvpSettings.showCostToCustomer,
			useBusinessHours: rsvpSettings.useBusinessHours,
			rsvpHours: rsvpSettings.rsvpHours,
			reminderHours: rsvpSettings.reminderHours,
			useReminderSMS: rsvpSettings.useReminderSMS,
			useReminderLine: rsvpSettings.useReminderLine,
			useReminderEmail: rsvpSettings.useReminderEmail,
			syncWithGoogle: rsvpSettings.syncWithGoogle,
			syncWithApple: rsvpSettings.syncWithApple,
			createdAt: rsvpSettings.createdAt,
			updatedAt: rsvpSettings.updatedAt,
		};
	}

	return (
		<Container>
			<RsvpSettingTabs store={store} rsvpSettings={transformedRsvpSettings} />
		</Container>
	);
}
