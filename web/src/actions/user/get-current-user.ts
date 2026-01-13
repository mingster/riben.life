import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
//import { User } from 'prisma/prisma-client';
import type { User } from "@/types";
import { transformPrismaDataForJson } from "@/utils/utils";
import { headers } from "next/headers";

const getCurrentUser = async (): Promise<User | null> => {
	const session = await auth.api.getSession({
		headers: await headers(), // you need to pass the headers object.
	});

	if (!session?.user?.id) {
		return null;
	}

	const obj = await sqlClient.user.findUnique({
		where: {
			id: session.user.id,
		},
		include: {
			/*
			NotificationTo: {
				take: 20,
				include: {
					Sender: true,
				},
				orderBy: {
					updatedAt: "desc",
				},
			},*/
			Addresses: true,
			Orders: {
				include: {
					ShippingMethod: true,
					PaymentMethod: true,
					OrderItemView: true,
					Store: {
						select: {
							id: true,
							name: true,
						},
					},
				},
				orderBy: {
					updatedAt: "desc",
				},
			},
			sessions: true,
			accounts: true,
			twofactors: true,
			passkeys: true,
			apikeys: true,
			members: true,
			invitations: true,
			Reservations: {
				// Fetch ALL reservations for the user, regardless of status
				// No status filter - includes Pending, Ready, Completed, Cancelled, NoShow, etc.
				include: {
					Store: true,
					Facility: true,
					FacilityPricingRule: true,
					Customer: true,
					CreatedBy: true,
				},
				orderBy: {
					rsvpTime: "desc",
				},
			},

			CustomerCreditLedger: {
				include: {
					Creator: true,
					Store: true,
				},
				orderBy: {
					createdAt: "desc",
				},
			},

			CustomerCredit: true,
			CustomerFiatLedger: {
				orderBy: {
					createdAt: "desc",
				},
				include: {
					Creator: true,
					Store: true,
				},
			},
			/*
			CustomerCreditLedger: {
				where: {
					storeId: params.storeId,
				},
				include: {
					Creator: true,
					StoreOrder: true,
				},
				orderBy: {
					createdAt: "desc",
				},
			},*/
		},
	});

	if (!obj) {
		return null;
	}

	transformPrismaDataForJson(obj);
	//console.log(obj.Rsvp.map((r) => r.rsvpTime));
	return obj as User;
};

export default getCurrentUser;
