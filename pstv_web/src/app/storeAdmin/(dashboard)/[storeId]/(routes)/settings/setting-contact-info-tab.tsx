"use client";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";

import axios, { type AxiosError } from "axios";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import * as z from "zod";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { SettingsFormProps } from "./setting-basic-tab";
import { Textarea } from "@/components/ui/textarea";

const contactInfoFormSchema = z.object({
  aboutUs: z.string().optional().default(""),
  supportEmail: z.string().optional().default(""),
  supportPhoneNumber: z.string().optional().default(""),
  facebookUrl: z.string().optional().default(""),
  igUrl: z.string().optional().default(""),
  lineId: z.string().optional().default(""),
  telegramId: z.string().optional().default(""),
  twitterId: z.string().optional().default(""),
  whatsappId: z.string().optional().default(""),
  wechatId: z.string().optional().default(""),
});

type formValues = z.infer<typeof contactInfoFormSchema>;

export const ContactInfoTab: React.FC<SettingsFormProps> = ({
  sqlData: initialData,
  mongoData,
}) => {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const { lng } = useI18n();
  const { t } = useTranslation(lng, "storeAdmin");

  const defaultValues = mongoData
    ? {
        ///...initialData,
        ...mongoData,
        aboutUs: mongoData.aboutUs ?? "",
        supportEmail: mongoData.supportEmail ?? "",
        supportPhoneNumber: mongoData.supportPhoneNumber ?? "",
        facebookUrl: mongoData.facebookUrl ?? "",
        igUrl: mongoData.igUrl ?? "",
        lineId: mongoData.lineId ?? "",
        telegramId: mongoData.telegramId ?? "",
        twitterId: mongoData.twitterId ?? "",
        whatsappId: mongoData.whatsappId ?? "",
        wechatId: mongoData.wechatId ?? "",
      }
    : {
        aboutUs: "",
        supportEmail: "",
        supportPhoneNumber: "",
        facebookUrl: "",
        igUrl: "",
        lineId: "",
        telegramId: "",
        twitterId: "",
        whatsappId: "",
        wechatId: "",
      };

  //console.log('defaultValues: ' + JSON.stringify(defaultValues));

  const contactInfoForm = useForm<formValues>({
    resolver: zodResolver(contactInfoFormSchema),
    defaultValues,
  });

  const {
    register,
    formState: { errors },
    handleSubmit,
    clearErrors,
  } = useForm<formValues>();

  //const isSubmittable = !!form.formState.isDirty && !!form.formState.isValid;
  const oncontactInfoSubmit = async (data: formValues) => {
    console.log(`contactInfo onSubmit: ${JSON.stringify(data)}`);

    try {
      setLoading(true);

      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/settings/contactInfo`,
        data,
      );
      router.refresh();
      toast({
        title: t("Store_Updated"),
        description: "",
        variant: "success",
      });
    } catch (err: unknown) {
      const error = err as AxiosError;
      toast({
        title: "Something went wrong.",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      //console.log(data);
    }
  };

  return (
    <>
      <Card>
        <CardContent className="space-y-2">
          <Form {...contactInfoForm}>
            <form
              onSubmit={contactInfoForm.handleSubmit(oncontactInfoSubmit)}
              className="w-full space-y-1"
            >
              <FormField
                control={contactInfoForm.control}
                name="aboutUs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("StoreSettings_about_us")}</FormLabel>
                    <FormControl>
                      <Textarea
                        disabled={loading}
                        className="font-mono"
                        placeholder={`${t("input_placeholder1")}${t("StoreSettings_about_us")}`}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-flow-row-dense grid-cols-2 gap-8">
                <FormField
                  control={contactInfoForm.control}
                  name="supportEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("StoreSettings_support_email")}</FormLabel>
                      <FormControl>
                        <Input
                          disabled={loading}
                          className="font-mono"
                          placeholder={`${t("input_placeholder1")}${t("StoreSettings_support_email")}`}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={contactInfoForm.control}
                  name="supportPhoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("StoreSettings_support_phone")}</FormLabel>
                      <FormControl>
                        <Input
                          disabled={loading}
                          className="font-mono"
                          placeholder={`${t("input_placeholder1")}${t("StoreSettings_support_phone")}`}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-flow-row-dense grid-cols-2 gap-8">
                <FormField
                  control={contactInfoForm.control}
                  name="facebookUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("StoreSettings_facebook_url")}</FormLabel>
                      <FormControl>
                        <Input
                          disabled={loading}
                          className="font-mono"
                          placeholder={`${t("input_placeholder1")}${t("StoreSettings_facebook_url")}`}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={contactInfoForm.control}
                  name="igUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("StoreSettings_ig_url")}</FormLabel>
                      <FormControl>
                        <Input
                          disabled={loading}
                          className="font-mono"
                          placeholder={`${t("input_placeholder1")}${t("StoreSettings_ig_url")}`}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-flow-row-dense grid-cols-2 gap-8">
                <FormField
                  control={contactInfoForm.control}
                  name="lineId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("StoreSettings_support_lineId")}</FormLabel>
                      <FormControl>
                        <Input
                          disabled={loading}
                          className="font-mono"
                          placeholder={`${t("input_placeholder1")}${t("StoreSettings_support_lineId")}`}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={contactInfoForm.control}
                  name="telegramId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("StoreSettings_support_telegramId")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          disabled={loading}
                          className="font-mono"
                          placeholder={`${t("input_placeholder1")}${t("StoreSettings_support_telegramId")}`}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-flow-row-dense grid-cols-2 gap-8">
                <FormField
                  control={contactInfoForm.control}
                  name="twitterId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("StoreSettings_support_twitterId")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          disabled={loading}
                          className="font-mono"
                          placeholder={`${t("input_placeholder1")}${t("StoreSettings_support_twitterId")}`}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={contactInfoForm.control}
                  name="whatsappId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("StoreSettings_support_whatsappId")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          disabled={loading}
                          className="font-mono"
                          placeholder={`${t("input_placeholder1")}${t("StoreSettings_support_whatsappId")}`}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={contactInfoForm.control}
                name="wechatId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("StoreSettings_support_wechatId")}</FormLabel>
                    <FormControl>
                      <Input
                        disabled={loading}
                        className="font-mono"
                        placeholder={`${t("input_placeholder1")}${t("StoreSettings_support_wechatId")}`}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                disabled={loading}
                className="disabled:opacity-25"
                type="submit"
              >
                {t("Save")}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  clearErrors();
                  router.push("../");
                }}
                className="ml-5"
              >
                {t("Cancel")}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
};
