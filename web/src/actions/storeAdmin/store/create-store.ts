"use server";

import { sqlClient } from "@/lib/prismadb";
import { StoreLevel } from "@/types/enum";
import logger from "@/lib/logger";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getUtcNowEpoch, getUtcNow } from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";
import { userRequiredActionClient } from "@/utils/actions/safe-action";
import { createStoreSchema } from "./create-store.validation";
import fs from "node:fs";
import { Role, type Organization } from "@prisma/client";
import { getOrganizationIdFromCreateResponse } from "@/utils/better-auth-organization";
import crypto from "crypto";

export const createStoreAction = userRequiredActionClient
	.metadata({ name: "createStore" })
	.schema(createStoreSchema)
	.action(async ({ parsedInput }) => {
		const { name, defaultLocale, defaultCountry, defaultCurrency } =
			parsedInput;

		const session = await auth.api.getSession({
			headers: await headers(),
		});
		const ownerId = session?.user?.id;

		if (!session?.user || !ownerId) {
			throw new SafeError("Unauthorized");
		}

		const defaultPaymentMethods = await sqlClient.paymentMethod.findMany({
			where: {
				isDefault: true,
			},
		});

		const defaultShippingMethods = await sqlClient.shippingMethod.findMany({
			where: {
				isDefault: true,
			},
		});

		const headersList = await headers();

		const userOrganizations = await sqlClient.member.findMany({
			where: {
				userId: ownerId,
			},
			include: {
				organization: {
					select: {
						id: true,
						name: true,
						slug: true,
					},
				},
			},
		});

		let organization: Organization | null = null;

		if (userOrganizations.length === 0) {
			try {
				let storeSlug = name.toLowerCase().replace(/ /g, "-");

				const slugExists = await sqlClient.organization.findUnique({
					where: { slug: storeSlug },
					select: { id: true },
				});

				if (slugExists) {
					storeSlug =
						storeSlug + "-" + Math.random().toString(36).substring(2, 15);
				}

				const createOrgResult = await auth.api.createOrganization({
					headers: headersList,
					body: {
						name,
						slug: storeSlug,
						keepCurrentActiveOrganization: true,
					},
				});
				const newOrgId = getOrganizationIdFromCreateResponse(createOrgResult);
				organization = newOrgId
					? await sqlClient.organization.findUnique({
							where: { id: newOrgId },
						})
					: null;

				if (!organization || !organization.id) {
					throw new SafeError("Failed to create organization");
				}

				logger.info("Created new organization for user", {
					metadata: {
						organizationId: organization.id,
						userId: ownerId,
						storeName: name,
					},
					tags: ["store", "organization", "create"],
				});
			} catch (error) {
				logger.error("Failed to create organization", {
					metadata: {
						error: error instanceof Error ? error.message : String(error),
						name,
						ownerId,
					},
					tags: ["store", "organization", "error"],
				});
				throw new SafeError("Failed to create organization. Please try again.");
			}
		} else {
			const orgData = userOrganizations[0].organization;
			if (!orgData || !orgData.id) {
				logger.error(
					"User has organization membership but organization not found",
					{
						metadata: {
							userId: ownerId,
							memberId: userOrganizations[0].id,
							organizationId: userOrganizations[0].organizationId,
						},
						tags: ["store", "organization", "error"],
					},
				);
				throw new SafeError("Organization not found. Please contact support.");
			}

			organization = await sqlClient.organization.findUnique({
				where: { id: orgData.id },
			});

			if (!organization || !organization.id) {
				throw new SafeError("Organization not found. Please contact support.");
			}

			logger.info("Reusing existing organization for new store", {
				metadata: {
					organizationId: organization.id,
					userId: ownerId,
					storeName: name,
				},
				tags: ["store", "organization", "reuse"],
			});
		}

		const store = await sqlClient.store.create({
			data: {
				name,
				ownerId,
				organizationId: organization.id,
				defaultCountry: defaultCountry,
				defaultCurrency: defaultCurrency,
				defaultLocale: defaultLocale,
				level: StoreLevel.Free,
				createdAt: getUtcNowEpoch(),
				updatedAt: getUtcNowEpoch(),
				...(defaultPaymentMethods.length > 0 && {
					StorePaymentMethods: {
						createMany: {
							data: defaultPaymentMethods.map((paymentMethod) => ({
								methodId: paymentMethod.id,
							})),
						},
					},
				}),
				...(defaultShippingMethods.length > 0 && {
					StoreShippingMethods: {
						createMany: {
							data: defaultShippingMethods.map((shippingMethod) => ({
								methodId: shippingMethod.id,
							})),
						},
					},
				}),
			},
		});

		try {
			if (session.user.role === "user") {
				await sqlClient.user.update({
					where: {
						id: ownerId,
					},
					data: {
						role: Role.owner,
					},
				});
			}
		} catch (error) {
			logger.error("Failed to update user role to owner", {
				metadata: {
					error: error instanceof Error ? error.message : String(error),
				},
			});
		}

		const existingMember = await sqlClient.member.findFirst({
			where: {
				userId: ownerId,
				organizationId: organization.id,
			},
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
					organizationId: organization.id,
					role: Role.owner,
					createdAt: getUtcNow(),
				},
			});
		}

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
		} catch (error) {
			logger.warn("Failed to create service staff for store owner", {
				metadata: {
					storeId: store.id,
					ownerId,
					error: error instanceof Error ? error.message : String(error),
				},
				tags: ["store", "service-staff", "create"],
			});
		}

		const databaseId = store.id;

		const termsfilePath = `${process.cwd()}/public/defaults/terms.md`;
		const tos = fs.readFileSync(termsfilePath, "utf8");

		const privacyfilePath = `${process.cwd()}/public/defaults/privacy.md`;
		const privacyPolicy = fs.readFileSync(privacyfilePath, "utf8");

		const bizhoursfilePath = `${process.cwd()}/public/defaults/business-hours.json`;
		const businessHours = fs.readFileSync(bizhoursfilePath, "utf8");

		await sqlClient.storeSettings.upsert({
			where: { storeId: databaseId },
			update: {
				businessHours,
				privacyPolicy,
				tos,
				updatedAt: getUtcNowEpoch(),
			},
			create: {
				storeId: databaseId,
				businessHours,
				privacyPolicy,
				tos,
				createdAt: getUtcNowEpoch(),
				updatedAt: getUtcNowEpoch(),
			},
		});

		await sqlClient.rsvpSettings.upsert({
			where: { storeId: databaseId },
			update: {
				updatedAt: getUtcNowEpoch(),
			},
			create: {
				storeId: databaseId,
				createdAt: getUtcNowEpoch(),
				updatedAt: getUtcNowEpoch(),
			},
		});

		return { storeId: databaseId };
	});
