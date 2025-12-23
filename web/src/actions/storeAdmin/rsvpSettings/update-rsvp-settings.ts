"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { updateRsvpSettingsSchema } from "./update-rsvp-settings.validation";
import { transformPrismaDataForJson } from "@/utils/utils";
import { dateToEpoch, getUtcNowEpoch } from "@/utils/datetime-utils";
import BusinessHours from "@/lib/businessHours";

export const updateRsvpSettingsAction = storeActionClient
	.metadata({ name: "updateRsvpSettings" })
	.schema(updateRsvpSettingsSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const {
			acceptReservation,
			minPrepaidPercentage,
			canCancel,
			cancelHours,
			canReserveBefore,
			canReserveAfter,
			defaultDuration,
			requireSignature,
			showCostToCustomer,
			useBusinessHours,
			rsvpHours,
			reminderHours,
			useReminderSMS,
			useReminderLine,
			useReminderEmail,
			syncWithGoogle,
			syncWithApple,
			reserveWithGoogleEnabled,
			googleBusinessProfileId,
			googleBusinessProfileName,
			reserveWithGoogleAccessToken,
			reserveWithGoogleRefreshToken,
			reserveWithGoogleTokenExpiry,
			reserveWithGoogleLastSync,
			reserveWithGoogleSyncStatus,
			reserveWithGoogleError,
		} = parsedInput;

		// Verify store exists and user has access
		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { id: true },
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		// Validate rsvpHours JSON (when provided and not using business hours)
		if (rsvpHours !== undefined && rsvpHours !== null) {
			try {
				new BusinessHours(rsvpHours);
			} catch (error) {
				throw new SafeError(
					`Invalid RSVP hours: ${
						error instanceof Error ? error.message : String(error)
					}`,
				);
			}
		}

		// Find existing RsvpSettings
		const existing = await sqlClient.rsvpSettings.findFirst({
			where: { storeId },
		});

		// Prepare update data (only include defined fields)
		const updateData: Prisma.RsvpSettingsUpdateInput = {};

		if (acceptReservation !== undefined) {
			updateData.acceptReservation = acceptReservation;
		}
		if (minPrepaidPercentage !== undefined) {
			updateData.minPrepaidPercentage = minPrepaidPercentage;
		}
		if (canCancel !== undefined) {
			updateData.canCancel = canCancel;
		}
		if (cancelHours !== undefined) {
			updateData.cancelHours = cancelHours;
		}
		if (canReserveBefore !== undefined) {
			updateData.canReserveBefore = canReserveBefore;
		}
		if (canReserveAfter !== undefined) {
			updateData.canReserveAfter = canReserveAfter;
		}
		if (defaultDuration !== undefined) {
			updateData.defaultDuration = defaultDuration;
		}
		if (requireSignature !== undefined) {
			updateData.requireSignature = requireSignature;
		}
		if (showCostToCustomer !== undefined) {
			updateData.showCostToCustomer = showCostToCustomer;
		}
		if (useBusinessHours !== undefined) {
			updateData.useBusinessHours = useBusinessHours;
		}
		if (rsvpHours !== undefined) {
			updateData.rsvpHours = rsvpHours;
		}
		if (reminderHours !== undefined) {
			updateData.reminderHours = reminderHours;
		}
		if (useReminderSMS !== undefined) {
			updateData.useReminderSMS = useReminderSMS;
		}
		if (useReminderLine !== undefined) {
			updateData.useReminderLine = useReminderLine;
		}
		if (useReminderEmail !== undefined) {
			updateData.useReminderEmail = useReminderEmail;
		}
		if (syncWithGoogle !== undefined) {
			updateData.syncWithGoogle = syncWithGoogle;
		}
		if (syncWithApple !== undefined) {
			updateData.syncWithApple = syncWithApple;
		}
		if (reserveWithGoogleEnabled !== undefined) {
			updateData.reserveWithGoogleEnabled = reserveWithGoogleEnabled;
		}
		if (googleBusinessProfileId !== undefined) {
			updateData.googleBusinessProfileId = googleBusinessProfileId;
		}
		if (googleBusinessProfileName !== undefined) {
			updateData.googleBusinessProfileName = googleBusinessProfileName;
		}
		if (reserveWithGoogleAccessToken !== undefined) {
			updateData.reserveWithGoogleAccessToken = reserveWithGoogleAccessToken;
		}
		if (reserveWithGoogleRefreshToken !== undefined) {
			updateData.reserveWithGoogleRefreshToken = reserveWithGoogleRefreshToken;
		}
		if (reserveWithGoogleTokenExpiry !== undefined) {
			updateData.reserveWithGoogleTokenExpiry = reserveWithGoogleTokenExpiry
				? dateToEpoch(reserveWithGoogleTokenExpiry)
				: null;
		}
		if (reserveWithGoogleLastSync !== undefined) {
			updateData.reserveWithGoogleLastSync = reserveWithGoogleLastSync
				? dateToEpoch(reserveWithGoogleLastSync)
				: null;
		}
		if (reserveWithGoogleSyncStatus !== undefined) {
			updateData.reserveWithGoogleSyncStatus = reserveWithGoogleSyncStatus;
		}
		if (reserveWithGoogleError !== undefined) {
			updateData.reserveWithGoogleError = reserveWithGoogleError;
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
							acceptReservation: acceptReservation ?? true,
							minPrepaidPercentage: minPrepaidPercentage ?? 0,
							canCancel: canCancel ?? true,
							cancelHours: cancelHours ?? 24,
							canReserveBefore: canReserveBefore ?? 2,
							canReserveAfter: canReserveAfter ?? 2190,
							defaultDuration: defaultDuration ?? 60,
							requireSignature: requireSignature ?? false,
							showCostToCustomer: showCostToCustomer ?? false,
							useBusinessHours: useBusinessHours ?? true,
							rsvpHours: rsvpHours ?? null,
							reminderHours: reminderHours ?? 24,
							useReminderSMS: useReminderSMS ?? false,
							useReminderLine: useReminderLine ?? false,
							useReminderEmail: useReminderEmail ?? false,
							syncWithGoogle: syncWithGoogle ?? false,
							syncWithApple: syncWithApple ?? false,
							reserveWithGoogleEnabled: reserveWithGoogleEnabled ?? false,
							googleBusinessProfileId: googleBusinessProfileId ?? null,
							googleBusinessProfileName: googleBusinessProfileName ?? null,
							reserveWithGoogleAccessToken:
								reserveWithGoogleAccessToken ?? null,
							reserveWithGoogleRefreshToken:
								reserveWithGoogleRefreshToken ?? null,
							reserveWithGoogleTokenExpiry: reserveWithGoogleTokenExpiry
								? dateToEpoch(reserveWithGoogleTokenExpiry)
								: null,
							reserveWithGoogleLastSync: reserveWithGoogleLastSync
								? dateToEpoch(reserveWithGoogleLastSync)
								: null,
							reserveWithGoogleSyncStatus: reserveWithGoogleSyncStatus ?? null,
							reserveWithGoogleError: reserveWithGoogleError ?? null,
							createdAt: getUtcNowEpoch(),
							updatedAt: getUtcNowEpoch(),
						},
					});

			transformPrismaDataForJson(rsvpSettings);
			return { rsvpSettings };
		} catch (error: unknown) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				throw new SafeError("RsvpSettings already exists for this store.");
			}

			throw error;
		}
	});
