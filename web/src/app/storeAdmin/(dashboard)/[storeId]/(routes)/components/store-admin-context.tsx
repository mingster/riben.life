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
import { TicketStatus } from "@/types/enum";

interface StoreAdminContextValue {
	store: Store;
	setStore: Dispatch<SetStateAction<Store>>;
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

export function StoreAdminProvider({
	store: initialStore,
	children,
}: {
	store: Store;
	children: ReactNode;
}) {
	const [store, setStore] = useState(initialStore);
	const [supportTicketCount, setSupportTicketCount] = useState(
		calculateOpenSupportTickets(initialStore),
	);

	const updateStoreLevel = useCallback((level: number) => {
		setStore((prev: Store) => ({ ...prev, level }));
	}, []);

	// Layout RSC can resolve before a child updates the DB (e.g. subscribe confirm).
	// When the server passes a newer store (e.g. after router.refresh()), sync context.
	useEffect(() => {
		setStore(initialStore);
		setSupportTicketCount(calculateOpenSupportTickets(initialStore));
	}, [initialStore]);

	const value = useMemo<StoreAdminContextValue>(
		() => ({
			store,
			setStore,
			updateStoreLevel,
			supportTicketCount,
			setSupportTicketCount,
		}),
		[store, supportTicketCount, updateStoreLevel],
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
