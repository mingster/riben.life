"use client";
import { Loader } from "@/components/loader";
import { toastError, toastSuccess } from "@/components/toaster";
import { zodResolver } from "@hookform/resolvers/zod";

import { Card, CardContent } from "@/components/ui/card";

import axios, { type AxiosError } from "axios";
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

export interface props {
	data: string;
}

const formSchema = z.object({
	terms: z.string().optional().default(""),
});

type formValues = z.infer<typeof formSchema>;

export const EditDefaultTerms: React.FC<props> = ({ data }) => {
	const _params = useParams();
	const router = useRouter();

	const [loading, setLoading] = useState(false);

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const defaultValues = { terms: data };

	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues,
	});

	const {
		register,
		formState: { errors },
		handleSubmit,
		clearErrors,
	} = useForm<formValues>();

	//const isSubmittable = !!form.formState.isDirty && !!form.formState.isValid;
	const onSubmit = async (data: formValues) => {
		//console.log(`privacy onSubmit: ${JSON.stringify(data)}`);

		setLoading(true);

		await axios.post(
			`${process.env.NEXT_PUBLIC_API_URL}/sysAdmin/defaults/terms`,
			data,
		);

		toastSuccess({
			title: "terms of service updated.",
			description: "",
		});

		router.refresh();

		setLoading(false);
	};

	return (
		<Card className="">
			<CardContent className="relative space-y-2">
				{(loading || form.formState.isSubmitting) && (
					<div
						className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-[2px]"
						aria-hidden="true"
					>
						<div className="flex flex-col items-center gap-3">
							<Loader />
							<span className="text-sm font-medium text-muted-foreground">
								{t("saving") || "Saving..."}
							</span>
						</div>
					</div>
				)}
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="w-full space-y-1"
					>
						<div className="h-[600px]">
							<FormField
								control={form.control}
								name="terms"
								render={({ field }) => (
									<FormItem>
										<FormLabel>default 服務條款</FormLabel>
										<FormControl>
											<EditorComp
												markdown={field.value || ""}
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
								clearErrors();
								router.push("../");
							}}
							className="ml-5"
						>
							{t("cancel")}
						</Button>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
};
