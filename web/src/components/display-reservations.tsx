// display given reservations in a table

"use client";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import type { Rsvp, User } from "@/types";
import { RsvpStatus } from "@/types/enum";
import { format } from "date-fns";
import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
	getDateInTz,
	getOffsetHours,
	epochToDate,
} from "@/utils/datetime-utils";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cancelReservationAction } from "@/actions/store/reservation/cancel-reservation";
import { deleteReservationAction } from "@/actions/store/reservation/delete-reservation";
import { getStoreDataAction } from "@/actions/store/reservation/get-store-data";
import { getRsvpSettingsAction } from "@/actions/store/reservation/get-rsvp-settings";
import { toastError, toastSuccess } from "@/components/toaster";
import { EditReservationDialog } from "@/app/(store)/[storeId]/reservation/components/edit-reservation-dialog";
import type { StoreFacility, RsvpSettings, StoreSettings } from "@/types";
import { getUtcNow } from "@/utils/datetime-utils";

export const DisplayReservations = ({
	reservations,
	user,
}: {
	reservations: Rsvp[];
	user?: User | null;
}) => {
	if (!reservations || reservations.length === 0) return null;

	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
	const [reservationToCancel, setReservationToCancel] = useState<Rsvp | null>(
		null,
	);
	const [isCancelling, setIsCancelling] = useState(false);
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [reservationToEdit, setReservationToEdit] = useState<Rsvp | null>(null);
	const [storeData, setStoreData] = useState<{
		rsvpSettings: RsvpSettings | null;
		storeSettings: StoreSettings | null;
		facilities: StoreFacility[];
	} | null>(null);
	const [isLoadingStoreData, setIsLoadingStoreData] = useState(false);
	const [rsvpSettingsCache, setRsvpSettingsCache] = useState<
		Map<string, RsvpSettings | null>
	>(new Map());

	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const datetimeFormat = useMemo(() => t("datetime_format"), [t]);

	// Sort reservations by rsvpTime (ascending - earliest first)
	const sortedReservations = useMemo(() => {
		return [...reservations].sort((a, b) => {
			// Helper to convert rsvpTime to number (epoch milliseconds)
			const getRsvpTimeValue = (rsvp: Rsvp): number => {
				if (typeof rsvp.rsvpTime === "bigint") {
					return Number(rsvp.rsvpTime);
				}
				if (typeof rsvp.rsvpTime === "number") {
					return rsvp.rsvpTime;
				}
				if (rsvp.rsvpTime instanceof Date) {
					return rsvp.rsvpTime.getTime();
				}
				return 0;
			};

			const timeA = getRsvpTimeValue(a);
			const timeB = getRsvpTimeValue(b);
			return timeA - timeB;
		});
	}, [reservations]);

	// Check if reservation belongs to current user
	const isUserReservation = (rsvp: Rsvp): boolean => {
		if (!user) return false;
		if (user.id && rsvp.customerId) {
			return user.id === rsvp.customerId;
		}
		if (user.email && rsvp.Customer?.email) {
			return user.email === rsvp.Customer.email;
		}
		return false;
	};

	// Check if reservation can be edited/cancelled
	//Edit button only appears if:
	//Reservation belongs to the current user
	//Reservation status is Pending or alreadyPaid is true
	//canCancel is enabled in rsvpSettings
	//Reservation is more than cancelHours away from now
	const canEditReservation = (rsvp: Rsvp): boolean => {
		if (!isUserReservation(rsvp)) {
			return false;
		}

		// Only allow edit for Pending status or if alreadyPaid
		if (rsvp.status !== RsvpStatus.Pending && !rsvp.alreadyPaid) {
			return false;
		}

		if (!rsvp.Store?.id) {
			return false;
		}

		// Get RsvpSettings from cache
		const rsvpSettings = rsvpSettingsCache.get(rsvp.Store.id);

		// If not cached yet, assume editing is not allowed (will be updated when cache is populated)
		if (rsvpSettings === undefined) {
			return false;
		}

		// Check if canCancel is enabled - if cancellation is disabled, editing is also disabled
		if (!rsvpSettings.canCancel) {
			return false;
		}

		// Check cancelHours window - don't allow editing if within the cancellation window
		const cancelHours = rsvpSettings.cancelHours ?? 24;
		const now = getUtcNow();
		const rsvpTimeDate = epochToDate(
			typeof rsvp.rsvpTime === "number"
				? BigInt(rsvp.rsvpTime)
				: rsvp.rsvpTime instanceof Date
					? BigInt(rsvp.rsvpTime.getTime())
					: rsvp.rsvpTime,
		);

		if (!rsvpTimeDate) {
			return false;
		}

		// Calculate hours until reservation
		const hoursUntilReservation =
			(rsvpTimeDate.getTime() - now.getTime()) / (1000 * 60 * 60);

		// Can edit if reservation is more than cancelHours away
		return hoursUntilReservation >= cancelHours;
	};

	// Pre-fetch RsvpSettings for all unique stores
	useEffect(() => {
		const uniqueStoreIds = [
			...new Set(
				reservations
					.map((r) => r.Store?.id)
					.filter((id): id is string => Boolean(id)),
			),
		];

		const fetchAllRsvpSettings = async () => {
			const promises = uniqueStoreIds.map(async (storeId) => {
				// Check cache using functional update to avoid stale closure
				let shouldFetch = false;
				setRsvpSettingsCache((prev) => {
					if (prev.has(storeId)) {
						return prev; // Already cached
					}
					shouldFetch = true;
					return prev;
				});

				if (!shouldFetch) {
					return;
				}

				try {
					const result = await getRsvpSettingsAction({ storeId });
					if (
						!result?.serverError &&
						result?.data?.rsvpSettings !== undefined
					) {
						setRsvpSettingsCache((prev) => {
							// Check again in case another request already cached it
							if (prev.has(storeId)) {
								return prev;
							}
							const newMap = new Map(prev);
							newMap.set(storeId, result.data!.rsvpSettings);
							return newMap;
						});
					}
				} catch (error) {
					// Silently fail - will default to not allowing cancellation
					console.error(
						`Failed to fetch RsvpSettings for store ${storeId}:`,
						error,
					);
				}
			});

			await Promise.all(promises);
		};

		if (uniqueStoreIds.length > 0) {
			fetchAllRsvpSettings();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [reservations]);

	// Check if reservation can be cancelled/deleted based on rsvpSettings
	//Cancel/Delete button only appears if:
	//All the same conditions as edit, plus: canCancel is enabled in rsvpSettings
	//Both buttons are hidden if the reservation is within the cancelHours window, preventing last-minute changes.
	const canCancelReservation = (rsvp: Rsvp): boolean => {
		if (!isUserReservation(rsvp)) {
			return false;
		}

		// Only allow cancel/delete for Pending status or if alreadyPaid
		if (rsvp.status !== RsvpStatus.Pending && !rsvp.alreadyPaid) {
			return false;
		}

		if (!rsvp.Store?.id) {
			return false;
		}

		// Get RsvpSettings from cache
		const rsvpSettings = rsvpSettingsCache.get(rsvp.Store.id);

		// If not cached yet, assume cancellation is not allowed (will be updated when cache is populated)
		if (rsvpSettings === undefined) {
			return false;
		}

		// Check if canCancel is enabled
		if (!rsvpSettings?.canCancel) {
			return false;
		}

		// Check cancelHours window
		const cancelHours = rsvpSettings.cancelHours ?? 24;
		const now = getUtcNow();
		const rsvpTimeDate = epochToDate(
			typeof rsvp.rsvpTime === "number"
				? BigInt(rsvp.rsvpTime)
				: rsvp.rsvpTime instanceof Date
					? BigInt(rsvp.rsvpTime.getTime())
					: rsvp.rsvpTime,
		);

		if (!rsvpTimeDate) {
			return false;
		}

		// Calculate hours until reservation
		const hoursUntilReservation =
			(rsvpTimeDate.getTime() - now.getTime()) / (1000 * 60 * 60);

		// Can cancel if reservation is more than cancelHours away
		return hoursUntilReservation >= cancelHours;
	};

	const handleCancelClick = (rsvp: Rsvp) => {
		setReservationToCancel(rsvp);
		setCancelDialogOpen(true);
	};

	const handleCancelConfirm = async () => {
		if (!reservationToCancel) return;

		setIsCancelling(true);
		try {
			// If status is Pending, delete it (hard delete)
			// Otherwise, cancel it (change status to Cancelled)
			if (reservationToCancel.status === RsvpStatus.Pending) {
				const result = await deleteReservationAction({
					id: reservationToCancel.id,
				});

				if (result?.serverError) {
					toastError({
						title: t("Error"),
						description: result.serverError,
					});
				} else {
					toastSuccess({
						description: t("reservation_deleted"),
					});
					// Refresh the page to show updated data
					if (typeof window !== "undefined") {
						window.location.reload();
					}
				}
			} else {
				const result = await cancelReservationAction({
					id: reservationToCancel.id,
				});

				if (result?.serverError) {
					toastError({
						title: t("Error"),
						description: result.serverError,
					});
				} else {
					toastSuccess({
						description: t("reservation_cancelled"),
					});
					// Refresh the page to show updated data
					if (typeof window !== "undefined") {
						window.location.reload();
					}
				}
			}
		} catch (error) {
			toastError({
				title: t("Error"),
				description: error instanceof Error ? error.message : String(error),
			});
		} finally {
			setIsCancelling(false);
			setCancelDialogOpen(false);
			setReservationToCancel(null);
		}
	};

	const handleEditClick = async (rsvp: Rsvp) => {
		if (!rsvp.Store?.id) return;

		setIsLoadingStoreData(true);
		try {
			const result = await getStoreDataAction({ storeId: rsvp.Store.id });
			if (result?.serverError) {
				toastError({
					title: t("Error"),
					description: result.serverError,
				});
				return;
			}

			if (result?.data) {
				setStoreData({
					rsvpSettings: result.data.rsvpSettings,
					storeSettings: result.data.storeSettings,
					facilities: result.data.facilities,
				});
				setReservationToEdit(rsvp);
				setEditDialogOpen(true);
			}
		} catch (error) {
			toastError({
				title: t("Error"),
				description: error instanceof Error ? error.message : String(error),
			});
		} finally {
			setIsLoadingStoreData(false);
		}
	};

	const handleReservationUpdated = (updatedRsvp: Rsvp) => {
		setEditDialogOpen(false);
		setReservationToEdit(null);
		setStoreData(null);
		// Refresh the page to show updated data
		if (typeof window !== "undefined") {
			window.location.reload();
		}
	};

	//console.log("reservations", reservations.map((r) => r.rsvpTime));

	return (
		<div className="space-y-3 sm:space-y-4">
			{/* Mobile: Card view */}
			<div className="block sm:hidden space-y-3">
				{sortedReservations.map((item) => (
					<div
						key={item.id}
						className="rounded-lg border bg-card p-3 space-y-2 text-xs"
					>
						<div className="flex items-start justify-between gap-2">
							<div className="flex-1 min-w-0">
								<div className="font-medium text-sm truncate">
									{item.Store?.id ? (
										<Link
											href={`/${item.Store.id}/reservation`}
											className="hover:underline text-primary"
										>
											{item.Store.name}
										</Link>
									) : (
										item.Store?.name
									)}
								</div>
								<div className="text-muted-foreground text-[10px]">
									{format(
										getDateInTz(
											epochToDate(
												typeof item.rsvpTime === "number"
													? BigInt(item.rsvpTime)
													: item.rsvpTime instanceof Date
														? BigInt(item.rsvpTime.getTime())
														: item.rsvpTime,
											) ?? new Date(),
											getOffsetHours(
												item.Store?.defaultTimezone ?? "Asia/Taipei",
											),
										),
										`${datetimeFormat} HH:mm`,
									)}
								</div>
							</div>
							<div className="shrink-0">
								<span
									className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-medium ${
										item.status === 0
											? "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400"
											: item.alreadyPaid
												? "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400"
												: item.confirmedByStore || item.confirmedByCustomer
													? "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400"
													: item.status === 40 || item.status === 50
														? "bg-gray-50 text-gray-700 dark:bg-gray-950/20 dark:text-gray-400"
														: item.status === 60
															? "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400"
															: "bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400"
									}`}
								>
									{t(`rsvp_status_${item.status}`)}
								</span>
							</div>
						</div>

						{item.Facility?.facilityName && (
							<div className="text-[10px] text-muted-foreground">
								<span className="font-medium">{t("rsvp_facility")}:</span>
								{item.Facility.facilityName}
							</div>
						)}

						{item.message && (
							<div className="text-[10px]">
								<span className="font-medium text-muted-foreground">
									{t("rsvp_message")}:
								</span>
								<span className="text-foreground">{item.message}</span>
							</div>
						)}

						{item.CreatedBy?.name && (
							<div className="text-[10px] text-muted-foreground">
								<span className="font-medium">{t("rsvp_creator")}:</span>
								{item.CreatedBy?.name}
							</div>
						)}

						<div className="flex items-center justify-between pt-1 border-t">
							<div className="text-[10px] text-muted-foreground">
								{format(
									getDateInTz(
										epochToDate(
											typeof item.createdAt === "number"
												? BigInt(item.createdAt)
												: item.createdAt instanceof Date
													? BigInt(item.createdAt.getTime())
													: item.createdAt,
										) ?? new Date(),
										getOffsetHours(
											item.Store?.defaultTimezone ?? "Asia/Taipei",
										),
									),
									datetimeFormat,
								)}
							</div>
							{canEditReservation(item) && (
								<div className="flex items-center gap-1">
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8 min-h-[44px] min-w-[44px] sm:h-7 sm:w-7 sm:min-h-0 sm:min-w-0"
										onClick={() => handleEditClick(item)}
										title={t("edit_reservation")}
										disabled={isLoadingStoreData}
									>
										<IconEdit className="h-4 w-4" />
									</Button>
									{canCancelReservation(item) && (
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8 min-h-[44px] min-w-[44px] sm:h-7 sm:w-7 sm:min-h-0 sm:min-w-0 text-destructive hover:text-destructive"
											onClick={() => handleCancelClick(item)}
											title={
												item.status === RsvpStatus.Pending
													? t("rsvp_delete_reservation")
													: t("rsvp_cancel_reservation")
											}
										>
											<IconTrash className="h-4 w-4" />
										</Button>
									)}
								</div>
							)}
						</div>
					</div>
				))}
			</div>

			{/* Desktop: Table view */}
			<div className="hidden sm:block rounded-md border overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full border-collapse min-w-full">
						<thead>
							<tr className="bg-muted/50">
								<th className="text-left px-3 py-2 text-xs font-medium">
									{t("rsvp_time")}
								</th>
								<th className="text-left px-3 py-2 text-xs font-medium">
									{t("rsvp_status")}
								</th>
								<th className="text-left px-3 py-2 text-xs font-medium">
									{t("store_name")}
								</th>
								<th className="text-left px-3 py-2 text-xs font-medium">
									{t("rsvp_facility")}
								</th>
								<th className="text-left px-3 py-2 text-xs font-medium">
									{t("rsvp_message")}
								</th>
								<th className="text-left px-3 py-2 text-xs font-medium">
									{t("rsvp_creator")}
								</th>
								<th className="text-left px-3 py-2 text-xs font-medium">
									{t("created_at")}
								</th>
								<th className="text-left px-3 py-2 text-xs font-medium">
									{t("actions")}
								</th>
							</tr>
						</thead>
						<tbody>
							{sortedReservations.map((item) => (
								<tr key={item.id} className="border-b last:border-b-0">
									<td className="px-3 py-2 text-xs font-mono">
										{format(
											getDateInTz(
												epochToDate(
													typeof item.rsvpTime === "number"
														? BigInt(item.rsvpTime)
														: item.rsvpTime instanceof Date
															? BigInt(item.rsvpTime.getTime())
															: item.rsvpTime,
												) ?? new Date(),
												getOffsetHours(
													item.Store?.defaultTimezone ?? "Asia/Taipei",
												),
											),
											`${datetimeFormat} HH:mm`,
										)}
									</td>
									<td className="px-3 py-2 text-xs">
										<span
											className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-medium ${
												item.status === 0
													? "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400"
													: item.alreadyPaid
														? "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400"
														: item.confirmedByStore || item.confirmedByCustomer
															? "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400"
															: item.status === 40 || item.status === 50
																? "bg-gray-50 text-gray-700 dark:bg-gray-950/20 dark:text-gray-400"
																: item.status === 60
																	? "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400"
																	: "bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400"
											}`}
										>
											{t(`rsvp_status_${item.status}`)}
										</span>
									</td>
									<td className="px-3 py-2 text-xs">
										{item.Store?.id ? (
											<Link
												href={`/${item.Store.id}/reservation`}
												className="hover:underline text-primary"
											>
												{item.Store.name}
											</Link>
										) : (
											item.Store?.name
										)}
									</td>
									<td className="px-3 py-2 text-xs">
										{item.Facility?.facilityName || "-"}
									</td>
									<td className="px-3 py-2 text-xs max-w-[200px] truncate">
										{item.message || "-"}
									</td>
									<td className="px-3 py-2 text-xs">
										{item.CreatedBy?.name || "-"}
									</td>
									{/*created at*/}
									<td className="px-3 py-2 text-xs font-mono">
										{format(
											getDateInTz(
												item.createdAt,
												getOffsetHours(
													item.Store?.defaultTimezone ?? "Asia/Taipei",
												),
											),
											datetimeFormat,
										)}
									</td>
									<td className="px-3 py-2 text-xs">
										{canEditReservation(item) && (
											<div className="flex items-center gap-1">
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 min-h-[44px] min-w-[44px] sm:h-7 sm:w-7 sm:min-h-0 sm:min-w-0"
													onClick={() => handleEditClick(item)}
													title={t("edit_reservation")}
													disabled={isLoadingStoreData}
												>
													<IconEdit className="h-4 w-4" />
												</Button>
												{canCancelReservation(item) && (
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 min-h-[44px] min-w-[44px] sm:h-7 sm:w-7 sm:min-h-0 sm:min-w-0 text-destructive hover:text-destructive"
														onClick={() => handleCancelClick(item)}
														title={
															item.status === RsvpStatus.Pending
																? t("rsvp_delete_reservation")
																: t("rsvp_cancel_reservation")
														}
													>
														<IconTrash className="h-4 w-4" />
													</Button>
												)}
											</div>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			{/* Cancel/Delete Confirmation Dialog */}
			<AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{reservationToCancel?.status === RsvpStatus.Pending
								? t("rsvp_delete_reservation")
								: t("rsvp_cancel_reservation")}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{reservationToCancel?.status === RsvpStatus.Pending
								? t("rsvp_delete_reservation_confirmation")
								: t("rsvp_cancel_reservation_confirmation")}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isCancelling}>
							{t("Cancel")}
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleCancelConfirm}
							disabled={isCancelling}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isCancelling
								? reservationToCancel?.status === RsvpStatus.Pending
									? t("deleting")
									: t("cancelling")
								: reservationToCancel?.status === RsvpStatus.Pending
									? t("confirm_delete")
									: t("confirm_cancel")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Edit Reservation Dialog */}
			{reservationToEdit && storeData && reservationToEdit.Store?.id && (
				<EditReservationDialog
					storeId={reservationToEdit.Store.id}
					rsvpSettings={storeData.rsvpSettings}
					storeSettings={storeData.storeSettings}
					facilities={storeData.facilities}
					user={user}
					rsvp={reservationToEdit}
					rsvps={sortedReservations}
					storeTimezone={
						reservationToEdit.Store.defaultTimezone || "Asia/Taipei"
					}
					open={editDialogOpen}
					onOpenChange={(open) => {
						setEditDialogOpen(open);
						if (!open) {
							setReservationToEdit(null);
							setStoreData(null);
						}
					}}
					onReservationUpdated={handleReservationUpdated}
				/>
			)}
		</div>
	);
};
