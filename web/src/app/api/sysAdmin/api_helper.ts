import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export const CheckAdminApiAccess = async () => {
	const session = await auth.api.getSession({
		headers: await headers(), // you need to pass the headers object.
	});

	const userId = session?.user.id;

	if (!session) {
		return new NextResponse("Unauthenticated", { status: 400 });
	}

	if (!userId) {
		return new NextResponse("Unauthenticated", { status: 401 });
	}

	// block if not admin
	if (session.user.role !== "admin") {
		return new NextResponse("Unauthenticated", { status: 402 });
	}
};
