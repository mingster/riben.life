"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { TicketStatus } from "@/types/enum";
import { zodResolver } from "@hookform/resolvers/zod";
import type { SupportTicket } from "@prisma/client";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useI18n } from "@/providers/i18n-provider";
import { useTranslation } from "react-i18next";

const formSchema = z.object({
  //department: z.string().min(1, { message: "department is required" }),
  //subject: z.string().min(1, { message: "subject is required" }),
  message: z.string().min(1, { message: "message is required" }),
  status: z.coerce.number(),
});

type formValues = z.infer<typeof formSchema>;

interface editProps {
  initialData:
    | (SupportTicket & {
        //images: ProductImage[];
        //productPrices: ProductPrice[];
        //ProductImages: ProductImages[] | null;
        //ProductAttribute: ProductAttribute | null;
      })
    | null;
}

// in edit mode,display all replies in this ticket (thread id)
// or create a new ticket
//
export const TicketReply = ({ initialData }: editProps) => {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const { lng } = useI18n();
  const { t } = useTranslation(lng);

  const editMode = true;

  const defaultValues = initialData
    ? {
        ...initialData,
        subject: initialData.subject,
        department: initialData.department,
        message: "",
        status: TicketStatus.Active,
      }
    : {
        //subject: "",
        message: "",
        //department: "",
        status: TicketStatus.Active,
      };

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
    setLoading(true);

    //1.create/update ticket in database

    //console.log(`onSubmit: ${JSON.stringify(data)}`);
    if (!initialData) return;

    // do reply
    await axios.patch(
      `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/ticket/${initialData.id}`,
      data,
    );
    toast({
      title: "ticket replied to customer.",
      description: "",
      variant: "success",
    });
    router.refresh();
    router.push(`/storeAdmin/${params.storeId}/support`);
  };

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full space-y-1"
        >
          <span id="reply" />
          <Card>
            <CardHeader>
              <CardTitle>
                {editMode ? t("reply") : t("create") + t("ticket")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem className="p-3">
                    <FormLabel>{t("message")}</FormLabel>
                    <FormControl>
                      <Textarea
                        disabled={loading}
                        className="font-mono min-h-50"
                        placeholder="message"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button
                disabled={loading}
                className="disabled:opacity-25"
                type="submit"
              >
                {t("Submit")}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  clearErrors();
                  router.push(`/${params.storeId}/support`);
                }}
                className="ml-5"
              >
                {t("Cancel")}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </>
  );
};
