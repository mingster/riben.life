"use client";

import { IconEdit } from "@tabler/icons-react";
import { format } from "date-fns";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cancelReservationAction } from "@/actions/store/reservation/cancel-reservation";
import { listMyRsvpsForStoreAction } from "@/actions/store/reservation/list-my-rsvps-for-store";
import { useTranslation } from "@/app/i18n/client";
import { ReservationDialog } from "@/app/s/[storeId]/reservation/components/reservation-dialog";
import { RsvpCancelDeleteDialog } from "@/app/s/[storeId]/reservation/components/rsvp-cancel-delete-dialog";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { CustomSessionUser } from "@/lib/auth";
import { useI18n } from "@/providers/i18n-provider";
import type {
	Rsvp,
	RsvpSettings,
	StoreFacility,
	StoreSettings,
	User,
} from "@/types";
import { RsvpStatus } from "@/types/enum";
import {
	epochToDate,
	getDateInTz,
	getOffsetHours,
} from "@/utils/datetime-utils";

interface ReservationHistoryClientProps {
	storeId: string;
	storeName: string;
	rsvpSettings: RsvpSettings | null;
	storeSettings: StoreSettings | null;
	facilities: StoreFacility[];
	/** Session user for edit dialog (null if anonymous). */
	user: User | CustomSessionUser | null;
	storeTimezone: string;
	storeCurrency: string;
	storeUseBusinessHours: boolean | null;
	useCustomerCredit: boolean;
	creditExchangeRate: number | null;
	creditServiceExchangeRate: number | null;
}

export function ReservationHistoryClient({
	storeId,
	storeName,
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
}: ReservationHistoryClientProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [rows, setRows] = useState<Rsvp[]>([]);
	const [loading, setLoading] = useState(true);
	const [unauthorized, setUnauthorized] = useState(false);
	const [editRsvp, setEditRsvp] = useState<Rsvp | null>(null);
	const [cancelRsvp, setCancelRsvp] = useState<Rsvp | null>(null);
	const [cancelLoading, setCancelLoading] = useState(false);

	const offsetHours = useMemo(
		() => getOffsetHours(storeTimezone),
		[storeTimezone],
	);

	const load = useCallback(async () => {
		setLoading(true);
		const result = await listMyRsvpsForStoreAction({ storeId });
		if (result?.serverError) {
			if (String(result.serverError).includes("Unauthorized")) {
				setUnauthorized(true);
				setRows([]);
			} else {
				toastError({ description: result.serverError });
			}
			setLoading(false);
			return;
		}
		setUnauthorized(false);
		const list = (result?.data?.rsvps ?? []) as Rsvp[];
		setRows(list);
		setLoading(false);
	}, [storeId]);

	useEffect(() => {
		void load();
	}, [load]);

	const formatRsvpTime = useCallback(
		(epoch: unknown) => {
			if (epoch == null) return "—";
			let asBig: bigint;
			if (typeof epoch === "bigint") {
				asBig = epoch;
			} else {
				const n = Number(epoch);
				if (Number.isNaN(n)) return "—";
				asBig = BigInt(Math.trunc(n));
			}
			const d = epochToDate(asBig);
			if (!d) return "—";
			const inTz = getDateInTz(d, offsetHours);
			return format(inTz, "yyyy-MM-dd HH:mm");
		},
		[offsetHours],
	);

	const onCancelConfirm = async () => {
		if (!cancelRsvp) return;
		setCancelLoading(true);
		try {
			const result = await cancelReservationAction({
				id: cancelRsvp.id,
				storeId,
			});
			if (result?.serverError) {
				toastError({ description: result.serverError });
				return;
			}
			toastSuccess({
				description: t("rsvp_cancel_reservation_success") || "Cancelled",
			});
			setCancelRsvp(null);
			await load();
		} finally {
			setCancelLoading(false);
		}
	};

	const statusLabel = (status: number) => {
		switch (status) {
			case RsvpStatus.Pending:
				return t("rsvp_status_pending") || "Pending";
			case RsvpStatus.ReadyToConfirm:
				return t("rsvp_status_ready_to_confirm") || "Ready to confirm";
			case RsvpStatus.Ready:
				return t("rsvp_status_ready") || "Confirmed";
			case RsvpStatus.Completed:
				return t("rsvp_status_completed") || "Completed";
			case RsvpStatus.NoShow:
				return t("rsvp_status_no_show") || "No show";
			default:
				return String(status);
		}
	};

	if (loading) {
		return (
			<div className="mx-auto max-w-3xl px-3 py-12 text-center text-sm text-muted-foreground sm:px-4">
				{t("loading") || "Loading…"}
			</div>
		);
	}

	if (unauthorized) {
		return (
			<div className="mx-auto max-w-lg space-y-4 px-3 py-12 sm:px-4">
				<h1 className="font-serif text-xl font-light">
					{t("s_reservation_history_sign_in_title") || "Sign in required"}
				</h1>
				<p className="text-sm text-muted-foreground">
					{t("s_reservation_history_sign_in_body") ||
						"Sign in to view your reservations for this store."}
				</p>
				<Button asChild>
					<Link href={`/signIn?callbackUrl=/s/${storeId}/reservation/history`}>
						{t("sign_in") || "Sign in"}
					</Link>
				</Button>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-3xl space-y-6 px-3 py-8 sm:px-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-serif text-2xl font-light tracking-tight">
						{t("s_reservation_my_reservations") || "My reservations"}
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">{storeName}</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button variant="outline" size="sm" asChild>
						<Link href={`/s/${storeId}/reservation`}>
							{t("create_reservation") || "New reservation"}
						</Link>
					</Button>
					<Button variant="outline" size="sm" asChild>
						<Link href={`/shop/${storeId}`}>
							{t("s_reservation_back_to_shop") || "Shop"}
						</Link>
					</Button>
				</div>
			</div>

			{rows.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					{t("s_reservation_history_empty") || "No reservations yet."}
				</p>
			) : (
				<ul className="space-y-3">
					{rows.map((r) => (
						<li key={r.id}>
							<Card>
								<CardHeader className="pb-2">
									<CardTitle className="text-base">
										{formatRsvpTime(r.rsvpTime)}
									</CardTitle>
									<CardDescription>
										{r.Facility?.facilityName ?? "—"} · {statusLabel(r.status)}
									</CardDescription>
								</CardHeader>
								<CardContent className="flex flex-wrap gap-2">
									{r.status !== RsvpStatus.Cancelled &&
										r.status !== RsvpStatus.Completed &&
										r.status !== RsvpStatus.NoShow && (
											<>
												<Button
													type="button"
													size="sm"
													variant="outline"
													onClick={() => setEditRsvp(r)}
												>
													<IconEdit className="mr-1 size-4" />
													{t("edit") || "Edit"}
												</Button>
												<Button
													type="button"
													size="sm"
													variant="destructive"
													onClick={() => setCancelRsvp(r)}
												>
													{r.status === RsvpStatus.Pending ||
													r.status === RsvpStatus.ReadyToConfirm
														? t("rsvp_delete_reservation") || "Delete"
														: t("rsvp_cancel_reservation") || "Cancel"}
												</Button>
											</>
										)}
								</CardContent>
							</Card>
						</li>
					))}
				</ul>
			)}

			{editRsvp && (
				<ReservationDialog
					storeId={storeId}
					rsvpSettings={rsvpSettings}
					storeSettings={storeSettings}
					facilities={facilities}
					user={user}
					rsvp={editRsvp}
					existingReservations={rows}
					storeTimezone={storeTimezone}
					storeCurrency={storeCurrency}
					storeUseBusinessHours={storeUseBusinessHours}
					open={Boolean(editRsvp)}
					onOpenChange={(open) => {
						if (!open) setEditRsvp(null);
					}}
					useCustomerCredit={useCustomerCredit}
					creditExchangeRate={creditExchangeRate}
					creditServiceExchangeRate={creditServiceExchangeRate}
					onReservationUpdated={() => {
						setEditRsvp(null);
						void load();
					}}
				/>
			)}

			<RsvpCancelDeleteDialog
				open={Boolean(cancelRsvp)}
				onOpenChange={(open) => {
					if (!open) setCancelRsvp(null);
				}}
				reservation={cancelRsvp}
				rsvpSettings={rsvpSettings}
				storeCurrency={storeCurrency}
				useCustomerCredit={useCustomerCredit}
				creditExchangeRate={creditExchangeRate}
				t={t}
				onConfirm={onCancelConfirm}
				isLoading={cancelLoading}
			/>
		</div>
	);
}
