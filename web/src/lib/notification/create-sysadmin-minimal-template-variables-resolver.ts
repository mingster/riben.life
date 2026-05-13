import { sqlClient } from "@/lib/prismadb";
import { buildSubscriptionLifecyclePayload } from "@/lib/notification/payload-mappers/subscription-lifecycle-payload";
import type { User } from "@/types";

export interface CreateSysAdminMinimalTemplateVariablesResolverParams {
	sampleStoreId: string;
	sampleStoreName: string;
	supportEmail: string;
	platformName: string;
}

/**
 * Per-recipient variables for sysAdmin sends when no sample domain is selected:
 * recipient user, platform, support email, and a sample store id/name for store-scoped tokens.
 * Order/reservation-specific sample fields are not filled (use a sample domain for those).
 */
export function createSysAdminMinimalTemplateVariablesResolver(
	params: CreateSysAdminMinimalTemplateVariablesResolverParams,
): (recipientId: string) => Promise<Record<string, unknown>> {
	return async (recipientId: string): Promise<Record<string, unknown>> => {
		const userRow = await sqlClient.user.findUnique({
			where: { id: recipientId },
			select: { id: true, name: true, email: true, phoneNumber: true },
		});

		const user: User = (userRow ?? {
			id: recipientId,
			name: "",
			email: "",
			phoneNumber: "",
		}) as User;

		const lifecycle = buildSubscriptionLifecyclePayload({
			user,
			storeId: params.sampleStoreId,
			storeName: params.sampleStoreName,
			platformName: params.platformName,
		});

		return {
			...lifecycle,
			user: {
				id: user.id ?? "",
				name: user.name ?? "",
				email: user.email ?? "",
				phoneNumber: user.phoneNumber ?? "",
			},
			support: { email: params.supportEmail },
		};
	};
}
