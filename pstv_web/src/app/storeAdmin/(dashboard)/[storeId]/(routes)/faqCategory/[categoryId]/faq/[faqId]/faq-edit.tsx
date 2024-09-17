"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";

import type { Faq } from "@/types";
import axios, { type AxiosError } from "axios";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

import { Heading } from "@/components/ui/heading";
import { Textarea } from "@/components/ui/textarea";
import type { FaqCategory } from "@prisma/client";
import Link from "next/link";
import * as z from "zod";
const formSchema = z.object({
  question: z.string().min(1, { message: "question is required" }),
  answer: z.string().min(1, { message: "answer is required" }),
  sortOrder: z.coerce.number().min(1),
});

type formValues = z.infer<typeof formSchema>;

interface editProps {
  initialData: Faq | null;
  category: FaqCategory;
  action: string;
}
export const FaqEdit = ({ initialData, category, action }: editProps) => {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const { lng } = useI18n();
  const { t } = useTranslation(lng, "storeAdmin");
  //const [open, setOpen] = useState(false);
  //const origin = useOrigin();
  const [loading, setLoading] = useState(false);

  const defaultValues = initialData
    ? {
        ...initialData,
      }
    : {};

  //console.log(`product basic: ${JSON.stringify(defaultValues)}`);
  const form = useForm<formValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: "onChange",
  });

  const {
    register,
    formState: { errors },
    handleSubmit,
    clearErrors,
  } = useForm<formValues>();

  const onSubmit = async (data: formValues) => {
    //try {
    setLoading(true);
    if (initialData) {
      // do edit
      const url = `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/faqCategory/${category.id}/faq/${initialData.id}`;

      await axios.patch(url, data);
      toast({
        title: t("FAQ") + t("Saved"),
        description: "",
        variant: "success",
      });
      router.refresh();
    } else {
      // do create
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/faqCategory/${category.id}/faq`,
        data,
      );
      toast({
        title: t("FAQ") + t("Created"),
        description: "",
        variant: "success",
      });

      router.refresh();
      router.push(
        `/storeAdmin/${params.storeId}/faqCategory/${params.categoryId}/faq`,
      );
    }
    setLoading(false);

    /*

    } catch (err: unknown) {
      const error = err as AxiosError;
      toast({
        title: "Something went wrong.",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }

      */
  };

  const pageTitle = t(action) + t("FAQ");

  return (
    <>
      <Card>
        <CardHeader>
          <Heading title={pageTitle} description="" />
          <Link href="#" className="text-sm" onClick={() => router.back()}>
            {category.name}
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="w-full space-y-1"
            >
              <FormField
                control={form.control}
                name="question"
                render={({ field }) => (
                  <FormItem className="p-3">
                    <FormLabel>{t("FAQ")}</FormLabel>
                    <FormControl>
                      <Textarea
                        disabled={loading}
                        className="font-mono"
                        placeholder={t("input_placeholder1") + t("FAQ")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="answer"
                render={({ field }) => (
                  <FormItem className="p-3">
                    <FormLabel>{t("FAQ_Answer")}</FormLabel>
                    <FormControl>
                      <Textarea
                        disabled={loading}
                        className="font-mono"
                        placeholder={t("input_placeholder1") + t("FAQ_Answer")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem className="p-3">
                    <FormLabel>{t("sortOrder")}</FormLabel>
                    <FormControl>
                      <Input
                        disabled={loading}
                        className="font-mono"
                        placeholder={t("input_placeholder1") + t("sortOrder")}
                        type="number"
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
                  router.push(
                    `/storeAdmin/${params.storeId}/faqCategory/${params.categoryId}/faq`,
                  );
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
