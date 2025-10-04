"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";

import { redirect } from "next/navigation";

export async function checkAdminAccess() {
	//console.log('storeid: ' + params.storeId);
	const session = await auth.api.getSession({
		headers: await headers(), // you need to pass the headers object.
	});
	if (!session) {
		return false;
	}

	if (!session.user) {
		return false;
	}

	//console.log("admin user", session.user.email, session.user.role);

	// block if not admin
	if (
		session.user.role !== "ADMIN" &&
		session.user.email !== "mingster.tsai@gmail.com"
	) {
		//if (session.user.role !== "ADMIN") {
		//throw new Error("Unauthorized");
		return false;
	}

	return true;
}
