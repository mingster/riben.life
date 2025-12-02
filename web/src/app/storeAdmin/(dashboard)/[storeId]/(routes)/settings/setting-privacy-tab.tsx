"use client";
import { toastError, toastSuccess } from "@/components/toaster";
import { zodResolver } from "@hookform/resolvers/zod";

import { Card, CardContent } from "@/components/ui/card";

import { type AxiosError } from "axios";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

import * as z from "zod";

const EditorComp = dynamic(
	() => import("@/components/editor/EditorComponent"),
	{ ssr: false },
);

import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import dynamic from "next/dynamic";
import type { StoreSettings } from "@prisma/client";
import { SettingsFormProps } from "./setting-basic-tab";
import { updateStorePrivacyAction } from "@/actions/storeAdmin/settings/update-store-privacy";
import type { UpdateStorePrivacyInput } from "@/actions/storeAdmin/settings/update-store-privacy.validation";

const privacyFormSchema = z.object({
	privacyPolicy: z.string().optional().default(""),
	tos: z.string().optional().default(""),
});

type formValues = z.infer<typeof privacyFormSchema>;

export const PrivacyTab: React.FC<SettingsFormProps> = ({
	store,
	storeSettings,
	onStoreSettingsUpdated,
}) => {
	const params = useParams();
	const router = useRouter();

	const [loading, setLoading] = useState(false);

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	//if (!storeSettings?.privacyPolicy) storeSettings.privacyPolicy = '';

	const defaultValues = storeSettings
		? {
				///...initialData,
				...storeSettings,
			}
		: {};

	// Replace null values with empty strings for string fields
	const sanitizedDefaultValues = Object.fromEntries(
		Object.entries(defaultValues).map(([key, value]) => [
			key,
			value === null ? "" : value,
		]),
	);

	//console.log('defaultValues: ' + JSON.stringify(defaultValues));
	/*
	<Textarea
	  disabled={loading || form.formState.isSubmitting}
	  className="font-mono min-h-100"
	  placeholder="enter your privacy statement here..."
	  {...field}
	/>
*/
	const form = useForm<formValues>({
		resolver: zodResolver(privacyFormSchema) as any,
		defaultValues: sanitizedDefaultValues,
	});

	//const isSubmittable = !!form.formState.isDirty && !!form.formState.isValid;
	const onSubmit = async (data: formValues) => {
		//console.log(`privacy onSubmit: ${JSON.stringify(data)}`);

		try {
			setLoading(true);

			const payload: Omit<UpdateStorePrivacyInput, "storeId"> = {
				privacyPolicy: data.privacyPolicy ?? "",
				tos: data.tos ?? "",
			};

			const result = await updateStorePrivacyAction(
				params.storeId as string,
				payload,
			);

			if (result?.serverError) {
				toastError({
					title: t("error_title"),
					description: result.serverError,
				});
			} else if (result?.data) {
				onStoreSettingsUpdated?.(
					(result.data.storeSettings as StoreSettings | null | undefined) ??
						null,
				);

				toastSuccess({
					title: t("Store_updated"),
					description: "",
				});
			}
		} catch (err: unknown) {
			const error = err as AxiosError;
			toastError({
				title: "Something went wrong.",
				description: error.message,
			});
		} finally {
			setLoading(false);
			//console.log(data);
		}
	};

	return (
		<Card className="h-svh">
			<CardContent className="space-y-2">
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="w-full space-y-1"
					>
						<div>
							<FormField
								control={form.control}
								name="privacyPolicy"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("StoreSettings_privacyPolicy")}</FormLabel>
										<FormControl>
											<EditorComp
												markdown={field.value ?? ""}
												onPChange={field.onChange}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="tos"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("StoreSettings_terms")}</FormLabel>
										<FormControl>
											<EditorComp
												markdown={field.value ?? ""}
												onPChange={field.onChange}
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
							{t("save")}
						</Button>

						<Button
							type="button"
							variant="outline"
							onClick={() => {
								form.clearErrors();
								router.push("../");
							}}
							disabled={loading || form.formState.isSubmitting}
							className="ml-5 disabled:opacity-25"
						>
							{t("cancel")}
						</Button>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
};
