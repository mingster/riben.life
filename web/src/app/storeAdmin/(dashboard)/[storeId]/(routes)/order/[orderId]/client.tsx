"use client";

import { toastError, toastSuccess } from "@/components/toaster";
import {
	IconCopy,
	IconEdit,
	IconMinus,
	IconDots,
	IconPlus,
	IconTrash,
	IconArrowBack,
	IconX,
} from "@tabler/icons-react";
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

import Currency from "@/components/currency";
import IconButton from "@/components/ui/icon-button";
import { useCallback, useEffect, useState } from "react";

import { z } from "zod";
import { StoreTableCombobox } from "../../components/store-table-combobox";

import { Input } from "@/components/ui/input";
import { OrderStatus, PageAction } from "@/types/enum";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { type AxiosError } from "axios";
import Decimal from "decimal.js";
import Link from "next/link";
import { type UseFormProps, useFieldArray, useForm } from "react-hook-form";
import { OrderAddProductModal } from "./order-add-product-modal";

interface props {
	store: StoreWithProducts;
	order: StoreOrder | null; // when null, create new order
	action: string;
}

const formSchema = z.object({
	tableId: z.string().optional().nullable(),
	orderNum: z.number().optional(),
	paymentMethodId: z.string().min(1, {
		error: "payment method is required",
	}),
	shippingMethodId: z.string().min(1, {
		error: "shipping method is required",
	}),
	OrderItemView: z
		.object({
			//id: z.string().min(1),
			//orderId: z.string().min(1),
			productId: z.string().min(1, {
				error: "product is required",
			}),
			quantity: z.number().min(1, {
				error: "quantity is required",
			}),
			//variants: z.string().optional(),
			//unitDiscount: z.number().min(1),
			//unitPrice: z.number().min(1),
		})
		.array()
		.min(1, {
			error: "at least one item is required",
		})
		.optional(),
});

function useZodForm<TSchema extends z.ZodType<any, any, any>>(
	props: Omit<UseFormProps<z.infer<TSchema>>, "resolver"> & {
		schema: TSchema;
	},
) {
	const form = useForm<z.infer<TSchema>>({
		...props,
		resolver: zodResolver(props.schema) as any,
	});

	return form;
}

// Modify Order Dialog
//
export const OrderEditClient: React.FC<props> = ({ store, order, action }) => {
	//console.log('order', JSON.stringify(order));

	const [_open, _setOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const [updatedOrder, setUpdatedOrder] = useState<StoreOrder | null>(order);
	const [orderTotal, setOrderTotal] = useState(order?.orderTotal || 0);
	const [openModal, setOpenModal] = useState(false);

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

	// update order in persisted storage
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

		toastSuccess({
			title: t("Order_edit_updated"),
			description: "",
		});

		setLoading(false);

		router.refresh();
		router.back();
	};

	//console.log('StorePaymentMethods', JSON.stringify(store.StorePaymentMethods));

	//const params = useParams();
	//console.log('order', JSON.stringify(order));

	console.log("form errors", form.formState.errors);

	// mark order as voided if total is zero.  Delete the order if total is zero.
	const onCancel = async () => {
		if (updatedOrder === null) {
			return;
		}

		let message = t("Delete_Confirm");

		if (updatedOrder.isPaid) {
			//construct message for refund
			message = `取消本訂單將退款 ＄${updatedOrder.orderTotal}，確定嗎？`;
		}

		if (confirm(message)) {
			setLoading(true);
			clearErrors();
			const _result = await axios.delete(
				`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${store.id}/orders/${updatedOrder?.id}`,
			);

			//console.log("result", JSON.stringify(result));

			setLoading(false);

			toastSuccess({
				title: t("Order_edit_removed"),
				description: "",
			});
			router.refresh();
			router.back();
		}
	};

	const handleShipMethodChange = (_fieldName: string, selectedVal: string) => {
		//console.log("fieldName", fieldName, selectedVal);
		form.setValue("shippingMethodId", selectedVal);

		if (updatedOrder) updatedOrder.shippingMethodId = selectedVal;
	};
	const handlePayMethodChange = (_fieldName: string, selectedVal: string) => {
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
		updatedOrder.OrderItemView.map((item: orderitemview) => {
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

	// when action is to create new order, we create an persisted order first.
	//
	const placeOrder = useCallback(async () => {
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
			orderNote: "created by store admin",
			paymentMethodId: store.StorePaymentMethods[0].methodId,
		});

		//console.log(JSON.stringify(body));

		try {
			const result = await axios.post(url, body);
			console.log("featch result", JSON.stringify(result));
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
			toastError({
				title: "Something went wrong.",
				description: t("checkout_placeOrder_exception") + err.message,
			});
		} finally {
			setLoading(false);
		}
	}, [
		store.StorePaymentMethods,
		store.StoreShippingMethods,
		store.defaultCurrency,
		store.id,
		t,
	]);

	// receive new items from OrderAddProductModal
	const handleAddToOrder = async (newItems: orderitemview[]) => {
		if (!updatedOrder) {
			return;
		}

		updatedOrder.OrderItemView = updatedOrder.OrderItemView.concat(newItems);

		append(
			newItems.map((item) => ({
				...item,
				quantity: item.quantity ?? 1, // provide a default value of 0 if quantity is null
			})),
		);

		newItems.map((item) =>
			fields.push({
				...item,
				quantity: item.quantity ?? 1, // provide a default value of 0 if quantity is null
			}),
		);

		console.log("fields", JSON.stringify(fields));

		recalc();
	};

	useEffect(() => {
		setOrderTotal(updatedOrder?.orderTotal || 0);
	}, [updatedOrder?.orderTotal]);

	// create order object if not exist. This should occur only in 新增訂單 workflow.
	//const placeOrderCallback = useCallback(placeOrder, []);
	useEffect(() => {
		const createOrder = async () => {
			if (updatedOrder === null) {
				await placeOrder();
			}
		};

		createOrder();
	}, [updatedOrder, placeOrder]);

	const pageTitle = t(action) + t("Order_edit_title");

	if (updatedOrder?.orderStatus === OrderStatus.Completed) {
		// do not allow editing if order is completed
		// display refund button instead
		return (
			<Card>
				<CardHeader className="pt-5 pl-5 pb-0 font-extrabold text-2xl">
					這是已完成的訂單。是否要退款/刪單？
				</CardHeader>
				<CardContent>
					<Button
						type="button"
						variant={"default"}
						onClick={() => {
							router.push(
								`/storeAdmin/${updatedOrder.storeId}/order/${updatedOrder.id}/refund`,
							);
						}}
					>
						<IconArrowBack className="mr-0 size-4" />
						{t("Refund")}
					</Button>

					<Button
						type="button"
						disabled={loading || form.formState.isSubmitting}
						variant="outline"
						onClick={() => {
							clearErrors();
							router.back();
						}}
						className="ml-2 disabled:opacity-25"
					>
						{t("Cancel")}
					</Button>
				</CardContent>
			</Card>
		);
	}

	if (updatedOrder?.isPaid === true) {
		// do not allow editing if order is paid
		return (
			<Card>
				<CardHeader className="pt-5 pl-5 pb-0 font-extrabold text-2xl">
					這是已付款的訂單。是否要退款？
				</CardHeader>
				<CardContent>
					<Button
						type="button"
						variant={"default"}
						onClick={() => {
							router.push(
								`/storeAdmin/${updatedOrder.storeId}/order/${updatedOrder.id}/refund`,
							);
						}}
					>
						<IconArrowBack className="mr-0 size-4" />
						{t("Refund")}
					</Button>

					<Button
						type="button"
						disabled={loading || form.formState.isSubmitting}
						variant="outline"
						onClick={() => {
							clearErrors();
							router.back();
						}}
						className="ml-2 disabled:opacity-25"
					>
						{t("Cancel")}
					</Button>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader className="pt-5 pl-5 pb-0 font-extrabold text-2xl">
				{pageTitle}
			</CardHeader>
			<CardContent>
				<div className="text-muted-foreground text-xs pt-0">
					可以在此修改未付款、未完成的訂單。
					<br />
					若訂單已付款，修改可能會產生退款。
				</div>

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
						</div>

						<div className="pb-1 flex items-center gap-1">
							{updatedOrder?.orderNum && (
								<>
									<span>{t("Order_edit_orderNum")}</span>
									<div className="font-extrabold">{updatedOrder?.orderNum}</div>
								</>
							)}
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
											//disabled={loading || form.formState.isSubmitting}
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

						<div className="w-full text-right">
							{/*加點按鈕 */}
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
						{updatedOrder?.OrderItemView.map(
							(item: orderitemview, index: number) => {
								const errorForFieldName =
									errors?.OrderItemView?.[index]?.message;

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
												<IconX className="text-red-400 size-4" />
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
																<IconMinus
																	size={18}
																	className="dark:text-primary text-slate-500"
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
															<IconPlus
																size={18}
																className="dark:text-primary text-slate-500"
															/>
														}
													/>
												</div>
											</div>
										</div>
									</div>
								);
							},
						)}

						<div className="w-full py-2 flex gap-2">
							<Button
								disabled={loading || !form.formState.isValid}
								className="disabled:opacity-25"
								type="submit"
							>
								{t("Save")}
							</Button>

							{action === PageAction.Modify && (
								<Button
									type="button"
									disabled={loading || form.formState.isSubmitting}
									variant="outline"
									onClick={() => {
										clearErrors();
										router.back();
									}}
									className="ml-2 disabled:opacity-25"
								>
									{t("Cancel")}
								</Button>
							)}

							<Button
								disabled={loading || form.formState.isSubmitting}
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
