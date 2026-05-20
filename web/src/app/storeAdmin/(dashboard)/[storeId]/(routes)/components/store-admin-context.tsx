"use client";

import {
	createContext,
	type Dispatch,
	type ReactNode,
	type SetStateAction,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

import type { Store, SupportTicket } from "@/types";
import { StoreLevel, TicketStatus } from "@/types/enum";

interface StoreAdminContextValue {
	store: Store;
	setStore: Dispatch<SetStateAction<Store>>;
	/** Active Pro/Multi subscription — required for import/export in store admin. */
	canImportExport: boolean;
	/** Updates `store.level` for header badge and menu gating (e.g. after subscribe). */
	updateStoreLevel: (level: number) => void;
	supportTicketCount: number;
	setSupportTicketCount: Dispatch<SetStateAction<number>>;
}

const StoreAdminContext = createContext<StoreAdminContextValue | null>(null);

function calculateOpenSupportTickets(store: Store): number {
	const tickets = (store as Store & { SupportTicket?: SupportTicket[] })
		.SupportTicket;
	if (!tickets?.length) {
		return 0;
	}
	return tickets.filter(
		(ticket: SupportTicket) =>
			ticket.status === TicketStatus.Open &&
			(ticket.threadId === null ||
				ticket.threadId === undefined ||
				ticket.threadId === ""),
	).length;
}

function importExportForLevel(level: number): boolean {
	return level === StoreLevel.Pro || level === StoreLevel.Multi;
}

export function StoreAdminProvider({
	store: initialStore,
	initialCanImportExport,
	children,
}: {
	store: Store;
	initialCanImportExport: boolean;
	children: ReactNode;
}) {
	const [store, setStore] = useState(initialStore);
	const [canImportExport, setCanImportExport] = useState(
		initialCanImportExport,
	);
	const [supportTicketCount, setSupportTicketCount] = useState(
		calculateOpenSupportTickets(initialStore),
	);

	const updateStoreLevel = useCallback((level: number) => {
		setStore((prev: Store) => ({ ...prev, level }));
		// Optimistic until router.refresh(); Free always disables import/export.
		setCanImportExport(importExportForLevel(level));
	}, []);

	// Layout RSC can resolve before a child updates the DB (e.g. subscribe confirm).
	// When the server passes a newer store (e.g. after router.refresh()), sync context.
	useEffect(() => {
		setStore(initialStore);
		setCanImportExport(initialCanImportExport);
		setSupportTicketCount(calculateOpenSupportTickets(initialStore));
	}, [initialStore, initialCanImportExport]);

	const value = useMemo<StoreAdminContextValue>(
		() => ({
			store,
			setStore,
			canImportExport,
			updateStoreLevel,
			supportTicketCount,
			setSupportTicketCount,
		}),
		[store, canImportExport, supportTicketCount, updateStoreLevel],
	);

	return (
		<StoreAdminContext.Provider value={value}>
			{children}
		</StoreAdminContext.Provider>
	);
}

export function useStoreAdminContext() {
	const context = useContext(StoreAdminContext);
	if (!context) {
		throw new Error(
			"useStoreAdminContext must be used within StoreAdminProvider",
		);
	}
	return context;
}
