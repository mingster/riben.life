"use client";

import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type {
  StoreOrder,
  StorePaymentMethodMapping,
  StoreShipMethodMapping,
  StoreWithProducts,
} from "@/types";
import type { orderitemview } from "@prisma/client";

import { useTranslation } from "@/app/i18n/client";

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
import { useEffect, useState } from "react";

import { z } from "zod";
import { StoreTableCombobox } from "../../components/store-table-combobox";

import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import Decimal from "decimal.js";
import { type UseFormProps, useFieldArray, useForm } from "react-hook-form";
import { OrderAddProductModal } from "./order-add-product-modal";

interface props {
  store: StoreWithProducts;
  order: StoreOrder | null; // when null, create new order
  action: string;
}

const formSchema = z.object({
  tableId: z.coerce.string(),
  orderNum: z.number().optional(),
  paymentMethodId: z.string().optional(),
  shippingMethodId: z.string().optional(),
  OrderItemView: z
    .object({
      //id: z.string().min(1),
      //orderId: z.string().min(1),
      productId: z.string().min(1),
      quantity: z.coerce.number().min(1),
      //variants: z.string().optional(),
      //unitDiscount: z.coerce.number().min(1),
      //unitPrice: z.coerce.number().min(1),
    })
    .array(),
});

function useZodForm<TSchema extends z.ZodType>(
  props: Omit<UseFormProps<TSchema["_input"]>, "resolver"> & {
    schema: TSchema;
  },
) {
  const form = useForm<TSchema["_input"]>({
    ...props,
    resolver: zodResolver(props.schema, undefined, {
      // This makes it so we can use `.transform()`s on the schema without same transform getting applied again when it reaches the server
      //rawValues: true
    }),
  });

  return form;
}

// Modifiy Order Dialog
//
export const OrderEditClient: React.FC<props> = ({ store, order, action }) => {
  //console.log('order', JSON.stringify(order));

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [updatedOrder, setUpdatedOrder] = useState<StoreOrder | null>(order);
  const [orderTotal, setOrderTotal] = useState(order?.orderTotal || 0);
  const [openModal, setOpenModal] = useState(false);

  const { toast } = useToast();
  const { lng } = useI18n();
  const { t } = useTranslation(lng, "storeAdmin");

  const router = useRouter();

  type formValues = z.infer<typeof formSchema>;
  //type OrderItemView = z.infer<typeof formSchema>["OrderItemView"][number];
  const defaultValues = order
    ? {
        ...order,
      }
    : {};

  // access OrderItemView using fields
  const {
    handleSubmit,
    register,
    control,
    formState: { isValid, errors, isValidating, isDirty },
    reset,
    watch,
    clearErrors,
    setValue,
  } = useZodForm({
    schema: formSchema,
    defaultValues,
    mode: "onChange",
  });

  const {
    fields,
    update,
    append,
    prepend,
    remove,
    swap,
    move,
    insert,
    replace,
  } = useFieldArray({
    control, // control props comes from useForm (optional: if you are using FormProvider)
    name: "OrderItemView", // unique name for your Field Array
  });

  //console.log("fields", fields, fields.length);
  const isSubmittable = !!isDirty && !!isValid;

  //console.log('defaultValues: ' + JSON.stringify(defaultValues));
  const form = useForm<formValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const onSubmit = async (data: formValues) => {
    setLoading(true);
    if (updatedOrder?.OrderItemView.length === 0) {
      alert("請添加商品");
      setLoading(false);
      return;
    }

    console.log("formValues", JSON.stringify(data));
    console.log("updatedOrder", JSON.stringify(updatedOrder));

    // NOTE: take OrderItemView data in order object instead of fieldArray

    toast({
      title: "訂單更新了",
      description: "",
      variant: "success",
    });

    setLoading(false);

    //router.back();
  };

  //console.log('StorePaymentMethods', JSON.stringify(store.StorePaymentMethods));

  //const params = useParams();
  //console.log('order', JSON.stringify(order));

  console.log("form errors", form.formState.errors);

  const onCancel = async () => {
    if (confirm("are you sure?")) {
      alert("not yet implemented");
    }
    router.back();
  };

  const handleShipMethodChange = (fieldName: string, selectedVal: string) => {
    console.log("fieldName", fieldName, selectedVal);
    form.setValue("shippingMethodId", selectedVal);
  };
  const handlePayMethodChange = (fieldName: string, selectedVal: string) => {
    console.log("fieldName", fieldName, selectedVal);
    form.setValue("paymentMethodId", selectedVal);
  };

  const handleIncraseQuality = (index: number) => {
    if (!updatedOrder) return;

    const row = fields[index];
    row.quantity = row.quantity + 1;
    update(index, row);

    setValue(`OrderItemView.${index}.quantity`, row.quantity);
    updatedOrder.OrderItemView[index].quantity = row.quantity;

    recalc();

    //console.log('handleIncraseQuality: ' + currentItem.quantity);
  };

  const handleDecreaseQuality = (index: number) => {
    if (!updatedOrder) return;

    const row = fields[index];
    row.quantity = row.quantity - 1;
    update(index, row);
    setValue(`OrderItemView.${index}.quantity`, row.quantity);

    updatedOrder.OrderItemView[index].quantity = row.quantity;

    if (row.quantity <= 0) {
      handleDeleteOrderItem(index);
      return;
    }

    recalc();
  };

  const handleQuantityInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const result = event.target.value.replace(/\D/g, "");
    if (result) {
      //onCartChange?.(Number(result));
    }
  };

  const recalc = () => {
    if (!updatedOrder) return;

    let total = 0;
    updatedOrder.OrderItemView.map((item) => {
      if (item.unitPrice && item.quantity)
        total += Number(item.unitPrice) * item.quantity;
    });
    setOrderTotal(total);
    updatedOrder.orderTotal = new Decimal(total);
  };

  const handleDeleteOrderItem = (index: number) => {
    if (!updatedOrder) return;

    //const rowToRemove = fields[index];
    //console.log("rowToRemove", JSON.stringify(rowToRemove));
    //console.log('rowToRemove: ' + rowToRemove.publicId);
    updatedOrder.OrderItemView.splice(index, 1);

    //remove from client data
    fields.splice(index, 1);
    //remove(index);

    recalc();

    //1. remove from cloud storage

    //2. remove from database

    //console.log('urlToDelete: ' + urlToDelete);

    //console.log('order', JSON.stringify(order));
  };

  useEffect(() => {
    setOrderTotal(updatedOrder?.orderTotal || 0);
  }, [updatedOrder?.orderTotal]);

  const handleAddToOrder = (newItems: orderitemview[]) => {
    if (!updatedOrder) return;
    //console.log("newItems", JSON.stringify(newItems));

    updatedOrder.OrderItemView = updatedOrder.OrderItemView.concat(newItems);

    append(
      newItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity || 1,
      })),
    );

    recalc();
  };

  return (
    <Card>
      <CardHeader>新增/修改訂單</CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="w-full space-y-1"
          >
            {Object.entries(form.formState.errors).map(([key, error]) => (
              <div key={key} className="text-red-500">
                {error.message?.toString()}
              </div>
            ))}

            <div className="pb-5 flex items-center gap-5">
              <FormField
                control={form.control}
                name="shippingMethodId"
                render={({ field }) => (
                  <FormItem className="flex items-center">
                    <FormControl>
                      <RadioGroup
                        onValueChange={(val) =>
                          handleShipMethodChange(field.name, val)
                        }
                        defaultValue={field.value}
                        className="flex items-center space-x-1 space-y-0"
                      >
                        {store.StoreShippingMethods.map(
                          (item: StoreShipMethodMapping) => (
                            <div
                              key={item.ShippingMethod.id}
                              className="flex items-center"
                            >
                              <FormItem className="flex items-center space-x-1 space-y-0">
                                <FormControl>
                                  <RadioGroupItem
                                    value={item.ShippingMethod.id}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {item.ShippingMethod.name}
                                </FormLabel>
                              </FormItem>
                            </div>
                          ),
                        )}
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
                      disabled={
                        loading ||
                        form.watch("shippingMethodId") !==
                          "3203cf4c-e1c7-4b79-b611-62c920b50860"
                      }
                      //disabled={loading}
                      storeId={store.id}
                      onValueChange={field.onChange}
                      defaultValue={field.value || ""}
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
                        onValueChange={(val) =>
                          handlePayMethodChange(field.name, val)
                        }
                        defaultValue={field.value}
                        className="flex items-center space-x-1 space-y-0"
                      >
                        {store.StorePaymentMethods.map(
                          (item: StorePaymentMethodMapping) => (
                            <div
                              key={item.PaymentMethod.id}
                              className="flex items-center"
                            >
                              <FormItem className="flex items-center space-x-1 space-y-0">
                                <FormControl>
                                  <RadioGroupItem
                                    value={item.PaymentMethod.id}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {item.PaymentMethod.name}
                                </FormLabel>
                              </FormItem>
                            </div>
                          ),
                        )}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="text-bold">
                <Currency value={orderTotal} />
              </div>
            </div>

            <div className="w-full text-right">
              <Button
                type="button"
                onClick={() => setOpenModal(true)}
                variant={"outline"}
              >
                加點
              </Button>
            </div>

            <OrderAddProductModal
              store={store}
              order={order}
              onValueChange={(newItems: orderitemview[] | []) => {
                handleAddToOrder(newItems);
              }}
              openModal={openModal}
              onModalClose={() => setOpenModal(false)}
            />
            {updatedOrder?.OrderItemView.map((item, index) => {
              const errorForFieldName = errors?.OrderItemView?.[index]?.message;

              return (
                <div
                  key={`${item.id}${index}`}
                  className="grid grid-cols-[5%_70%_10%_15%] gap-1 w-full border"
                >
                  {errorForFieldName && <p>{errorForFieldName}</p>}

                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={() => handleDeleteOrderItem(index)}
                    >
                      <XIcon className="text-red-400 h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center">
                    {item.name}
                    {item.variants && (
                      <div className="pl-3 text-sm">- {item.variants}</div>
                    )}
                  </div>

                  <div className="place-self-center">
                    <Currency value={Number(item.unitPrice)} />
                  </div>

                  <div className="place-self-center">
                    <div className="flex">
                      <div className="flex flex-nowrap content-center w-[20px]">
                        {item.quantity && item.quantity > 0 && (
                          //{currentItem.quantity > 0 && (
                          <IconButton
                            onClick={() => handleDecreaseQuality(index)}
                            icon={
                              <Minus
                                size={18}
                                className="dark:text-primary text-secondary"
                              />
                            }
                          />
                        )}
                      </div>
                      <div className="flex flex-nowrap content-center items-center ">
                        <Input
                          {...register(
                            `OrderItemView.${index}.quantity` as const,
                          )}
                          type="number"
                          className="w-10 text-center border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          value={Number(item.quantity) || 0}
                          onChange={handleQuantityInputChange}
                        />
                      </div>
                      <div className="flex flex-nowrap content-center w-[20px]">
                        <IconButton
                          onClick={() => handleIncraseQuality(index)}
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
              );
            })}

            <div className="w-full pt-2 pb-2">
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
                  router.back();
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
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
