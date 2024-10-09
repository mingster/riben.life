"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import type { StoreSettings } from "@prisma-mongo/prisma/client";
import {
  type PaymentMethod,
  Prisma,
  type ShippingMethod,
} from "@prisma/client";

import axios, { type AxiosError } from "axios";
import { Trash } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

import { Button } from "@/components/ui/button";

import { AlertModal } from "@/components/modals/alert-modal";
import { Heading } from "@/components/ui/heading";
import { BasicSettingTab } from "./setting-basic-tab";
import { Loader } from "@/components/ui/loader";
import type { Store } from "./page";
import { BankSettingTab } from "./setting-bank-tab";
import { ContactInfoTab } from "./setting-contact-info-tab";
import { PaidOptionsTab } from "./setting-paid-options";
import { PrivacyTab } from "./setting-privacy-tab";
//import { TermsTab } from "./setting-terms-tab";
import { ShippingPaymentMethodTab } from "./setting-shipping-payment-method";
import { RsvpSettingTab } from "./setting-rsvp-tab";

export interface SettingsFormProps {
  sqlData: Store;
  mongoData: StoreSettings | null;
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
  mongoData,
  paymentMethods,
  shippingMethods,
  disablePaidOptions
}) => {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

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

      toast({
        title: t("Store_Removed"),
        description: "",
        variant: "success",
      });
    } catch (err: unknown) {
      const error = err as AxiosError;

      toast({
        title:
          "Something went wrong. Make sure you removed all products and categories first.",
        description: error.message,
        variant: "destructive",
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
          <Trash className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList>
          <TabsTrigger className="pl-5 pr-5 lg:min-w-40" value="basic">
            {t("StoreSettingsTab_Basic")}
          </TabsTrigger>

          <TabsTrigger className="pl-5 pr-5 lg:min-w-40" value="rsvp">
            {t("StoreSettingsTab_RSVP")}
          </TabsTrigger>

          <TabsTrigger className="pl-5 pr-5 lg:min-w-40" value="bank">
            {t("StoreSettingsTab_Bank")}
          </TabsTrigger>

          <TabsTrigger className="pl-5 pr-5 lg:min-w-40" value="contactInfo">
            {t("StoreSettingsTab_ContactInfo")}
          </TabsTrigger>
          <TabsTrigger
            className="pl-5 pr-5 lg:min-w-40"
            value="privacyStatement"
          >
            {t("StoreSettingsTab_Policy")}
          </TabsTrigger>
          <TabsTrigger className="pl-5 pr-5 lg:min-w-40" value="ShippingMethod">
            {t("StoreSettingsTab_shipping_method")} /{" "}
            {t("StoreSettingsTab_payment_method")}
          </TabsTrigger>
          <TabsTrigger className="pl-5 pr-5 lg:min-w-40" value="paidOptions">
            {t("StoreSettingsTab_PaidOptions")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <BasicSettingTab sqlData={sqlData} mongoData={mongoData} />
        </TabsContent>

        <TabsContent value="bank">
          <BankSettingTab sqlData={sqlData} mongoData={mongoData} />
        </TabsContent>

        <TabsContent value="contactInfo">
          <ContactInfoTab sqlData={sqlData} mongoData={mongoData} />
        </TabsContent>

        <TabsContent value="rsvp">
          <RsvpSettingTab sqlData={sqlData} mongoData={mongoData} />
        </TabsContent>

        <TabsContent value="privacyStatement">
          <PrivacyTab sqlData={sqlData} mongoData={mongoData} />
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
          <PaidOptionsTab sqlData={sqlData} mongoData={mongoData} disablePaidOptions={disablePaidOptions} />
        </TabsContent>
      </Tabs>
    </>
  );
};
