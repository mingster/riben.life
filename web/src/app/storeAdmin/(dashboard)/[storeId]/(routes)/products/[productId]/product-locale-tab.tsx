"use client";

import { upsertProductLocalesAction } from "@/actions/storeAdmin/product/upsert-product-locales";
import { useTranslation } from "@/app/i18n/client";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { adminCrudUseFormProps } from "@/lib/admin/form-defaults";
import { useI18n } from "@/providers/i18n-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import useSWR from "swr";
import { z } from "zod";
import type { ProductLocaleRow } from "@/actions/storeAdmin/storeAdmin/map-product-column";

type LocaleRow = { id: string; name: string; lng: string };
type LocalesApiResponse = { locales: LocaleRow[]; defaultLocaleId: string };
const fetcher = (url: string) => fetch(url).then((r) => r.json());

const formSchema = z.object({
	locales: z.record(z.string(), z.string()),
});
type FormValues = z.infer<typeof formSchema>;

interface ProductLocaleTabProps {
	productId: string;
	initialLocales: ProductLocaleRow[];
	productName: string;
	onProductNameChange?: (name: string) => void;
}

export function ProductLocaleTab({
	productId,
	initialLocales,
	productName,
	onProductNameChange,
}: ProductLocaleTabProps) {
	const params = useParams<{ storeId: string }>();
	const storeId = String(params.storeId);
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [locales, setLocales] = useState<ProductLocaleRow[]>(initialLocales);
	const [loading, setLoading] = useState(false);

	const { data: localesData } = useSWR<LocalesApiResponse>(
		`${process.env.NEXT_PUBLIC_API_URL}/common/get-locales?storeId=${storeId}`,
		fetcher,
	);
	const allLocales = localesData?.locales ?? [];
	const defaultLocaleId = localesData?.defaultLocaleId ?? "";

	const defaultValues = useMemo<FormValues>(
		() => ({
			locales: allLocales.reduce((acc, l) => {
				const existing = locales.find((loc) => loc.localeId === l.id)?.name;
				const value = existing ?? (l.id === defaultLocaleId ? productName : "");
				return { ...acc, [l.id]: value };
			}, {}),
		}),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[allLocales, locales, defaultLocaleId],
	);

	const form = useForm<FormValues>({
		...adminCrudUseFormProps,
		resolver: zodResolver(formSchema),
		defaultValues,
	});

	useEffect(() => {
		if (allLocales.length > 0) {
			form.reset(defaultValues);
			form.trigger();
		}
	}, [allLocales, defaultValues, form]);

	const onSubmit = async (values: FormValues) => {
		setLoading(true);
		const result = await upsertProductLocalesAction(storeId, {
			productId,
			locales: values.locales,
		});
		if (result?.data) {
			setLocales(result.data.locales);
			if (result.data.productName !== productName) {
				onProductNameChange?.(result.data.productName);
			}
			toastSuccess({ description: t("saved") });
		} else {
			toastError({ description: result?.serverError ?? t("error") });
		}
		setLoading(false);
	};

	const isBusy = loading || form.formState.isSubmitting;

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("locale_variants")}</CardTitle>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							{allLocales.map((locale) => (
								<FormField
									key={locale.id}
									control={form.control}
									name={`locales.${locale.id}`}
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{t("product_name")} ({locale.name})
											</FormLabel>
											<FormControl>
												<Input
													disabled={isBusy}
													className="h-10 text-base sm:h-9 sm:text-sm touch-manipulation"
													placeholder={t("product_name")}
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							))}
						</div>

						<Button
							type="submit"
							disabled={isBusy || !form.formState.isValid}
							className="touch-manipulation disabled:opacity-25"
						>
							{t("save")}
						</Button>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}
