"use client";

import {
	ReservationFlowClient,
	type ReservationFlowClientProps,
} from "./reservation-flow-client";

/** Restaurant-mode RSVP (`RsvpMode.RESTAURANT`): `/reservation/open`. */
export type RestaurantModeReservationClientProps = Omit<
	ReservationFlowClientProps,
	| "omitFacilityOnSubmit"
	| "prefilledServiceStaffId"
	| "facilitiesForPersonnelPicker"
>;

export function RestaurantModeReservationClient(
	props: RestaurantModeReservationClientProps,
) {
	return (
		<ReservationFlowClient
			{...props}
			omitFacilityOnSubmit
			prefilledServiceStaffId={null}
			facilitiesForPersonnelPicker={[]}
		/>
	);
}
