import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { headers } from "next/headers";

/**
 * Comma-separated emails in ADMINS or ADMIN (e.g. `ADMINS=you@x.com,other@y.com`).
 */
function parseAdminEmailsFromEnv(): string[] {
	const raw = process.env.ADMINS?.trim() || process.env.ADMIN?.trim() || "";
	if (!raw) {
		return [];
	}
	return raw
		.split(",")
		.map((entry) => entry.trim().toLowerCase())
		.filter((entry) => entry.length > 0);
}

function isAllowlistedAdminEmail(email: string): boolean {
	const normalized = email.trim().toLowerCase();
	if (!normalized) {
		return false;
	}
	return parseAdminEmailsFromEnv().includes(normalized);
}

/** True if the current session may access sysAdmin routes and adminActionClient. */
export async function checkAdminAccess(): Promise<boolean> {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		return false;
	}

	const role = session.user.role;
	const hasAdminRole = role === Role.admin || role === "admin";

	if (hasAdminRole) {
		return true;
	}

	const email = session.user.email;
	if (typeof email === "string" && isAllowlistedAdminEmail(email)) {
		return true;
	}

	return false;
}

export { isAllowlistedAdminEmail, parseAdminEmailsFromEnv };
