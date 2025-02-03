"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useI18n } from "@/providers/i18n-provider";
import { zodResolver } from "@hookform/resolvers/zod";

import { Switch } from "@/components/ui/switch";
import type { ShippingMethod } from "@prisma/client";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as z from "zod";

const formSchema = z.object({
	name: z.string().default(""),
	description: z.string().optional().default(""),
	basic_price: z.coerce.number().default(0),
	isDeleted: z.boolean(),
	isDefault: z.boolean(),
	shipRequried: z.boolean(),

	//currencyId   String   @default("twd")
});

type formValues = z.infer<typeof formSchema>;

interface editProps {
	initialData:
		| (ShippingMethod & {
				//images: ProductImage[];
		  })
		| null;
}

// edit payment method form
export const EditClient = ({ initialData }: editProps) => {
	const params = useParams();
	const router = useRouter();
	const { toast } = useToast();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [loading, setLoading] = useState(false);

	const defaultValues = initialData
		? {
				...initialData,
			}
		: {};

	//console.log(`product basic: ${JSON.stringify(defaultValues)}`);
	const form = useForm<formValues>({
		resolver: zodResolver(formSchema),
		defaultValues,
		mode: "onChange",
	});

	const {
		register,
		formState: { errors },
		handleSubmit,
		clearErrors,
	} = useForm<formValues>();

	const onSubmit = async (data: formValues) => {
		//try {
		if (!initialData) return;

		setLoading(true);
		//console.log(`onSubmit: ${JSON.stringify(data)}`);
		await axios.patch(
			`${process.env.NEXT_PUBLIC_API_URL}/admin/shipMethods/${initialData.id}`,
			data,
		);

		toast({
			title: "data saved.",
			description: "",
			variant: "success",
		});

		router.refresh();
		router.push("/admin/shipMethods");
		setLoading(false);

		/*
    } catch (err: unknown) {
      const error = err as AxiosError;
      toast({
        title: "Something went wrong.",
        description: error.message,
        variant: "destructive",
      });
    } finally {
    }
    */
	};

	return (
		<>
			<Card>
				<CardContent className="space-y-2">
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="w-full space-y-1"
						>
							<div className="grid grid-flow-row-dense grid-cols-2 gap-1">
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem className="p-3">
											<FormLabel>name</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													className="font-mono"
													placeholder="name"
													{...field}
												/>
											</FormControl>
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="description"
									render={({ field }) => (
										<FormItem className="p-3">
											<FormLabel>description</FormLabel>
											<FormControl>
												<Input
													type="text"
													disabled={loading || form.formState.isSubmitting}
													className="font-mono"
													placeholder="description"
													{...field}
												/>
											</FormControl>
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="basic_price"
									render={({ field }) => (
										<FormItem className="p-3">
											<FormLabel>basic price</FormLabel>
											<FormControl>
												<Input
													type="number"
													disabled={loading || form.formState.isSubmitting}
													className="font-mono"
													placeholder="basic_price"
													{...field}
												/>
											</FormControl>
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="isDeleted"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between px-3 rounded-lg shadow-sm">
											<div className="space-y-0.5">
												<FormLabel>isDeleted </FormLabel>
												<FormDescription />
											</div>
											<FormControl>
												<Switch
													disabled={loading || form.formState.isSubmitting}
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
											</FormControl>
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="isDefault"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between px-3 rounded-lg shadow-sm">
											<div className="space-y-0.5">
												<FormLabel>isDefault</FormLabel>
												<FormDescription />
											</div>
											<FormControl>
												<Switch
													disabled={loading || form.formState.isSubmitting}
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
											</FormControl>
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="shipRequried"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between px-3 rounded-lg shadow-sm">
											<div className="space-y-0.5">
												<FormLabel>shipment requried</FormLabel>
												<FormDescription />
											</div>
											<FormControl>
												<Switch
													disabled={loading || form.formState.isSubmitting}
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
											</FormControl>
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
									router.push("/admin/shipMethods");
								}}
								disabled={loading || form.formState.isSubmitting}
								className="ml-5 disabled:opacity-25"
							>
								{t("Cancel")}
							</Button>
						</form>
					</Form>
				</CardContent>
			</Card>
		</>
	);
};
