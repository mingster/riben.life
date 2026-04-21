"use server";

import { Role } from "@prisma/client";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { transformPrismaDataForJson } from "@/utils/utils";

const listStoreRsvpsSchema = z.object({});

export const listStoreRsvpsForAdminAction = storeActionClient
	.metadata({ name: "listStoreRsvpsForAdmin" })
	.schema(listStoreRsvpsSchema)
	.action(async ({ bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;

		const session = await auth.api.getSession({
			headers: await headers(),
		});
		const currentUserId = session?.user?.id;
		const userRole = session?.user?.role;
		const isStaff = userRole === Role.staff;
		const staffFilter =
			isStaff && currentUserId ? { createdBy: currentUserId } : {};

		const rsvps = await sqlClient.rsvp.findMany({
			where: {
				storeId,
				...staffFilter,
			},
			orderBy: { rsvpTime: "desc" },
			take: 500,
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
