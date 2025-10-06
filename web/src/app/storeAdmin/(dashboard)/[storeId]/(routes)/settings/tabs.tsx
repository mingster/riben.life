"use client";
import { toastError, toastSuccess } from "@/components/Toaster";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type {
	PaymentMethod,
	ShippingMethod,
	StoreSettings,
} from "@prisma/client";

import axios, { type AxiosError } from "axios";
import { IconTrash } from "@tabler/icons-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

import { Button } from "@/components/ui/button";

import { AlertModal } from "@/components/modals/alert-modal";
import { Heading } from "@/components/ui/heading";
import { Loader } from "@/components/loader";
import type { Store } from "./page";
import { BankSettingTab } from "./setting-bank-tab";
import { BasicSettingTab } from "./setting-basic-tab";
import { ContactInfoTab } from "./setting-contact-info-tab";
import { PaidOptionsTab } from "./setting-paid-options";
import { PrivacyTab } from "./setting-privacy-tab";
import { RsvpSettingTab } from "./setting-rsvp-tab";
//import { TermsTab } from "./setting-terms-tab";
import { ShippingPaymentMethodTab } from "./setting-shipping-payment-method";

export interface SettingsFormProps {
	sqlData: Store;
	storeSettings: StoreSettings | null;
	paymentMethods: PaymentMethod[] | [];
	shippingMethods: ShippingMethod[] | [];
	disablePaidOptions: boolean;
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
	sqlData,
	storeSettings,
	paymentMethods,
	shippingMethods,
	disablePaidOptions,
}) => {
	const router = useRouter();
	const params = useParams();

	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	if (!sqlData.customDomain) sqlData.customDomain = "";
	if (!sqlData.logo) sqlData.logo = "";
	if (!sqlData.logoPublicId) sqlData.logoPublicId = "";

	const onDelete = async () => {
		try {
			setLoading(true);
			await axios.delete(
				`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/settings/basic`,
			);
			router.refresh();
			router.push("/storeAdmin/");

			toastSuccess({
				title: t("Store_Removed"),
				description: "",
			});
		} catch (err: unknown) {
			const error = err as AxiosError;

			toastError({
				title:
					"Something went wrong. Make sure you removed all products and categories first.",
				description: error.message,
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
				<TabsList>
					<TabsTrigger className="px-1 lg:min-w-25" value="basic">
						{t("StoreSettingsTab_Basic")}
					</TabsTrigger>

					<TabsTrigger className="px-1 lg:min-w-25" value="rsvp">
						{t("StoreSettingsTab_RSVP")}
					</TabsTrigger>

					<TabsTrigger className="px-1 lg:min-w-25" value="bank">
						{t("StoreSettingsTab_Bank")}
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
					<TabsTrigger className="px-1 lg:min-w-25" value="paidOptions">
						{t("StoreSettingsTab_PaidOptions")}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="basic">
					<BasicSettingTab sqlData={sqlData} storeSettings={storeSettings} />
				</TabsContent>

				<TabsContent value="bank">
					<BankSettingTab sqlData={sqlData} storeSettings={storeSettings} />
				</TabsContent>

				<TabsContent value="contactInfo">
					<ContactInfoTab sqlData={sqlData} storeSettings={storeSettings} />
				</TabsContent>

				<TabsContent value="rsvp">
					<RsvpSettingTab sqlData={sqlData} storeSettings={storeSettings} />
				</TabsContent>

				<TabsContent value="privacyStatement">
					<PrivacyTab sqlData={sqlData} storeSettings={storeSettings} />
				</TabsContent>

				<TabsContent value="ShippingMethod">
					<ShippingPaymentMethodTab
						sqlData={sqlData}
						allPaymentMethods={paymentMethods}
						allShippingMethods={shippingMethods}
						disablePaidOptions={disablePaidOptions}
					/>
				</TabsContent>
				<TabsContent value="paidOptions">
					<PaidOptionsTab
						sqlData={sqlData}
						storeSettings={storeSettings}
						disablePaidOptions={disablePaidOptions}
					/>
				</TabsContent>
			</Tabs>
		</>
	);
};
