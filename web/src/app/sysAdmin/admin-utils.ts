"use server";

import { auth } from "@/lib/auth";
import { Role } from "@/types/enum";
import { headers } from "next/headers";

export async function checkAdminAccess() {
	// check user session
	const session = await auth.api.getSession({
		headers: await headers(), // you need to pass the headers object.
	});

	if (!session) {
		return false;
	}

	if (session.user.role !== Role.admin) {
		// check if email is in ADMINS
		if (process.env.ADMINS?.includes(session.user.email)) {
			return true;
		}

		return false;
	}

	return true;
}
