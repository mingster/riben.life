"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
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
		console.log(data);
		const result = await fetch("/api/sysAdmin/emailQueue/send-test", {
			method: "POST",
			body: JSON.stringify(data),
		});
		const resultData = await result.json();
		console.log(resultData);
		toastSuccess({ description: resultData.toString() });
		setLoading(false);
	};

	return (
		<div className="">
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)}>
					<FormField
						control={form.control}
						name="email"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Email</FormLabel>
								<FormControl>
									<Input type="text" placeholder="Enter email" {...field} />
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
