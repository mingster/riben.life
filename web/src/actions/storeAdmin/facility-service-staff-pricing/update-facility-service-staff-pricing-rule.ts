"use server";

import { mapFacilityServiceStaffPricingRuleToColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/facility/service-staff-pricing/facility-service-staff-pricing-rule-column";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { updateFacilityServiceStaffPricingRuleSchema } from "./update-facility-service-staff-pricing-rule.validation";

export const updateFacilityServiceStaffPricingRuleAction = storeActionClient
	.metadata({ name: "updateFacilityServiceStaffPricingRule" })
	.schema(updateFacilityServiceStaffPricingRuleSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const {
			id,
			facilityId,
			serviceStaffId,
			facilityDiscount,
			serviceStaffDiscount,
			priority,
			isActive,
		} = parsedInput;

		const rule = await sqlClient.facilityServiceStaffPricingRule.findUnique({
			where: { id },
			select: { id: true, storeId: true },
		});

		if (!rule || rule.storeId !== storeId) {
			throw new SafeError("Pricing rule not found");
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
			const updated = await sqlClient.facilityServiceStaffPricingRule.update({
				where: { id },
				data: {
					facilityId: facilityId || null,
					serviceStaffId: serviceStaffId || null,
					facilityDiscount: new Prisma.Decimal(facilityDiscount),
					serviceStaffDiscount: new Prisma.Decimal(serviceStaffDiscount),
					priority,
					isActive,
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
				rule: mapFacilityServiceStaffPricingRuleToColumn(updated),
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
