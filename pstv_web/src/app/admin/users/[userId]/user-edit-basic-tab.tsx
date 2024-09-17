"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useI18n } from "@/providers/i18n-provider";
import { zodResolver } from "@hookform/resolvers/zod";

import { LocaleSelectItems } from "@/components/locale-select-items";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { User } from "@prisma/client";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as z from "zod";
import { UserRoleCombobox } from "./user-role-combobox";

const formSchema = z.object({
  name: z.string().optional().default(""),
  locale: z.string().optional().default(""),
  role: z.string().optional().default(""),
});

type formValues = z.infer<typeof formSchema>;

interface editProps {
  initialData:
    | (User & {
        //images: ProductImage[];
      })
    | null;
  action: string;
}
export const UserEditBasicTab = ({ initialData, action }: editProps) => {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { lng } = useI18n();
  const { t } = useTranslation(lng);
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
    if (!initialData) return;

    setLoading(true);
    //console.log(`onSubmit: ${JSON.stringify(data)}`);
    await axios.patch(
      `${process.env.NEXT_PUBLIC_API_URL}/admin/user/${initialData.id}`,
      data,
    );

    toast({
      title: "user saved.",
      description: "",
      variant: "success",
    });

    //router.push(`/storeAdmin/${params.storeId}/users`);
    router.refresh();
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
    }
    */
  };

  return (
    <>
      <Card>
        <CardContent className="space-y-2">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="w-full space-y-1"
            >
              <div className="grid grid-flow-row-dense grid-cols-2 gap-3 items-center">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="p-3">
                      <FormLabel>{t("account_page_title")}</FormLabel>
                      <FormControl>
                        <Input
                          disabled={loading}
                          className="font-mono"
                          placeholder="name"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="locale"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("account_tabs_language")}</FormLabel>
                      <FormControl>
                        <Select
                          disabled={loading}
                          //disabled={form.formState.isSubmitting}
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger className="font-mono">
                            <SelectValue placeholder="Select a default locale" />
                          </SelectTrigger>
                          <SelectContent className="font-mono">
                            <LocaleSelectItems />
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-flow-row-dense grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between p-3 rounded-lg shadow-sm">
                      <div className="space-y-1 leading-none">
                        <FormLabel>Role</FormLabel>
                        <FormDescription>manage user role</FormDescription>
                      </div>
                      <FormControl>
                        <div>
                          <UserRoleCombobox
                            defaultValue={field.value}
                            onChange={field.onChange}
                          />
                        </div>
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

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
                  router.push("/admin/users");
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
