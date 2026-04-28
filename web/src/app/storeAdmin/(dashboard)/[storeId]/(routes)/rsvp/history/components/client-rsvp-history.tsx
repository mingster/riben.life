"use client";

import { useCallback, useState } from "react";

import { DisplayReservations } from "@/components/display-reservations";
import type { CustomSessionUser } from "@/lib/auth";
import type {
	Rsvp,
	RsvpSettings,
	StoreFacility,
	StoreSettings,
	User,
} from "@/types";
import { toBigIntEpochUnknown } from "@/utils/datetime-utils";
import { CreateRsvpDialog } from "./create-rsvp-dialog";

interface Props {
	storeId: string;
	initialRsvps: Rsvp[];
	rsvpSettings: RsvpSettings | null;
	storeSettings: StoreSettings | null;
	facilities: StoreFacility[];
	customers: User[];
	serviceStaff: Array<{
		id: string;
		defaultCost: number | null;
		User?: {
			name: string | null;
			email: string | null;
		} | null;
	}>;
	user: User | CustomSessionUser | null;
	storeTimezone: string;
	storeCurrency: string;
	storeUseBusinessHours: boolean | null;
	useCustomerCredit: boolean;
	creditExchangeRate: number | null;
	creditServiceExchangeRate: number | null;
}

export function ClientRsvpHistory({
	storeId,
	initialRsvps,
	rsvpSettings,
	storeSettings,
	facilities,
	customers,
	serviceStaff,
	user,
	storeTimezone,
	storeCurrency,
	storeUseBusinessHours,
	useCustomerCredit,
	creditExchangeRate,
	creditServiceExchangeRate,
}: Props) {
	const [reservations, setReservations] = useState<Rsvp[]>(initialRsvps);

	const handleReservationUpdated = useCallback((updated: Rsvp) => {
		const normalized = {
			...updated,
			rsvpTime: toBigIntEpochUnknown(updated.rsvpTime) ?? BigInt(0),
			createdAt: toBigIntEpochUnknown(updated.createdAt) ?? BigInt(0),
			updatedAt: toBigIntEpochUnknown(updated.updatedAt) ?? BigInt(0),
		};
		setReservations((prev) =>
			prev.map((r) => (r.id === normalized.id ? (normalized as Rsvp) : r)),
		);
	}, []);

	const handleReservationCreated = useCallback((created: Rsvp) => {
		const normalized = {
			...created,
			rsvpTime: toBigIntEpochUnknown(created.rsvpTime) ?? BigInt(0),
			createdAt: toBigIntEpochUnknown(created.createdAt) ?? BigInt(0),
			updatedAt: toBigIntEpochUnknown(created.updatedAt) ?? BigInt(0),
		};
		setReservations((prev) => [normalized as Rsvp, ...prev]);
	}, []);

	const handleReservationDeleted = useCallback((id: string) => {
		setReservations((prev) => prev.filter((r) => r.id !== id));
	}, []);

	return (
		<div className="space-y-3 sm:space-y-4">
			<div className="flex justify-end">
				<CreateRsvpDialog
					storeId={storeId}
					customers={customers}
					facilities={facilities}
					serviceStaff={serviceStaff}
					rsvpMode={rsvpSettings?.rsvpMode ?? 0}
					storeTimezone={storeTimezone}
					onCreated={handleReservationCreated}
				/>
			</div>
			<DisplayReservations
				reservations={reservations}
				user={user}
				storeId={storeId}
				storeTimezone={storeTimezone}
				rsvpSettings={rsvpSettings}
				storeSettings={storeSettings}
				facilities={facilities}
				storeCurrency={storeCurrency}
				useCustomerCredit={useCustomerCredit}
				creditExchangeRate={creditExchangeRate}
				creditServiceExchangeRate={creditServiceExchangeRate}
				showStatusFilter
				showHeading
				showCheckout={false}
				onReservationUpdated={handleReservationUpdated}
				onReservationDeleted={handleReservationDeleted}
				hideActions={false}
				showCalendarExport={false}
				storeAdminList
			/>
		</div>
	);
}
