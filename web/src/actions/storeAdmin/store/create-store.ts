"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { sqlClient } from "@/lib/prismadb";
import { StoreLevel } from "@/types/enum";
import logger from "@/lib/logger";
import { auth, Session } from "@/lib/auth";
import { headers } from "next/headers";
import { getUtcNow } from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";
import { userRequiredActionClient } from "@/utils/actions/safe-action";
import { createStoreSchema } from "./create-store.validation";
import fs from "node:fs";

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

		// Create organization BEFORE creating store
		let organization;
		try {
			const headersList = await headers();

			organization = await auth.api.createOrganization({
				headers: headersList,
				body: {
					name: name, // Use original name for organization display name
					slug: name,
					keepCurrentActiveOrganization: true,
				},
			});

			if (!organization || !organization.id) {
				throw new SafeError("Failed to create organization");
			}
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
						role: "owner",
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
			},
		});

		return { storeId: databaseId };
	});
