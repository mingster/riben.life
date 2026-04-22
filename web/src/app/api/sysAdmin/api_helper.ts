import { checkAdminAccess } from "@/lib/admin-access";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Same rules as sysAdmin UI: {@link checkAdminAccess} (role `admin` / `Role.admin`, or
 * `ADMINS` / `ADMIN` env allowlist).
 */
export const CheckAdminApiAccess = async () => {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	if (!(await checkAdminAccess())) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}
};
