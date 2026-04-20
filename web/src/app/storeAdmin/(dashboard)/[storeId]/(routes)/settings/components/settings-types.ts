import type {
	PaymentMethod,
	ShippingMethod,
	StoreSettings,
} from "@prisma/client";
import type { Store } from "@/types";

export interface SettingsFormProps {
	store: Store;
	storeSettings: StoreSettings | null;
	paymentMethods: PaymentMethod[];
	shippingMethods: ShippingMethod[];
	disablePaidOptions: boolean;
	onStoreUpdated?: (store: Store) => void;
	onStoreSettingsUpdated?: (settings: StoreSettings | null) => void;
	onPaymentMethodsUpdated?: (items: PaymentMethod[]) => void;
	onShippingMethodsUpdated?: (items: ShippingMethod[]) => void;
}

export type BasicTabProps = Pick<
	SettingsFormProps,
	"store" | "storeSettings" | "onStoreUpdated" | "onStoreSettingsUpdated"
>;

export type BankTabProps = Pick<SettingsFormProps, "store" | "onStoreUpdated">;

export type ContactTabProps = Pick<
	SettingsFormProps,
	"store" | "storeSettings" | "onStoreSettingsUpdated"
>;
