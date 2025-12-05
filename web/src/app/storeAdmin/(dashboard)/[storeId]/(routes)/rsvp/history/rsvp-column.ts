import type { Rsvp } from "@prisma/client";
import { epochToDate } from "@/utils/datetime-utils";

export interface RsvpColumn {
	id: string;
	storeId: string;
	customerId: string | null;
	facilityId: string | null;
	numOfAdult: number;
	numOfChild: number;
	rsvpTime: Date;
	arriveTime: Date | null;
	status: number;
	message: string | null;
	alreadyPaid: boolean;
	confirmedByStore: boolean;
	confirmedByCustomer: boolean;
	facilityCost: number | null;
	facilityCredit: number | null;
	pricingRuleId: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export const mapRsvpToColumn = (rsvp: Rsvp): RsvpColumn => ({
	id: rsvp.id,
	storeId: rsvp.storeId,
	customerId: rsvp.customerId,
	facilityId: rsvp.facilityId,
	numOfAdult: rsvp.numOfAdult,
	numOfChild: rsvp.numOfChild,
	rsvpTime: epochToDate(rsvp.rsvpTime) ?? new Date(),
	arriveTime: rsvp.arriveTime ? epochToDate(rsvp.arriveTime) : null,
	status: rsvp.status,
	message: rsvp.message,
	alreadyPaid: rsvp.alreadyPaid,
	confirmedByStore: rsvp.confirmedByStore,
	confirmedByCustomer: rsvp.confirmedByCustomer,
	facilityCost: rsvp.facilityCost?.toNumber() ?? null,
	facilityCredit: rsvp.facilityCredit?.toNumber() ?? null,
	pricingRuleId: rsvp.pricingRuleId,
	createdAt: epochToDate(rsvp.createdAt) ?? new Date(),
	updatedAt: epochToDate(rsvp.updatedAt) ?? new Date(),
});
