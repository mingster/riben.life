"use client";

import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useI18n } from "@/providers/i18n-provider";
import type { ProductOption, StoreProductOptionTemplate } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { Pencil, Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

interface props {
  initialData: StoreProductOptionTemplate | null;
  action: string;
}

type formValues = z.infer<typeof formSchema>;

export const formSchema = z.object({
  // 規格 | 甜度/冰 | 配料
  optionName: z.string().min(1, { message: "option name is required" }),
  ////必選
  isRequired: z.boolean().default(false).optional(),
  // 0:radiobox|1:checkboxes
  isMultiple: z.boolean().default(false).optional(),
  // 至少選1項 | 最多選3項
  minSelection: z.coerce.number().default(1),
  maxSelection: z.coerce.number().default(1),

  allowQuantity: z.boolean().default(false).optional(),
  minQuantity: z.coerce.number().default(1),
  maxQuantity: z.coerce.number().default(1),

  selections: z.string().min(1, { message: "selections is required" }),
  sortOrder: z.coerce.number().min(1),
});

// dialog to handle create and update for ProductOption and ProductOptionSelections object.
export const AddProductOptionTemplateDialog: React.FC<props> = ({
  initialData,
  action,
}) => {
  const { toast } = useToast();

  const router = useRouter();
  const params = useParams();
  const { lng } = useI18n();
  const { t } = useTranslation(lng, "storeAdmin");
  const [loading, setLoading] = useState(false);

  //console.log("AddProductOptionDialog:", JSON.stringify(initialData));

  // parse selection into line separated text
  let s = "";
  initialData?.StoreProductOptionSelectionsTemplate.map((selection) => {
    s += `${selection.name}`;
    s += `:${selection.price}`;
    if (selection.isDefault === true) s += ":1";
    s += "\n";
  });

  const defaultValues = initialData
    ? {
        ...initialData,
        selections: s,
      }
    : {};

  const form = useForm<formValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: "onChange",
  });

  const {
    register,
    formState: { errors },
    handleSubmit,
    watch,
    clearErrors,
  } = useForm<formValues>();

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setLoading(true);

    if (initialData) {
      // edit
      const result = await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/product-option-template/${initialData.id}`,
        data,
      );

      if (result) {
        toast({
          title: t("ProductOption_template") + t("Updated"),
          description: "",
          variant: "success",
        });
      }
    } else {
      // create new
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/product-option-template`,
        data,
      );

      if (result) {
        toast({
          title: t("ProductOption_template") + t("Created"),
          description: "",
          variant: "success",
        });
      }
    }

    setLoading(false);
    //router.refresh();
    window.location.assign(
      `/storeAdmin/${params.storeId}/product-option-template`,
    );
  };

  const pageTitle = t(action) + t("ProductOption_template");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={"outline"}>
          {action === "Create" ? (
            <Plus className="mr-1 size-4" />
          ) : (
            <Pencil className="mr-1 size-4" />
          )}
          {t(action)}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{pageTitle}</DialogTitle>
          <DialogDescription>
            {t("ProductOption_Mgmt_Add_Descr")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="optionName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("ProductOption_optionName")}</FormLabel>
                  <FormControl>
                    <Input disabled={loading} type="text" {...field} />
                  </FormControl>
                  <FormDescription>
                    {t("ProductOption_optionName_Descr")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isRequired"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between p-1 rounded-lg shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>{t("ProductOption_isRequired")}</FormLabel>
                    <FormDescription>
                      {t("ProductOption_isRequired_Descr")}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      disabled={loading}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isMultiple"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between p-1 rounded-lg shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>{t("ProductOption_isMultiple")}</FormLabel>
                    <FormDescription>
                      {t("ProductOption_isMultiple_Descr")}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      ref={field.ref}
                      disabled={loading}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-flow-row-dense grid-cols-2 gap-1">
              <FormField
                control={form.control}
                name="minSelection"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("ProductOption_minSelection")}</FormLabel>
                    <FormControl>
                      <Input
                        disabled={loading || !form.watch("isMultiple")}
                        type="number"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("ProductOption_minSelection_Descr")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxSelection"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("ProductOption_maxSelection")}</FormLabel>
                    <FormControl>
                      <Input
                        disabled={loading || !form.watch("isMultiple")}
                        type="number"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("ProductOption_maxSelection_Descr")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="allowQuantity"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between p-1 rounded-lg shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>{t("ProductOption_allowQuantity")}</FormLabel>
                    <FormDescription>
                      {t("ProductOption_allowQuantity_Descr")}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      disabled={loading}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-flow-row-dense grid-cols-2 gap-1">
              <FormField
                control={form.control}
                name="minQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("ProductOption_minQuantity")}</FormLabel>
                    <FormControl>
                      <Input
                        disabled={loading || !form.watch("allowQuantity")}
                        type="number"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("ProductOption_minQuantity_Descr")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("ProductOption_maxQuantity")}</FormLabel>
                    <FormControl>
                      <Input
                        disabled={loading || !form.watch("allowQuantity")}
                        type="number"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("ProductOption_maxQuantity_Descr")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="selections"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("ProductOption_selections")}</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormDescription>
                    {t("ProductOption_selections_Descr")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sortOrder"
              render={({ field }) => (
                <FormItem className="p-3">
                  <FormLabel>{t("Category_sortOrder")}</FormLabel>
                  <FormControl>
                    <Input
                      disabled={loading}
                      className="font-mono"
                      placeholder={
                        t("input_placeholder1") + t("Category_sortOrder")
                      }
                      type="number"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex w-full items-center justify-end space-x-2 pt-6">
              <Button disabled={form.formState.isSubmitting} type="submit">
                {action === "Create" ? t("Create") : t("Update")}
              </Button>

              <DialogFooter className="sm:justify-start">
                <DialogClose asChild>
                  <Button
                    disabled={form.formState.isSubmitting}
                    variant="outline"
                  >
                    {t("Cancel")}
                  </Button>
                </DialogClose>
              </DialogFooter>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
