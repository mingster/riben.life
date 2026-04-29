"use client";

import { useCallback, useState } from "react";

import { IconPlus } from "@tabler/icons-react";
import { useTranslation } from "@/app/i18n/client";
import { DisplayReservations } from "@/components/display-reservations";
import { Button } from "@/components/ui/button";
import type { CustomSessionUser } from "@/lib/auth";
import { useI18n } from "@/providers/i18n-provider";
import type {
	Rsvp,
	RsvpSettings,
	StoreFacility,
	StoreSettings,
	User,
} from "@/types";
import { toBigIntEpochUnknown } from "@/utils/datetime-utils";
import { AdminEditRsvpDialog } from "./admin-edit-rsvp-dialog";
import Link from "next/link";

interface Props {
	storeId: string;
	initialRsvps: Rsvp[];
	rsvpSettings: RsvpSettings | null;
	storeSettings: StoreSettings | null;
	facilities: StoreFacility[];
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
	user,
	storeTimezone,
	storeCurrency,
	storeUseBusinessHours,
	useCustomerCredit,
	creditExchangeRate,
	creditServiceExchangeRate,
}: Props) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
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
			<div className="flex items-center justify-end gap-2">
				<Button
					asChild
					variant="outline"
					className="h-10 touch-manipulation sm:h-9"
				>
					<Link href={`/storeAdmin/${storeId}/rsvp`}>
						{t("rsvp_week_view") || "Week View"}
					</Link>
				</Button>
				<AdminEditRsvpDialog
					storeId={storeId}
					rsvpSettings={rsvpSettings}
					storeSettings={storeSettings}
					existingReservations={reservations}
					storeTimezone={storeTimezone}
					storeCurrency={storeCurrency}
					storeUseBusinessHours={storeUseBusinessHours}
					onReservationCreated={handleReservationCreated}
					trigger={
						<Button className="h-10 touch-manipulation sm:h-9">
							<IconPlus className="mr-2 h-4 w-4" />
							{t("create_reservation") || "Create reservation"}
						</Button>
					}
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
