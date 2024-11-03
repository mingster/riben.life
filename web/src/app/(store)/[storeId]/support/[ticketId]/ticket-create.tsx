"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

import {
  Card,
  CardContent,
  CardDescription,
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/providers/i18n-provider";
import type { StoreOrder } from "@/types";
import { TicketStatus } from "@/types/enum";
import { zodResolver } from "@hookform/resolvers/zod";
import type { SupportTicket } from "@prisma/client";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as z from "zod";

const formSchema = z.object({
  department: z.string().min(1, { message: "department is required" }),
  subject: z.string().min(1, { message: "subject is required" }),
  message: z.string().min(1, { message: "message is required" }),
  //status: z.coerce.number(),
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
  order: StoreOrder | null;
}

// in edit mode,display all replies in this ticket (thread id)
// or create a new ticket
//
export const TicketCreate = ({ initialData, order }: editProps) => {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { lng } = useI18n();
  const { t } = useTranslation(lng);
  const [loading, setLoading] = useState(false);

  const editMode = false;
  const defaultValues = initialData
    ? {
      ...initialData,
    }
    : {
      subject: "",
      message: "",
      department: "",
      status: TicketStatus.Active,
    };

  if (order) {
    defaultValues.subject = `關於訂單 ＃${order.orderNum}`;
    defaultValues.department = "Sales";
  }

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

    // do create
    await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/store/${params.storeId}/ticket`,
      data,
    );

    toast({
      title: "ticket created. Please wait for store staff to respond.",
      description: "",
      variant: "success",
    });
    router.refresh();
    router.push(`/${params.storeId}/support`);

    //2.save as notification in database. the api will also send email
  };

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full space-y-1"
        >
          <Card>
            <CardHeader>
              <CardTitle>
                {editMode ? t("reply") : t("create") + t("ticket")}
              </CardTitle>
              <CardDescription />
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem className="p-3">
                    <FormLabel>{t("subject")}</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        disabled={loading}
                        className="font-mono"
                        placeholder="Subject"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {!editMode && (
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem className="p-3">
                      <FormLabel>{t("department")}</FormLabel>
                      <FormControl>
                        <Select
                          disabled={loading}
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Sales">Sales</SelectItem>
                            <SelectItem value="Support">Support</SelectItem>
                            <SelectItem value="Billing">Billing</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
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
                  router.back();
                  //router.push(`/${params.storeId}/support`);
                }}
                className="ml-2"
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
