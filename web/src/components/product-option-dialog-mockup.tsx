"use client";

import { toastError, toastSuccess } from "@/components/toaster";
import { useCart } from "@/hooks/use-cart";
import type { Product } from "@/types";
import { useForm } from "react-hook-form";
import { Button } from "./ui/button";

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

import IconButton from "@/components/ui/icon-button";
import { useState } from "react";
import Currency from "./currency";

import { zodResolver } from "@hookform/resolvers/zod";

import { z } from "zod";
import logger from "@/lib/logger";

type item_props = {
	id: string;
	name: string;
	price: number;
};
interface props {
	product: Product;
}

// NOTE: this is a mockup
export const ProductOptionDialogMockup: React.FC<props> = ({ product }) => {
	const [open, setOpen] = useState(false);
	const cart = useCart();

	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [quantity, setQuantity] = useState<number>(1);

	const [unitPrice, setUnitPrice] = useState<number>(Number(product.price)); // maintain sum of unit price
	const [total, setTotal] = useState<number>(Number(product.price)); // maintain sum of unit price * quantity
	const [checkedTotal, setCheckedTotal] = useState<number>(0); // maintain sum of checked prices

	const productOption = product.ProductOptions;

	const option1_items: item_props[] = [
		{
			id: "1",
			name: "大",
			price: 30,
		},
		{
			id: "2",
			name: "中",
			price: 20,
		},
		{
			id: "3",
			name: "小",
			price: 0,
		},
	];

	const option2_items: item_props[] = [
		{
			id: "1",
			name: "排骨",
			price: 60,
		},
		{
			id: "2",
			name: "魯蛋",
			price: 15,
		},
		{
			id: "3",
			name: "叉燒",
			price: 80,
		},
	];

	const option4_items: item_props[] = [
		{
			id: "4",
			name: "加湯",
			price: 10,
		},
		{
			id: "5",
			name: "加麵",
			price: 15,
		},
		{
			id: "6",
			name: "不加",
			price: 0,
		},
	];

	const option1_names = [...option1_items.map((item) => item.name)] as const;
	const option4_names = [...option4_items.map((item) => item.name)] as const;

	const formSchema = z.object({
		// option 1 is required radio button
		option1: z.enum(option1_names as [string, string, string], {
			error: (issue) =>
				issue.input === undefined
					? "You need to select at least one option."
					: undefined,
		}),

		// option 2 is required and can have a maximum of 2 items
		option2: z
			.array(z.string())
			.max(2, "You can select up to 2 items only.")
			.refine((value) => value.some((item) => item), {
				error: "You have to select at least one item.",
			}),

		// option 3 is optional checkboxes without additional validation
		option3: z.array(z.string()).optional(),

		// option 4 is optional radio button
		option4: z.enum(option4_names as [string, string, string]).optional(),
	});

	const handleDecreaseQuality = () => {
		//currentItem.quantity = currentItem.quantity - 1;
		let newQuantity = quantity ?? 0;
		newQuantity -= 1;

		if (newQuantity <= 0) {
			const msg = t("cart_itemInfo_removeConfirm");
			if (confirm(msg)) {
				// close dialog
				setQuantity(0);
				setOpen(false);
			}
		} else {
			setQuantity(newQuantity);
			//cart.updateItemQuantity(currentItem.id, newQuantity);
		}

		setTotal(newQuantity * unitPrice);

		//onCartChange?.(newQuantity);
		//console.log('handleDecreaseQuality: ' + currentItem.quantity);
	};

	const handleIncraseQuality = () => {
		let newQuantity = quantity ?? 0;
		newQuantity += 1;
		setQuantity(newQuantity);
		setTotal(newQuantity * unitPrice);
	};

	const handleQuantityInputChange = (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const result = event.target.value.replace(/\D/g, "");
		if (result) {
			setQuantity(Number(result));
			//cart.updateItemQuantity(currentItem.id, Number(result));
			//onCartChange?.(Number(result));
		}
	};
	//console.log(JSON.stringify(product.ProductOptions));

	const _handleAddToCart = (product: Product) => {
		const item = cart.getItem(product.id);
		if (item) {
			cart.updateItemQuantity(product.id, item.quantity + 1);
		} else {
			cart.addItem(
				{
					id: product.id,
					name: product.name,
					price: Number(product.price),
					quantity: quantity,
					//...product,
					//cartStatus: CartProductStatus.InProgress,
					//userData: "",
				},
				1,
			);
		}

		//router.push('/cart');

		toastSuccess({
			title: t("product_added_to_cart"),
			description: "",
		});
	};

	// radio group must have default value, cannot be empty...
	type formValues = z.infer<typeof formSchema>;
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			option1: "小",
			option2: [],
			option3: [],
			option4: "加湯",
		},
	});

	// TODO: need to recalc price based on the default values....

	const {
		register,
		formState: { errors },
		handleSubmit,
		watch,
		clearErrors,
	} = useForm<formValues>();

	const onSubmit = async (data: z.infer<typeof formSchema>) => {
		try {
			logger.info("form data");
			// Your submission logic here
		} catch (_error) {
			form.setError("root", {
				type: "submit",
				message: "An error occurred while submitting the form.",
			});
		}
	};

	const handleRadio = (fieldName: string, selectedVal: string) => {
		//console.log("fieldName", fieldName, selectedVal);
		//console.log("selected", selected);

		const base_price = Number(product.price);

		let selected = null;
		if (fieldName === "option1") {
			selected = option1_items.find((item) => item.name === selectedVal);
		} else if (fieldName === "option4") {
			selected = option4_items.find((item) => item.name === selectedVal);
			logger.info("selected");
		}

		if (selected) {
			const p = base_price + (selected?.price ?? 0) + checkedTotal;
			setUnitPrice(p);
			setTotal(quantity * p);
		}
	};

	const handleCheckbox = (selected: number) => {
		//console.log("selectedPrice", selectedPrice);

		setCheckedTotal(checkedTotal + selected);

		const p = unitPrice + selected;
		//console.log("p", product.price, price, selected, p);
		setUnitPrice(p);
		setTotal(quantity * p);
	};

	if (!product || !productOption) {
		return <></>;
	}

	//console.log("form errors", form.formState.errors);
	return (
		<>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTrigger asChild>
					<Button
						variant={"outline"}
						className="w-full bg-slate-200 dark:bg-zinc-900"
					>
						{t("keep_shopping")}
					</Button>
				</DialogTrigger>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>
							<div className="flex items-center justify-between">
								<div className="grow">{product.name}</div>
								<div className="text-sm text-muted-foreground">
									<Currency value={Number(product.price)} />
								</div>
							</div>
						</DialogTitle>
						<DialogDescription> </DialogDescription>
					</DialogHeader>

					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)}>
							{/*form.formState.errors && (
                <>
                  {Object.keys(form.formState.errors).map(
                    (key, index) =>
                      key !== "root" && (
                        <div key={key} className="text-red-500">
                          {form.formState.errors[key]?.message?.toString()}
                        </div>
                      ),
                  )}
                </>
              )*/}
							<div key="optionid1" className="pb-2">
								{/* render product option and its requirement */}
								<div className="flex items-center justify-between">
									<FormLabel className="grow font-bold text-xl">規格</FormLabel>
									<div className="w-10 text-center text-green-800 text-sm bg-slate-300">
										必選
									</div>
								</div>
							</div>
							<FormField
								control={form.control}
								name="option1"
								render={({ field }) => (
									<FormItem className="space-y-3">
										<FormControl>
											<RadioGroup
												onValueChange={(val) => handleRadio(field.name, val)}
												defaultValue={field.value}
												className="flex flex-col space-y-1"
											>
												{option1_items.map((item) => (
													<div
														key={item.id}
														className="flex items-center justify-between"
													>
														<FormItem className="flex items-center space-x-3 space-y-0">
															<FormControl>
																<RadioGroupItem value={item.name} />
															</FormControl>
															<FormLabel className="font-normal">
																{item.name}
															</FormLabel>
														</FormItem>
														<div className="text-sm text-muted-foreground">
															<Currency value={item.price} />
														</div>
													</div>
												))}
											</RadioGroup>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div key="optionid2" className="py-2">
								{/* render product option and its requirement */}
								<div className="flex items-center justify-between">
									<FormLabel className="grow font-bold text-xl">主菜</FormLabel>
									<div className="w-10 text-center text-green-800 text-sm bg-slate-300">
										必選
									</div>
									<div className="text-center text-green-800 text-sm bg-slate-300">
										最多選2項
									</div>
								</div>
							</div>
							<FormField
								control={form.control}
								name="option2"
								render={() => (
									<FormItem>
										{option2_items.map((item) => (
											<FormField
												key={item.id}
												control={form.control}
												name="option2"
												render={({ field }) => {
													return (
														<div className="flex items-center justify-between">
															<FormItem
																key={item.id}
																className="flex flex-row items-start space-x-3 space-y-0"
															>
																<FormControl>
																	<Checkbox
																		checked={field.value?.includes(item.id)}
																		onCheckedChange={(checked) => {
																			return checked
																				? field.onChange(
																						[...field.value, item.id],
																						handleCheckbox(item.price),
																					)
																				: field.onChange(
																						field.value?.filter(
																							(value) => value !== item.id,
																						),
																						handleCheckbox(-item.price),
																					);
																		}}
																	/>
																</FormControl>
																<FormLabel className="text-sm font-normal">
																	{item.name}
																</FormLabel>
															</FormItem>
															<div className="text-sm text-muted-foreground">
																<Currency value={item.price} />
															</div>
														</div>
													);
												}}
											/>
										))}
										<FormMessage />
									</FormItem>
								)}
							/>

							<div key="optionid3" className="py-2">
								{/* render product option and its requirement */}
								<div className="flex items-center justify-between">
									<FormLabel className="grow font-bold text-xl">加購</FormLabel>
									<div className="text-center text-green-800 text-sm bg-slate-300">
										{" "}
									</div>
								</div>
							</div>
							<FormField
								control={form.control}
								name="option3"
								render={() => (
									<FormItem>
										{option2_items.map((item) => (
											<FormField
												key={item.id}
												control={form.control}
												name="option3"
												render={({ field }) => {
													return (
														<div className="flex items-center justify-between">
															<FormItem
																key={item.id}
																className="flex flex-row items-start space-x-3 space-y-0"
															>
																<FormControl>
																	<Checkbox
																		checked={(field.value || []).includes(
																			item.id,
																		)}
																		onCheckedChange={(checked) => {
																			return checked
																				? field.onChange(
																						[...(field.value || []), item.id],
																						handleCheckbox(item.price),
																					)
																				: field.onChange(
																						(field.value || []).filter(
																							(value) => value !== item.id,
																						),
																						handleCheckbox(-item.price),
																					);
																		}}
																	/>
																</FormControl>
																<FormLabel className="text-sm font-normal">
																	{item.name}
																</FormLabel>
															</FormItem>
															<div className="text-sm text-muted-foreground">
																<Currency value={item.price} />
															</div>
														</div>
													);
												}}
											/>
										))}
										<FormMessage />
									</FormItem>
								)}
							/>

							<div key="optionid4" className="pb-2">
								<div className="flex items-center justify-between">
									<FormLabel className="grow font-bold text-xl">
										加購 2
									</FormLabel>
								</div>
							</div>
							<FormField
								control={form.control}
								name="option4"
								render={({ field }) => (
									<FormItem className="space-y-3">
										<FormControl>
											<RadioGroup
												onValueChange={(val) => handleRadio(field.name, val)}
												defaultValue={field.value}
												className="flex flex-col space-y-1"
											>
												{option4_items.map((item) => (
													<div
														key={item.id}
														className="flex items-center justify-between"
													>
														<FormItem className="flex items-center space-x-3 space-y-0">
															<FormControl>
																<RadioGroupItem value={item.name} />
															</FormControl>
															<FormLabel className="font-normal">
																{item.name}
															</FormLabel>
														</FormItem>
														<div className="text-sm text-muted-foreground">
															<Currency value={item.price} />
														</div>
													</div>
												))}
											</RadioGroup>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							{/* render quantity of product to buy */}
							<div className="w-full py-2">
								<div className="flex justify-center">
									<div className="flex flex-nowrap content-center w-[20px]">
										{quantity && quantity > 0 && (
											<IconButton
												onClick={handleDecreaseQuality}
												icon={
													<Minus
														size={18}
														className="dark:text-primary text-slate-500"
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
											value={quantity}
											onChange={handleQuantityInputChange}
										/>
									</div>
									<div className="flex flex-nowrap content-center w-[20px]">
										<IconButton
											onClick={handleIncraseQuality}
											icon={
												<Plus
													size={18}
													className="dark:text-primary text-slate-500"
												/>
											}
										/>
									</div>
								</div>
							</div>

							<DialogFooter>
								<Button
									title={
										product.ProductAttribute?.isRecurring
											? t("subscribe")
											: t("buy")
									}
									variant={"secondary"}
									className="w-full"
									disabled={form.formState.isSubmitting}
									type="submit"
									//onClick={() => handleAddToCart(product)}
								>
									<div className="flex items-center justify-between w-full">
										<div className="grow font-bold text-xl">{t("buy")}</div>
										<div className="text-right text-green-800 text-sm">
											<Currency value={total} />
										</div>
									</div>
								</Button>
							</DialogFooter>
						</form>
					</Form>
				</DialogContent>
			</Dialog>
		</>
	);
};
