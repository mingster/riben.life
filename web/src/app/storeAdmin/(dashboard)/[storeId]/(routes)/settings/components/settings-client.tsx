"use client";

import type {
	PaymentMethod,
	ShippingMethod,
	StoreSettings,
} from "@prisma/client";
import { useEffect, useState } from "react";

import type { Store } from "@/types";

import { StoreSettingTabs } from "./store-setting-tabs";

export interface SettingsClientProps {
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
	const [store, setStore] = useState(serverStore);
	const [storeSettings, setStoreSettings] = useState(serverStoreSettings);

	useEffect(() => {
		setStore(serverStore);
	}, [serverStore]);

	useEffect(() => {
		setStoreSettings(serverStoreSettings);
	}, [serverStoreSettings]);

	return (
		<StoreSettingTabs
			store={store}
			storeSettings={storeSettings}
			paymentMethods={serverPaymentMethods}
			shippingMethods={serverShippingMethods}
			disablePaidOptions={disablePaidOptions}
			onStoreUpdated={setStore}
			onStoreSettingsUpdated={setStoreSettings}
		/>
	);
}
