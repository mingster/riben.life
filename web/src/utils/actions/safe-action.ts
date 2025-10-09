import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";

import { SafeError } from "@/utils/error";
import { isAdmin } from "../isAdmin";
import { headers } from "next/headers";

// TODO: take functionality from `withActionInstrumentation` and move it here (apps/web/utils/actions/middleware.ts)

export const baseClient = createSafeActionClient({
	defineMetadataSchema() {
		return z.object({ name: z.string() });
	},
	handleServerError(error, { metadata, ctx, bindArgsClientInputs }) {
		const context = ctx as any;
		logger.error("Server action error", {
			metadata: {
				metadata,
				userId: context?.userId,
				userEmail: context?.userEmail,
				emailAccountId: context?.emailAccountId,
				bindArgsClientInputs,
				error: error.message,
			},
		});
		// Need a better way to handle this within logger itself
		if (process.env.NODE_ENV !== "production") console.log("Error:", error);
		if (error instanceof SafeError) return error.message;
		return "An unknown error occurred.";
	},
}).use(async ({ next, metadata }) => {
	logger.info("Calling action", { metadata: { name: metadata?.name } });
	return next();
});

// doesn't bind to a specific email
export const userRequiredActionClient = baseClient.use(
	async ({ next, metadata }) => {
		const session = await auth.api.getSession({
			headers: await headers(), // you need to pass the headers object.
		});

		if (!session?.user) throw new SafeError("Unauthorized");

		const userId = session.user.id;

		return next({
			ctx: { userId },
		});
	},
);

export const storeOwnerActionClient = baseClient.use(
	async ({ next, metadata }) => {
		const session = await auth.api.getSession({
			headers: await headers(), // you need to pass the headers object.
		});
		if (!session?.user) throw new SafeError("Unauthorized");

		if (session.user.role !== "owner" && session.user.role !== "admin") {
			console.error("access denied");
			throw new SafeError("Unauthorized");
		}

		return next({ ctx: {} });
	},
);

export const adminActionClient = baseClient.use(async ({ next, metadata }) => {
	const session = await auth.api.getSession({
		headers: await headers(), // you need to pass the headers object.
	});
	if (!session?.user) throw new SafeError("Unauthorized");
	if (!isAdmin({ email: session.user.email }))
		throw new SafeError("Unauthorized");

	return next({ ctx: {} });
});
