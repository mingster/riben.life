"use client";
import { useToast } from "@/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";

import { Card, CardContent } from "@/components/ui/card";

import axios, { type AxiosError } from "axios";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

import * as z from "zod";

const EditorComp = dynamic(
  () => import("@/components/editor/EditorComponent"),
  { ssr: false },
);

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import dynamic from "next/dynamic";
import type { SettingsFormProps } from "./setting-basic-tab";

const privacyFormSchema = z.object({
  privacyPolicy: z.string().optional().default(""),
  tos: z.string().optional().default(""),
});

type formValues = z.infer<typeof privacyFormSchema>;

export const PrivacyTab: React.FC<SettingsFormProps> = ({ mongoData }) => {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const { lng } = useI18n();
  const { t } = useTranslation(lng, "storeAdmin");

  //if (!mongoData?.privacyPolicy) mongoData.privacyPolicy = '';

  const defaultValues = mongoData
    ? {
        ///...initialData,
        ...mongoData,
      }
    : {};

  //console.log('defaultValues: ' + JSON.stringify(defaultValues));
  /*
    <Textarea
      disabled={loading}
      className="font-mono min-h-100"
      placeholder="enter your privacy statement here..."
      {...field}
    />
*/
  const privacyForm = useForm<formValues>({
    resolver: zodResolver(privacyFormSchema),
    defaultValues,
  });

  const {
    register,
    formState: { errors },
    handleSubmit,
    clearErrors,
  } = useForm<formValues>();

  //const isSubmittable = !!form.formState.isDirty && !!form.formState.isValid;
  const onSubmit = async (data: formValues) => {
    //console.log(`privacy onSubmit: ${JSON.stringify(data)}`);

    try {
      setLoading(true);

      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/settings/privacy`,
        data,
      );
      //revalidatePath(`/storeAdmin/${params.storeId}/settings`);

      toast({
        title: t("Store_Updated"),
        description: "",
        variant: "success",
      });

      router.refresh();
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
    <Card className="h-svh">
      <CardContent className="space-y-2">
        <Form {...privacyForm}>
          <form
            onSubmit={privacyForm.handleSubmit(onSubmit)}
            className="w-full space-y-1"
          >
            <div>
              <FormField
                control={privacyForm.control}
                name="privacyPolicy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("StoreSettings_privacyPolicy")}</FormLabel>
                    <FormControl>
                      <EditorComp
                        markdown={field.value}
                        onPChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={privacyForm.control}
                name="tos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("StoreSettings_terms")}</FormLabel>
                    <FormControl>
                      <EditorComp
                        markdown={field.value}
                        onPChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
  );
};
