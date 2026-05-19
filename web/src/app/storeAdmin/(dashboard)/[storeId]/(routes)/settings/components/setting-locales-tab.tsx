"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { updateStoreLocalesAction } from "@/actions/storeAdmin/settings/update-store-locales";
import { useTranslation } from "@/app/i18n/client";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
} from "@/components/ui/form";
import { useI18n } from "@/providers/i18n-provider";
import useSWR from "swr";
import type { LocalesTabProps } from "./settings-types";
import { z } from "zod";
const fetcher = (url: RequestInfo) => fetch(url).then((res) => res.json());

type LocaleRow = { id: string; name: string; lng: string };

const formSchema = z.object({
	supportedLocales: z
		.array(z.string())
		.min(1, "At least one supported locale is required"),
});

export const SettingLocalesTab: React.FC<LocalesTabProps> = ({
	store,
	onStoreUpdated,
}) => {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [loading, setLoading] = useState(false);

	const { data: allLocales = [] } = useSWR<LocaleRow[]>(
		`${process.env.NEXT_PUBLIC_API_URL}/common/get-locales`,
		fetcher,
	);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			supportedLocales: store?.supportedLocales || ["tw", "en"],
		},
	});

	const onSubmit = async (data: z.infer<typeof formSchema>) => {
		setLoading(true);
		try {
			const result = await updateStoreLocalesAction(
				String(params.storeId),
				data,
			);
			if (result?.serverError) {
				toastError({ description: result.serverError });
				return;
			}
			toastSuccess({ description: t("updated") });
			if (onStoreUpdated && result?.data) {
				onStoreUpdated(result.data);
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				<FormField
					control={form.control}
					name="supportedLocales"
					render={() => (
						<FormItem>
							<div className="mb-4">
								<FormLabel className="text-base">
									{t("supported_locales") || "Supported Locales"}
								</FormLabel>
							</div>
							<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
								{allLocales.map((locale) => (
									<FormField
										key={locale.id}
										control={form.control}
										name="supportedLocales"
										render={({ field }) => {
											return (
												<FormItem
													key={locale.id}
													className="flex flex-row items-start space-x-3 space-y-0"
												>
													<FormControl>
														<Checkbox
															checked={field.value?.includes(locale.id)}
															onCheckedChange={(checked) => {
																return checked
																	? field.onChange([...field.value, locale.id])
																	: field.onChange(
																			field.value?.filter(
																				(value) => value !== locale.id,
																			),
																		);
															}}
														/>
													</FormControl>
													<FormLabel className="font-normal">
														{locale.name}
													</FormLabel>
												</FormItem>
											);
										}}
									/>
								))}
							</div>
						</FormItem>
					)}
				/>
				<div className="flex justify-end">
					<Button disabled={loading} type="submit">
						{t("save")}
					</Button>
				</div>
			</form>
		</Form>
	);
};
