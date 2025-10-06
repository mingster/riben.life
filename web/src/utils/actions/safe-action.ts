import { auth } from "@/auth";
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";

import { SafeError } from "@/utils/error";
import { isAdmin } from "../isAdmin";

// TODO: take functionality from `withActionInstrumentation` and move it here (apps/web/utils/actions/middleware.ts)

const baseClient = createSafeActionClient({
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
// .schema(z.object({}), {
//   handleValidationErrorsShape: async (ve) =>
//     flattenValidationErrors(ve).fieldErrors,
// });

export const actionClient = baseClient
	.bindArgsSchemas<[emailAccountId: z.ZodString]>([z.string()])
	.use(async ({ next, metadata, bindArgsClientInputs }) => {
		const session = await auth();

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

		return next({
			ctx: {
				userId,
				userEmail,
				session,
				emailAccountId,
			},
		});
	});

// doesn't bind to a specific email
export const userRequiredActionClient = baseClient.use(
	async ({ next, metadata }) => {
		const session = await auth();

		if (!session?.user) throw new SafeError("Unauthorized");

		const userId = session.user.id;

		return next({
			ctx: { userId },
		});
	},
);

export const storeOwnerActionClient = baseClient.use(
	async ({ next, metadata }) => {
		const session = await auth();
		if (!session?.user) throw new SafeError("Unauthorized");

		if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
			console.error("access denied");
			throw new SafeError("Unauthorized");
		}

		return next({ ctx: {} });
	},
);

export const adminActionClient = baseClient.use(async ({ next, metadata }) => {
	const session = await auth();
	if (!session?.user) throw new SafeError("Unauthorized");
	if (!isAdmin({ email: session.user.email }))
		throw new SafeError("Unauthorized");

	return next({ ctx: {} });
});
