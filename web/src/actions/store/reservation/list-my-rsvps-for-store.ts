"use server";

import { getT } from "@/app/i18n";
import { sqlClient } from "@/lib/prismadb";
import { RsvpStatus } from "@/types/enum";
import { userRequiredActionClient } from "@/utils/actions/safe-action";
import { SafeError } from "@/utils/error";
import { transformPrismaDataForJson } from "@/utils/utils";

import { listMyRsvpsForStoreSchema } from "./list-my-rsvps-for-store.validation";

export const listMyRsvpsForStoreAction = userRequiredActionClient
	.metadata({ name: "listMyRsvpsForStore" })
	.schema(listMyRsvpsForStoreSchema)
	.action(async ({ parsedInput, ctx }) => {
		const { storeId } = parsedInput;

		const store = await sqlClient.store.findFirst({
			where: { id: storeId, isDeleted: false },
			select: { id: true },
		});
		if (!store) {
			const { t } = await getT();
			throw new SafeError(t("rsvp_store_not_found") || "Store not found");
		}

		const rsvps = await sqlClient.rsvp.findMany({
			where: {
				storeId,
				customerId: ctx.userId,
				status: { not: RsvpStatus.Cancelled },
			},
			orderBy: { rsvpTime: "desc" },
			take: 50,
			include: {
				Store: true,
				Customer: true,
				Order: true,
				Facility: true,
				FacilityPricingRule: true,
				CreatedBy: true,
				ServiceStaff: {
					include: {
						User: {
							select: {
								id: true,
								name: true,
							},
						},
					},
				},
			},
		});

		transformPrismaDataForJson(rsvps);
		return { rsvps };
	});
