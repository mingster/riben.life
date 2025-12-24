"use server";

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
import { Role, type Organization } from "@prisma/client";
import crypto from "crypto";
import { ensureCreditRechargeProduct } from "@/actions/store/credit/ensure-credit-recharge-product";
import { ensureReservationPrepaidProduct } from "@/actions/store/reservation/ensure-reservation-prepaid-product";

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

		let organization: Organization | null = null;

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

				organization = (await auth.api.createOrganization({
					headers: headersList,
					body: {
						name: name, // Use original name for organization display name
						slug: storeSlug,
						keepCurrentActiveOrganization: true,
					},
				})) as unknown as Organization;

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

			// Fetch full organization data
			organization = await sqlClient.organization.findUnique({
				where: { id: orgData.id },
			});

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
			logger.error("Operation log", {
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

		// StoreSettings is required - always create it when creating a store
		// Use upsert to handle edge cases where it might already exist
		await sqlClient.storeSettings.upsert({
			where: { storeId: databaseId },
			update: {
				// If it exists, update with defaults (shouldn't happen, but safe)
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

		// RsvpSettings is required - always create it when creating a store
		// Use upsert to handle edge cases where it might already exist
		// All fields use schema defaults, so we only need to set required fields
		await sqlClient.rsvpSettings.upsert({
			where: { storeId: databaseId },
			update: {
				// If it exists, just update timestamp (shouldn't happen, but safe)
				updatedAt: getUtcNowEpoch(),
			},
			create: {
				storeId: databaseId,
				// All other fields use schema defaults:
				// acceptReservation: true
				// singleServiceMode: false
				// minPrepaidPercentage: 0
				// canCancel: true
				// cancelHours: 24
				// canReserveBefore: 2
				// canReserveAfter: 2190
				// defaultDuration: 60
				// requireSignature: false
				// showCostToCustomer: false
				// useBusinessHours: true
				// reminderHours: 24
				// useReminderSMS: false
				// useReminderLine: false
				// useReminderEmail: false
				// syncWithGoogle: false
				// syncWithApple: false
				// reserveWithGoogleEnabled: false
				createdAt: getUtcNowEpoch(),
				updatedAt: getUtcNowEpoch(),
			},
		});

		// Create special system product for credit recharge (FR-PAY-004.1)
		try {
			await ensureCreditRechargeProduct(databaseId);
			await ensureReservationPrepaidProduct(databaseId);
		} catch (error) {
			// Log but don't fail store creation if product creation fails
			logger.error(
				"Failed to create credit recharge product during store creation",
				{
					metadata: {
						storeId: databaseId,
						error: error instanceof Error ? error.message : String(error),
					},
					tags: ["store", "product", "credit", "error"],
				},
			);
		}

		return { storeId: databaseId };
	});
