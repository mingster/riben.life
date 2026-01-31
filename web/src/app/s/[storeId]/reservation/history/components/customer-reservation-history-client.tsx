"use client";

import { useCallback, useEffect, useState } from "react";

import { DisplayReservations } from "@/components/display-reservations";
import { removeReservationFromLocalStorage as removeReservationFromLocalStorageUtil } from "@/utils/rsvp-utils";

import type {
	Rsvp,
	RsvpSettings,
	StoreFacility,
	StoreSettings,
	User,
} from "@/types";

interface CustomerReservationHistoryClientProps {
	serverData: Rsvp[];
	storeTimezone: string;
	rsvpSettings?: RsvpSettings | null;
	storeId: string;
	user: User | null;
	storeCurrency?: string;
	useCustomerCredit?: boolean;
	creditExchangeRate?: number | null;
	creditServiceExchangeRate?: number | null;
	facilities?: StoreFacility[];
	storeSettings?: StoreSettings | null;
}

export const CustomerReservationHistoryClient: React.FC<
	CustomerReservationHistoryClientProps
> = ({
	serverData,
	storeTimezone,
	rsvpSettings,
	storeId,
	user,
	storeCurrency = "twd",
	useCustomerCredit = false,
	creditExchangeRate = null,
	creditServiceExchangeRate = null,
	facilities = [],
	storeSettings = null,
}) => {
	// Load local storage reservations for anonymous users
	const [localStorageReservations, setLocalStorageReservations] = useState<
		Rsvp[]
	>([]);

	useEffect(() => {
		if (!storeId) return;
		const storageKey = `rsvp-${storeId}`;
		try {
			const storedData = localStorage.getItem(storageKey);
			if (storedData) {
				const parsed: Rsvp[] = JSON.parse(storedData);
				if (Array.isArray(parsed) && parsed.length > 0) {
					setLocalStorageReservations(parsed);
				}
			}
		} catch {
			// Silently handle errors loading from local storage
		}
	}, [storeId]);

	// Merge server data with local storage for anonymous users
	const [allData, setAllData] = useState<Rsvp[]>(() => [...serverData]);

	useEffect(() => {
		if (!user && localStorageReservations.length > 0) {
			const serverIdsSet = new Set(serverData.map((r) => r.id));
			const validLocalReservations = localStorageReservations.filter(
				(localRsvp) => serverIdsSet.has(localRsvp.id),
			);

			if (validLocalReservations.length !== localStorageReservations.length) {
				try {
					const storageKey = `rsvp-${storeId}`;
					if (validLocalReservations.length > 0) {
						localStorage.setItem(
							storageKey,
							JSON.stringify(validLocalReservations),
						);
					} else {
						localStorage.removeItem(storageKey);
					}
					setLocalStorageReservations(validLocalReservations);
				} catch {
					// Silently handle errors
				}
			}

			const serverReservationsWithLocalData = serverData
				.filter((serverRsvp) =>
					validLocalReservations.some((r) => r.id === serverRsvp.id),
				)
				.map((serverRsvp) => {
					const localRsvp = validLocalReservations.find(
						(r) => r.id === serverRsvp.id,
					);
					if (localRsvp?.name && localRsvp?.phone) {
						return {
							...serverRsvp,
							name: localRsvp.name,
							phone: localRsvp.phone,
						};
					}
					return serverRsvp;
				});

			setAllData(serverReservationsWithLocalData);
		} else if (!user && localStorageReservations.length === 0) {
			setAllData([]);
		} else {
			setAllData(serverData);
		}
	}, [localStorageReservations, serverData, user, storeId]);

	const normalizeRsvp = useCallback((rsvp: Rsvp): Rsvp => {
		return {
			...rsvp,
			rsvpTime:
				typeof rsvp.rsvpTime === "number"
					? BigInt(rsvp.rsvpTime)
					: rsvp.rsvpTime instanceof Date
						? BigInt(rsvp.rsvpTime.getTime())
						: rsvp.rsvpTime,
			createdAt:
				typeof rsvp.createdAt === "number"
					? BigInt(rsvp.createdAt)
					: rsvp.createdAt instanceof Date
						? BigInt(rsvp.createdAt.getTime())
						: rsvp.createdAt,
			updatedAt:
				typeof rsvp.updatedAt === "number"
					? BigInt(rsvp.updatedAt)
					: rsvp.updatedAt instanceof Date
						? BigInt(rsvp.updatedAt.getTime())
						: rsvp.updatedAt,
		};
	}, []);

	const handleReservationDeleted = useCallback((reservationId: string) => {
		setAllData((prev) => prev.filter((r) => r.id !== reservationId));
	}, []);

	const handleReservationUpdated = useCallback(
		(updatedRsvp: Rsvp) => {
			const normalized = normalizeRsvp(updatedRsvp);
			setAllData((prev) => {
				const existingIndex = prev.findIndex((r) => r.id === normalized.id);
				if (existingIndex === -1) return [...prev, normalized];
				return prev.map((item) =>
					item.id === normalized.id ? normalized : item,
				);
			});

			if (!user && storeId) {
				const storageKey = `rsvp-${storeId}`;
				try {
					const storedData = localStorage.getItem(storageKey);
					if (storedData) {
						const localReservations: Rsvp[] = JSON.parse(storedData);
						const updatedLocal = localReservations.map((r) =>
							r.id === updatedRsvp.id
								? {
										...updatedRsvp,
										rsvpTime:
											typeof updatedRsvp.rsvpTime === "number"
												? updatedRsvp.rsvpTime
												: updatedRsvp.rsvpTime instanceof Date
													? updatedRsvp.rsvpTime.getTime()
													: typeof updatedRsvp.rsvpTime === "bigint"
														? Number(updatedRsvp.rsvpTime)
														: null,
										createdAt:
											typeof updatedRsvp.createdAt === "number"
												? updatedRsvp.createdAt
												: typeof updatedRsvp.createdAt === "bigint"
													? Number(updatedRsvp.createdAt)
													: null,
										updatedAt:
											typeof updatedRsvp.updatedAt === "number"
												? updatedRsvp.updatedAt
												: typeof updatedRsvp.updatedAt === "bigint"
													? Number(updatedRsvp.updatedAt)
													: null,
									}
								: r,
						);
						localStorage.setItem(storageKey, JSON.stringify(updatedLocal));
						setLocalStorageReservations(updatedLocal);
					}
				} catch {
					// Silently handle errors
				}
			}
		},
		[user, storeId, normalizeRsvp],
	);

	const handleRemoveFromLocalStorage = useCallback(
		(reservationId: string) => {
			if (!user && storeId) {
				removeReservationFromLocalStorageUtil(
					storeId,
					reservationId,
					(updated) => {
						setLocalStorageReservations(updated);
					},
				);
			}
		},
		[user, storeId],
	);

	return (
		<DisplayReservations
			reservations={allData}
			user={user}
			hideActions={false}
			storeId={storeId}
			storeTimezone={storeTimezone}
			rsvpSettings={rsvpSettings ?? null}
			storeSettings={storeSettings}
			facilities={facilities}
			storeCurrency={storeCurrency}
			useCustomerCredit={useCustomerCredit}
			creditExchangeRate={creditExchangeRate}
			creditServiceExchangeRate={creditServiceExchangeRate}
			showStatusFilter={true}
			showCheckout={true}
			showHeading={true}
			onReservationDeleted={handleReservationDeleted}
			onReservationUpdated={handleReservationUpdated}
			localStorageReservations={localStorageReservations}
			onRemoveFromLocalStorage={handleRemoveFromLocalStorage}
		/>
	);
};
