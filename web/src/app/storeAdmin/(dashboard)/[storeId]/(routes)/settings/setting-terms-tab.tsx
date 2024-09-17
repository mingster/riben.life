"use client";
import { useToast } from "@/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";

import axios, { type AxiosError } from "axios";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

const tosFormSchema = z.object({
  tos: z.string().optional().default(""),
});

type formValues = z.infer<typeof tosFormSchema>;

export const TermsTab: React.FC<SettingsFormProps> = ({ mongoData }) => {
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
      }
    : {};

  //console.log('defaultValues: ' + JSON.stringify(defaultValues));

  const form = useForm<formValues>({
    resolver: zodResolver(tosFormSchema),
    defaultValues,
  });

  const {
    register,
    formState: { errors },
    handleSubmit,
    clearErrors,
  } = useForm<formValues>();

  /*
  <Textarea
  disabled={loading}
  className="font-mono min-h-100"
  placeholder="服務條款..."
  {...field}
  />
  */

  const onSubmit = async (data: formValues) => {
    //console.log(`tos onSubmit: ${JSON.stringify(data)}`);

    try {
      setLoading(true);

      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/settings/terms`,
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
    <Card className="h-svh">
      <CardContent className="space-y-2">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="w-full space-y-1"
          >
            <FormField
              control={form.control}
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
