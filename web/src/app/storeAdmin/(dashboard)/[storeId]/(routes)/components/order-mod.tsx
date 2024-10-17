"use client";

import { useToast } from "@/components/ui/use-toast";
import { useCart } from "@/hooks/use-cart";
import type { ItemOption } from "@/hooks/use-cart";

import { Button } from "@/components/ui/button";
import type { Product, ProductOption, Store, StoreOrder } from "@/types";
import type { orderitemview, StoreTables, StoreShipMethodMapping } from "@prisma/client";
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
import { Minus, Plus, XIcon } from "lucide-react";

import Currency from "@/components/currency";
import IconButton from "@/components/ui/icon-button";
import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { z } from "zod";
import { StoreTableCombobox } from "./store-table-combobox";
import { Modal } from "@/components/ui/modal";

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


  const itemView = z.object({
    id: z.string().min(1),
    orderId: z.string().min(1),
    productId: z.string().min(1),
    quantity: z.coerce.number().min(1),
    unitDiscount: z.coerce.number().min(1),
    unitPrice: z.coerce.number().min(1),
  })

  const formSchema = z.object({
    tableId: z.string().min(1),
    orderNum: z.number().optional(),
    paymentMethodId: z.string().optional(),
    shippingMethodId: z.string().optional(),
    OrderItemView: itemView.array().optional(),
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
  //console.log('order', JSON.stringify(order));

  //console.log("form errors", form.formState.errors);

  const onCancel = async () => {
    if (confirm("are you sure?")) {
      alert("not yet implemented");
    }
    setOpen(false);
  };

  const handleShipMethodChange = (fieldName: string, selectedVal: string) => {
    console.log("fieldName", fieldName, selectedVal);
    form.setValue('shippingMethodId', selectedVal);
  };
  const handlePayMethodChange = (fieldName: string, selectedVal: string) => {
    console.log("fieldName", fieldName, selectedVal);
    form.setValue('paymentMethodId', selectedVal);
  };
  const [openModal, setOpenModal] = useState(false);

  const handleIncraseQuality = () => {
    //console.log('handleIncraseQuality: ' + currentItem.quantity);
  };

  const handleDecreaseQuality = () => {
    //currentItem.quantity = currentItem.quantity - 1;
    //onCartChange?.(newQuantity);
    //console.log('handleDecreaseQuality: ' + currentItem.quantity);
  };

  const handleQuantityInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const result = event.target.value.replace(/\D/g, "");
    if (result) {
      //onCartChange?.(Number(result));
    }
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
              <DialogTitle>新增/修改訂單</DialogTitle>
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
                              onValueChange={(val) => handleShipMethodChange(field.name, val)}
                              defaultValue={field.value}
                              className="flex items-center space-x-1 space-y-0"
                            >
                              {store.StoreShippingMethods.map((item) => (
                                <div
                                  key={item.ShippingMethod.id}
                                  className="flex items-center"
                                >
                                  <FormItem className="flex items-center space-x-1 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem value={item.ShippingMethod.id} />
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
                            disabled={loading || form.watch("shippingMethodId") !== '3203cf4c-e1c7-4b79-b611-62c920b50860'}
                            storeId={store.id}
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="pb-5 flex items-center gap-5">
                    <FormField
                      control={form.control}
                      name="paymentMethodId"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-1 space-y-0">
                          <FormLabel className="font-normal">付款方式</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={(val) => handlePayMethodChange(field.name, val)}
                              defaultValue={field.value}
                              className="flex items-center space-x-1 space-y-0"
                            >
                              {store.StorePaymentMethods.map((item) => (
                                <div
                                  key={item.PaymentMethod.id}
                                  className="flex items-center"
                                >
                                  <FormItem className="flex items-center space-x-1 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem value={item.PaymentMethod.id} />
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
                  </div>


                  {order.OrderItemView.map((item) => (
                    <div key={item.id} className="flex flex-row justify-between">
                      <div><XIcon className="text-red-400 h-4 w-4" /></div>
                      <div>{item.name}</div>
                      <div>

                        <div className="pl-2">
                          <div className="flex">
                            <div className="flex flex-nowrap content-center w-[20px]">
                              {item.quantity && item.quantity > 0 && (
                                //{currentItem.quantity > 0 && (
                                <IconButton
                                  onClick={handleDecreaseQuality}
                                  icon={
                                    <Minus
                                      size={18}
                                      className="dark:text-primary text-secondary"
                                    />
                                  }
                                />
                              )}
                            </div>
                            <div className="flex flex-nowrap content-center item">
                              <input
                                type="number"
                                className="w-10 text-center border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder="0"
                                value={Number(item.quantity) || 0}
                                onChange={handleQuantityInputChange}
                              />
                            </div>
                            <div className="flex flex-nowrap content-center w-[20px]">
                              <IconButton
                                onClick={handleIncraseQuality}
                                icon={
                                  <Plus
                                    size={18}
                                    className="dark:text-primary text-secondary"
                                  />
                                }
                              />
                            </div>
                          </div>
                        </div>


                      </div>

                    </div>
                  ))}

                  <Button onClick={() => setOpenModal(true)} variant={'outline'}>加點</Button>

                  <Modal isOpen={openModal} onClose={() => setOpenModal(false)} title='' description=''>
                    menu
                  </Modal>


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




                </form>
              </Form>
            </div>

          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
