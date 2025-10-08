import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function isAdmin({ email }: { email?: string | null }) {
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
	if (session.user.role !== "admin") {
		return process.env.ADMINS?.includes(email);
	}
}
