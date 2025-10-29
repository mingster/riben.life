"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconEdit, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useWindowSize } from "usehooks-ts";
import type { z } from "zod/v4";
import { updateMessageTemplateAction } from "@/actions/sysAdmin/messageTemplate/update-message-template";
import { updateMessageTemplateSchema } from "@/actions/sysAdmin/messageTemplate/update-message-template.validation";
import { useTranslation } from "@/app/i18n/client";

import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/providers/i18n-provider";
import type { MessageTemplate } from "@/types";

interface props {
	item: MessageTemplate;
	onUpdated?: (newValue: MessageTemplate) => void;
}

export const EditMessageTemplate: React.FC<props> = ({ item, onUpdated }) => {
	const [isOpen, setIsOpen] = useState(false);
	const [loading, setLoading] = useState(false);

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

	const form = useForm<z.infer<typeof updateMessageTemplateSchema>>({
		resolver: zodResolver(updateMessageTemplateSchema),
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

	// commit to db and return the updated category
	async function onSubmit(data: z.infer<typeof updateMessageTemplateSchema>) {
		//console.log("data", data);
		setLoading(true);
		const result = (await updateMessageTemplateAction(data)) as MessageTemplate;
		if (result?.serverError) {
			toastError({ description: result.serverError });
		} else {
			// also update data from parent component or caller
			const updatedData = {
				id: result.data.id,
				name: result.data.name,
				MessageTemplateLocalized: result.data.MessageTemplateLocalized,
			} as MessageTemplate;

			//console.log("onSubmit", updatedData);
			onUpdated?.(updatedData);

			if (data.id === "new") {
				toastSuccess({ description: "Message template created." });
			} else {
				toastSuccess({ description: "Message template updated." });
			}
		}
		setLoading(false);
		setIsOpen(false);
	}

	//console.log("item", item);
	return (
		<>
			<Drawer
				direction={isMobile ? "bottom" : "right"}
				open={isOpen}
				onOpenChange={setIsOpen}
			>
				<DrawerTrigger asChild>
					{item === null || item.id === "new" ? (
						<Button
							variant={"outline"}
							onClick={() => {
								setIsOpen(true);
							}}
						>
							<IconPlus className="mr-0 size-4" />
							{t("create")}
						</Button>
					) : (
						<Button
							variant="link"
							className="text-foreground w-fit px-0 text-left"
							onClick={() => setIsOpen(true)}
						>
							<IconEdit className="mr-0 size-3" />
						</Button>
					)}
				</DrawerTrigger>

				<DrawerContent className="p-2 space-y-2 w-full">
					<DrawerHeader className="">
						<DrawerTitle>Message Template</DrawerTitle>
						<DrawerDescription>
							{
								//display form error if any
							}
						</DrawerDescription>
					</DrawerHeader>

					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="space-y-2.5"
						>
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem className="w-full">
										<FormLabel>Name</FormLabel>
										<FormControl>
											<Input
												disabled={loading || form.formState.isSubmitting}
												placeholder="Enter the name of the message template"
												{...field}
											/>
										</FormControl>
										<FormMessage />
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
				</DrawerContent>
			</Drawer>
		</>
	);
};
