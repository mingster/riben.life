"use client";
import { toastError, toastSuccess } from "@/components/toaster";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type {
	PaymentMethod,
	ShippingMethod,
	StoreSettings,
} from "@prisma/client";

import { IconTrash } from "@tabler/icons-react";
import { type AxiosError } from "axios";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

import { Button } from "@/components/ui/button";

import { Loader } from "@/components/loader";
import { AlertModal } from "@/components/modals/alert-modal";
import { Heading } from "@/components/ui/heading";
import type { Store } from "@/types";
import { BankSettingTab } from "./setting-bank-tab";
import { BasicSettingTab } from "./setting-basic-tab";
import { ContactInfoTab } from "./setting-contact-info-tab";
import { PaidOptionsTab } from "./setting-paid-options";
import { PrivacyTab } from "./setting-privacy-tab";

//import { TermsTab } from "./setting-terms-tab";
import { deleteStoreAction } from "@/actions/storeAdmin/store/delete-store";
import { CreditTab } from "./setting-credit-tab";
import { ShippingPaymentMethodTab } from "./setting-shipping-payment-method";

export interface SettingsFormProps {
	store: Store;
	storeSettings: StoreSettings | null;
	paymentMethods: PaymentMethod[] | [];
	shippingMethods: ShippingMethod[] | [];
	disablePaidOptions: boolean;
	onStoreUpdated?: (store: Store) => void;
	onStoreSettingsUpdated?: (settings: StoreSettings | null) => void;
	onPaymentMethodsUpdated?: (items: PaymentMethod[]) => void;
	onShippingMethodsUpdated?: (items: ShippingMethod[]) => void;
	/*
  initialData:
	| (Store & {
		name: string;
	  })
	| null;
  logo: string;
  */
}

export const StoreSettingTabs: React.FC<SettingsFormProps> = ({
	store,
	storeSettings,
	paymentMethods,
	shippingMethods,
	disablePaidOptions,
	onStoreUpdated,
	onStoreSettingsUpdated,
	onPaymentMethodsUpdated,
	onShippingMethodsUpdated,
}) => {
	const router = useRouter();
	const params = useParams();

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const normalizedStore = useMemo(
		() => ({
			...store,
			customDomain: store.customDomain ?? "",
			logo: store.logo ?? "",
			logoPublicId: store.logoPublicId ?? "",
		}),
		[store],
	);

	const onDelete = async () => {
		try {
			setLoading(true);
			const result = await deleteStoreAction(params.storeId as string, {});

			if (result?.serverError) {
				toastError({
					title: t("error_title"),
					description: result.serverError,
				});
			} else {
				router.push("/storeAdmin/");
				toastSuccess({
					title: t("store_removed"),
					description: "",
				});
			}
		} catch (error: unknown) {
			const err = error as AxiosError;
			toastError({
				title: t("error_title"),
				description: err.message,
			});
		} finally {
			setLoading(false);
			setOpen(false);
		}
	};

	if (loading) {
		return <Loader />;
	}

	return (
		<>
			<AlertModal
				isOpen={open}
				onClose={() => setOpen(false)}
				onConfirm={onDelete}
				loading={loading}
			/>

			<div className="flex items-center justify-between">
				<Heading
					title={t("StoreSettings")}
					description={t("StoreSettingsDescr")}
				/>
				<Button
					disabled={loading}
					variant="destructive"
					size="sm"
					onClick={() => setOpen(true)}
				>
					<IconTrash className="size-4" />
				</Button>
			</div>

			<Tabs defaultValue="basic" className="w-full">
				<TabsList className="grid grid-cols-4 gap-1 lg:inline-flex lg:flex-row">
					<TabsTrigger className="px-1 lg:min-w-25" value="basic">
						{t("StoreSettingsTab_Basic")}
					</TabsTrigger>

					<TabsTrigger className="px-1 lg:min-w-25" value="contactInfo">
						{t("StoreSettingsTab_ContactInfo")}
					</TabsTrigger>
					<TabsTrigger className="px-1 lg:min-w-25" value="privacyStatement">
						{t("StoreSettingsTab_Policy")}
					</TabsTrigger>
					<TabsTrigger className="px-1 lg:min-w-25" value="ShippingMethod">
						{t("StoreSettingsTab_shipping_method")} /{" "}
						{t("StoreSettingsTab_payment_method")}
					</TabsTrigger>

					<TabsTrigger className="px-1 lg:min-w-25" value="credit">
						{t("RSVP_Tab_Credit")}
					</TabsTrigger>

					<TabsTrigger className="px-1 lg:min-w-25" value="bank">
						{t("StoreSettingsTab_Bank")}
					</TabsTrigger>

					<TabsTrigger className="px-1 lg:min-w-25" value="paidOptions">
						{t("StoreSettingsTab_PaidOptions")}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="basic">
					<BasicSettingTab
						store={normalizedStore}
						storeSettings={storeSettings}
						onStoreUpdated={onStoreUpdated}
						onStoreSettingsUpdated={onStoreSettingsUpdated}
					/>
				</TabsContent>

				<TabsContent value="contactInfo">
					<ContactInfoTab
						store={normalizedStore}
						storeSettings={storeSettings}
						onStoreSettingsUpdated={onStoreSettingsUpdated}
					/>
				</TabsContent>

				<TabsContent value="privacyStatement">
					<PrivacyTab
						store={normalizedStore}
						storeSettings={storeSettings}
						onStoreSettingsUpdated={onStoreSettingsUpdated}
					/>
				</TabsContent>

				<TabsContent value="ShippingMethod">
					<ShippingPaymentMethodTab
						store={normalizedStore}
						allPaymentMethods={paymentMethods}
						allShippingMethods={shippingMethods}
						disablePaidOptions={disablePaidOptions}
						onStoreUpdated={onStoreUpdated}
					/>
				</TabsContent>

				<TabsContent value="credit">
					<CreditTab store={normalizedStore} onStoreUpdated={onStoreUpdated} />
				</TabsContent>

				<TabsContent value="bank">
					<BankSettingTab
						store={normalizedStore}
						storeSettings={storeSettings}
						onStoreUpdated={onStoreUpdated}
					/>
				</TabsContent>

				<TabsContent value="paidOptions">
					<PaidOptionsTab
						store={normalizedStore}
						storeSettings={storeSettings}
						disablePaidOptions={disablePaidOptions}
						onStoreUpdated={onStoreUpdated}
					/>
				</TabsContent>
			</Tabs>
		</>
	);
};
