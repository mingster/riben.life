import { mapRsvpBlacklistToColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/rsvp-settings/components/rsvp-blacklist-column";
import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import { RsvpSettingsClient } from "./components/client-rsvp-settings";

type Params = Promise<{ storeId: string }>;

export default async function RsvpSettingsPage(props: { params: Params }) {
	const params = await props.params;
	const storeId = params.storeId;

	const [store, rsvpSettings, blacklistRows] = await Promise.all([
		sqlClient.store.findUnique({
			where: { id: storeId },
			select: { defaultTimezone: true, defaultCurrency: true },
		}),
		sqlClient.rsvpSettings.findFirst({ where: { storeId } }),
		sqlClient.rsvpBlacklist.findMany({
			where: { storeId },
			include: {
				User: {
					select: { id: true, name: true, email: true },
				},
			},
			orderBy: { createdAt: "desc" },
		}),
	]);

	transformPrismaDataForJson(rsvpSettings);
	transformPrismaDataForJson(blacklistRows);

	const blacklist = blacklistRows.map((row) =>
		mapRsvpBlacklistToColumn({
			...row,
			User: row.User,
		}),
	);

	return (
		<Container>
			<RsvpSettingsClient
				storeId={storeId}
				storeDefaultTimezone={store?.defaultTimezone ?? "Asia/Taipei"}
				storeDefaultCurrency={store?.defaultCurrency ?? "twd"}
				initialSettings={rsvpSettings}
				initialBlacklist={blacklist}
			/>
		</Container>
	);
}
