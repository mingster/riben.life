"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { orderitemview } from "@prisma/client";
import { IconArrowBack, IconMinus, IconPlus, IconX } from "@tabler/icons-react";
import axios, { type AxiosError } from "axios";
import Decimal from "decimal.js";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
	type DefaultValues,
	type Resolver,
	useFieldArray,
	useForm,
} from "react-hook-form";
import {
	type UpdateOrderEditFormInput,
	updateOrderEditFormSchema,
} from "@/actions/storeAdmin/order/update-order-edit.validation";
import { useTranslation } from "@/app/i18n/client";
import { AdminSettingsTabFormFooter } from "@/components/admin-settings-tabs";
import Currency from "@/components/currency";
import { FormSubmitOverlay } from "@/components/form-submit-overlay";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import IconButton from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { adminCrudUseFormProps } from "@/lib/admin-form-defaults";
import logger from "@/lib/logger";
import { useI18n } from "@/providers/i18n-provider";
import type {
	StoreForOrderEdit,
	StoreOrder,
	StorePaymentMethodMapping,
	StoreShipMethodMapping,
} from "@/types";
import { OrderStatus, PageAction } from "@/types/enum";
import { FacilityCombobox } from "../../components/facility-combobox";
import { OrderAddProductModal } from "./order-add-product-modal";

interface props {
	store: StoreForOrderEdit;
	order: StoreOrder | null; // when null, create new order
	action: string;
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
	const { t } = useTranslation(lng);

	const router = useRouter();

	const defaultValues = order
		? {
				...order,
			}
		: {};

	const form = useForm<UpdateOrderEditFormInput>({
		...adminCrudUseFormProps,
		resolver: zodResolver(
			updateOrderEditFormSchema,
		) as Resolver<UpdateOrderEditFormInput>,
		defaultValues: defaultValues as DefaultValues<UpdateOrderEditFormInput>,
		reValidateMode: "onChange",
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
		control: form.control,
		name: "OrderItemView",
	});

	// update order in persisted storage
	const onSubmit = async (data: UpdateOrderEditFormInput) => {
		if (updatedOrder === null) {
			return;
		}

		setLoading(true);
		if (updatedOrder?.OrderItemView.length === 0) {
			alert(t("order_edit_no_item"));
			setLoading(false);

			return;
		}

		//const order: StoreOrder = { /* initialize properties here */ };
		updatedOrder.paymentMethodId = data.paymentMethodId ?? "";
		updatedOrder.shippingMethodId = data.shippingMethodId ?? "";
		(updatedOrder as StoreOrder & { facilityId?: string | null }).facilityId =
			data.facilityId ?? null;
		updatedOrder.orderTotal = new Decimal(orderTotal);
		// NOTE: take OrderItemView data in order object instead of fieldArray

		//console.log("formValues", JSON.stringify(data));
		//console.log("updatedOrder", JSON.stringify(updatedOrder));

		const _result = await axios.patch(
			`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${store.id}/orders/${updatedOrder.id}`,
			updatedOrder,
		);

		logger.info("result");

		toastSuccess({
			title: t("order_edit_updated"),
			description: "",
		});

		setLoading(false);

		router.refresh();
		router.back();
	};

	//console.log('StorePaymentMethods', JSON.stringify(store.StorePaymentMethods));

	//const params = useParams();
	//console.log('order', JSON.stringify(order));

	logger.info("form errors");

	// mark order as voided if total is zero.  Delete the order if total is zero.
	const onCancel = async () => {
		if (updatedOrder === null) {
			return;
		}

		let message = t("delete_confirm");

		if (updatedOrder.isPaid) {
			//construct message for refund
			message = `取消本訂單將退款 ＄${updatedOrder.orderTotal}，確定嗎？`;
		}

		if (confirm(message)) {
			setLoading(true);
			form.clearErrors();
			const _result = await axios.delete(
				`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${store.id}/orders/${updatedOrder?.id}`,
			);

			//console.log("result", JSON.stringify(result));

			setLoading(false);

			toastSuccess({
				title: t("order_edit_removed"),
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

		form.setValue(`OrderItemView.${index}.quantity`, row.quantity);
		updatedOrder.OrderItemView[index].quantity = row.quantity;

		recalc();

		//console.log('handleIncraseQuality: ' + currentItem.quantity);
	};

	const handleDecreaseQuality = (index: number) => {
		if (!updatedOrder) return;

		const row = fields[index];
		row.quantity = row.quantity - 1;
		update(index, row);
		form.setValue(`OrderItemView.${index}.quantity`, row.quantity);

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
			const _errmsg = t("checkout_no_payment_method");
			logger.error("Operation log", {
				tags: ["error"],
			});
			setLoading(false);

			return;
		}
		if (!store.StoreShippingMethods[0]) {
			const _errmsg = t("checkout_no_shipping_method");
			logger.error("Operation log", {
				tags: ["error"],
			});
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
			facilityId: "",
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
			logger.info("featch result");
			const newOrder = result.data.order as StoreOrder;
			setUpdatedOrder(newOrder);

			logger.info("Operation log");

			//console.log('order.id', order.id);

			//return value to parent component
			//onChange?.(true);

			// redirect to payment page
			//const paymenturl = `/checkout/${order.id}/${paymentMethod.payUrl}`;
			//router.push(paymenturl);
		} catch (error: unknown) {
			const err = error as AxiosError;
			logger.error("Operation log", {
				metadata: {
					error: error instanceof Error ? error.message : String(error),
				},
				tags: ["error"],
			});
			toastError({
				title: "Something went wrong.",
				description: t("checkout_place_order_exception") + err.message,
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

		logger.info("fields");

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

	const pageTitle = t(action) + t("order_edit_title");

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
						{t("refund")}
					</Button>

					<Button
						type="button"
						disabled={loading || form.formState.isSubmitting}
						variant="outline"
						onClick={() => {
							form.clearErrors();
							router.back();
						}}
						className="ml-2 disabled:opacity-25"
					>
						{t("cancel")}
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
						{t("refund")}
					</Button>

					<Button
						type="button"
						disabled={loading || form.formState.isSubmitting}
						variant="outline"
						onClick={() => {
							form.clearErrors();
							router.back();
						}}
						className="ml-2 disabled:opacity-25"
					>
						{t("cancel")}
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

				<div
					className="relative"
					aria-busy={loading || form.formState.isSubmitting}
				>
					<FormSubmitOverlay
						visible={loading || form.formState.isSubmitting}
						statusText={t("submitting") || "Submitting…"}
					/>
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
										<span>{t("order_edit_order_num")}</span>
										<div className="font-extrabold">
											{updatedOrder?.orderNum}
										</div>
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
									name="facilityId"
									render={({ field }) => (
										<FormItem className="flex items-center space-x-1 space-y-0">
											<FormLabel className="text-nowrap">桌號</FormLabel>

											<FacilityCombobox
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
									{t("order_edit_add_button")}
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
										form.formState.errors?.OrderItemView?.[index]?.message;

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
															{...form.register(
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

							<AdminSettingsTabFormFooter className="w-full flex-wrap py-2">
								<Button
									disabled={loading || !form.formState.isValid}
									className="touch-manipulation disabled:opacity-25"
									type="submit"
								>
									{t("save")}
								</Button>
								{action === PageAction.modify && (
									<Button
										type="button"
										disabled={loading || form.formState.isSubmitting}
										variant="outline"
										onClick={() => {
											form.clearErrors();
											router.back();
										}}
										className="touch-manipulation disabled:opacity-25"
									>
										{t("cancel")}
									</Button>
								)}
								<Button
									disabled={loading || form.formState.isSubmitting}
									className="touch-manipulation text-xs"
									variant={"destructive"}
									onClick={onCancel}
								>
									{t("order_edit_delete_button")}
								</Button>
							</AdminSettingsTabFormFooter>
						</form>
					</Form>
				</div>
			</CardContent>
		</Card>
	);
};
