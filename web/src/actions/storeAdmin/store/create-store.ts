"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { sqlClient } from "@/lib/prismadb";
import { StoreLevel } from "@/types/enum";
import logger from "@/lib/logger";
import { auth, Session } from "@/lib/auth";
import { headers } from "next/headers";
import { getUtcNowEpoch, getUtcNow } from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";
import { userRequiredActionClient } from "@/utils/actions/safe-action";
import { createStoreSchema } from "./create-store.validation";
import fs from "node:fs";
import { Role } from "@prisma/client";
import crypto from "crypto";

export const createStoreAction = userRequiredActionClient
	.metadata({ name: "createStore" })
	.schema(createStoreSchema)
	.action(async ({ parsedInput }) => {
		const { name, defaultLocale, defaultCountry, defaultCurrency } =
			parsedInput;

		const session = (await auth.api.getSession({
			headers: await headers(),
		})) as unknown as Session;
		const ownerId = session.user?.id;

		if (!session || !session.user || !ownerId) {
			throw new SafeError("Unauthorized");
		}

		// Get default payment and shipping methods
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

		// if user do not have an organization, create org BEFORE creating store
		const headersList = await headers();

		// Check if user is already a member of any organization
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

		let organization;

		// If user has no organizations, create one
		if (userOrganizations.length === 0) {
			try {
				// Generate slug from store name
				let storeSlug = name.toLowerCase().replace(/ /g, "-");

				// Check if slug is already taken
				const slugExists = await sqlClient.organization.findUnique({
					where: { slug: storeSlug },
					select: { id: true },
				});

				// If slug exists, add suffix
				if (slugExists) {
					storeSlug =
						storeSlug + "-" + Math.random().toString(36).substring(2, 15);
				}

				organization = await auth.api.createOrganization({
					headers: headersList,
					body: {
						name: name, // Use original name for organization display name
						slug: storeSlug,
						keepCurrentActiveOrganization: true,
					},
				});

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
			// User already has organizations, reuse the first one (one org per user, multiple stores)
			organization = userOrganizations[0].organization;

			if (!organization || !organization.id) {
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

			logger.info("Reusing existing organization for new store", {
				metadata: {
					organizationId: organization.id,
					userId: ownerId,
					storeName: name,
				},
				tags: ["store", "organization", "reuse"],
			});
		}

		// Create store AFTER organization is successfully created
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
				StorePaymentMethods: {
					createMany: {
						data: defaultPaymentMethods.map((paymentMethod) => ({
							methodId: paymentMethod.id,
						})),
					},
				},
				StoreShippingMethods: {
					createMany: {
						data: defaultShippingMethods.map((shippingMethod) => ({
							methodId: shippingMethod.id,
						})),
					},
				},
			},
		});

		// Update user role to owner if needed
		try {
			if (session.user.role === "user") {
				await sqlClient.user.update({
					where: {
						id: ownerId,
					},
					data: {
						role: Role.owner as Role,
					},
				});
			}
		} catch (error) {
			logger.info("Operation log", {
				metadata: {
					error: error instanceof Error ? error.message : String(error),
				},
			});
		}

		// update user's role in members table
		// Check if member already exists for this user and organization
		const existingMember = await sqlClient.member.findFirst({
			where: {
				userId: ownerId,
				organizationId: organization.id,
			},
		});

		if (existingMember) {
			// Update existing member role
			await sqlClient.member.update({
				where: { id: existingMember.id },
				data: { role: Role.owner as Role },
			});
		} else {
			// Create new member
			await sqlClient.member.create({
				data: {
					id: crypto.randomUUID(),
					userId: ownerId,
					organizationId: organization.id,
					role: Role.owner as Role,
					createdAt: getUtcNow(),
				},
			});
		}

		const databaseId = store.id;

		// Populate defaults: privacy policy and terms of service
		const termsfilePath = `${process.cwd()}/public/defaults/terms.md`;
		const tos = fs.readFileSync(termsfilePath, "utf8");

		const privacyfilePath = `${process.cwd()}/public/defaults/privacy.md`;
		const privacyPolicy = fs.readFileSync(privacyfilePath, "utf8");

		// Populate defaults business hours
		const bizhoursfilePath = `${process.cwd()}/public/defaults/business-hours.json`;
		const businessHours = fs.readFileSync(bizhoursfilePath, "utf8");

		await sqlClient.storeSettings.create({
			data: {
				storeId: databaseId,
				businessHours,
				privacyPolicy,
				tos,
				createdAt: getUtcNowEpoch(),
				updatedAt: getUtcNowEpoch(),
			},
		});

		return { storeId: databaseId };
	});
