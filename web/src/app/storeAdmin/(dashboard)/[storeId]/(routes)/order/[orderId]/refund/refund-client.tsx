"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { orderitemview } from "@prisma/client";
import { IconArrowBack, IconCheck, IconMinus } from "@tabler/icons-react";
import Decimal from "decimal.js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
	type DefaultValues,
	type Resolver,
	useFieldArray,
	useForm,
} from "react-hook-form";
import {
	type UpdateOrderRefundFormInput,
	updateOrderRefundFormSchema,
} from "@/actions/storeAdmin/order/update-order-refund.validation";
import { useTranslation } from "@/app/i18n/client";
import Currency from "@/components/currency";
import { FormSubmitOverlay } from "@/components/form-submit-overlay";
import { toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import IconButton from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { adminCrudUseFormProps } from "@/lib/admin-form-defaults";
import logger from "@/lib/logger";
import { useI18n } from "@/providers/i18n-provider";
import type { StoreOrder } from "@/types";

interface props {
	order: StoreOrder;
}

export const OrderRefundClient: React.FC<props> = ({ order }) => {
	//console.log('order', JSON.stringify(order));

	if (order == null) {
		throw new Error("order is null");
	}

	//const [open, setOpen] = useState(false);
	//const [openModal, setOpenModal] = useState(false);

	const [loading, setLoading] = useState(false);

	const [updatedOrder, _setUpdatedOrder] = useState<StoreOrder>(order);

	const [orderTotal, setOrderTotal] = useState(Number(order.orderTotal));
	const [refundAmount, setRefundAmount] = useState(orderTotal);

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const router = useRouter();

	const defaultValues = order
		? {
				...order,
			}
		: {};

	const form = useForm<UpdateOrderRefundFormInput>({
		...adminCrudUseFormProps,
		resolver: zodResolver(
			updateOrderRefundFormSchema,
		) as Resolver<UpdateOrderRefundFormInput>,
		defaultValues: defaultValues as DefaultValues<UpdateOrderRefundFormInput>,
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
	const onSubmit = async (_data: UpdateOrderRefundFormInput) => {
		if (updatedOrder === null) {
			return;
		}

		toastSuccess({
			title: t("order_edit_updated"),
			description: "",
		});

		setLoading(false);

		router.refresh();
		router.back();
	};

	//const params = useParams();
	//console.log('order', JSON.stringify(order));

	logger.info("form errors", { metadata: { errors: form.formState.errors } });

	const handleDecreaseQuality = (index: number) => {
		if (!updatedOrder) return;

		const row = fields[index];
		row.quantity = row.quantity - 1;
		if (row.quantity <= 0) {
			row.quantity = 0;
		}
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

		setRefundAmount(Number(order.orderTotal) - total);

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

	useEffect(() => {
		setOrderTotal(Number(updatedOrder?.orderTotal) || 0);
	}, [updatedOrder?.orderTotal]);

	const pageTitle = "退款/刪單";

	return (
		<Card>
			<CardHeader className="pt-5 pl-5 pb-0 font-extrabold text-2xl">
				{pageTitle}
			</CardHeader>
			<CardContent>
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
								<div className="text-bold">訂單金額:</div>
								<div>
									<Currency value={orderTotal} />
								</div>
								<div>
									<Button
										disabled={loading || !form.formState.isValid}
										className="disabled:opacity-25 bg-red-700 dark:bg-red-500 dark:text-white hover:bg-red-600"
										type="submit"
									>
										<IconArrowBack className="mr-0 size-4" />
										{t("refund_all")}
									</Button>
								</div>
								<div>
									<Button
										type="button"
										variant="outline"
										onClick={() => {
											form.clearErrors();
											router.back();
											//router.push(`/${params.storeId}/support`);
										}}
									>
										{t("cancel")}
									</Button>
								</div>
							</div>

							<div className="pt-10 text-muted-foreground text-xs">
								請勾選要保留的商品。完成後,請點擊下方「退款」鍵。
							</div>

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
													<IconCheck className="text-green-400 size-4" />
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
													<div className="flex flex-nowrap content-center w-[20px]" />
												</div>
											</div>
										</div>
									);
								},
							)}

							<div className="pb-1 flex items-center gap-1">
								<div className="text-bold">退款金額:</div>
								<div>
									<Currency value={refundAmount} />
								</div>
								<div>
									<Button
										disabled={loading || !form.formState.isValid}
										className="disabled:opacity-25"
										type="submit"
									>
										<IconArrowBack className="mr-0 size-4" />
										{t("refund")}
									</Button>
								</div>
							</div>
						</form>
					</Form>
				</div>
			</CardContent>
		</Card>
	);
};
