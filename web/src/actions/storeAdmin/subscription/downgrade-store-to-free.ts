"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { downgradeStoreToFreeWithStripe } from "@/lib/store-subscription/downgrade-store-to-free";
import { storeActionClient } from "@/utils/actions/safe-action";
import { SafeError } from "@/utils/error";
import { downgradeStoreToFreeSchema } from "./downgrade-store-to-free.validation";

export const downgradeStoreToFreeAction = storeActionClient
	.metadata({ name: "downgradeStoreToFree" })
	.schema(downgradeStoreToFreeSchema)
	.action(async ({ bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const session = await auth.api.getSession({
			headers: await headers(),
		});
		const userId = session?.user?.id;
		if (typeof userId !== "string") {
			throw new SafeError("Unauthorized");
		}

		await downgradeStoreToFreeWithStripe({ storeId, userId });

		return { success: true as const };
	});
