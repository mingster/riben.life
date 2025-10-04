import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { Role } from "@/types/enum";

export async function isAdmin({
	email,
}: {
	email?: string | null | undefined;
}) {
	if (!email) return false;

	const session = await auth.api.getSession({
		headers: await headers(), // you need to pass the headers object.
	});

	if (!session) {
		return false;
	}

	if (!session.user) {
		return false;
	}

	// block if not admin
	if (session.user.role === Role.ADMIN.toString()) {
		return true;
	}

	// check if email is in ADMINS
	if (process.env.ADMINS?.includes(session.user.email)) {
		return true;
	}

	return false;
}
