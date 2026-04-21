import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";

import { SafeError } from "@/utils/error";
import { isAdmin } from "../isAdmin";
import { headers } from "next/headers";
import { Role } from "@prisma/client";

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
		if (error instanceof SafeError) return error.message;
		return "An unknown error occurred.";
	},
}).use(async ({ next, metadata }) => {
	if (process.env.NODE_ENV === "development") {
		logger.info("Calling action", { metadata: { name: metadata?.name } });
	}
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
			where: { id: userId },
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

// this action allows only store members with owner, storeAdmin, and staff roles to access.
// Bypass check for admin users.
// Requires storeId in the action input schema
export const storeActionClient = baseClient
	.bindArgsSchemas<[storeId: z.ZodString]>([z.string()])
	.use(async ({ next, metadata, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;

		// Validate storeId is not "error" or other invalid values
		if (
			!storeId ||
			typeof storeId !== "string" ||
			storeId.trim() === "" ||
			storeId.toLowerCase() === "error" ||
			storeId.toLowerCase() === "undefined" ||
			storeId.toLowerCase() === "null"
		) {
			logger.error("Invalid storeId provided", {
				metadata: {
					storeId: String(storeId),
					actionName: metadata?.name,
					bindArgsClientInputs,
				},
				tags: ["action", "validation", "error"],
			});
			throw new SafeError("Invalid storeId provided");
		}

		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { id: true, organizationId: true, ownerId: true },
		});
		if (!store) throw new SafeError("Store not found");

		const session = await auth.api.getSession({
			headers: await headers(), // you need to pass the headers object.
		});
		if (!session?.user) throw new SafeError("Unauthorized");

		// admin users can access any store
		if (session.user.role === Role.admin) {
			/*
			logger.info("access granted - user is an admin", {
				metadata: {
					userId: session.user.id,
					userRole: session.user.role,
					storeId,
					organizationId: store.organizationId,
					actionName: metadata?.name,
				},
			});
			*/

			return next({ ctx: {} });
		}

		// Check if user is a member of this store's organization with one of these roles
		const member = await sqlClient.member.findFirst({
			where: {
				userId: session.user.id,
				organizationId: store.organizationId,
				role: {
					in: [Role.owner, Role.storeAdmin, Role.staff],
				},
			},
			select: {
				id: true,
				role: true,
				organizationId: true,
			},
		});

		if (member) {
			return next({ ctx: {} });
		} else {
			// finally, throw Access denied
			logger.error(
				"access denied - user is not a member of the store's organization with allowed role",
				{
					metadata: {
						userId: session.user.id,
						userRole: session.user.role,
						storeId,
						organizationId: store.organizationId,
						actionName: metadata?.name,
					},
					tags: ["action", "error"],
				},
			);

			throw new SafeError("Unauthorized");
		}
	});

export const adminActionClient = baseClient.use(async ({ next, metadata }) => {
	const session = await auth.api.getSession({
		headers: await headers(), // you need to pass the headers object.
	});
	if (!session?.user) throw new SafeError("Unauthorized");
	if (!isAdmin({ email: session.user.email }))
		throw new SafeError("Unauthorized");

	return next({ ctx: {} });
});
