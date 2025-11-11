"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type {
	PaymentMethod,
	ShippingMethod,
	StoreSettings,
} from "@prisma/client";
import type { Store } from "@/types";
import { StoreSettingTabs } from "./tabs";

interface SettingsClientProps {
	serverStore: Store;
	serverStoreSettings: StoreSettings | null;
	serverPaymentMethods: PaymentMethod[];
	serverShippingMethods: ShippingMethod[];
	disablePaidOptions: boolean;
}

export function SettingsClient({
	serverStore,
	serverStoreSettings,
	serverPaymentMethods,
	serverShippingMethods,
	disablePaidOptions,
}: SettingsClientProps) {
	const [store, setStore] = useState<Store>(serverStore);
	const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(
		serverStoreSettings,
	);
	const [paymentMethods, setPaymentMethods] =
		useState<PaymentMethod[]>(serverPaymentMethods);
	const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>(
		serverShippingMethods,
	);

	// Keep local state in sync if server data changes after a refresh.
	useEffect(() => {
		setStore(serverStore);
	}, [serverStore]);

	useEffect(() => {
		setStoreSettings(serverStoreSettings);
	}, [serverStoreSettings]);

	useEffect(() => {
		setPaymentMethods(serverPaymentMethods);
	}, [serverPaymentMethods]);

	useEffect(() => {
		setShippingMethods(serverShippingMethods);
	}, [serverShippingMethods]);

	const handleStoreUpdated = useCallback((updated: Store) => {
		setStore(updated);
	}, []);

	const handleStoreSettingsUpdated = useCallback(
		(updated: StoreSettings | null) => {
			setStoreSettings(updated);
		},
		[],
	);

	const handlePaymentMethodsUpdated = useCallback(
		(updated: PaymentMethod[]) => {
			setPaymentMethods(updated);
		},
		[],
	);

	const handleShippingMethodsUpdated = useCallback(
		(updated: ShippingMethod[]) => {
			setShippingMethods(updated);
		},
		[],
	);

	const memoizedStore = useMemo(() => store, [store]);
	const memoizedSettings = useMemo(() => storeSettings, [storeSettings]);
	const memoizedPaymentMethods = useMemo(
		() => paymentMethods,
		[paymentMethods],
	);
	const memoizedShippingMethods = useMemo(
		() => shippingMethods,
		[shippingMethods],
	);

	return (
		<StoreSettingTabs
			store={memoizedStore}
			storeSettings={memoizedSettings}
			paymentMethods={memoizedPaymentMethods}
			shippingMethods={memoizedShippingMethods}
			disablePaidOptions={disablePaidOptions}
			onStoreUpdated={handleStoreUpdated}
			onStoreSettingsUpdated={handleStoreSettingsUpdated}
			onPaymentMethodsUpdated={handlePaymentMethodsUpdated}
			onShippingMethodsUpdated={handleShippingMethodsUpdated}
		/>
	);
}
