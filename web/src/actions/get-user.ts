import { auth } from "@/auth";
import { sqlClient } from "@/lib/prismadb";
//import { User } from 'prisma/prisma-client';
import type { StoreOrder, User } from "@/types";
import { getDateInTz, transformDecimalsToNumbers } from "@/utils/utils";
import type { StoreTables } from "@prisma/client";

const getUser = async (): Promise<User | null> => {
	const session = await auth();
	if (!session) {
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
				},
				orderBy: {
					updatedAt: "desc",
				},
			},
			Session: true,
			Account: true,
		},
	});

	if (obj) {
		transformDecimalsToNumbers(obj);
	}

	return obj;
};

export default getUser;
