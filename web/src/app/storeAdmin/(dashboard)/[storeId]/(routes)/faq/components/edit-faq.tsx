"use client";

import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
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
import {
	Select,
	SelectContent,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useWindowSize } from "usehooks-ts";
import type { z } from "zod";

const EditorComp = dynamic(
	() => import("@/components/editor/EditorComponent"),
	{ ssr: false },
);

import { toastError, toastSuccess } from "@/components/Toaster";
import { useI18n } from "@/providers/i18n-provider";
import { PenIcon, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Faq } from "@/types";
import dynamic from "next/dynamic";
import { Switch } from "@/components/ui/switch";
import {
	UpdateFaqInput,
	updateFaqSchema,
} from "@/actions/storeAdmin/faq/update-faq.validation";
import { updateFaqAction } from "@/actions/storeAdmin/faq/update-faq";

interface props {
	item: z.infer<typeof updateFaqSchema>;
	onUpdated?: (newValue: Faq) => void;
	isNew?: boolean;
}

export const EditFaq: React.FC<props> = ({ item, onUpdated, isNew }) => {
	const [isOpen, setIsOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	//const router = useRouter();

	const { lng } = useI18n();
	//console.log('lng', lng);
	const { t } = useTranslation(lng);
	const windowSize = useWindowSize();
	const isMobile = windowSize.width < 768;

	const defaultValues = item
		? {
				...item,
			}
		: {
				id: "new",
				name: "new",
			};

	const form = useForm<UpdateFaqInput>({
		resolver: zodResolver(updateFaqSchema),
		defaultValues,
		mode: "onChange",
	});

	const {
		register,
		formState: { errors },
		handleSubmit,
		clearErrors,
	} = form;

	//console.log("disabled", loading || form.formState.isSubmitting);

	async function onSubmit(data: UpdateFaqInput) {
		//console.log("data", data);
		setLoading(true);
		const result = (await updateFaqAction(data)) as Faq;
		if (result?.serverError) {
			toastError({ description: result.serverError });
		} else {
			// also update data from parent component or caller
			onUpdated?.(result.data);

			if (data.id === "new") {
				data.id = result.data.id;
				toastSuccess({ description: "FAQ created." });
			} else {
				toastSuccess({ description: "FAQ updated." });
			}
		}
		setLoading(false);
		setIsOpen(false);
	}

	return (
		<>
			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogTrigger asChild>
					<Button
						variant={"ghost"}
						onClick={() => {
							setIsOpen(true);
						}}
					>
						{isNew ? (
							<Plus className="mr-0 size-3" />
						) : (
							<PenIcon className="mr-0 size-3" />
						)}
					</Button>
				</DialogTrigger>

				<DialogContent className="p-2 space-y-2 sm:max-w-[90%]">
					<DialogHeader className="">
						<DialogTitle>FAQ</DialogTitle>
						<DialogDescription></DialogDescription>
					</DialogHeader>

					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="space-y-2.5"
						>
							<FormField
								control={form.control}
								name="question"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Question</FormLabel>
										<FormControl>
											<Input
												disabled={loading || form.formState.isSubmitting}
												placeholder="Enter the question of this FAQ"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="answer"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Answer</FormLabel>
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
							<FormField
								control={form.control}
								name="sortOrder"
								render={({ field }) => (
									<FormItem className="w-full">
										<FormLabel>Sort Order</FormLabel>
										<FormControl>
											<Input
												type="number"
												disabled={loading || form.formState.isSubmitting}
												placeholder="Enter sort order of the "
												{...field}
											/>
										</FormControl>
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="published"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center justify-between p-3 rounded-lg shadow-sm">
										<div className="space-y-0.5">
											<FormLabel>Publish</FormLabel>
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

							<Button
								type="submit"
								disabled={loading || form.formState.isSubmitting}
								className="disabled:opacity-25"
							>
								{t("Submit")}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									clearErrors();
									setIsOpen(false);
									//router.push(`/${params.storeId}/support`);
								}}
								className="ml-2"
							>
								{t("Cancel")}
							</Button>
						</form>
					</Form>
				</DialogContent>
			</Dialog>
		</>
	);
};
