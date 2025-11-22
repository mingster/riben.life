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

// this action allows only store members with owner, storeAdmin, and staff roles to access
// Requires storeId in the action input schema
export const storeActionClient = baseClient.use(
	async ({ next, metadata, clientInput }) => {
		const session = await auth.api.getSession({
			headers: await headers(), // you need to pass the headers object.
		});
		if (!session?.user) throw new SafeError("Unauthorized");

		const userId = session.user.id;
		const userRole = session.user.role;

		// Get storeId from client input (before schema validation)
		const storeId = (clientInput as any)?.storeId;
		if (!storeId || typeof storeId !== "string") {
			logger.error("storeId is required in store actions", {
				metadata: {
					userId,
					actionName: metadata?.name,
				},
				tags: ["action", "error"],
			});
			throw new SafeError("Store ID is required");
		}

		// Get the store to find its organization
		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { id: true, organizationId: true, ownerId: true },
		});

		if (!store) {
			logger.error("store not found", {
				metadata: {
					userId,
					storeId,
					actionName: metadata?.name,
				},
				tags: ["action", "error"],
			});
			throw new SafeError("Store not found");
		}

		// Check if user is a member of this store's organization with one of these roles
		if (store.organizationId) {
			const member = await sqlClient.member.findFirst({
				where: {
					userId,
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
			}
		}

		// Access denied
		logger.error(
			"access denied - user is not a member of the store's organization with allowed role",
			{
				metadata: {
					userId,
					userRole,
					storeId,
					organizationId: store.organizationId,
					actionName: metadata?.name,
				},
				tags: ["action", "error"],
			},
		);
		throw new SafeError("Unauthorized");
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
