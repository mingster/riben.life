import Container from "@/components/ui/container";
import { isPro } from "@/lib/store-admin-utils";
import { getStoreWithRelations } from "@/lib/store-access";
import { RsvpSettingTabs, type RsvpSettingsData } from "./components/tabs";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import { epochToDate } from "@/utils/datetime-utils";
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
	const [storeResult, isProLevel, rsvpSettings, rsvpBlacklist] =
		await Promise.all([
			getStoreWithRelations(params.storeId, {}),
			isPro(params.storeId),
			sqlClient.rsvpSettings.findFirst({
				where: { storeId: params.storeId },
			}),
			sqlClient.rsvpBlacklist.findMany({
				where: { storeId: params.storeId },
				orderBy: {
					createdAt: "desc",
				},
			}),
		]);

	// Fetch user data for blacklist entries
	const userIds = rsvpBlacklist.map((item: { userId: string }) => item.userId);
	const users =
		userIds.length > 0
			? await sqlClient.user.findMany({
					where: {
						id: {
							in: userIds,
						},
					},
					select: {
						id: true,
						name: true,
						email: true,
					},
				})
			: [];

	const userMap = new Map(users.map((u) => [u.id, u]));

	if (!storeResult) {
		redirect("/storeAdmin");
	}

	const store = storeResult;

	let transformedRsvpSettings: RsvpSettingsData | null = null;
	if (rsvpSettings) {
		transformPrismaDataForJson(rsvpSettings);
		transformedRsvpSettings = {
			id: rsvpSettings.id,
			storeId: rsvpSettings.storeId,
			acceptReservation: rsvpSettings.acceptReservation,
			singleServiceMode: rsvpSettings.singleServiceMode ?? false,
			minPrepaidPercentage: rsvpSettings.minPrepaidPercentage,
			noNeedToConfirm: rsvpSettings.noNeedToConfirm ?? false,
			canCancel: rsvpSettings.canCancel,
			cancelHours: rsvpSettings.cancelHours,
			canReserveBefore: rsvpSettings.canReserveBefore,
			canReserveAfter: rsvpSettings.canReserveAfter,
			defaultDuration: rsvpSettings.defaultDuration,
			requireSignature: rsvpSettings.requireSignature,
			showCostToCustomer: rsvpSettings.showCostToCustomer,
			mustSelectFacility: rsvpSettings.mustSelectFacility ?? false,
			mustHaveServiceStaff: rsvpSettings.mustHaveServiceStaff ?? false,
			useBusinessHours: rsvpSettings.useBusinessHours,
			rsvpHours: rsvpSettings.rsvpHours,
			reminderHours: rsvpSettings.reminderHours,
			syncWithGoogle: rsvpSettings.syncWithGoogle,
			syncWithApple: rsvpSettings.syncWithApple,
			createdAt: epochToDate(rsvpSettings.createdAt) ?? new Date(),
			updatedAt: epochToDate(rsvpSettings.updatedAt) ?? new Date(),
		};
	}

	// Transform blacklist data
	let transformedBlacklist: Array<{
		id: string;
		storeId: string;
		userId: string;
		userName: string | null;
		userEmail: string | null;
		createdAt: bigint;
		updatedAt: bigint;
		User?: {
			id: string;
			name: string | null;
			email: string | null;
		} | null;
	}> = [];

	if (rsvpBlacklist) {
		transformPrismaDataForJson(rsvpBlacklist);
		transformedBlacklist = rsvpBlacklist.map(
			(item: {
				userId: string;
				id: any;
				storeId: any;
				createdAt: any;
				updatedAt: any;
			}) => {
				const user = userMap.get(item.userId);
				return {
					id: item.id,
					storeId: item.storeId,
					userId: item.userId,
					userName: user?.name ?? null,
					userEmail: user?.email ?? null,
					createdAt: item.createdAt,
					updatedAt: item.updatedAt,
					User: user || null,
				};
			},
		);
	}

	return (
		<Container>
			<RsvpSettingTabs
				store={store}
				rsvpSettings={transformedRsvpSettings}
				rsvpBlacklist={transformedBlacklist}
			/>
		</Container>
	);
}
