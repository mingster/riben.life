"use client";

import {
	createContext,
	useContext,
	useMemo,
	useState,
	type Dispatch,
	type ReactNode,
	type SetStateAction,
} from "react";

import type { Store, SupportTicket } from "@/types";
import { TicketStatus } from "@/types/enum";

interface StoreAdminContextValue {
	store: Store;
	setStore: Dispatch<SetStateAction<Store>>;
	supportTicketCount: number;
	setSupportTicketCount: Dispatch<SetStateAction<number>>;
}

const StoreAdminContext = createContext<StoreAdminContextValue | null>(null);

function calculateOpenSupportTickets(store: Store): number {
	return (
		(
			store as Store & { SupportTicket?: SupportTicket[] }
		).SupportTicket?.filter(
			(ticket: SupportTicket) => ticket.status === TicketStatus.Open,
		).length ?? 0
	);
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

	const value = useMemo<StoreAdminContextValue>(
		() => ({ store, setStore, supportTicketCount, setSupportTicketCount }),
		[store, supportTicketCount],
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
