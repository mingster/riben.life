import { auth } from "@/auth";
import type { Session } from "next-auth";

export async function isAdmin({ email }: { email?: string | null }) {
	if (!email) return false;

	const session = (await auth()) as Session;

	if (!session) {
		return false;
	}

	if (!session.user) {
		return false;
	}

	// block if not admin
	if (session.user.role !== "ADMIN") {
		return process.env.ADMINS?.includes(email);
	}
}
