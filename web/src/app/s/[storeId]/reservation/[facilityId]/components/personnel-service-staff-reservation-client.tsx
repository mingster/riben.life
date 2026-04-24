"use client";

import type { StoreFacility } from "@/types";
import {
	ReservationFlowClient,
	type ReservationFlowClientProps,
} from "./reservation-flow-client";

/** Personnel-mode RSVP from `/reservation/service-staff/[serviceStaffId]` (`RsvpMode.PERSONNEL`). */
export type PersonnelServiceStaffReservationClientProps = Omit<
	ReservationFlowClientProps,
	| "omitFacilityOnSubmit"
	| "prefilledServiceStaffId"
	| "facilitiesForPersonnelPicker"
> & {
	prefilledServiceStaffId: string;
	facilitiesForPersonnelPicker?: StoreFacility[];
};

export function PersonnelServiceStaffReservationClient(
	props: PersonnelServiceStaffReservationClientProps,
) {
	const {
		prefilledServiceStaffId,
		facilitiesForPersonnelPicker = [],
		...rest
	} = props;
	return (
		<ReservationFlowClient
			{...rest}
			omitFacilityOnSubmit
			prefilledServiceStaffId={prefilledServiceStaffId}
			facilitiesForPersonnelPicker={facilitiesForPersonnelPicker}
		/>
	);
}
