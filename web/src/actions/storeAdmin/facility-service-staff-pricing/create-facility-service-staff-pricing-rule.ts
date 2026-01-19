"use server";

import { mapFacilityServiceStaffPricingRuleToColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/facility/service-staff-pricing/facility-service-staff-pricing-rule-column";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

import { createFacilityServiceStaffPricingRuleSchema } from "./create-facility-service-staff-pricing-rule.validation";

export const createFacilityServiceStaffPricingRuleAction = storeActionClient
	.metadata({ name: "createFacilityServiceStaffPricingRule" })
	.schema(createFacilityServiceStaffPricingRuleSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const {
			facilityId,
			serviceStaffId,
			facilityDiscount,
			serviceStaffDiscount,
			priority,
			isActive,
		} = parsedInput;

		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { id: true },
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		// If facilityId is provided, verify it exists and belongs to the store
		if (facilityId) {
			const facility = await sqlClient.storeFacility.findUnique({
				where: { id: facilityId },
				select: { id: true, storeId: true },
			});

			if (!facility || facility.storeId !== storeId) {
				throw new SafeError("Facility not found or does not belong to store");
			}
		}

		// If serviceStaffId is provided, verify it exists and belongs to the store
		if (serviceStaffId) {
			const serviceStaff = await sqlClient.serviceStaff.findUnique({
				where: { id: serviceStaffId },
				select: { id: true, storeId: true },
			});

			if (!serviceStaff || serviceStaff.storeId !== storeId) {
				throw new SafeError(
					"Service staff not found or does not belong to store",
				);
			}
		}

		try {
			const rule = await sqlClient.facilityServiceStaffPricingRule.create({
				data: {
					storeId,
					facilityId: facilityId || null,
					serviceStaffId: serviceStaffId || null,
					facilityDiscount: new Prisma.Decimal(facilityDiscount),
					serviceStaffDiscount: new Prisma.Decimal(serviceStaffDiscount),
					priority,
					isActive,
					createdAt: getUtcNowEpoch(),
					updatedAt: getUtcNowEpoch(),
				},
				include: {
					Facility: {
						select: {
							facilityName: true,
						},
					},
					ServiceStaff: {
						select: {
							User: {
								select: {
									name: true,
								},
							},
						},
					},
				},
			});

			return {
				rule: mapFacilityServiceStaffPricingRuleToColumn(rule),
			};
		} catch (error: unknown) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				throw new SafeError("Pricing rule already exists.");
			}

			throw error;
		}
	});
