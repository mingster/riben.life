import { auth } from "@/lib/auth";
import { isAllowlistedAdminEmail } from "@/lib/admin/access";
import { Role } from "@prisma/client";
import { headers } from "next/headers";

/** True when the session user has admin role or an allowlisted admin email. */
export async function isAdmin({ email }: { email?: string | null }) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		return false;
	}

	const role = session.user.role;
	if (role === Role.admin || role === "admin") {
		return true;
	}

	const sessionEmail = session.user.email;
	if (
		typeof sessionEmail === "string" &&
		isAllowlistedAdminEmail(sessionEmail)
	) {
		return true;
	}

	if (
		email &&
		typeof sessionEmail === "string" &&
		sessionEmail.toLowerCase() !== email.toLowerCase()
	) {
		return false;
	}

	return false;
}
