import { sqlClient } from "@/lib/prismadb";

/**
 * Calendar sync target: assigned service staff's userId, or store owner when no staff.
 */
export async function resolveRsvpCalendarTargetUserId(params: {
	storeId: string;
	ownerId: string;
	serviceStaffId: string | null;
}): Promise<string> {
	if (params.serviceStaffId) {
		const staff = await sqlClient.serviceStaff.findFirst({
			where: {
				id: params.serviceStaffId,
				storeId: params.storeId,
				isDeleted: false,
			},
			select: { userId: true },
		});
		if (staff) {
			return staff.userId;
		}
	}
	return params.ownerId;
}
