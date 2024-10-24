"use client";

import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
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
import { useCallback, useEffect, useState } from "react";

import { z } from "zod";
import { StoreTableCombobox } from "../../components/store-table-combobox";

import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import Decimal from "decimal.js";
import { type UseFormProps, useFieldArray, useForm } from "react-hook-form";
import { OrderAddProductModal } from "./order-add-product-modal";
import axios, { type AxiosError } from "axios";

interface props {
  store: StoreWithProducts;
  order: StoreOrder | null; // when null, create new order
  action: string;
}

const formSchema = z.object({
  tableId: z.coerce.string(),
  orderNum: z.number().optional(),
  paymentMethodId: z.string().min(1, { message: "payment method is required" }),
  shippingMethodId: z.string().min(1, { message: "shipping method is required" }),
  OrderItemView: z
    .object({
      //id: z.string().min(1),
      //orderId: z.string().min(1),
      //productId: z.string().min(1, { message: "product is required" }),
      //quantity: z.coerce.number().min(1, { message: "quantity is required" }),
      productId: z.string().optional(),
      quantity: z.coerce.number().optional(),
      //variants: z.string().optional(),
      //unitDiscount: z.coerce.number().min(1),
      //unitPrice: z.coerce.number().min(1),
    })
    .array().optional(),
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
  //const isSubmittable = !!isDirty && !!isValid;

  //console.log('defaultValues: ' + JSON.stringify(defaultValues));
  const form = useForm<formValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const onSubmit = async (data: formValues) => {
    if (updatedOrder === null) {
      return;
    }

    setLoading(true);
    if (updatedOrder?.OrderItemView.length === 0) {
      alert(t("Order_edit_noItem"));
      setLoading(false);
      return;
    }

    //const order: StoreOrder = { /* initialize properties here */ };
    updatedOrder.paymentMethodId = data.paymentMethodId ?? "";
    updatedOrder.shippingMethodId = data.shippingMethodId ?? "";
    updatedOrder.tableId = data.tableId ?? null;
    updatedOrder.orderTotal = new Decimal(orderTotal);
    // NOTE: take OrderItemView data in order object instead of fieldArray

    //console.log("formValues", JSON.stringify(data));
    //console.log("updatedOrder", JSON.stringify(updatedOrder));

    const result = await axios.patch(
      `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${store.id}/orders/${updatedOrder.id}`,
      updatedOrder,
    );

    console.log("result", JSON.stringify(result));

    toast({
      title: t("Order_edit_updated"),
      description: "",
      variant: "success",
    });

    setLoading(false);

    router.refresh();
    router.back();
  };

  //console.log('StorePaymentMethods', JSON.stringify(store.StorePaymentMethods));

  //const params = useParams();
  //console.log('order', JSON.stringify(order));

  console.log("form errors", form.formState.errors);

  const onCancel = async () => {
    if (updatedOrder === null) {
      return;
    }

    if (confirm(t("Delete_Confirm"))) {
      setLoading(true);

      const result = await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${store.id}/orders/${updatedOrder?.id}`,
      );

      console.log("result", JSON.stringify(result));

      setLoading(false);

      toast({
        title: t("Order_edit_removed"),
        description: "",
        variant: "success",
      });
      router.refresh();
      router.back();
    }
  };

  const handleShipMethodChange = (fieldName: string, selectedVal: string) => {
    //console.log("fieldName", fieldName, selectedVal);
    form.setValue("shippingMethodId", selectedVal);

    if (updatedOrder) updatedOrder.shippingMethodId = selectedVal;
  };
  const handlePayMethodChange = (fieldName: string, selectedVal: string) => {
    //console.log("fieldName", fieldName, selectedVal);
    form.setValue("paymentMethodId", selectedVal);
    if (updatedOrder) updatedOrder.paymentMethodId = selectedVal;

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
  };

  //create an order, and then process to the selected payment method
  //
  const placeOrder = async () => {
    setLoading(true);

    if (!store.StorePaymentMethods[0]) {
      const errmsg = t("checkout_no_paymentMethod");
      console.error(errmsg);
      setLoading(false);

      return;
    }
    if (!store.StoreShippingMethods[0]) {
      const errmsg = t("checkout_no_shippingMethod");
      console.error(errmsg);
      setLoading(false);
      return;
    }

    // convert cart items into string array to send to order creation
    const productIds: string[] = [];
    const prices: number[] = [];
    const quantities: number[] = [];
    //const notes: string[] = [];
    const variants: string[] = [];
    const variantCosts: string[] = [];

    const url = `${process.env.NEXT_PUBLIC_API_URL}/store/${store.id}/create-empty-order`;
    const body = JSON.stringify({
      userId: null, //user is optional
      tableId: "",
      total: 0,
      currency: store.defaultCurrency,
      shippingMethodId: store.StoreShippingMethods[0].methodId,
      productIds: productIds,
      quantities: quantities,
      unitPrices: prices,
      variants: variants,
      variantCosts: variantCosts,
      orderNote: 'created by store admin',
      paymentMethodId: store.StorePaymentMethods[0].methodId,
    });

    //console.log(JSON.stringify(body));

    try {

      const result = await axios.post(url, body);
      console.log('featch result', JSON.stringify(result));
      const newOrder = result.data.order as StoreOrder;
      setUpdatedOrder(newOrder);

      console.log(JSON.stringify(result));

      //console.log('order.id', order.id);

      //return value to parent component
      //onChange?.(true);

      // redirect to payment page
      //const paymenturl = `/checkout/${order.id}/${paymentMethod.payUrl}`;
      //router.push(paymenturl);
    } catch (error: unknown) {
      const err = error as AxiosError;
      console.error(error);
      toast({
        title: "Something went wrong.",
        description: t("checkout_placeOrder_exception") + err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // receive new items from OrderAddProductModal
  const handleAddToOrder = async (newItems: orderitemview[]) => {
    if (!updatedOrder) {
      console.log("create new?", action);

      // create new empty order
      await placeOrder();
      if (!updatedOrder) {
        console.log("failed to place order", action);
        return;
      }
    }

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

  useEffect(() => {
    setOrderTotal(updatedOrder?.orderTotal || 0);
  }, [updatedOrder?.orderTotal]);

  const placeOrderCallback = useCallback(placeOrder, []);

  // create empty order if not exist
  useEffect(() => {

    const createOrder = async () => {
      if (updatedOrder === null) {
        await placeOrderCallback();
      }
    };

    createOrder();
  }, [updatedOrder, placeOrderCallback]);

  const pageTitle = t(action) + t('Order_edit_title');

  return (
    <Card>
      <CardHeader className='p-5 font-extrabold text-2xl'>{pageTitle}</CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="w-full space-y-1"
          >
            <div className="pb-1 flex items-center gap-1">
              {Object.entries(form.formState.errors).map(([key, error]) => (
                <div key={key} className="text-red-500">
                  {error.message?.toString()}
                </div>
              ))}

              {updatedOrder?.orderNum && (<><span>{t("Order_edit_orderNum")}</span><div className="font-extrabold">{updatedOrder?.orderNum}</div></>)}
            </div>

            <div className="pb-1 flex items-center gap-1">
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

            <div className="pb-1 flex items-center gap-1">
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

            <div className="w-full text-right">{/*加點按鈕 */}
              <Button
                type="button"
                onClick={() => setOpenModal(true)}
                variant={"outline"}
              >
                {t("Order_edit_addButton")}
              </Button>
            </div>

            <OrderAddProductModal
              store={store}
              order={updatedOrder}
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
                disabled={loading||!form.formState.isValid}
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
                {t("Order_edit_deleteButton")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
