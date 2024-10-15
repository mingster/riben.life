"use client";

import { useToast } from "@/components/ui/use-toast";
import { useCart } from "@/hooks/use-cart";
import type { ItemOption } from "@/hooks/use-cart";

import { Button } from "@/components/ui/button";
import type { Product, ProductOption, Store, StoreOrder } from "@/types";
import type { ProductOptionSelections, StoreTables, StoreShipMethodMapping } from "@prisma/client";
import { useForm } from "react-hook-form";

import { useTranslation } from "@/app/i18n/client";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useI18n } from "@/providers/i18n-provider";
import { Minus, Plus } from "lucide-react";

import Currency from "@/components/currency";
import IconButton from "@/components/ui/icon-button";
import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";

import { AlertModal } from "@/components/modals/alert-modal";
import { useParams } from "next/navigation";
import { z } from "zod";
import { StoreTableCombobox } from "./store-table-combobox";

interface props {
  store: Store;
  order: StoreOrder;
}

// Modifiy Order Dialog
//
export const ModifiyOrderDialog: React.FC<props> = ({ store, order }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();
  const { lng } = useI18n();
  const { t } = useTranslation(lng, "storeAdmin");


  const formSchema = z.object({
    tableId: z.string().min(1),
    orderNum: z.number().optional(),
    paymentMethodId: z.string().optional(),
    shippingMethodId: z.string().optional(),
  });

  type formValues = z.infer<typeof formSchema>;

  const defaultValues = order
    ? {
      ...order,
    }
    : {};

  //console.log('defaultValues: ' + JSON.stringify(defaultValues));
  const form = useForm<formValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const {
    register,
    formState: { errors },
    handleSubmit,
    watch,
    clearErrors,
  } = useForm<formValues>();


  const onSubmit = async (data: formValues) => {
    setLoading(true);


    console.log('formValues', JSON.stringify(data));
    toast({
      title: '訂單更新了',
      description: "",
      variant: "success",
    });
    setLoading(false);
  }

  //console.log('StorePaymentMethods', JSON.stringify(store.StorePaymentMethods));

  //const params = useParams();
  //console.log(JSON.stringify(order));

  //console.log("form errors", form.formState.errors);

  const onCancel = async () => {
    if (confirm("are you sure?")) {
      alert("not yet implemented");
    }
    setOpen(false);
  };

  const handleTableChange = (fieldName: string, selectedVal: string) => {
    //console.log("fieldName", fieldName, selectedVal);
    //console.log("selected", selected);

    /*
    const base_price = Number(product.price);
    let selected = null;
    if (fieldName === "option1") {
      selected = option1_items.find((item) => item.name === selectedVal);
    } else if (fieldName === "option4") {
      selected = option4_items.find((item) => item.name === selectedVal);
      console.log("selected", selected);
    }

    if (selected) {
      const p = base_price + (selected?.price ?? 0) + checkedTotal;
      setUnitPrice(p);
      setTotal(quantity * p);
    }
    */
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="text-xs" variant={"outline"}>
            {t("Modify")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <div className="flex h-full flex-col">

            <DialogHeader className="p-1">
              <DialogTitle>修改訂單</DialogTitle>
              <DialogDescription>&nbsp;</DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-auto p-1">

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="w-full space-y-1"
                >
                  <div className="pb-5 flex items-center gap-5">
                    <FormField
                      control={form.control}
                      name="shippingMethodId"
                      render={({ field }) => (
                        <FormItem className="flex items-center">
                          <FormControl>
                            <RadioGroup
                              //onValueChange={(val) => handleTableChange(field.name, val)}
                              defaultValue={field.value}
                              className="flex items-center space-x-1 space-y-0"
                            >
                              {store.StoreShippingMethods.map((item) => (
                                <div
                                  key={item.methodId}
                                  className="flex items-center"
                                >
                                  <FormItem className="flex items-center space-x-1 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem value={item.methodId} />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                      {item.ShippingMethod.name}
                                    </FormLabel>
                                  </FormItem>
                                </div>
                              ))}
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="tableId"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-1 space-y-0">
                          <FormLabel className="text-nowrap">桌號</FormLabel>
                          <StoreTableCombobox
                            disabled={loading}
                            storeId={store.id}
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          />
                        </FormItem>
                      )}
                    />

                  </div>

                  <FormField
                    control={form.control}
                    name="paymentMethodId"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-1 space-y-0">
                        <FormLabel className="font-normal">修改付款方式</FormLabel>
                        <FormControl>
                          <RadioGroup
                            //onValueChange={(val) => handleTableChange(field.name, val)}
                            defaultValue={field.value}
                            className="flex items-center space-x-1 space-y-0"
                          >
                            {store.StorePaymentMethods.map((item) => (
                              <div
                                key={item.methodId}
                                className="flex items-center"
                              >
                                <FormItem className="flex items-center space-x-1 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value={item.methodId} />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {item.PaymentMethod.name}
                                  </FormLabel>
                                </FormItem>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />


                  <DialogFooter className="w-full pt-2 pb-2">

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
                        clearErrors(); setOpen(false);
                      }}
                      className="ml-2 disabled:opacity-25"
                    >
                      {t("Cancel")}
                    </Button>

                    <Button
                      className="text-xs"
                      variant={"destructive"}
                      onClick={onCancel}
                    >
                      刪單
                    </Button>
                  </DialogFooter>


                  <div className="pb-5">修改menu</div>


                </form>
              </Form>
            </div>

          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
