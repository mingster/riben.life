import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
//import { User } from 'prisma/prisma-client';
import type { User } from "@/types";
import { transformDecimalsToNumbers } from "@/utils/utils";
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
		},
	});

	if (!obj) {
		return null;
	}

	transformDecimalsToNumbers(obj);

	return obj as User;
};

export default getCurrentUser;
