import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { currentUserArgs, type CurrentUser } from "@/types/current-user";
import { transformPrismaDataForJson } from "@/utils/utils";
import { headers } from "next/headers";

const getCurrentUser = async (): Promise<CurrentUser | null> => {
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
		...currentUserArgs,
	});

	if (!obj) {
		return null;
	}

	transformPrismaDataForJson(obj);
	return obj;
};

export default getCurrentUser;
