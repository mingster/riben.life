"use client";

import { Calendar } from "@/components/ui/calendar";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import type { ProductAttribute } from "@prisma/client";
import axios, { type AxiosError } from "axios";
import { CalendarIcon } from "lucide-react";

/*
export const productAttributeModel = z.object({
  isRecurring: z.boolean().optional().default(false),
});
type ProductAttribute = z.infer<typeof validationSchema>["productAttribute"];
const validationSchema = z.object({
  productAttribute: productAttributeModel,
});
*/

const formSchema = z.object({
	isRecurring: z.boolean().optional().default(false),
	isBrandNew: z.boolean().optional().default(true),

	interval: z.coerce.number().default(0),
	intervalCount: z.coerce.number().default(0),
	trialPeriodDays: z.coerce.number().default(0),

	isShipRequired: z.boolean().optional().default(false),
	isFreeShipping: z.boolean().optional().default(false),
	additionalShipCost: z.coerce.number().default(0),

	stock: z.coerce.number().default(0),
	displayStockAvailability: z.boolean().optional().default(false),
	displayStockQuantity: z.boolean().optional().default(false),
	allowBackOrder: z.boolean().optional().default(false),
	disableBuyButton: z.boolean().optional().default(false),

	orderMinQuantity: z.coerce.number().default(1),
	orderMaxQuantity: z.coerce.number().default(0),

	weight: z.coerce.number().optional().default(0),
	height: z.coerce.number().optional().default(0),
	width: z.coerce.number().optional().default(0),

	availableStartDate: z.coerce.date().optional(),
	availableEndDate: z.coerce.date().optional(),

	stripePriceId: z.string().optional().default(""),
	mfgPartNumber: z.string().optional().default(""),
});
type formValues = z.infer<typeof formSchema>;

interface productAttrProps {
	initialData?: ProductAttribute | null;
	action: string;
}
export const ProductEditAttributeTab = ({
	initialData,
	action,
}: productAttrProps) => {
	const params = useParams();
	const router = useRouter();

	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	const { toast } = useToast();

	const [_open, _setOpen] = useState(false);
	//const origin = useOrigin();
	const [loading, setLoading] = useState(false);

	//product.storeId = `${params.storeId}`;

	const defaultValues = initialData
		? {
				...initialData,
				stripePriceId: initialData.stripePriceId ?? undefined,
				mfgPartNumber: initialData.mfgPartNumber ?? undefined,
				intervalCount: initialData.intervalCount ?? undefined,
				trialPeriodDays: initialData.trialPeriodDays ?? undefined,
			}
		: {};

	// Replace null values with undefined
	const sanitizedDefaultValues = Object.fromEntries(
		Object.entries(defaultValues).map(([key, value]) => [
			key,
			value ?? undefined,
		]),
	);

	//console.log(`product attribute: ${JSON.stringify(initialData)}`);
	//console.log(`attribute defaultValues: ${JSON.stringify(defaultValues)}`);
	const form = useForm<formValues>({
		resolver: zodResolver(formSchema) as any,
		defaultValues: sanitizedDefaultValues,
		mode: "onChange",
	});

	const {
		register,
		formState: { errors },
		handleSubmit,
		clearErrors,
	} = useForm<formValues>();

	const onSubmit = async (data: formValues) => {
		try {
			setLoading(true);

			console.log(`onSubmit: ${JSON.stringify(data)}`);

			if (initialData) {
				// do edit
				await axios.patch(
					`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/product/${initialData.productId}/attribute/${initialData.id}`,
					data,
				);
				toast({
					title: "product attribute saved.",
					description: "",
					variant: "success",
				});
			} else {
				// do create
				/*
        await axios.patch(
          `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/productAttribute`,
          data,
        );
        toast({
          title: "product created.",
          description: "",
          variant: "success",
        });
         */
			}

			//router.push(`/storeAdmin/${params.storeId}/products`);
			router.refresh();
		} catch (err: unknown) {
			const error = err as AxiosError;
			toast({
				title: "Something went wrong.",
				description: error.message,
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="w-full space-y-1"
				>
					<Card>
						<CardContent className="space-y-2">
							{/* recurring billing */}
							<FormField
								control={form.control}
								name="isRecurring"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center justify-between p-3 rounded-lg shadow-sm">
										<div className="space-y-0.5">
											<FormLabel>Recurring?</FormLabel>
											<FormDescription>
												this product will set up a recurring billing for
												customer.
											</FormDescription>
										</div>
										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
									</FormItem>
								)}
							/>

							<div className="grid grid-flow-row-dense grid-cols-2 gap-3">
								<FormField
									control={form.control}
									name="interval"
									render={({ field }) => (
										<FormItem className="p-3 ">
											<FormLabel>interval</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													className="font-mono"
													placeholder="Interval in days."
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="intervalCount"
									render={({ field }) => (
										<FormItem className="p-3 ">
											<FormLabel>interval count</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													className="font-mono"
													placeholder="# of interval set fore."
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<FormField
								control={form.control}
								name="trialPeriodDays"
								render={({ field }) => (
									<FormItem className="p-3 ">
										<FormLabel>free trial days?</FormLabel>
										<FormControl>
											<Input
												disabled={loading || form.formState.isSubmitting}
												className="font-mono"
												placeholder="enter number of days for free trial."
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="isBrandNew"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center justify-between p-3 rounded-lg shadow-sm">
										<div className="space-y-0.5">
											<FormLabel>is brand new?</FormLabel>
											<FormDescription>
												this product is brand new.
											</FormDescription>
										</div>
										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
									</FormItem>
								)}
							/>

							{/* shipping related */}
							<FormField
								control={form.control}
								name="isShipRequired"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center justify-between p-3 rounded-lg shadow-sm">
										<div className="space-y-0.5">
											<FormLabel>shipping is required?</FormLabel>
											<FormDescription />
										</div>
										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
									</FormItem>
								)}
							/>
							<div className="grid grid-flow-row-dense grid-cols-2 gap-3">
								<FormField
									control={form.control}
									name="isFreeShipping"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between p-3 rounded-lg shadow-sm">
											<div className="space-y-0.5">
												<FormLabel>free shipping?</FormLabel>
												<FormDescription />
											</div>
											<FormControl>
												<Switch
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
											</FormControl>
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="additionalShipCost"
									render={({ field }) => (
										<FormItem className="p-3 ">
											<FormLabel>additional ship cost</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													className="font-mono"
													placeholder="shipping cost"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							{/* stock related */}
							<FormField
								control={form.control}
								name="stock"
								render={({ field }) => (
									<FormItem className="p-3 ">
										<FormLabel>stock</FormLabel>
										<FormControl>
											<Input
												disabled={loading || form.formState.isSubmitting}
												className="font-mono"
												placeholder="# of stock"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<div className="grid grid-flow-row-dense grid-cols-2 gap-3">
								<FormField
									control={form.control}
									name="displayStockAvailability"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between p-3 rounded-lg shadow-sm">
											<div className="space-y-0.5">
												<FormLabel>display stock availability</FormLabel>
												<FormDescription />
											</div>
											<FormControl>
												<Switch
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
											</FormControl>
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="displayStockQuantity"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between p-3 rounded-lg shadow-sm">
											<div className="space-y-0.5">
												<FormLabel>display stock quantity</FormLabel>
												<FormDescription />
											</div>
											<FormControl>
												<Switch
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
											</FormControl>
										</FormItem>
									)}
								/>
							</div>

							<div className="grid grid-flow-row-dense grid-cols-2 gap-3">
								<FormField
									control={form.control}
									name="allowBackOrder"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between p-3 rounded-lg shadow-sm">
											<div className="space-y-0.5">
												<FormLabel>allow back order</FormLabel>
												<FormDescription />
											</div>
											<FormControl>
												<Switch
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
											</FormControl>
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="disableBuyButton"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between p-3 rounded-lg shadow-sm">
											<div className="space-y-0.5">
												<FormLabel>disable buy button</FormLabel>
												<FormDescription />
											</div>
											<FormControl>
												<Switch
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
											</FormControl>
										</FormItem>
									)}
								/>
							</div>

							{/* order quantity... */}
							<div className="grid grid-flow-row-dense grid-cols-2 gap-3">
								<FormField
									control={form.control}
									name="availableStartDate"
									render={({ field }) => (
										<FormItem className="flex flex-col p-3">
											<FormLabel>availability start date</FormLabel>
											<Popover>
												<PopoverTrigger asChild>
													<FormControl>
														<Button
															variant={"outline"}
															className={cn(
																"w-[240px] pl-3 text-left font-normal",
																!field.value && "text-muted-foreground",
															)}
														>
															{field.value ? (
																format(field.value, "PPP")
															) : (
																<span>Pick a date</span>
															)}
															<CalendarIcon className="size-4 ml-auto opacity-50" />
														</Button>
													</FormControl>
												</PopoverTrigger>
												<PopoverContent className="w-auto p-0" align="start">
													<Calendar
														mode="single"
														selected={field.value}
														onSelect={field.onChange}
														disabled={(date: Date) =>
															date < new Date() && date < new Date("3000-01-01")
														}
														//initialFocus
													/>
												</PopoverContent>
											</Popover>
											<FormDescription>
												start date will be used if dated in the future.
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="availableEndDate"
									render={({ field }) => (
										<FormItem className="flex flex-col p-3">
											<FormLabel>availability end date</FormLabel>
											<Popover>
												<PopoverTrigger asChild>
													<FormControl>
														<Button
															variant={"outline"}
															className={cn(
																"w-[240px] pl-3 text-left font-normal",
																!field.value && "text-muted-foreground",
															)}
														>
															{field.value ? (
																format(field.value, "PPP")
															) : (
																<span>Pick a date</span>
															)}
															<CalendarIcon className="size-4 ml-auto opacity-50" />
														</Button>
													</FormControl>
												</PopoverTrigger>
												<PopoverContent className="w-auto p-0" align="start">
													<Calendar
														mode="single"
														selected={field.value}
														onSelect={field.onChange}
														disabled={(date: Date) =>
															date < new Date() && date < new Date("3000-01-01")
														}
														//initialFocus
													/>
												</PopoverContent>
											</Popover>
											<FormDescription />
											<FormMessage />
										</FormItem>
									)}
								/>
								{/* order quantity... */}
								<FormField
									control={form.control}
									name="orderMaxQuantity"
									render={({ field }) => (
										<FormItem className="p-3 ">
											<FormLabel>order max quantity</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													className="font-mono"
													placeholder="order max quantity"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="orderMinQuantity"
									render={({ field }) => (
										<FormItem className="p-3 ">
											<FormLabel>order min quantity</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													className="font-mono"
													placeholder="order min quantity"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							{/* stripe id, etc... */}
							<FormField
								control={form.control}
								name="stripePriceId"
								render={({ field }) => (
									<FormItem className="p-3 ">
										<FormLabel>stripe price Id</FormLabel>
										<FormControl>
											<Input
												disabled={loading || form.formState.isSubmitting}
												className="font-mono"
												placeholder="stripe price id"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="grid grid-flow-row-dense grid-cols-2 gap-3">
								<FormField
									control={form.control}
									name="mfgPartNumber"
									render={({ field }) => (
										<FormItem className="p-3 ">
											<FormLabel>Manufacturer Part Number</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													className="font-mono"
													placeholder="Manufacturer info.."
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="weight"
									render={({ field }) => (
										<FormItem className="p-3 ">
											<FormLabel>weight</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													className="font-mono"
													placeholder="weight in kg"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="height"
									render={({ field }) => (
										<FormItem className="p-3 ">
											<FormLabel>height</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													className="font-mono"
													placeholder="height in cm"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="width"
									render={({ field }) => (
										<FormItem className="p-3 ">
											<FormLabel>width</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													className="font-mono"
													placeholder="width in cm"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<Button
								disabled={
									loading ||
									!form.formState.isValid ||
									form.formState.isSubmitting
								}
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
									router.push(`/storeAdmin/${params.storeId}/products`);
								}}
								disabled={loading || form.formState.isSubmitting}
								className="ml-5 disabled:opacity-25"
							>
								{t("Cancel")}
							</Button>
						</CardContent>
					</Card>
				</form>
			</Form>
		</>
	);
};
