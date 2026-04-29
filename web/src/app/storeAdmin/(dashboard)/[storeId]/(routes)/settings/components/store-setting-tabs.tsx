"use client";

import { IconTrash } from "@tabler/icons-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { deleteStoreAction } from "@/actions/storeAdmin/store/delete-store";
import { useTranslation } from "@/app/i18n/client";
import {
	AdminSettingsTabs,
	AdminSettingsTabsContent,
	AdminSettingsTabsList,
	AdminSettingsTabsTrigger,
} from "@/components/admin-settings-tabs";
import { Heading } from "@/components/heading";
import { AlertModal } from "@/components/modals/alert-modal";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";
import { BasicSettingTab } from "./setting-basic-tab";
import { ContactInfoTab } from "./setting-contact-info-tab";
import { SettingCreditTab } from "./setting-credit-tab";
import { SettingPaidOptionsTab } from "./setting-paid-options";
import { SettingShippingPaymentMethodTab } from "./setting-shipping-payment-method";
import { SettingStorefrontShippingTab } from "./setting-storefront-shipping-tab";
import type { SettingsFormProps } from "./settings-types";

export const StoreSettingTabs: React.FC<SettingsFormProps> = ({
	store,
	storeSettings,
	paymentMethods,
	shippingMethods,
	disablePaidOptions,
	onStoreUpdated,
	onStoreSettingsUpdated,
}) => {
	const params = useParams<{ storeId: string }>();
	const router = useRouter();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleteLoading, setDeleteLoading] = useState(false);

	const handleDeleteConfirm = async () => {
		setDeleteLoading(true);
		try {
			const result = await deleteStoreAction(String(params.storeId), {});
			if (result?.serverError) {
				toastError({ description: result.serverError });
				return;
			}
			toastSuccess({ description: t("deleted") });
			router.push("/storeAdmin");
			router.refresh();
		} finally {
			setDeleteLoading(false);
			setDeleteOpen(false);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<Heading
					title={t("store_settings")}
					description={t("store_settings_descr")}
				/>
				<Button
					type="button"
					variant="destructive"
					className="h-10 touch-manipulation sm:h-9 sm:min-h-0"
					onClick={() => setDeleteOpen(true)}
				>
					<IconTrash className="mr-2 size-4" />
					{t("delete")}
				</Button>
			</div>
			<AlertModal
				isOpen={deleteOpen}
				onClose={() => setDeleteOpen(false)}
				onConfirm={() => void handleDeleteConfirm()}
				loading={deleteLoading}
			/>
			<Separator />

			<AdminSettingsTabs defaultValue="basic">
				<AdminSettingsTabsList className="justify-start">
					<AdminSettingsTabsTrigger value="basic">
						{t("store_settings_tab_basic")}
					</AdminSettingsTabsTrigger>
					<AdminSettingsTabsTrigger value="contact">
						{t("store_settings_tab_contact_info")}
					</AdminSettingsTabsTrigger>
					<AdminSettingsTabsTrigger value="shipping_payment">
						{t("store_settings_tab_shipping_payment")}
					</AdminSettingsTabsTrigger>
					<AdminSettingsTabsTrigger value="checkout">
						{t("store_settings_tab_checkout_pickup")}
					</AdminSettingsTabsTrigger>
					<AdminSettingsTabsTrigger value="credit">
						{t("rsvp_tab_credit")}
					</AdminSettingsTabsTrigger>
					<AdminSettingsTabsTrigger value="paid">
						{t("store_settings_tab_paid_options")}
					</AdminSettingsTabsTrigger>
				</AdminSettingsTabsList>

				<AdminSettingsTabsContent value="basic">
					<BasicSettingTab
						store={store}
						storeSettings={storeSettings}
						onStoreUpdated={onStoreUpdated}
						onStoreSettingsUpdated={onStoreSettingsUpdated}
					/>
				</AdminSettingsTabsContent>
				<AdminSettingsTabsContent value="contact">
					<ContactInfoTab
						store={store}
						storeSettings={storeSettings}
						onStoreSettingsUpdated={onStoreSettingsUpdated}
					/>
				</AdminSettingsTabsContent>
				<AdminSettingsTabsContent value="shipping_payment">
					<SettingShippingPaymentMethodTab
						store={store}
						paymentMethods={paymentMethods}
						shippingMethods={shippingMethods}
						disablePaidOptions={disablePaidOptions}
						onStoreUpdated={onStoreUpdated}
					/>
				</AdminSettingsTabsContent>
				<AdminSettingsTabsContent value="checkout">
					<SettingStorefrontShippingTab
						store={store}
						storeSettings={storeSettings}
						onStoreUpdated={onStoreUpdated}
						onStoreSettingsUpdated={onStoreSettingsUpdated}
					/>
				</AdminSettingsTabsContent>
				<AdminSettingsTabsContent value="credit">
					<SettingCreditTab store={store} onStoreUpdated={onStoreUpdated} />
				</AdminSettingsTabsContent>
				<AdminSettingsTabsContent value="paid">
					<SettingPaidOptionsTab
						store={store}
						disablePaidOptions={disablePaidOptions}
						onStoreUpdated={onStoreUpdated}
					/>
				</AdminSettingsTabsContent>
			</AdminSettingsTabs>
		</div>
	);
};
