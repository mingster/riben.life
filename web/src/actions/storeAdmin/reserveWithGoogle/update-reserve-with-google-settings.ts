"use server";

import { Prisma } from "@prisma/client";
import { sqlClient } from "@/lib/prismadb";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { transformPrismaDataForJson } from "@/utils/utils";
import { updateReserveWithGoogleSettingsSchema } from "./update-reserve-with-google-settings.validation";

export const updateReserveWithGoogleSettingsAction = storeActionClient
	.metadata({ name: "updateReserveWithGoogleSettings" })
	.schema(updateReserveWithGoogleSettingsSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const existing = await sqlClient.rsvpSettings.findFirst({
			where: { storeId },
		});

		const updateData: Prisma.RsvpSettingsUpdateInput = {
			updatedAt: getUtcNowEpoch(),
		};

		if (parsedInput.reserveWithGoogleEnabled !== undefined) {
			updateData.reserveWithGoogleEnabled =
				parsedInput.reserveWithGoogleEnabled;
		}
		if (parsedInput.googleBusinessProfileId !== undefined) {
			updateData.googleBusinessProfileId =
				parsedInput.googleBusinessProfileId?.trim() || null;
		}
		if (parsedInput.googleBusinessProfileName !== undefined) {
			updateData.googleBusinessProfileName =
				parsedInput.googleBusinessProfileName?.trim() || null;
		}

		try {
			const rsvpSettings = existing
				? await sqlClient.rsvpSettings.update({
						where: { id: existing.id },
						data: updateData,
					})
				: await sqlClient.rsvpSettings.create({
						data: {
							storeId,
							reserveWithGoogleEnabled:
								parsedInput.reserveWithGoogleEnabled ?? false,
							googleBusinessProfileId:
								parsedInput.googleBusinessProfileId?.trim() || null,
							googleBusinessProfileName:
								parsedInput.googleBusinessProfileName?.trim() || null,
							createdAt: getUtcNowEpoch(),
							updatedAt: getUtcNowEpoch(),
						},
					});

			transformPrismaDataForJson(rsvpSettings);
			return { rsvpSettings };
		} catch (err: unknown) {
			if (
				err instanceof Prisma.PrismaClientKnownRequestError &&
				err.code === "P2002"
			) {
				throw new SafeError("Reserve with Google settings already exists.");
			}
			throw err;
		}
	});
