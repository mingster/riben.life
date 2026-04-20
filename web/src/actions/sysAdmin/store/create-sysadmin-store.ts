"use server";

import crypto from "node:crypto";
import fs from "node:fs";
import { Role } from "@prisma/client";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { StoreLevel } from "@/types/enum";
import { adminActionClient } from "@/utils/actions/safe-action";
import { getUtcNow, getUtcNowEpoch } from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";

import { transformPrismaDataForJson } from "@/utils/utils";

import { createSysAdminStoreSchema } from "./create-sysadmin-store.validation";

export const createSysAdminStoreAction = adminActionClient
	.metadata({ name: "createSysAdminStore" })
	.schema(createSysAdminStoreSchema)
	.action(async ({ parsedInput }) => {
		const {
			name,
			organizationId,
			ownerId,
			defaultCountry,
			defaultCurrency,
			defaultLocale,
		} = parsedInput;

		const organization = await sqlClient.organization.findUnique({
			where: { id: organizationId },
			select: { id: true },
		});
		const owner = await sqlClient.user.findUnique({
			where: { id: ownerId },
			select: { id: true },
		});

		if (!organization) {
			throw new SafeError("Organization not found.");
		}
		if (!owner) {
			throw new SafeError("User not found.");
		}

		const defaultPaymentMethods = await sqlClient.paymentMethod.findMany({
			where: { isDefault: true },
		});
		const defaultShippingMethods = await sqlClient.shippingMethod.findMany({
			where: { isDefault: true },
		});

		const existingMember = await sqlClient.member.findFirst({
			where: { userId: ownerId, organizationId },
		});

		if (existingMember) {
			await sqlClient.member.update({
				where: { id: existingMember.id },
				data: { role: Role.owner },
			});
		} else {
			await sqlClient.member.create({
				data: {
					id: crypto.randomUUID(),
					userId: ownerId,
					organizationId,
					role: Role.owner,
					createdAt: getUtcNow(),
				},
			});
		}

		const store = await sqlClient.store.create({
			data: {
				name,
				ownerId,
				organizationId,
				defaultCountry,
				defaultCurrency,
				defaultLocale,
				level: StoreLevel.Free,
				isDeleted: false,
				createdAt: getUtcNowEpoch(),
				updatedAt: getUtcNowEpoch(),
				...(defaultPaymentMethods.length > 0 && {
					StorePaymentMethods: {
						createMany: {
							data: defaultPaymentMethods.map((pm) => ({
								methodId: pm.id,
							})),
						},
					},
				}),
				...(defaultShippingMethods.length > 0 && {
					StoreShippingMethods: {
						createMany: {
							data: defaultShippingMethods.map((sm) => ({
								methodId: sm.id,
							})),
						},
					},
				}),
			},
		});

		try {
			await sqlClient.serviceStaff.create({
				data: {
					storeId: store.id,
					userId: ownerId,
					capacity: 4,
					defaultCost: 0,
					defaultCredit: 0,
					defaultDuration: 60,
					description: null,
					receiveStoreNotifications: true,
				},
			});
		} catch (err: unknown) {
			logger.warn("Failed to create service staff for store owner", {
				metadata: {
					storeId: store.id,
					ownerId,
					error: err instanceof Error ? err.message : String(err),
				},
				tags: ["store", "service-staff", "create"],
			});
		}

		const termsfilePath = `${process.cwd()}/public/defaults/terms.md`;
		const tos = fs.readFileSync(termsfilePath, "utf8");
		const privacyfilePath = `${process.cwd()}/public/defaults/privacy.md`;
		const privacyPolicy = fs.readFileSync(privacyfilePath, "utf8");
		const bizhoursfilePath = `${process.cwd()}/public/defaults/business-hours.json`;
		const businessHours = fs.readFileSync(bizhoursfilePath, "utf8");

		await sqlClient.storeSettings.upsert({
			where: { storeId: store.id },
			update: {
				businessHours,
				privacyPolicy,
				tos,
				updatedAt: getUtcNowEpoch(),
			},
			create: {
				storeId: store.id,
				businessHours,
				privacyPolicy,
				tos,
				createdAt: getUtcNowEpoch(),
				updatedAt: getUtcNowEpoch(),
			},
		});

		await sqlClient.rsvpSettings.upsert({
			where: { storeId: store.id },
			update: { updatedAt: getUtcNowEpoch() },
			create: {
				storeId: store.id,
				createdAt: getUtcNowEpoch(),
				updatedAt: getUtcNowEpoch(),
			},
		});

		try {
			if (ownerId) {
				const u = await sqlClient.user.findUnique({ where: { id: ownerId } });
				if (u?.role === Role.user) {
					await sqlClient.user.update({
						where: { id: ownerId },
						data: { role: Role.owner },
					});
				}
			}
		} catch (err: unknown) {
			logger.error("Failed to promote user role after sysAdmin store create", {
				metadata: {
					error: err instanceof Error ? err.message : String(err),
					ownerId,
				},
				tags: ["store", "user-role", "error"],
			});
		}

		logger.info("SysAdmin created store", {
			metadata: { storeId: store.id, organizationId, ownerId },
			tags: ["sysAdmin", "store", "create"],
		});

		const row = await sqlClient.store.findUnique({
			where: { id: store.id },
			select: {
				id: true,
				name: true,
				ownerId: true,
				defaultCurrency: true,
				defaultCountry: true,
				defaultLocale: true,
				updatedAt: true,
				isDeleted: true,
				isOpen: true,
				acceptAnonymousOrder: true,
				autoAcceptOrder: true,
				Organization: { select: { id: true, name: true, slug: true } },
			},
		});

		if (!row) {
			throw new SafeError("Store was created but could not be reloaded.");
		}

		transformPrismaDataForJson(row);

		return { store: row };
	});
