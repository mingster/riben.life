"use client";

import type { Item, ItemOption } from "@/hooks/use-cart";
import { useCart } from "@/hooks/use-cart";

import { Button } from "@/components/ui/button";
import type { Product, ProductOption } from "@/types";
import type { ProductOptionSelections } from "@prisma/client";
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

import logger from "@/utils/logger";
import { useParams } from "next/navigation";
import { z } from "zod";

interface props {
	product: Product;
	disableBuyButton: boolean;
	//onPurchase: () => void;
	onValueChange?: (newValue: Item) => void; // return configured CartItem back to parent component
}

// display product options for user to configure product variants.
//
export const ProductOptionDialog: React.FC<props> = ({
	product,
	disableBuyButton,
	//onPurchase,
	onValueChange,
}) => {
	const [open, setOpen] = useState(false);
	//const cart = useCart();

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	//const params = useParams();
	//const {storeId, tableId} = params;
	const params = useParams<{ storeId: string; tableId: string }>();
	//  console.log("storeId", params.storeId, "tableId", params.tableId);

	const productOptions = product.ProductOptions as ProductOption[];

	function generateProductOptionSchema(productOptions: ProductOption[]) {
		const schemaFields: Record<string, z.ZodTypeAny> = {};

		productOptions.map((option: ProductOption, index) => {
			const fieldName = `option${index}`;

			if (option.isMultiple) {
				//checkboxes
				if (option.isRequired) {
					schemaFields[fieldName] = z
						.array(z.string())
						.min(
							option.minSelection,
							`You can select up to ${option.minSelection} items only.`,
						)
						.max(
							option.maxSelection,
							`You can select up to ${option.maxSelection} items only.`,
						)
						.refine((value) => value.some((item) => item), {
                            error: "You have to select at least one item."
                        });
				} else {
					// not required checkbox

					if (option.minSelection === 0) {
						if (option.maxSelection > 0) {
							//最多選?項
							schemaFields[fieldName] = z
								.array(z.string())
								.max(
									option.maxSelection,
									`1You can select up to ${option.maxSelection} items only.`,
								)
								.optional();
						} else {
							schemaFields[fieldName] = z.array(z.string()).optional();
						}
					} else {
						////最少選?項
						schemaFields[fieldName] = z
							.array(z.string())
							.min(
								option.minSelection,
								`3You can select up to ${option.minSelection} items only.`,
							)
							.max(
								option.maxSelection,
								`4You can select up to ${option.maxSelection} items only.`,
							)
							.refine((value) => value.some((item) => item), {
                                error: "5You have to select at least one item."
                            })
							.optional();
					}
				}
			} else {
				// radio buttons
				const iteriable_selections: string[] = productOptions.flatMap(
					(option) =>
						option.ProductOptionSelections.map(
							(selection: ProductOptionSelections) => selection.id,
						),
				);

				if (option.isRequired) {
					schemaFields[fieldName] = z.enum(
						iteriable_selections as [string, string, string],
						{
                            error: (issue) => issue.input === undefined ? undefined : undefined
                        },
					);
				} else {
					schemaFields[fieldName] = z
						.enum(iteriable_selections as [string, string, string])
						.optional();
				}
			}
			return null;
		});

		return z.object(schemaFields);
	}
	const formSchema = generateProductOptionSchema(productOptions);

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

	/*
  function generateDefaultValues(productOptions: ProductOption[]) {
    const defaultValues: Record<string, string | string[]> = {};

    productOptions.forEach((option: ProductOption, index) => {
      const fieldName = `option${index}`;

      if (option.isMultiple) {
        defaultValues[fieldName] = option.ProductOptionSelections.filter(
          (item) => item.isDefault,
        ).map((item) => item.id);
      } else {

        let defaultItem = option.ProductOptionSelections.find(
          (item) => item.isDefault,
        );
        console.log("defaultItem", defaultItem);

        // radio group must have default value, cannot be empty...
        if (!defaultItem) defaultItem = option.ProductOptionSelections[0];

        defaultValues[fieldName] = defaultItem ? defaultItem.id : "";
      }
    });

    return defaultValues;
  }
*/

	// calculate sum of price for isDefault selections
	// also generate default values for the form
	function calculateInitialValues(productOptions: ProductOption[]) {
		const defaultValues: Record<string, string | string[]> = {};
		let initialCheckedTotal = 0;

		productOptions.map((option: ProductOption, index) => {
			//productOptions.forEach((option: ProductOption, index) => {
			const fieldName = `option${index}`;

			if (option.isMultiple) {
				const defaultSelections = option.ProductOptionSelections.filter(
					(item: ProductOptionSelections) => item.isDefault,
				);
				defaultValues[fieldName] = defaultSelections.map(
					(item: ProductOptionSelections) => item.id,
				);
				initialCheckedTotal += defaultSelections.reduce(
					(sum: number, item: ProductOptionSelections) =>
						sum + Number(item.price),
					0,
				);
			} else {
				const defaultItem =
					option.ProductOptionSelections.find(
						(item: ProductOptionSelections) => item.isDefault,
					) || option.ProductOptionSelections[0];
				defaultValues[fieldName] = defaultItem ? defaultItem.id : "";
				initialCheckedTotal += Number(defaultItem?.price || 0);
			}
		});

		return { defaultValues, initialCheckedTotal };
	}

	const { defaultValues, initialCheckedTotal } = calculateInitialValues(
		product.ProductOptions,
	);

	const [checkedTotal, setCheckedTotal] = useState<number>(initialCheckedTotal); // recalc price based on the default values....
	const [quantity, setQuantity] = useState<number>(1);
	const [unitPrice, setUnitPrice] = useState<number>(Number(product.price)); // maintain sum of unit price
	const [total, setTotal] = useState<number>(
		Number(product.price) + initialCheckedTotal,
	); // maintain sum of unit price * quantity

	type FormValues = z.infer<typeof formSchema>;
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: defaultValues,
		//defaultValues: generateDefaultValues(productOptions),
		/* defaultValues: {  option1: "小", option2: [], },*/
	});

	//console.log("form", form.formState.defaultValues);

	const {
		register,
		formState: { errors },
		handleSubmit,
		watch,
		clearErrors,
	} = useForm<FormValues>();

	function findSelectionById(id: string) {
		for (const option of productOptions) {
			for (const selection of option.ProductOptionSelections) {
				if (selection.id === id) {
					return selection;
				}
			}
		}

		return null; // Return null if no matching selection is found
	}

	function getCartItemOption(id: string) {
		const productOptionSelection = findSelectionById(id);
		if (productOptionSelection) {
			return {
				id: productOptionSelection.id,
				value: productOptionSelection.name,
				price: Number(productOptionSelection.price),
			} as ItemOption;
		}

		return null;
	}

	// construct form data into CartItem, and return to parent component
	const onClick = () => {
		const data = form.getValues();
		//console.log("data", JSON.stringify(data));

		// Map form data to item
		const itemOptions: ItemOption[] = [];

		// NOTE: cartId is used to identify the item in the cart
		// it's formatted as a query string of the form data
		let cartId = `${product.id}?`;

		let variants = "";
		let variantCosts = "";

		// console.log("form data", JSON.stringify(data));
		for (const [key, value] of Object.entries(data)) {
			//console.log(`${key}: ${value} ${typeof value}`);

			cartId += `${key}=${value}&`;

			if (typeof value === "string") {
				// radio button
				const itemOption = getCartItemOption(value);
				if (itemOption) {
					itemOptions.push(itemOption);

					variants += `${itemOption.value},`;
					variantCosts += `${itemOption.price},`;
				}
			} else if (Array.isArray(value)) {
				// checkboxes
				value.map((selection: string) => {
					//value.forEach((selection: string) => {
					//console.log(`selection: [${index}] ${selection}`);
					const itemOption = getCartItemOption(selection);
					if (itemOption) {
						itemOptions.push(itemOption);
						variants += `${itemOption.value},`;
						variantCosts += `${itemOption.price},`;
					}
				});
			}
		}

		// trim off end comma
		if (variants.length > 2) {
			variants = variants.substring(0, variants.length - 1);
			variantCosts = variantCosts.substring(0, variantCosts.length - 1);
		}

		const newItem = {
			id: cartId,
			name: product.name,
			price: unitPrice,
			quantity: quantity,
			itemOptions: itemOptions,
			storeId: params.storeId,
			tableId: params.tableId,
			variants: variants,
			variantCosts: variantCosts,
		} as Item;

		onValueChange?.(newItem);
		//onPurchase();

		// close the dialog
		setOpen(false);
	};

	// NOTE: obsoleted
	// add the product selection to the cart
	const onSubmit = async (data: z.infer<typeof formSchema>) => {
		//console.log("data", JSON.stringify(data));
		try {
			// Map form data to item
			const itemOptions: ItemOption[] = [];

			// NOTE: cartId is used to identify the item in the cart
			// it's formatted as a query string of the form data
			let cartId = `${product.id}?`;

			let variants = "";
			let variantCosts = "";

			// console.log("form data", JSON.stringify(data));
			for (const [key, value] of Object.entries(data)) {
				//console.log(`${key}: ${value} ${typeof value}`);

				cartId += `${key}=${value}&`;

				if (typeof value === "string") {
					// radio button
					const itemOption = getCartItemOption(value);
					if (itemOption) {
						itemOptions.push(itemOption);

						variants += `${itemOption.value},`;
						variantCosts += `${itemOption.price},`;
					}
				} else if (Array.isArray(value)) {
					// checkboxes
					value.map((selection: string) => {
						//value.forEach((selection: string) => {
						//console.log(`selection: [${index}] ${selection}`);
						const itemOption = getCartItemOption(selection);
						if (itemOption) {
							itemOptions.push(itemOption);
							variants += `${itemOption.value},`;
							variantCosts += `${itemOption.price},`;
						}
					});
				}
			}

			// trim off end comma
			if (variants.length > 2) {
				variants = variants.substring(0, variants.length - 1);
				variantCosts = variantCosts.substring(0, variantCosts.length - 1);
			}

			const newItem = {
				id: cartId,
				name: product.name,
				price: unitPrice,
				quantity: quantity,
				itemOptions: itemOptions,
				storeId: params.storeId,
				tableId: params.tableId,
				variants: variants,
				variantCosts: variantCosts,
			} as Item;

			onValueChange?.(newItem);
			//onPurchase();

			// close the dialog
			setOpen(false);

			// Your submission logic here
		} catch (error) {
			form.setError("root", {
				type: "submit",
				message: "An error occurred while submitting the form.",
			});

			logger.error(error);
		}
	};

	// update price using the radio button selection
	const handleRadio = (optionName: string, selectedVal: string) => {
		//console.log("optionName", optionName, selectedVal);

		const base_price = Number(product.price);

		// find the option from the form
		let option = null;
		for (const [index, o] of productOptions.entries()) {
			const fieldName = `option${index}`;
			if (fieldName === optionName) {
				option = o;
				break;
			}
		}

		if (!option) return;

		// find the selected value in the option selections
		let selected = null;
		for (const selection of option.ProductOptionSelections) {
			if (selection.id === selectedVal) {
				selected = selection;
				break;
			}
		}

		//console.log("selected", selected);

		if (selected) {
			let p = base_price + Number(selected?.price ?? 0) + checkedTotal;

			if (initialCheckedTotal > 0) p = p - initialCheckedTotal;

			setUnitPrice(p);
			setTotal(quantity * p);
		}
	};

	// update price using the checkbox selection
	const handleCheckbox = (selected: number) => {
		//console.log("selectedPrice", selectedPrice);
		setCheckedTotal(checkedTotal + selected);
		const p = unitPrice + selected;
		//console.log("p", product.price, price, selected, p);
		setUnitPrice(p);
		setTotal(quantity * p);
	};

	if (!product || !productOptions) {
		return <></>;
	}

	//console.log("form errors", form.formState.errors);
	//className="fixed top-30 left-1/4 lg:left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[80vh] rounded-lg"
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					variant={"outline"}
					className="w-full bg-slate-200 dark:bg-zinc-900"
				>
					{t("keep_shopping")}
				</Button>
			</DialogTrigger>
			<DialogContent>
				<div className="flex h-full flex-col">
					<DialogHeader className="border-b p-4">
						<DialogTitle>
							<div className="flex items-center justify-between">
								<div className="grow text-xl m-2">{product.name}</div>
								<div className="text-sm text-muted-foreground">
									<Currency value={Number(product.price)} />
								</div>
							</div>
						</DialogTitle>
						<DialogDescription>
							{product.description && product.description}
						</DialogDescription>
					</DialogHeader>

					<div className="flex-1 overflow-auto p-4">
						<Form {...form}>
							<form onSubmit={form.handleSubmit(onSubmit)}>
								{/* render form errors}
              {form.formState.errors && (
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
              )}
              */}

								{/* loop through ProductOptions */}
								{productOptions.map((option: ProductOption, index) => {
									const fieldName = `option${index}`;

									return (
										<div key={option.id} className="pb-5 border-b">
											{/* render product option and its requirement */}
											<div className="pb-2">
												<div className="flex items-center justify-between gap-1">
													<FormLabel className="grow font-bold text-xl">
														{option.optionName}
													</FormLabel>
													{option.isRequired && (
														<div className="w-10 text-center text-green-800 text-sm bg-slate-300">
															{t("ProductOptionDialog_required")}
														</div>
													)}
													{option.minSelection !== 0 && (
														<div className="text-center text-green-800 text-sm bg-slate-300">
															{t("ProductOptionDialog_minSelection").replace(
																"{0}",
																`${option.minSelection}`,
															)}
														</div>
													)}
													{option.maxSelection > 1 && (
														<div className="text-center text-green-800 text-sm bg-slate-300">
															{t("ProductOptionDialog_maxSelection").replace(
																"{0}",
																`${option.maxSelection}`,
															)}
														</div>
													)}
												</div>
											</div>

											{/* render product option selections */}
											{option.isMultiple ? (
												// checkbox
												<FormField
													control={form.control}
													name={fieldName}
													render={() => (
														<FormItem>
															{option.ProductOptionSelections.map(
																(item: ProductOptionSelections) => (
																	<FormField
																		key={item.id}
																		control={form.control}
																		name={fieldName}
																		render={({ field }) => {
																			return (
																				<div className="flex items-center justify-between">
																					<FormItem
																						key={item.id}
																						className="flex flex-row items-start space-x-3 space-y-0"
																					>
																						<FormControl>
																							<Checkbox
																								checked={field.value?.includes(
																									item.id,
																								)}
																								onCheckedChange={(checked) => {
																									return checked
																										? field.onChange(
																												[
																													...field.value,
																													item.id,
																												],
																												handleCheckbox(
																													Number(item.price),
																												),
																											)
																										: field.onChange(
																												field.value?.filter(
																													(value: string) =>
																														value !== item.id,
																												),
																												handleCheckbox(
																													-item.price,
																												),
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
																),
															)}
															<FormMessage />
														</FormItem>
													)}
												/>
											) : (
												// radio
												<FormField
													control={form.control}
													name={fieldName}
													render={({ field }) => (
														<FormItem className="space-y-3">
															<FormControl>
																<RadioGroup
																	onValueChange={(val) =>
																		handleRadio(field.name, val)
																	}
																	defaultValue={field.value}
																	className="flex flex-col space-y-1"
																>
																	{option.ProductOptionSelections.map(
																		(item: ProductOptionSelections) => (
																			<div
																				key={item.id}
																				className="flex items-center justify-between"
																			>
																				<FormItem className="flex items-center space-x-3 space-y-0">
																					<FormControl>
																						<RadioGroupItem value={item.id} />
																					</FormControl>
																					<FormLabel className="font-normal">
																						{item.name}
																					</FormLabel>
																				</FormItem>
																				<div className="text-sm text-muted-foreground">
																					<Currency value={item.price} />
																				</div>
																			</div>
																		),
																	)}
																</RadioGroup>
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>
											)}
										</div>
									);
								})}

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

								<DialogFooter className="w-full py-2">
									{/*
                  obsolete form submit and change to onclick event. this is because we use the dialog inside another form.
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
                  >
                  </Button>
                  */}
									<Button
										title={
											product.ProductAttribute?.isRecurring
												? t("subscribe")
												: t("buy")
										}
										variant={"secondary"}
										className="w-full"
										disabled={!form.formState.isValid}
										onClick={() => onClick()}
										type="button"
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
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};
