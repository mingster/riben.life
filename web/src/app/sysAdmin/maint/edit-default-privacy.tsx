"use client";
import { toastSuccess } from "@/components/toaster";
import { zodResolver } from "@hookform/resolvers/zod";

import { Card, CardContent } from "@/components/ui/card";

import axios from "axios";
import { useRouter } from "next/navigation";
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

const privacyFormSchema = z.object({
	privacyPolicy: z.string().optional().default(""),
});

type formValues = z.infer<typeof privacyFormSchema>;

export const EditDefaultPrivacy: React.FC<props> = ({ data }) => {
	//const params = useParams();
	const router = useRouter();

	const [loading, setLoading] = useState(false);

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const defaultValues = { privacyPolicy: data };

	// Automatically infers the output type from the schema
	const privacyForm = useForm({
		resolver: zodResolver(privacyFormSchema),
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
			`${process.env.NEXT_PUBLIC_API_URL}/admin/defaults/priacy`,
			data,
		);

		toastSuccess({
			title: "privacy statement updated.",
			description: "",
		});

		router.refresh();

		setLoading(false);
	};

	return (
		<Card className="">
			<CardContent className="space-y-2">
				<Form {...privacyForm}>
					<form
						onSubmit={privacyForm.handleSubmit(onSubmit)}
						className="w-full space-y-1"
					>
						<div className="h-[600px]">
							<FormField
								control={privacyForm.control}
								name="privacyPolicy"
								render={({ field }) => (
									<FormItem>
										<FormLabel>default 隱私權政策</FormLabel>
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
								!privacyForm.formState.isValid ||
								privacyForm.formState.isSubmitting
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
								router.push("../");
							}}
							className="ml-5"
						>
							{t("Cancel")}
						</Button>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
};
