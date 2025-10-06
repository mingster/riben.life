"use server";

import { auth } from "@/lib/auth";

import { sqlClient } from "@/lib/prismadb";
import type { StoreNotification } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function CreateNotification(values: StoreNotification) {
	const session = await auth.api.getSession({
		headers: await headers(), // you need to pass the headers object.
	});

	const userId = session?.user.id;
	if (typeof userId !== "string") {
		throw Error("Unauthorized");
	}

	const email = session?.user?.email;

	if (!email) {
		throw Error("Unauthorized");
	}

	await sqlClient.storeNotification.create({
		data: { ...values },
	});

	revalidatePath("/");
}
