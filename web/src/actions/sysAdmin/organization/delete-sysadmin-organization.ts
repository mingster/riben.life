"use server";

import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { adminActionClient } from "@/utils/actions/safe-action";
import { SafeError } from "@/utils/error";

import { deleteSysAdminOrganizationSchema } from "./delete-sysadmin-organization.validation";

export const deleteSysAdminOrganizationAction = adminActionClient
	.metadata({ name: "deleteSysAdminOrganization" })
	.schema(deleteSysAdminOrganizationSchema)
	.action(async ({ parsedInput }) => {
		const { id } = parsedInput;

		const org = await sqlClient.organization.findUnique({
			where: { id },
			select: {
				id: true,
				_count: { select: { stores: true } },
			},
		});
		if (!org) {
			throw new SafeError("Organization not found.");
		}
		if (org._count.stores > 0) {
			throw new SafeError(
				"Cannot delete an organization that still has stores. Remove or reassign stores first.",
			);
		}

		try {
			await sqlClient.organization.delete({ where: { id } });
			return { success: true as const };
		} catch (err: unknown) {
			logger.error("deleteSysAdminOrganization failed", {
				metadata: {
					organizationId: id,
					error: err instanceof Error ? err.message : String(err),
				},
				tags: ["sysAdmin", "organization", "error"],
			});
			throw new SafeError("Could not delete organization.");
		}
	});
