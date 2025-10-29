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
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useWindowSize } from "usehooks-ts";
import type { z } from "zod/v4";

const EditorComp = dynamic(
	() => import("@/components/editor/EditorComponent"),
	{ ssr: false },
);

import { updateEmailQueueAction } from "@/actions/sysAdmin/emailQueue/update-emailQueue";
import {
	UpdateEmailQueueInput,
	updateEmailQueueSchema,
} from "@/actions/sysAdmin/emailQueue/update-emailQueue.validation";
import { toastError, toastSuccess } from "@/components/toaster";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/providers/i18n-provider";
import type { EmailQueue } from "@/types";
import { IconEdit, IconPlus } from "@tabler/icons-react";
import dynamic from "next/dynamic";

interface props {
	item: z.infer<typeof updateEmailQueueSchema>;
	onUpdated?: (newValue: EmailQueue) => void;
	isNew?: boolean;
}

export const EditMailQueue: React.FC<props> = ({ item, onUpdated, isNew }) => {
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

	const form = useForm<UpdateEmailQueueInput>({
		resolver: zodResolver(updateEmailQueueSchema),
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

	async function onSubmit(data: UpdateEmailQueueInput) {
		console.log("data", data);
		setLoading(true);
		const result = (await updateEmailQueueAction(data)) as EmailQueue;
		if (result?.serverError) {
			toastError({ description: result.serverError });
		} else {
			// also update data from parent component or caller
			onUpdated?.(result.data);

			if (isNew) {
				//if (data.id === "new") {
				data.id = result.data.id;
				toastSuccess({ description: "Queued Email created." });
			} else {
				toastSuccess({ description: "Queued Email updated." });
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
							<IconPlus className="mr-0 size-3" />
						) : (
							<IconEdit className="mr-0 size-3" />
						)}
					</Button>
				</DialogTrigger>

				<DialogContent className="p-2 space-y-2 sm:max-w-[90%]">
					<DialogHeader className="">
						<DialogTitle>Email Queue</DialogTitle>
						<DialogDescription></DialogDescription>
					</DialogHeader>

					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="space-y-2.5"
						>
							<div className="grid grid-cols-2 gap-2">
								<FormField
									control={form.control}
									name="from"
									render={({ field }) => (
										<FormItem>
											<FormLabel>From</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													placeholder="Enter the from of this email"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="fromName"
									render={({ field }) => (
										<FormItem>
											<FormLabel>From Name</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													placeholder="Enter the from name of this email"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
							<div className="grid grid-cols-2 gap-2">
								<FormField
									control={form.control}
									name="to"
									render={({ field }) => (
										<FormItem>
											<FormLabel>To</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													placeholder="Enter the to of this email"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="toName"
									render={({ field }) => (
										<FormItem>
											<FormLabel>To Name</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													placeholder="Enter the to of this email"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="grid grid-cols-2 gap-2">
								<FormField
									control={form.control}
									name="cc"
									render={({ field }) => (
										<FormItem>
											<FormLabel>CC</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													placeholder="Enter the cc of this email"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="bcc"
									render={({ field }) => (
										<FormItem>
											<FormLabel>BCC</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													placeholder="Enter the bcc of this email"
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
								name="subject"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Subject</FormLabel>
										<FormControl>
											<Input
												disabled={loading || form.formState.isSubmitting}
												placeholder="Enter the subject of this email"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="textMessage"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Text Message</FormLabel>
										<FormControl>
											<Textarea
												disabled={loading || form.formState.isSubmitting}
												placeholder="Enter the text message of this email"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="htmMessage"
								render={({ field }) => (
									<FormItem>
										<FormLabel>HTML Message</FormLabel>
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
