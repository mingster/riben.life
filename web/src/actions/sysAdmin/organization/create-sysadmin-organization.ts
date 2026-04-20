"use server";

import crypto from "node:crypto";

import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { adminActionClient } from "@/utils/actions/safe-action";
import { getUtcNow } from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";
import { transformPrismaDataForJson } from "@/utils/utils";

import { createSysAdminOrganizationSchema } from "./create-sysadmin-organization.validation";

export const createSysAdminOrganizationAction = adminActionClient
	.metadata({ name: "createSysAdminOrganization" })
	.schema(createSysAdminOrganizationSchema)
	.action(async ({ parsedInput }) => {
		const { name, slug, logo, metadata } = parsedInput;

		const existing = await sqlClient.organization.findUnique({
			where: { slug },
			select: { id: true },
		});
		if (existing) {
			throw new SafeError("An organization with this slug already exists.");
		}

		try {
			const organization = await sqlClient.organization.create({
				data: {
					id: crypto.randomUUID(),
					name,
					slug,
					logo: logo ?? null,
					metadata: metadata ?? null,
					createdAt: getUtcNow(),
				},
				include: {
					_count: { select: { stores: true } },
				},
			});

			transformPrismaDataForJson(organization);
			return { organization };
		} catch (err: unknown) {
			logger.error("createSysAdminOrganization failed", {
				metadata: {
					error: err instanceof Error ? err.message : String(err),
				},
				tags: ["sysAdmin", "organization", "error"],
			});
			throw new SafeError("Could not create organization.");
		}
	});
