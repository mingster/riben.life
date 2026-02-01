"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader } from "@/components/loader";
import { toastSuccess } from "@/components/toaster";
// send mail tester
//
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import logger from "@/lib/logger";

export const mailTesterSchema = z.object({
	email: z.email(),
});

export type MailTesterInput = z.infer<typeof mailTesterSchema>;
export default function ClientMailTester() {
	const form = useForm<MailTesterInput>({
		mode: "onChange",
		resolver: zodResolver(mailTesterSchema),
		defaultValues: {
			email: "",
		},
	});

	const [loading, setLoading] = useState(false);
	const {
		register,
		formState: { errors },
		handleSubmit,
		clearErrors,
	} = form;

	const onSubmit = async (data: MailTesterInput) => {
		setLoading(true);
		logger.info("Operation log");
		const result = await fetch("/api/sysAdmin/emailQueue/send-test", {
			method: "POST",
			body: JSON.stringify(data),
		});
		const resultData = await result.json();
		logger.info("Operation log");
		toastSuccess({ description: resultData.toString() });
		setLoading(false);
	};

	return (
		<div className="relative">
			{(loading || form.formState.isSubmitting) && (
				<div
					className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-[2px]"
					aria-hidden="true"
				>
					<div className="flex flex-col items-center gap-3">
						<Loader />
						<span className="text-sm font-medium text-muted-foreground">
							Sending...
						</span>
					</div>
				</div>
			)}
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)}>
					<FormField
						control={form.control}
						name="email"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									Email <span className="text-destructive">*</span>
								</FormLabel>
								<FormControl>
									<Input
										type="text"
										placeholder="Enter email"
										{...field}
										value={field.value ?? ""}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<Button type="submit">Send</Button>
				</form>
			</Form>
		</div>
	);
}
