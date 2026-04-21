"use server";

import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { adminActionClient } from "@/utils/actions/safe-action";
import { SafeError } from "@/utils/error";
import { transformPrismaDataForJson } from "@/utils/utils";

import { updateSysAdminOrganizationSchema } from "./update-sysadmin-organization.validation";

export const updateSysAdminOrganizationAction = adminActionClient
	.metadata({ name: "updateSysAdminOrganization" })
	.schema(updateSysAdminOrganizationSchema)
	.action(async ({ parsedInput }) => {
		const { id, name, slug, logo, metadata } = parsedInput;

		const current = await sqlClient.organization.findUnique({
			where: { id },
			select: { id: true, slug: true },
		});
		if (!current) {
			throw new SafeError("Organization not found.");
		}

		if (slug !== current.slug) {
			const taken = await sqlClient.organization.findFirst({
				where: { slug, NOT: { id } },
				select: { id: true },
			});
			if (taken) {
				throw new SafeError("An organization with this slug already exists.");
			}
		}

		try {
			const organization = await sqlClient.organization.update({
				where: { id },
				data: {
					name,
					slug,
					logo: logo ?? null,
					metadata: metadata ?? null,
				},
				include: {
					_count: { select: { stores: true } },
				},
			});

			transformPrismaDataForJson(organization);
			return { organization };
		} catch (err: unknown) {
			logger.error("updateSysAdminOrganization failed", {
				metadata: {
					organizationId: id,
					error: err instanceof Error ? err.message : String(err),
				},
				tags: ["sysAdmin", "organization", "error"],
			});
			throw new SafeError("Could not update organization.");
		}
	});
