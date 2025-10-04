import { headers } from "next/headers";
//import { withServerActionInstrumentation } from "@sentry/nextjs";
import { createSafeActionClient } from "next-safe-action";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";

import { SafeError } from "@/utils/error";
import logger from "@/lib/logger";
import { isAdmin } from "../isAdmin";
import { getClientIPForServerAction } from "../geo-ip";
import { sqlClient } from "@/lib/prismadb";

// TODO: take functionality from `withActionInstrumentation` and
//  move it here (apps/web/utils/actions/middleware.ts)

export const baseClient = createSafeActionClient({
	defineMetadataSchema() {
		return z.object({ name: z.string() });
	},
	async handleServerError(error, { metadata, ctx, bindArgsClientInputs }) {
		const ip = await getClientIPForServerAction();
		const context = ctx as any;
		logger.error(`Server action error: ${error.message}`, {
			metadata: {
				metadata,
				userId: context?.userId,
				userEmail: context?.userEmail,
				emailAccountId: context?.emailAccountId,
				bindArgsClientInputs,
				error: error.message,
			},
			tags: ["handleServerError"],
			service: "safe-action",
			environment: process.env.NODE_ENV,
			version: process.env.npm_package_version,
			ip,
		});
		// Need a better way to handle this within logger itself
		if (process.env.NODE_ENV !== "production") console.log("Error:", error);
		if (error instanceof SafeError) return error.message;
		return "An unknown error occurred.";
	},
}).use(async ({ next, metadata }) => {
	//logger.info(`Calling action: ${metadata?.name}`);
	return next();
});

export const emailRequiredActionClient = baseClient
	.bindArgsSchemas<[emailAccountId: z.ZodString]>([z.string()])
	.use(async ({ next, metadata, bindArgsClientInputs }) => {
		const session = await auth.api.getSession({
			headers: await headers(), // you need to pass the headers object.
		});

		if (!session?.user) throw new SafeError("Unauthorized");
		const userEmail = session.user.email;
		if (!userEmail) throw new SafeError("Unauthorized");

		const userId = session.user.id;
		const emailAccountId = bindArgsClientInputs[0] as string;

		// validate user owns this email
		const user = await sqlClient.user.findUnique({
			where: { id: emailAccountId },
		});

		if (!user) throw new SafeError("Unauthorized");

		//return withServerActionInstrumentation(metadata?.name, async () => {
		return next({
			ctx: {
				userId,
				userEmail,
				session,
				emailAccountId,
			},
		});
		//});
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

export const adminActionClient = baseClient.use(async ({ next, metadata }) => {
	const session = await auth.api.getSession({
		headers: await headers(), // you need to pass the headers object.
	});

	if (!session?.user) throw new SafeError("Unauthorized");

	if (!isAdmin({ email: session.user.email }))
		throw new SafeError("Unauthorized");

	//return withServerActionInstrumentation(metadata?.name, async () => {
	return next({ ctx: {} });
	//});
});
