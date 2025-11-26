"use client";
import { toastError, toastSuccess } from "@/components/toaster";
import { zodResolver } from "@hookform/resolvers/zod";

import { type AxiosError } from "axios";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

import { Card, CardContent } from "@/components/ui/card";

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
import { SettingsFormProps } from "./tabs";
import { updateStoreTermsAction } from "@/actions/storeAdmin/settings/update-store-terms";
import type { UpdateStoreTermsInput } from "@/actions/storeAdmin/settings/update-store-terms.validation";

const tosFormSchema = z.object({
	tos: z.string().default(""),
});

type formValues = z.infer<typeof tosFormSchema>;

export const TermsTab: React.FC<SettingsFormProps> = ({
	store,
	storeSettings,
	onStoreSettingsUpdated,
}) => {
	const params = useParams();
	const router = useRouter();

	const [loading, setLoading] = useState(false);

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const defaultValues = storeSettings
		? {
				///...initialData,
				...storeSettings,
			}
		: {};

	//console.log('defaultValues: ' + JSON.stringify(defaultValues));

	const form = useForm<formValues>({
		resolver: zodResolver(tosFormSchema) as any,
		defaultValues,
	});

	/*
  <Textarea
  disabled={loading || form.formState.isSubmitting}
  className="font-mono min-h-100"
  placeholder="服務條款..."
  {...field}
  />
  */

	const onSubmit = async (data: formValues) => {
		//console.log(`tos onSubmit: ${JSON.stringify(data)}`);

		try {
			setLoading(true);

			const payload: UpdateStoreTermsInput = {
				storeId: params.storeId as string,
				tos: data.tos ?? "",
			};

			const result = await updateStoreTermsAction(payload);

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
						<FormField
							control={form.control}
							name="tos"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("StoreSettings_terms")}</FormLabel>
									<FormControl>
										<EditorComp
											markdown={field.value}
											onPChange={field.onChange}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
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
