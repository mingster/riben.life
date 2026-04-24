"use client";

import {
	ReservationFlowClient,
	type ReservationFlowClientProps,
} from "./reservation-flow-client";

/** Facility-mode RSVP (`RsvpMode.FACILITY`): `/reservation/[facilityId]`, LIFF facility booking. */
export type FacilityModeReservationClientProps = Omit<
	ReservationFlowClientProps,
	| "omitFacilityOnSubmit"
	| "storeLabelForHeader"
	| "prefilledServiceStaffId"
	| "facilitiesForPersonnelPicker"
>;

export function FacilityModeReservationClient(
	props: FacilityModeReservationClientProps,
) {
	return (
		<ReservationFlowClient
			{...props}
			omitFacilityOnSubmit={false}
			storeLabelForHeader={undefined}
			prefilledServiceStaffId={null}
			facilitiesForPersonnelPicker={[]}
		/>
	);
}
