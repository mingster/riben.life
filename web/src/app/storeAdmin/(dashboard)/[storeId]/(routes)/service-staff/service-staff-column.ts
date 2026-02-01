import type { ServiceStaff, User } from "@prisma/client";

export interface ServiceStaffColumn {
	id: string;
	storeId: string;
	userId: string;
	userName: string | null;
	userEmail: string | null;
	userPhoneNumber: string | null;
	memberRole: string;
	capacity: number;
	defaultCost: number;
	defaultCredit: number;
	defaultDuration: number;
	// businessHours moved to ServiceStaffFacilitySchedule model
	description: string | null;
	receiveStoreNotifications: boolean;
}

type ServiceStaffWithUser = ServiceStaff & {
	User: Pick<User, "id" | "name" | "email" | "phoneNumber">;
};

export const mapServiceStaffToColumn = (
	serviceStaff: ServiceStaffWithUser | ServiceStaffColumn,
): ServiceStaffColumn => {
	// Handle both Prisma Decimal objects and already-transformed numbers
	const defaultCost =
		typeof serviceStaff.defaultCost === "number"
			? serviceStaff.defaultCost
			: serviceStaff.defaultCost.toNumber();
	const defaultCredit =
		typeof serviceStaff.defaultCredit === "number"
			? serviceStaff.defaultCredit
			: serviceStaff.defaultCredit.toNumber();

	// Check if it's a ServiceStaffWithUser (has User property)
	if ("User" in serviceStaff) {
		return {
			id: serviceStaff.id,
			storeId: serviceStaff.storeId,
			userId: serviceStaff.userId,
			userName: serviceStaff.User.name,
			userEmail: serviceStaff.User.email,
			userPhoneNumber: serviceStaff.User.phoneNumber,
			memberRole: (serviceStaff as any).memberRole || "",
			capacity: serviceStaff.capacity,
			defaultCost,
			defaultCredit,
			defaultDuration: serviceStaff.defaultDuration,
			description: serviceStaff.description,
			receiveStoreNotifications:
				"receiveStoreNotifications" in serviceStaff
					? Boolean(serviceStaff.receiveStoreNotifications)
					: true,
		};
	}

	// Already mapped ServiceStaffColumn
	return {
		id: serviceStaff.id,
		storeId: serviceStaff.storeId,
		userId: serviceStaff.userId,
		userName: serviceStaff.userName,
		userEmail: serviceStaff.userEmail,
		userPhoneNumber: serviceStaff.userPhoneNumber,
		memberRole: serviceStaff.memberRole || "",
		capacity: serviceStaff.capacity,
		defaultCost,
		defaultCredit,
		defaultDuration: serviceStaff.defaultDuration,
		description: serviceStaff.description,
		receiveStoreNotifications:
			"receiveStoreNotifications" in serviceStaff
				? Boolean(serviceStaff.receiveStoreNotifications)
				: true,
	};
};
